"""Vercel function that keeps YouTube Music OAuth tokens out of browser storage."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from cryptography.fernet import Fernet, InvalidToken
from ytmusicapi.auth.oauth.exceptions import BadOAuthClient, UnauthorizedOAuthClient
from ytmusicapi import OAuthCredentials, YTMusic

COOKIE_NAME = "wavelength_ytmusic"
DEVICE_FLOW_MAX_AGE = 900
TOKEN_MAX_AGE = 31_536_000


def _json_response(handler: BaseHTTPRequestHandler, status: int, payload: dict, cookie: str | None = None) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("X-Content-Type-Options", "nosniff")
    handler.send_header("Content-Length", str(len(body)))
    if cookie:
        handler.send_header("Set-Cookie", cookie)
    handler.end_headers()
    handler.wfile.write(body)


def _credentials() -> OAuthCredentials:
    client_id = os.environ.get("YTMUSIC_CLIENT_ID", "").strip()
    client_secret = os.environ.get("YTMUSIC_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise RuntimeError("YouTube Music no está configurado en el servidor. Añade YTMUSIC_CLIENT_ID y YTMUSIC_CLIENT_SECRET.")
    return OAuthCredentials(client_id=client_id, client_secret=client_secret)


def _session_secret() -> bytes:
    secret = os.environ.get("YTMUSIC_SESSION_SECRET", "").encode("utf-8")
    if len(secret) < 32:
        raise RuntimeError("Falta YTMUSIC_SESSION_SECRET: configura una clave aleatoria de al menos 32 caracteres.")
    return secret


def _is_configured() -> bool:
    return bool(
        os.environ.get("YTMUSIC_CLIENT_ID", "").strip()
        and os.environ.get("YTMUSIC_CLIENT_SECRET", "").strip()
        and len(os.environ.get("YTMUSIC_SESSION_SECRET", "").encode("utf-8")) >= 32
    )


def _session_cipher() -> Fernet:
    key = base64.urlsafe_b64encode(hashlib.sha256(_session_secret()).digest())
    return Fernet(key)


def _encrypted_session(payload: dict) -> str:
    serialized = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return _session_cipher().encrypt(serialized).decode("ascii")


def _read_session(handler: BaseHTTPRequestHandler) -> dict | None:
    raw_cookie = handler.headers.get("Cookie", "")
    cookies = SimpleCookie()
    try:
        cookies.load(raw_cookie)
    except Exception:
        return None
    morsel = cookies.get(COOKIE_NAME)
    if morsel is None:
        return None
    try:
        decoded = _session_cipher().decrypt(morsel.value.encode("ascii"))
        payload = json.loads(decoded)
        if not isinstance(payload, dict) or int(payload.get("expiresAt", 0)) < int(time.time()):
            return None
        return payload
    except (InvalidToken, RuntimeError, ValueError, TypeError, UnicodeError, json.JSONDecodeError):
        return None


def _set_session_cookie(handler: BaseHTTPRequestHandler, payload: dict, max_age: int) -> str:
    secure = os.environ.get("VERCEL") == "1" or handler.headers.get("X-Forwarded-Proto") == "https"
    value = _encrypted_session(payload)
    attributes = f"{COOKIE_NAME}={value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age={max_age}"
    return attributes + ("; Secure" if secure else "")


def _clear_session_cookie(handler: BaseHTTPRequestHandler) -> str:
    secure = os.environ.get("VERCEL") == "1" or handler.headers.get("X-Forwarded-Proto") == "https"
    attributes = f"{COOKIE_NAME}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0"
    return attributes + ("; Secure" if secure else "")


def _music(handler: BaseHTTPRequestHandler, require_auth: bool = False) -> YTMusic:
    session = _read_session(handler)
    token = session.get("token") if session and session.get("flow") == "token" else None
    if require_auth and (not isinstance(token, dict) or not token.get("refresh_token")):
        raise RuntimeError("Conecta tu cuenta de YouTube Music para ver o crear playlists.")
    if token:
        credentials = _credentials()
        return YTMusic(auth=token, oauth_credentials=credentials)
    return YTMusic()


def _duration_ms(item: dict) -> int:
    seconds = item.get("duration_seconds")
    if isinstance(seconds, (int, float)):
        return int(seconds * 1000)
    duration = item.get("duration")
    if not isinstance(duration, str):
        return 0
    try:
        total_seconds = 0
        for part in duration.split(":"):
            total_seconds = total_seconds * 60 + int(part)
        return total_seconds * 1000
    except ValueError:
        return 0


def _track_count(value: object) -> int:
    if isinstance(value, int):
        return max(value, 0)
    if isinstance(value, str):
        match = re.search(r"\d+", value.replace(",", ""))
        if match:
            return int(match.group())
    return 0


def _track(item: dict) -> dict | None:
    video_id = item.get("videoId")
    if not video_id:
        return None
    artists = item.get("artists") or []
    album = item.get("album") or {}
    thumbnails = item.get("thumbnails") or []
    return {
        "videoId": video_id,
        "title": item.get("title") or "Sin título",
        "artist": ", ".join(artist.get("name", "") for artist in artists if artist.get("name")) or "Artista desconocido",
        "album": album.get("name") if isinstance(album, dict) else None,
        "durationMs": _duration_ms(item),
        "thumbnail": thumbnails[-1].get("url") if thumbnails else None,
        "url": f"https://music.youtube.com/watch?v={video_id}",
    }


def _read_body(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length", "0"))
    if length > 32_000:
        raise ValueError("La solicitud supera el tamaño permitido.")
    if length <= 0:
        return {}
    try:
        body = json.loads(handler.rfile.read(length))
    except json.JSONDecodeError as error:
        raise ValueError("El cuerpo JSON no es válido.") from error
    if not isinstance(body, dict):
        raise ValueError("El cuerpo de la solicitud debe ser un objeto JSON.")
    return body


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        self.send_response(204)
        self.send_header("Allow", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        params = parse_qs(urlparse(self.path).query)
        action = (params.get("action") or [""])[0]
        session = _read_session(self)
        try:
            if action == "status":
                connected = bool(session and session.get("flow") == "token" and (session.get("token") or {}).get("refresh_token"))
                connecting = bool(session and session.get("flow") == "device")
                status = {"connected": connected, "connecting": connecting, "configured": _is_configured()}
                if connecting:
                    status.update({
                        "userCode": session.get("userCode"),
                        "verificationUrl": session.get("verificationUrl"),
                        "expiresIn": max(0, int(session.get("expiresAt", 0)) - int(time.time())),
                        "interval": session.get("interval", 5),
                    })
                _json_response(self, 200, status)
                return

            if action == "auth-poll":
                if not session or session.get("flow") != "device":
                    _json_response(self, 400, {"error": "No hay una conexión de YouTube Music pendiente. Inicia el flujo de nuevo."}, _clear_session_cookie(self))
                    return
                if int(session.get("expiresAt", 0)) <= int(time.time()):
                    _json_response(self, 410, {"error": "El código de conexión venció. Solicita uno nuevo."}, _clear_session_cookie(self))
                    return
                try:
                    token = _credentials().token_from_code(session["deviceCode"])
                except (BadOAuthClient, UnauthorizedOAuthClient):
                    _json_response(self, 409, {
                        "error": "Google rechazó las credenciales de YouTube Music. Verifica el Client ID/Secret y que el proyecto tenga habilitada YouTube Data API v3."
                    }, _clear_session_cookie(self))
                    return
                except Exception:
                    _json_response(self, 202, {"pending": True})
                    return
                if isinstance(token, dict) and token.get("error"):
                    oauth_error = str(token.get("error"))
                    if oauth_error in {"authorization_pending", "slow_down"}:
                        _json_response(self, 202, {"pending": True})
                        return
                    if oauth_error in {"expired_token", "invalid_grant"}:
                        _json_response(self, 410, {"error": "El código de conexión venció. Solicita uno nuevo."}, _clear_session_cookie(self))
                        return
                    if oauth_error in {"access_denied", "user_denied"}:
                        _json_response(self, 403, {"error": "Se canceló la autorización de YouTube Music."}, _clear_session_cookie(self))
                        return
                    _json_response(self, 502, {"error": "Google rechazó la autorización de YouTube Music. Revisa el cliente OAuth y vuelve a intentarlo."}, _clear_session_cookie(self))
                    return
                if not isinstance(token, dict) or not token.get("access_token") or not token.get("refresh_token"):
                    _json_response(self, 502, {"error": "YouTube Music devolvió una respuesta de autorización incompleta."}, _clear_session_cookie(self))
                    return
                token["expires_at"] = int(time.time()) + int(token.get("expires_in", 0))
                payload = {"flow": "token", "token": token, "expiresAt": int(time.time()) + TOKEN_MAX_AGE}
                _json_response(self, 200, {"pending": False, "connected": True}, _set_session_cookie(self, payload, TOKEN_MAX_AGE))
                return

            if action == "search":
                query = (params.get("q") or [""])[0].strip()
                if not query:
                    _json_response(self, 200, {"tracks": []})
                    return
                if len(query) > 160:
                    raise ValueError("La búsqueda puede tener hasta 160 caracteres.")
                results = _music(self).search(query, filter="songs", limit=10)
                _json_response(self, 200, {"tracks": [track for item in results if (track := _track(item))]})
                return

            if action == "playlists":
                playlists = _music(self, require_auth=True).get_library_playlists(limit=100)
                mapped = []
                for item in playlists:
                    playlist_id = item.get("playlistId") or item.get("browseId")
                    if not playlist_id:
                        continue
                    thumbnails = item.get("thumbnails") or []
                    mapped.append({
                        "id": playlist_id,
                        "name": item.get("title") or "Lista sin título",
                        "description": item.get("description") or "",
                        "coverArt": thumbnails[-1].get("url") if thumbnails else None,
                        "totalTracks": _track_count(item.get("count")),
                        "duration": 0,
                        "isPublic": item.get("privacy") == "PUBLIC",
                    })
                _json_response(self, 200, {"playlists": mapped})
                return

            _json_response(self, 404, {"error": "Acción de YouTube Music desconocida."})
        except ValueError as error:
            _json_response(self, 400, {"error": str(error)})
        except RuntimeError as error:
            _json_response(self, 409, {"error": str(error)})
        except Exception:
            _json_response(self, 502, {"error": "YouTube Music no respondió. Inténtalo de nuevo en un momento."})

    def do_POST(self) -> None:  # noqa: N802
        params = parse_qs(urlparse(self.path).query)
        action = (params.get("action") or [""])[0]
        try:
            if action == "auth-start":
                try:
                    code = _credentials().get_code()
                except (BadOAuthClient, UnauthorizedOAuthClient) as error:
                    raise RuntimeError(
                        "Google rechazó el cliente OAuth de YouTube Music. Comprueba sus credenciales y habilita YouTube Data API v3."
                    ) from error
                expires_in = int(code.get("expires_in", DEVICE_FLOW_MAX_AGE))
                expires_at = int(time.time()) + expires_in
                interval = max(5, int(code.get("interval", 5)))
                payload = {
                    "flow": "device",
                    "deviceCode": code["device_code"],
                    "userCode": code.get("user_code"),
                    "verificationUrl": code.get("verification_url"),
                    "interval": interval,
                    "expiresAt": expires_at,
                }
                _json_response(self, 200, {
                    "userCode": code.get("user_code"),
                    "verificationUrl": code.get("verification_url"),
                    "expiresIn": expires_in,
                    "interval": interval,
                }, _set_session_cookie(self, payload, expires_in))
                return

            if action == "auth-logout":
                _json_response(self, 200, {"connected": False}, _clear_session_cookie(self))
                return

            body = _read_body(self)
            if action == "create-playlist":
                name = str(body.get("name") or "").strip()
                description = str(body.get("description") or "").strip()
                video_ids = body.get("videoIds")
                if not name:
                    raise ValueError("Escribe un nombre para la playlist.")
                if len(name) > 150 or len(description) > 5000:
                    raise ValueError("El nombre o la descripción supera el máximo permitido.")
                if not isinstance(video_ids, list) or not video_ids:
                    raise ValueError("Añade al menos una canción confirmada de YouTube Music.")
                if len(video_ids) > 100:
                    raise ValueError("Una playlist puede crearse con hasta 100 canciones a la vez.")
                if any(not isinstance(video_id, str) or not video_id.strip() or len(video_id) > 80 for video_id in video_ids):
                    raise ValueError("Una de las canciones no tiene un identificador válido de YouTube Music.")
                if len(set(video_ids)) != len(video_ids):
                    raise ValueError("Quita las canciones duplicadas antes de crear la playlist.")

                result = _music(self, require_auth=True).create_playlist(
                    title=name,
                    description=description,
                    privacy_status="PUBLIC" if body.get("isPublic") else "PRIVATE",
                    video_ids=video_ids,
                )
                playlist_id = result.get("playlistId") if isinstance(result, dict) else result
                if not playlist_id:
                    raise RuntimeError("YouTube Music no devolvió el identificador de la playlist.")
                _json_response(self, 201, {
                    "id": playlist_id,
                    "url": f"https://music.youtube.com/playlist?list={playlist_id}",
                })
                return

            _json_response(self, 404, {"error": "Acción de YouTube Music desconocida."})
        except ValueError as error:
            _json_response(self, 400, {"error": str(error)})
        except RuntimeError as error:
            _json_response(self, 409, {"error": str(error)})
        except Exception:
            _json_response(self, 502, {"error": "No se pudo completar la acción en YouTube Music. Inténtalo de nuevo."})

    def log_message(self, _format: str, *_args: object) -> None:
        return

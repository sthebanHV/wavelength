# Wavelength

Wavelength is a TypeScript music library and player with local and Spotify collections. Its playlist composer can also find tracks in YouTube Music, match catalog tracks to an exact YouTube Music version, reorder the route, and create the remote playlist.

## Run the frontend

```bash
npm install
npm run dev
```

The app builds to `dist` with `npm run build`. Vercel serves the Vite frontend and the Python function under `/api` from the same project.

## Connect Spotify

Spotify sign-in uses Authorization Code with PKCE. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and add the exact callback URL to **Redirect URIs**. Spotify requires HTTPS for deployed URLs and the IP loopback form for local development; `localhost` is rejected. See the [Spotify redirect URI rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

For local development, set these in `.env.local` and register `http://127.0.0.1:5173/callback` in Spotify:

```text
VITE_SPOTIFY_CLIENT_ID=...
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/callback
```

For Vercel, set `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI` in the project environment, using `https://wavelength-reproductor-musica.vercel.app/callback` as the redirect value for the current production domain. Register that exact URL in Spotify too. Preview deployments route the authorization start to the configured callback domain so the PKCE verifier remains available when Spotify returns to `/callback`. Rebuild after changing either `VITE_` variable.

## Connect YouTube Music

The YouTube Music integration uses [`ytmusicapi`](https://github.com/sigma67/ytmusicapi) in a server-side Vercel Function. Search works without an account; viewing your YouTube Music playlists and creating new ones require a separate account connection in each browser.

1. In Google Cloud, enable the **YouTube Data API v3** and create an OAuth client for **TVs and Limited Input devices**. The `ytmusicapi` OAuth flow requires this client type.
2. Add these server environment variables to the Vercel project. Keep the client secret and session secret out of `VITE_` variables.

   ```text
   YTMUSIC_CLIENT_ID=...
   YTMUSIC_CLIENT_SECRET=...
   YTMUSIC_SESSION_SECRET=<random value of at least 32 characters>
   ```

   Generate a session secret with `openssl rand -hex 32`. Add the same values to a local `.env` when using Vercel's local development runtime.
3. Deploy the project, open **Listas → Crear playlist**, choose **Conectar YouTube Music**, and enter the displayed code at Google's device authorization page.
4. The browser receives an encrypted, `HttpOnly`, `SameSite=Strict` session cookie. In production it is also `Secure`. The OAuth refresh token is not readable by application JavaScript or shared between users.

For local API development, use the Vercel CLI's `vercel dev` so `/api/ytmusic` runs as a Python Function; `npm run dev` serves only the Vite frontend. The Settings page shows when a provider is missing credentials or its API function is unavailable. `requirements.txt` pins the Python integration dependency, and `.python-version` selects Python 3.12 for the function runtime.

The existing SPA fallback remains configured in `vercel.json`; the `/api/ytmusic` Python Function handles its file-based API route.

## Create mixed-source playlists

Open **Listas → Crear playlist**, choose Spotify or YouTube Music as the destination, and add tracks from either provider. Tracks from the other provider are searched in the destination catalog; select the matching recording to confirm the version before adding it. The final playlist lives in one provider at a time because Spotify and YouTube Music use separate track identifiers. Spotify item writes are sent in batches of 100; YouTube Music playlist creation is limited to 100 tracks in this flow.

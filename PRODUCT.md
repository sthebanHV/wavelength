# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who listen to music and want to collect and organize playlists across Wavelength's existing catalog and YouTube Music.

## Product Purpose

Wavelength is a TypeScript music player that uses data structures to organize a music library and playlists. The requested extension lets listeners find YouTube Music tracks and create playlists in YouTube Music from the app.

## Operating Context

Listeners browse and search a personal music collection in a web app. They use the existing local-file and Spotify features and should be able to create and organize playlists in a few steps. The app is deployed on Vercel.

## Capabilities and Constraints

- The current project is a React and TypeScript web app built with Vite.
- Existing collection sources include local audio files and Spotify.
- Existing playlists and library data are represented with TypeScript data models and client-side state.
- YouTube Music playlist creation is the new requested capability. Playback of YouTube Music tracks inside Wavelength is undecided and must not be implied unless implemented.
- The deployment target is the existing Vercel setup.
- `ytmusicapi` is the requested YouTube Music integration library; its authenticated features require Google/YouTube Music credentials.

## Brand Commitments

- Product name: Wavelength.
- Preserve the incumbent dark and purple visual identity. The user explicitly requested that this redesign stay in that color family while using a more distinctive composition than the initial mockup.

## Evidence on Hand

- Source code, sample catalog, and local audio files in this repository.
- No testimonials, customer metrics, or other marketing proof were provided.

## Product Principles

- Make playlist creation and organization quick to understand.
- Keep music source and availability clear.
- Preserve the existing local and Spotify workflows.
- Explain account connection and service errors in plain language.
- Do not suggest YouTube Music playback when the feature only creates playlists.

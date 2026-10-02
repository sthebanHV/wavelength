---
name: Wavelength
description: A dark music workspace with a vivid violet signal.
colors:
  background: "#07050c"
  background-secondary: "#0a0811"
  surface: "#100c19"
  surface-hover: "#191126"
  surface-active: "#241535"
  accent: "#b026ff"
  accent-hover: "#ca69ff"
  text-primary: "#ffffff"
  text-secondary: "#c2b9cf"
  text-muted: "#82788f"
  border: "#21172e"
  border-strong: "#39234c"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
---

## Overview

Wavelength's established identity is a near-black music workspace with violet as its signature signal. The palette and tokens below are extracted from `src/styles/globals.css`; the app already uses them in navigation, controls, and playback surfaces. The redesign carries this dark and purple language across the full working area, as requested.

The interface should feel focused and expressive. Music titles and playlist order stay easy to scan; violet marks the active source, selected tracks, and the action that commits a playlist. Components use clear edges and quiet tonal changes rather than glossy gradients as their primary structure.

## Colors

### Primary

- **Signal Violet** (`#b026ff`): Main action, active selection, and the visual cue linking playlist steps.
- **Signal Violet Light** (`#ca69ff`): Hover and brighter emphasis.

### Neutral

- **Night Floor** (`#07050c`): App background.
- **Night Panel** (`#0a0811`): Secondary workspace and navigation.
- **Raised Plum** (`#100c19`): Cards, inputs, and raised surfaces.
- **Hover Plum** (`#191126`): Hover state.
- **Selected Plum** (`#241535`): Selected and active containers.
- **Primary White** (`#ffffff`): Titles and primary labels.
- **Orchid Gray** (`#c2b9cf`): Supporting copy.
- **Quiet Lilac** (`#82788f`): Metadata and tertiary labels.
- **Plum Rule** (`#21172e`): Default dividers and outlines.
- **Strong Plum Rule** (`#39234c`): Emphasized outlines and focus context.

**The Signal Rule.** Violet identifies active music actions and selected tracks; it does not fill every control or compete with song names.

## Typography

**Display Font:** Inter (with system-ui, sans-serif fallback)

**Body Font:** Inter (with system-ui, sans-serif fallback)
**Label/Mono Font:** Inter; use tabular figures for durations and counts where available.

**Character:** A clean, contemporary sans serif keeps the library practical while the near-black surfaces and vivid accent carry the character.

### Hierarchy

- **Display** (700, responsive 32–48px, 1.05): Main page statements and playlist creation title.
- **Headline** (700, 24–32px, 1.2): Page section titles.
- **Title** (600, 14–18px, 1.3): Track and playlist names.
- **Body** (400, 14px, 1.5): Supporting instructions and artist names.
- **Label** (600, 11–12px, 1.2, letter spacing 0.08em): Source, status, and compact section labels.

## Layout

The app uses a persistent left navigation rail, a compact top search header, a flexible content workspace, and a bottom playback bar. The content area may change shape to suit its task; playlist authoring should not collapse into a conventional dashboard grid. Keep track title, artist, duration, source, and ordering action in one scan path. On narrow screens, navigation becomes a compact control and multi-region workspaces become a readable sequence of sections.

## Elevation & Depth

Depth comes from small steps between near-black surfaces and thin plum borders. Reserve glow and shadow for a focused or playing state; do not use broad ambient shadows as a default card treatment.

## Shapes

The existing components use medium rounded corners, from 6px to 16px, with 24px reserved for large enclosing surfaces and pills for compact status markers. Use one radius consistently within a component family. Prefer precise rules and spacing over piles of rounded cards.

## Components

### Buttons

- **Shape:** Medium corners (10px).
- **Primary:** Signal Violet with white text; use for the main save or create action.
- **Secondary:** Raised Plum with a Plum Rule outline; use for supporting actions.
- **Ghost:** Transparent at rest; use Orchid Gray and reveal a Hover Plum surface on hover.
- **Focus:** Keep a visible violet keyboard ring with contrast against the Night Floor.

### Inputs

- **Shape:** Medium corners (10px), Raised Plum fill, Plum Rule outline.
- **State:** The focused field uses a visible violet border or ring; placeholder text uses Quiet Lilac.

### Navigation

- **Shape:** Compact rounded rows on the Night Panel.
- **State:** The current destination gets a Selected Plum ground and a clear Signal Violet marker.

### Track rows and playlist containers

- Keep song title, artist, duration, source, and actions aligned and legible.
- Use the source's own mark and label to distinguish local, Spotify, and YouTube Music items; keep Wavelength violet for active selection and playlist actions.
- The track's interactive ordering or selection state remains visible without relying on color alone.

## Do's and Don'ts

### Do:

- Do use the dark palette across the working canvas when the dark theme is active.
- Do use violet to mark the current step, selected songs, focus, and the primary playlist action.
- Do keep source and track metadata beside the song it describes.
- Do use a distinct composition to make playlist order easy to see and change.

### Don't:

- Don't mix a bright white main canvas with the dark navigation in the dark theme.
- Don't use gradients as the main structure for content regions.
- Don't hide song titles or actions inside decoration, artwork, or abstract signal shapes.
- Don't imply that a YouTube Music item can play inside Wavelength when it is only being added to a remote playlist.

---
name: Normalite EDGE
description: LET review and exam preparation platform for Cebu Normal University
colors:
  primary: "#7A1E1E"
  primary-foreground: "#FFFFFF"
  secondary: "#F2B744"
  secondary-foreground: "#000000"
  background: "#FFFFFF"
  background-light: "#f8f5f5"
  background-dark: "#230f0f"
  foreground: "#000000"
  muted: "#F5F5F5"
  muted-foreground: "#737373"
  destructive: "#DC2626"
  border: "#E5E5E5"
  input: "#E5E5E5"
  ring: "#7A1E1E"
  card: "#FFFFFF"
  card-foreground: "#000000"
  sidebar: "#0d0f14"
  sidebar-foreground: "#FFFFFF"
  warm-white: "#F7F4EE"
  warm-border: "#e6ddd3"
  warm-text: "#1A0E0E"
  warm-muted: "#4a3a3a"
  warm-subtle: "#3a2727"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontWeight: 600
    lineHeight: 1.1
  body:
    fontFamily: "Lexend, Noto Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Lexend, Noto Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0.02em"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.18em"
    textTransform: "uppercase"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "12px 28px"
  button-primary-hover:
    backgroundColor: "#5a1010"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "12px 28px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    padding: "12px 28px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "12px 28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "12px 28px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Design System: Normalite EDGE

## Overview

**Creative North Star: "The Review Center"**

The visual system evokes the focused energy of a university review center — structured, purposeful, and quietly confident. Every surface communicates that this is a place of serious preparation, not casual browsing. The aesthetic sits between editorial warmth and institutional authority: muted tones that don't fatigue the eye during long study sessions, with the CNU maroon and gold providing identity anchors without shouting.

The design avoids the sterility of generic SaaS dashboards and the chaos of consumer apps. Instead, it channels the organized intensity of a well-run review center — clear hierarchy, consistent spacing, and just enough warmth to feel human. The OMR answer-sheet motif (bubble markers, shaded grids) is the signature visual device, connecting the digital experience to the physical exam ritual students know.

**Key Characteristics:**
- Muted academic palette — deep maroon and warm gold on parchment-like surfaces
- Structured typography — serif headlines for authority, sans-serif body for readability
- Flat & tonal depth — background shifts convey hierarchy, not shadows
- Answer-sheet motif — OMR bubbles and dot grids as recurring visual texture
- Dark sidebar as anchor — the constant navigation frame across all roles

## Colors

The palette is warm, muted, and institutional — built for extended study sessions without visual fatigue.

### Primary
- **University Maroon** (#7A1E1E): The identity anchor. Used for primary buttons, active navigation indicators, links, and the sidebar's accent elements. Appears on ~15% of any given screen — its restraint is the point.
- **Warm White** (#F7F4EE): The marketing surface background. A parchment-like warmth that distinguishes the public-facing pages from the app's neutral interior.

### Secondary
- **Exam Gold** (#F2B744): The highlight accent. Used for secondary buttons, the answer-sheet bubble markers, the `marked-answer` highlighter stroke, notification badges, and the sidebar's brand logo text. Reserved for moments that need emphasis without competing with the primary maroon.

### Neutral
- **Clean White** (#FFFFFF): App interior backgrounds, card surfaces, modal backgrounds.
- **Off-White** (#f8f5f5): Subtle background tint for content areas, dashboard cards, and alternate sections.
- **Deep Dark** (#230f0f): The dark-mode background, a near-black with a warm maroon undertone.
- **Sidebar Black** (#0d0f14): The navigation frame — a cooler dark that separates navigation from content.
- **Border Gray** (#E5E5E5 / oklch 0.922): Light borders, dividers, input outlines.
- **Muted Text** (#737373 / oklch 0.556): Secondary labels, descriptions, timestamps.
- **Foreground** (#000000 / oklch 0.145): Primary text in light mode.

### Destructive
- **Alert Red** (oklch 0.577 0.245 27.325 / #DC2626): Delete confirmations, error states, critical warnings. Used sparingly — never decorative.

### Named Rules

**The Fifteen Percent Rule.** The primary maroon appears on ≤15% of any given screen. Its rarity is what gives it weight. Buttons, active nav indicators, and key accents — never backgrounds, never walls of color.

**The Warmth Rule.** The marketing site uses warm whites (#F7F4EE) and warm borders (#e6ddd3), not cool grays. The app interior uses neutral whites. This distinction separates the public brand from the working tool.

## Typography

**Display Font:** Fraunces (with Georgia fallback)
**Body Font:** Lexend (with Noto Sans fallback)
**Label Font:** Lexend (same family, smaller scale)
**Mono/Eyebrow Font:** IBM Plex Mono

**Character:** Fraunces brings academic gravitas to headlines — its soft serifs feel collegiate without being archaic. Lexend is the workhorse: geometric, highly legible at small sizes, and optimized for screen reading. The pairing says "serious institution that understands modern tools."

### Hierarchy
- **Display** (Fraunces, 600 weight, clamp 2.25rem–3.75rem, line-height 1.1): Hero headlines on marketing pages and section headers. The serif voice of the brand.
- **Headline** (Fraunces, 600 weight, 1.75rem–2.25rem, line-height 1.15): Page titles within the app. Same serif authority at a smaller scale.
- **Title** (Lexend, 600 weight, 1.125rem, line-height 1.3): Card titles, section headers, modal titles. Sans-serif for functional hierarchy.
- **Body** (Lexend, 400 weight, 15px, line-height 1.6): All running text, descriptions, and content. Max comfortable reading width around 65ch.
- **Label** (Lexend, 500 weight, 12px, letter-spacing 0.02em): Form labels, navigation items, button text, badges.
- **Eyebrow/Mono** (IBM Plex Mono, 500 weight, 11px, letter-spacing 0.18em, uppercase): Section eyebrows, metadata labels, the "LET Review · Cebu Normal University" identifier. Used sparingly as a structural accent.

### Named Rules

**The Eyebrow Rule.** Mono uppercase text appears as a prefixed label (with a gold bubble marker) above section titles — never as body text, never as a button label. It's a structural accent, not a voice.

## Layout

The layout follows a two-frame model: the dark sidebar navigation on the left, and the content area filling the rest. On mobile, the sidebar slides in as an overlay.

- **Marketing site:** Centered container at max-width 1200px, with generous vertical padding (py-16 to py-28). Sections are separated by subtle warm borders (`border-[#e6ddd3]`).
- **App interior:** Sticky sidebar (w-54.5 / ~218px on desktop) + scrollable content area. Content uses responsive grid layouts (1-col mobile → 2-col tablet → 3-4 col desktop).
- **Dashboard grid:** 4-column stat cards on desktop, collapsing to 2-col then 1-col. Main content area takes 2/3 width on large screens.
- **Spacing rhythm:** Base unit is 4px. Most spacing is multiples of 4 (gap-2 = 8px, gap-3 = 12px, gap-6 = 24px, gap-8 = 32px). Page content padding is consistently px-6 on mobile, px-8 on desktop.
- **Breakpoints:** Standard Tailwind — sm (640px), md (768px), lg (1024px), xl (1280px).

## Elevation & Depth

Flat & tonal. The system does not use shadows to convey depth hierarchy. Instead, depth is communicated through background color shifts (white cards on off-white backgrounds), border presence, and tonal contrast. The one exception is the marketing product frame, which uses a `shadow-2xl shadow-primary/10` for visual interest — this is decorative, not structural.

### Shadow Usage (Limited)
- **Marketing product frame** (`shadow-2xl shadow-primary/10`): Decorative, gives the screenshot a lifted feel. Not replicated in the app interior.
- **Mobile sidebar** (`shadow-2xl`): Functional — separates the sliding overlay from the dimmed background.
- **Cards in app interior:** No shadows. Differentiated by `border` + `bg-card` on `bg-background` tonal shift.

### Named Rules

**The Flat Interior Rule.** The app interior is shadow-free. Cards, modals, and surfaces are differentiated by background color and borders, not elevation. This keeps the interface calm and focused during extended use.

## Shapes

The form language is consistent and restrained — gently rounded corners with no sharp edges, but no exaggerated radius either.

- **Cards:** `rounded-xl` (12px) — soft enough to feel approachable, tight enough to feel structured.
- **Buttons:** `rounded-md` (8px) — the standard interactive radius throughout the app.
- **Inputs:** `rounded-md` (8px) — matches buttons for visual consistency in forms.
- **Modals/Sheets:** `rounded-xl` (12px) — same as cards, maintaining the surface vocabulary.
- **Avatars:** `rounded-full` — circles for profile images and initials.
- **Badges/Tags:** `rounded-full` — pills for status labels and notification counts.
- **Marketing product frame:** `rounded-2xl` (16px) — slightly more generous for the decorative screenshot frame.

### Named Rules

**The Radius Hierarchy.** Interactive elements (buttons, inputs) use 8px. Content surfaces (cards, modals) use 12px. Decorative frames use 16px. This three-tier system keeps the visual language predictable without being monotonous.

## Components

### Buttons
- **Shape:** rounded-md (8px radius)
- **Primary:** University Maroon background, white text, shadow-sm. Padding 12px 28px. Hover: darken to #5a1010, translate-y -0.5px for tactile lift.
- **Secondary:** Exam Gold background, black text. Same sizing as primary. Used for CTA emphasis on marketing pages.
- **Outline:** Transparent background, maroon text, border-primary/25. Hover: border darkens. Used for secondary actions and the "Log in" button on marketing.
- **Ghost:** Transparent background, foreground text. Hover: accent background. Used in tables, dropdowns, and low-emphasis actions.
- **Destructive:** Alert red background, white text. Used for delete confirmation buttons only.

### Cards
- **Shape:** rounded-xl (12px radius)
- **Background:** White (bg-card) on off-white (bg-background) surfaces.
- **Border:** 1px solid border color (oklch 0.922).
- **Internal Padding:** p-6 (24px) standard. CardHeader uses p-6 with space-y-1.5 for title/description grouping.
- **Shadow:** None. Depth is tonal, not elevated.

### Inputs
- **Shape:** rounded-md (8px radius)
- **Border:** 1px solid input color, transparent background.
- **Focus:** Ring-1 ring-primary (maroon outline). No glow, no border-color change — the ring is the focus indicator.
- **Height:** h-9 (36px) default. md:text-sm (14px) on desktop, text-base (16px) on mobile for iOS zoom prevention.
- **Placeholder:** muted-foreground color, standard opacity.

### Navigation (Sidebar)
- **Background:** #0d0f14 (sidebar black) — cooler than the content area's warm tones.
- **Width:** w-54.5 (218px) on desktop. w-72 max-w-86vw on mobile overlay.
- **Nav items:** h-8 (32px), rounded-md, 12.5px font. Active state: bg-white/10 with a left-edge maroon indicator bar (w-0.5 h-4 rounded-full bg-primary).
- **Group labels:** 10px mono uppercase, white/25 opacity — structural, not competing with nav items.
- **User section:** Border-top separator, profile avatar (9x9 rounded-full or initials in maroon circle), name in white/95, metadata in white/55 and white/40.

### Chips/Tags (Study Hub Categories)
- Category-colored badges with background, text, and border per category (amber for Professional Ed, blue for General Ed, violet for Specialization).
- Used for filtering and deck categorization. Consistent pill shape with category-specific accent colors.

### Marketing Primitives
- **Eyebrow:** Mono uppercase text with a gold bubble marker (size-2 circle, bg-secondary, ring-primary/40).
- **Page Hero:** Answer-grid background (dot pattern), serif headline, warm muted text.
- **BubbleList:** OMR-style list markers — a bordered circle with a gold filled inner circle.

## Do's and Don'ts

### Do:
- **Do** use the answer-sheet dot grid (`answer-grid`) as ambient texture on marketing section headers — it connects the digital to the physical exam ritual.
- **Do** keep the primary maroon at ≤15% of any screen — its restraint is what gives it identity weight.
- **Do** use Fraunces serif for headlines that need institutional authority — page titles, hero text, section headers.
- **Do** use Lexend for everything functional — body text, labels, navigation, buttons, form fields.
- **Do** maintain the warm-white (#F7F4EE) / warm-border (#e6ddd3) palette on the marketing site — it distinguishes the brand from the working tool.
- **Do** use the mono eyebrow pattern (gold bubble + uppercase label) above section titles on marketing pages — it's the signature structural accent.
- **Do** keep the sidebar dark (#0d0f14) across all themes — it's the constant navigation anchor.

### Don't:
- **Don't** add shadows to app-interior cards or surfaces — depth is tonal, not elevated.
- **Don't** use the primary maroon for backgrounds, large surfaces, or decorative fills — it's an accent, not a base color.
- **Don't** mix warm whites (#F7F4EE) with cool grays in the same context — pick one temperature per surface.
- **Don't** use serif fonts for functional UI elements (buttons, labels, nav items) — serif is for headlines and brand moments only.
- **Don't** exceed rounded-xl (12px) for interactive elements — the radius hierarchy keeps the language predictable.
- **Don't** use the answer-sheet dot grid inside the app interior — it's a marketing motif, not an app texture.

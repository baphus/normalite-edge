# Landing Redesign & Public Pages — Design + Standards-Readiness Record

**Version:** v1.0.0
**Date:** 2026-07-07
**Author:** Engineering (Claude Code, reviewed by an independent review agent)
**Status:** Implemented — legal pages ship as *drafts pending legal review*.

---

## 1. Summary

Redesigned the public landing page away from a templated, "AI-generated" look and added
five public pages. Extracted a shared marketing shell so header/footer live in one place.

**Changed / added files**
- `client/src/components/marketing/MarketingLayout.tsx` — shared header + footer (new)
- `client/src/components/marketing/Primitives.tsx` — `Eyebrow`, `BubbleMark`, `BubbleList`, `PageHero` (new)
- `client/src/components/marketing/LegalDocument.tsx` — legal doc shell w/ draft banner + TOC (new)
- `client/src/pages/LandingPage.tsx` — rewritten (editorial redesign)
- `client/src/pages/AboutPage.tsx`, `FaqPage.tsx`, `ContactPage.tsx` — new
- `client/src/pages/PrivacyPolicyPage.tsx`, `TermsPage.tsx` — new
- `client/src/App.tsx` — 5 new public routes (`/about`, `/faq`, `/contact`, `/privacy`, `/terms`)
- `client/index.html` — added Fraunces + IBM Plex Mono web fonts
- `client/src/index.css` — font tokens, `.answer-grid`, `.marked-answer`, global reduced-motion

## 2. Design system (why it doesn't read as AI-generated)

- **Palette:** Paper `#F7F4EE`, Ink `#1A0E0E`, CNU Maroon `#7A1E1E`, Gold `#F2B744` (brand-locked).
- **Type roles:** Fraunces (serif display) / Lexend (body, chosen for reading proficiency) /
  IBM Plex Mono (labels, step numbers — evokes the machine-scored answer sheet).
- **Signature:** the OMR answer-sheet shaded bubble — used as the eyebrow marker, list bullets,
  the hero "marked answer" highlight, the `AnswerRow` mock card, and a faint bubble-grid texture
  that replaces the old stock-photo gradient hero.

## 3. Content honesty changes (requested)

- Success-story testimonials now carry a **"Sample content — illustrative placeholders, not real
  reviewees"** banner and a per-card `· sample` tag. Google stock avatars replaced with initials.
- Dates updated: footer `© 2026`; removed the stale "LET 2023" reference; legal docs dated 2026-07-07.

## 4. Standards-readiness check — legal pages

Per policy, compliance is built in from the first draft rather than retrofitted. The Privacy Policy
is drafted to align with the **Philippine Data Privacy Act of 2012 (RA 10173)** and references
ISO/IEC 27001 control objectives.

**Built in already**
- Lawful basis for processing (consent / contract / legitimate interest)
- Data subject rights (informed, access, correct, erasure/blocking, object, portability, complaint to NPC)
- Retention statement, security-measures statement, cookies/analytics disclosure
- **Breach notification** commitment (NPC + affected subjects, 72-hour timeline)
- Named **Data Protection Officer** section (placeholder)
- Visible "Draft — pending legal review / not legal advice" banner on both documents

**Requires human/legal input before the draft banner is removed** (marked `[LIKE THIS]` in the pages):
- Operating legal entity name
- DPO name + privacy contact email
- Retention periods, analytics providers, minimum-age position
- Terms: liability cap/carve-outs, dispute venue

## 5. Auto-generation vs. approval (per policy)

| Document | Standard referenced | Auto-generated w/o approval? |
|---|---|---|
| About / FAQ / Contact | — (product content) | Yes — content finalized, editable |
| Privacy Policy | PH DPA 2012, ISO 27001 | **No** — requires legal sign-off before banner removal |
| Terms & Conditions | PH civil/consumer law | **No** — requires legal sign-off before banner removal |

## 6. QA

- `tsc -b` → clean (exit 0). `vite build` → success (pre-existing exceljs/pdfkit chunk-size warning only).
- Independent review agent (no memory of implementation): verdict **fix-then-ship**; all four
  requirements PASS. Applied fixes: footer contrast (`gray-500`→`gray-400`), dark-mode overrides on
  darker-gold labels, and a real global `prefers-reduced-motion` rule.
- **Known limitation:** the app has no runtime `.dark` theme toggle, so authored `dark:` styles are
  currently inert (site renders light). Dark mode is future-proofed but deferred — wiring a theme
  toggle is out of scope for this change.

## 7. Recommended future pages (not built this round)

- **Pricing** (a `pricing-proposal` exists in git history)
- **Program Tracks overview** (public, per-major)
- **Getting Started / review guide**
- **Accessibility statement**

## Changelog

- **v1.0.0 (2026-07-07):** Initial landing redesign; added About, FAQ, Contact, Privacy, Terms;
  shared MarketingLayout; testimonial placeholder warnings; date updates; standards-readiness record.

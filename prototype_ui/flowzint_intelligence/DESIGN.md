---
name: FlowZint Intelligence
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464555'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#5c00ca'
  on-tertiary: '#ffffff'
  tertiary-container: '#7531e6'
  on-tertiary-container: '#e4d4ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d2bbff'
  on-tertiary-fixed: '#25005a'
  on-tertiary-fixed-variant: '#5a00c6'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '800'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  container-max: 1280px
---

## Brand & Style

The design system for FlowZint is anchored in the concept of **Intelligent Automation**. It targets high-performance sales teams who require immediate clarity from complex data. The aesthetic is **Modern Corporate**, leaning into a "Data-Centric Minimalism" that feels mathematically rigorous yet accessible.

The emotional response should be one of **calm authority** and **analytical precision**. We achieve this through a high-trust palette of deep indigos and crisp whites, combined with a "visual island" strategy where data widgets are isolated in clean, elevated containers. The style avoids unnecessary decoration, focusing instead on structural hierarchy, functional depth, and subtle AI-driven accents (like violet-to-purple gradients) to signal where machine intelligence is enhancing the user's workflow.

## Colors

The palette is designed for high legibility and semantic clarity.

- **Primary Foundation:** The app uses a "Crisp Canvas" approach. Surfaces are primarily white (`#ffffff`), set against an ambient background of light slate (`#f8fafc`).
- **Interactive Core:** Deep Indigo (`#4f46e5`) serves as the primary action color. It is paired with a darker Navy (`#0f172a`) for primary text to ensure a professional, authoritative tone.
- **AI Accents:** A tertiary Violet (`#7c3aed`) is used sparingly for AI-enhanced features or automation highlights, often appearing as a subtle gradient transition to deep royal purple.
- **Semantic Logic:** Performance metrics use a strictly mapped status system. Success (Green), Warning (Amber), and Danger (Red) are used for "Hot/Warm/Cold" lead classifications and performance trends. These should always be paired with high-contrast text for accessibility.

## Typography

This design system relies exclusively on **Inter** to maintain a systematic, utilitarian feel that excels in data-heavy environments.

- **Scale:** The type scale is intentionally tight. Large display headers are reserved for page titles, while most of the interface lives in the `14px` (body) and `12px` (labels) range to maximize information density.
- **Weights:** Use `800` (Extra Bold) for page-level headers to create a strong anchor. Use `600` (Semibold) for sub-headers and button labels to provide clear affordance.
- **Labels:** Meta-information and table headers must use the `label-caps` style with `0.05em` letter spacing to differentiate them from interactive data.
- **Numerical Data:** For tables and metrics, ensure the use of tabular num alignment (tnum) where possible to prevent visual shifting in live-updating dashboards.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid** model. The sidebar remains fixed in width (`240px`), while the main content area expands up to a maximum width of `1280px` to maintain readability on ultrawide monitors.

- **Grid:** Use a 12-column grid for dashboard layouts. Standard cards should typically span 3, 4, or 6 columns.
- **Rhythm:** All spacing is based on a `4px` baseline. Gutters between cards are set to `20px` (`lg`) to provide enough "breathing room" to separate distinct data clusters.
- **Margins:** Page-level padding is `24px` on desktop and scales down to `16px` on mobile. 
- **Reflow:** On tablet (`<1024px`), 4-column grids should reflow to 2-column. On mobile (`<768px`), all grids collapse to a single column, and the sidebar transforms into a bottom-sheet or overlay menu.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Ambient Shadows** rather than heavy color blocks.

- **The Canvas:** The lowest layer is the background (`#f8fafc`).
- **The Surface:** Cards and panels are pure white (`#ffffff`). They are separated from the background by a `1px` hairline border (`#e2e8f0`).
- **Depth Levels:**
    - **Level 0 (Flat):** Used for background inputs and inactive areas.
    - **Level 1 (Subtle):** Standard card elevation. Use a very soft, diffused shadow: `0 1px 3px rgba(0,0,0,0.05)`.
    - **Level 2 (Hover):** When a user interacts with a card, the border color shifts to `#cbd5e1` and the shadow deepens slightly to create a "lift" effect.
    - **Level 3 (Overlay):** Modals and dropdowns use a more pronounced shadow with a wider blur to suggest significant distance from the page surface.

## Shapes

The shape language is **Rounded**, reflecting a modern and approachable software aesthetic that balances the "coldness" of data.

- **Standard Elements:** Buttons, input fields, and small badges use `0.5rem` (8px) corners.
- **Containers:** Large dashboard cards and modals use `rounded-lg` (1rem / 16px) to create soft, distinct visual islands.
- **Interactive Indicators:** Status badges and "pill" tags (e.g., for "Hot Leads") use a fully rounded/pill shape to distinguish them from structural elements.

## Components

- **Buttons:** Primary buttons are solid `#4f46e5` with white text. Secondary buttons use a white background with a `#e2e8f0` border. All buttons have a subtle `translateY(-1px)` lift on hover.
- **Cards:** Dashboard cards must include a header section with a `label-caps` title and an optional right-aligned icon. Inner padding is consistently `20px`.
- **Status Chips:** High-contrast pastel pills. 
    - *Hot*: Background `#fee2e2`, Text `#dc2626`.
    - *Warm*: Background `#fef3c7`, Text `#d97706`.
    - *Cold*: Background `#dbeafe`, Text `#2563eb`.
- **Input Fields:** Use a `10px 14px` inner padding. On focus, the border shifts to the primary indigo with a `3px` soft glow ring (`rgba(79, 70, 229, 0.1)`).
- **Metric Rings:** Circular SVG progress indicators for "Lead Scores." Use a stroke weight of `4px` and color-code based on the threshold (Green > 70%).
- **AI Chat/Transcript:** AI-generated content is styled in light violet containers (`rgba(99,102,241,0.08)`) with a `Geist Mono` or similar monospaced font for timestamps to emphasize the technical/automated nature of the data.
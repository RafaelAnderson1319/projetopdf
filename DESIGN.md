---
name: WonderLearn Enchanted Academy
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#efeee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2de'
  on-surface: '#1b1c19'
  on-surface-variant: '#3d4946'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#6d7a76'
  outline-variant: '#bcc9c5'
  surface-tint: '#006b5c'
  primary: '#00685a'
  on-primary: '#ffffff'
  primary-container: '#008472'
  on-primary-container: '#f4fffa'
  inverse-primary: '#69d9c3'
  secondary: '#775a00'
  on-secondary: '#ffffff'
  secondary-container: '#fdc73a'
  on-secondary-container: '#6f5400'
  tertiary: '#335f8b'
  on-tertiary: '#ffffff'
  tertiary-container: '#4d77a5'
  on-tertiary-container: '#fdfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#86f6df'
  primary-fixed-dim: '#69d9c3'
  on-primary-fixed: '#00201b'
  on-primary-fixed-variant: '#005045'
  secondary-fixed: '#ffdf9a'
  secondary-fixed-dim: '#f4bf32'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#5a4300'
  tertiary-fixed: '#d1e4ff'
  tertiary-fixed-dim: '#a0cafc'
  on-tertiary-fixed: '#001d35'
  on-tertiary-fixed-variant: '#184974'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2de'
typography:
  headline-xl:
    fontFamily: Quicksand
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  headline-xl-mobile:
    fontFamily: Quicksand
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Quicksand
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-lg-mobile:
    fontFamily: Quicksand
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Quicksand
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-sm:
    fontFamily: Quicksand
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 30px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-sm:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Quicksand
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  label-md:
    fontFamily: Quicksand
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 20px
  label-sm:
    fontFamily: Quicksand
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2.5rem
  margin-mobile: 1.25rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system crafts a whimsical, storybook wonderland designed specifically for young adventurers (ages 4–12), educators, and parents. The visual identity channels the charm of illustrated children's literature, blending watercolor lightness with playful digital tangibility. It evokes wonder, discovery, safety, and joy without tipping into juvenile chaos. 

The aesthetic marries **Tactile / Illustrated Playfulness** with **Soft Neomorphic Minimalism**:
- Silky organic contours mimic rolling hills, drifting clouds, and hand-cut paper cards.
- Surfaces feel floaty, warm, and sunlit, featuring subtle watercolor grain, decorative sparkle bursts, and celestial star clusters.
- Interactive affordances are chunky, pill-shaped, and delightfully springy, welcoming small hands and building tactile intuition across tablets and touch displays.

## Colors

The palette mirrors an open morning sky arching over a magical meadow, prioritizing soft optimism and high legibility.

- **Primary (`#1E9E8A` - Storybook Teal):** Anchors trust, navigation headers, solid action buttons, active states, and grounding footer surfaces.
- **Secondary (`#FFC93C` - Starlight Gold):** Energizes celebration triggers, stars, primary call-to-action badges, quest streaks, and treasure counters.
- **Tertiary (`#1F4E79` - Deep Starlit Navy):** Used exclusively for high-contrast, crystal-clear typographic hierarchies, guaranteeing effortless reading comprehension for developing readers.
- **Canvas & Background System:** Fluid gradients shift gently from sky blue (`#CFEFFA`) to minty aqua (`#E8F8F5`), warmed by parchment highlights (`#FFFDF8` and `#FBF8F1`).
- **Topic Wonder Accents:**
  - Soft Lavender (`#EDE7F6` / text `#5E35B1`): Quests, fantasy, language arts.
  - Peach Dawn (`#FFE8D6` / text `#D84315`): Creativity, music, discovery.
  - Fresh Mint (`#D1F2EB` / text `#00695C`): Nature, biology, science.
  - Sweet Berry (`#FCE4EC` / text `#C2185B`): Math puzzles, logic challenges.
  - Solar Cream (`#FFF9E6` / text `#F57F17`): Daily bonuses, rewards, alerts.

## Typography

Typography prioritizes open terminals, high x-height, and generous letter spacing to maximize readability for early readers without losing storybook warmth.

- **Quicksand** brings rounded, open structural geometry to headlines, game badges, and action prompts. Headlines leverage warm Navy (`#1F4E79`) with select keyword phrases colored in Teal (`#1E9E8A`) for rhythm.
- **Nunito Sans** carries continuous instructions, story narratives, and UI copy. The rounded letterforms maintain optical calm at dense sizes.
- Tracking is slightly relaxed (`+0.015em` on body text) to assist scanning across varying reading abilities.

## Layout & Spacing

The layout embraces open, airy breathing room inspired by panoramic double-page picture book spreads.

- **Grid Architecture:** 12-column fluid grid system on desktop (max width `1280px`), transitioning to an 8-column layout on tablets, and a 4-column layout on handheld mobile devices.
- **Safe Margins:** Deep outer margins prevent touch errors around hardware perimeters on family tablets and mobile devices.
- **Organic Flow:** Sections separate via undulating SVG wave dividers and asymmetrical cloud puffs rather than harsh rectilinear rules. Content pods nestle into friendly clusters with ample white space between tasks.

## Elevation & Depth

Depth in this system avoids heavy, cold drop shadows. Instead, it relies on soft, radiant under-glows, tinted ambient atmospheric blurs, and offset pastel cushions:

- **Surface Level 0 (Sky Backdrop):** Subtle gradient spanning `#CFEFFA` to `#E8F8F5` overlaid with a 3% opacity watercolor noise map.
- **Surface Level 1 (Resting Cards & Clouds):** Pure White (`#FFFFFF`) with a soft tinted pillow shadow: `0px 10px 24px -4px rgba(30, 158, 138, 0.08), 0px 4px 8px -2px rgba(31, 78, 121, 0.04)`.
- **Surface Level 2 (Floating Badges & Drawers):** `0px 16px 36px -6px rgba(31, 78, 121, 0.12), 0px 6px 12px -2px rgba(30, 158, 138, 0.06)`.
- **Level 3 (Tactile Pushables):** Buttons utilize physical 3D "cushions"—a solid bottom border or inset drop (`4px` down-shift of `#0E7465` for Teal and `#DBA314` for Yellow) that physically depresses flat on active tap.

## Shapes

The design system enforces playful, bulbous roundedness. Every corner evokes smoothed river stones, pillows, and cartoon clouds.

- **Standard Containers & Cards:** Grounded with a hyper-soft radius of `1.25rem` (20px), providing a friendly silhouette.
- **Interactive Triggers & Pills:** Pure capsule/pill shapes (`rounded-full` / `9999px`) ensure elements are inviting and comfortable to tap.
- **Masks & Hero Cutouts:** Irregular multi-lobe SVG cloud cutouts (`border-radius: 60% 40% 70% 30% / 40% 50% 60% 50%`) are used dynamically behind profile avatars and featured achievement illustrations.

## Components

### Buttons & CTAs
- **Primary Action (Sunny Gold):** Background `#FFC93C`, text `#1F4E79`, pill-shaped (`9999px`), with an embossed lower rim (`border-b-4 border-[#DBA314]`). On press, translate down `2px` and shrink border for a physical squash effect.
- **Secondary Action (Storybook Teal):** Background `#1E9E8A`, text `#FFFFFF`, bottom lip `#126E60`. Includes a floating companion icon (sparkle or wand).
- **Audio / Read-Aloud Button:** Circular floating trigger with bright white base, starlight yellow pulsing rim, and clear speaker/soundwave icon.

### Cards & Learning Pods
- **Topic Cards:** Multi-colored pastel bases (`Lavender`, `Peach`, `Mint`, `Pink`, `Cream`) framed in white 3px borders with 20px rounded corners. Each card features an illustrative badge peeking over the top-right corner.
- **Cloud Containers:** Large information blocks framed with top-wavy or multi-scallop cloud paths.

### Form Inputs & Selectors
- **Input Fields:** Oversized height (`56px`), pure white surface, thick rounded boundaries (`20px`), with a resting border of `#D4EFF2`. On focus: border shifts to Teal `#1E9E8A` with an ambient cyan halo ring.
- **Checkboxes & Radios:** Scaled up (minimum 28px hit box). Radios transform into smiling star tokens when checked; checkboxes display chunky mint green checkmarks.

### Gamification & Micro-Decorations
- **Sparkle & Star Particles:** Four-point geometric sparkles (`✦`) in soft gold and cyan placed sparingly near headings, completed quest markers, and progress bars.
- **Progress Trails:** Wavy, meandering dotted path lines with moving animal or hot-air balloon tracker tokens replacing sterile, straight progress indicators.
# WonderLearn Landing Page (React + Tailwind CSS)

A faithful recreation of the **WonderLearn** landing page — a magical, kid-friendly educational platform designed with playful storytelling, vibrant watercolor illustrations, rounded pill buttons, and seamless cloud/wave section transitions.

---

## 🌟 Instant Viewing (Zero Setup Required)

Simply double-click or open **`index.html`** in any modern web browser (Chrome, Edge, Safari, Firefox). 
It runs directly without needing any build step or local dependencies, using React 18, Babel Standalone, and Tailwind CSS.

Alternatively, you can serve it with Python or any local web server:
```bash
# Using Python
python -m http.server 3000

# Or using npx serve
npx serve .
```
Then visit `http://localhost:3000`.

---

## 🎨 Visual Identity & Styling

- **Typography**:
  - Headings: `Fredoka` (Google Font, rounded, friendly, bold)
  - Body & UI: `Nunito` (Google Font, smooth, highly legible)
- **Color Palette**:
  - Deep Blue: `#1565C0` (Headings, primary accents)
  - Teal-Green: `#1FA38A` (Headings, footer background, badges)
  - Sunny Yellow: `#FFC93C` (Primary CTA buttons, star ratings, sparkles)
  - Soft Sky-Blue & Mint Pastels: `#EBF5FF`, `#E8F8F5`, `#F8FCFD`
- **Card Aesthetics**:
  - Soft elevated drop shadows (`shadow-card`, `shadow-soft`)
  - Large rounded corners (`rounded-3xl` / `rounded-4xl` / `rounded-[32px]`)
  - Seamless SVG cloud scallops and flowing wave dividers separating each section

---

## 📑 The 10 Sections Recreated

1. **NAVBAR**:
   - Crisp white background with a bottom scalloped cloud edge.
   - Logo **WonderLearn** with tagline *"Imagine • Discover • Grow"* and open book icon.
   - Navigation links: *Home*, *Explore*, *Stories*, *Games*, *About Us*.
   - Round search icon button (triggers interactive search modal with popular searches).
   - Yellow **Log In** pill button (`#FFC93C`).
   - Teal-green **Join Now** pill button (`#1FA38A`) with star icon.
   - Fully responsive hamburger drawer for mobile devices.

2. **HERO**:
   - Full-width magical watercolor illustration featuring floating islands with fantasy castles, gentle cascading waterfalls, giant wooden bookshelf towers, Professor Hoot (owl with glasses), Drake the reading teal dragon, a fluttering blue bird, hot air balloon, and three children looking up in awe.
   - Centered title: **"Let Curiosity"** (deep blue `#1565C0`) / **"Lead the Way"** (teal-green `#1FA38A`).
   - Subtitle: *"A magical world where learning feels like an adventure!"*.
   - Sunny yellow CTA button: **"Start Exploring 🚀"**.

3. **FEATURE BAR**:
   - White rounded pill card with soft elevation shadow, overlapping the bottom of the Hero section.
   - 4 key trust pillars separated by thin vertical dividers:
     - 🛡️ **Safe & Ad-Free** (KidSAFE Certified)
     - ⭐ **Expert Curated** (Built by Educators)
     - 🎮 **Learn Through Play** (Games & Puzzles)
     - ❤️ **For Ages 4–12** (Personalized Paths)

4. **EXPLORE BY TOPIC**:
   - Centered title with sparkles: **✨ Explore by Topic ✨**.
   - Left side: Cartoon bunny with glasses and bow tie happily reading a book on grassy hills (**Barnaby the Bunny**).
   - Center: 6 pastel square cards with custom vector icons:
     - 🔢 **Math Magic** (Pastel yellow)
     - 🧪 **Science Lab** (Pastel mint)
     - 📚 **Reading Land** (Pastel sky blue)
     - 🎨 **Art Studio** (Pastel lavender)
     - 🌍 **Geography** (Pastel teal)
     - 🌱 **Life Skills** (Pastel peach)
   - Right side: Wooden carved signpost (*Discover / Learn / Have Fun*) with a blue bird on top (**Pip the Bluebird**).

5. **MAGICAL STORIES**:
   - Title + outlined **"View All Stories"** pill button on the right.
   - Interactive carousel with round blue `<` and `>` arrow navigation buttons and touch-friendly scrolling.
   - 4 storybook cards with cover artwork, read times, age badges, and colored category pills:
     - 🎈 **The Starry Balloon** (*Friendship*)
     - 🌿 **Luna and the Little Glow** (*Fantasy*)
     - ⛵ **The Brave Little Sailor** (*Adventure*)
     - 🌸 **The Secret Garden** (*Kindness*)

6. **PLAY & LEARN**:
   - Section heading + **"View All Games"** button.
   - 5 rounded educational game thumbnails with semi-transparent play button overlay and hover pulse:
     - ⚔️ **Math Quest: Castle Defense** (*Chibi knight with sword & "5+2=?"*)
     - 🎈 **Letter Pop Safari** (*ABC floating party balloons*)
     - 🧩 **Shape Builder Wonderland** (*Colorful smiling jigsaw puzzle pieces*)
     - ⚗️ **Little Scientist Lab** (*Atomic rings & bubbling Erlenmeyer flask*)
     - 🃏 **Memory Match Magic** (*Flipping cards with star & heart*)

7. **FEATURED ADVENTURES**:
   - Wide rounded banner with gradient border and soft shadow.
   - Left: Whimsical wooden-brass flying airship carrying children over lush floating islands.
   - Right: **"Island of Imagination"** in teal-green, adventure description, key feature checkmarks, and sunny yellow **"Start Adventure →"** button.
   - 3 interactive carousel indicator dots below.

8. **LOVED BY PARENTS**:
   - Title + 3 testimonial cards featuring round parent avatars, 5 bright yellow stars, and heartfelt reviews:
     - **Sarah M.** (Mom of Emma & Noah) — Safety and screen-time transformation.
     - **Daniel R.** (Dad of Leo) — Educational impact and self-motivated math learning.
     - **Priya S.** (Primary Educator & Mom) — Storytelling quality and critical thinking.

9. **APP CTA**:
   - Title **"Learning on the Go!"** + *"Download the WonderLearn App and continue the adventure anywhere, anytime."*
   - Fluffy purple monster holding a learning tablet on the left (**Gloop**).
   - Playful orange fox holding a smartphone on the right (**Rusty**).
   - Official-styled vector badges for **App Store** and **Google Play**.
   - Perks row: Offline Mode, KidSAFE Certified, Family Sharing.

10. **FOOTER**:
    - Teal-green (`#1FA38A`) background with a curved top wave.
    - Logo + tagline: *"Making learning magical for every child."*
    - Three navigation columns: **Quick Links**, **For Parents**, **Support**.
    - **"Stay Connected with Wonder"** parent newsletter signup with input and yellow **"Subscribe"** button.
    - Social media icon circles: *Facebook*, *Instagram*, *YouTube*, *Pinterest*.
    - Copyright notice: *"© 2025 WonderLearn. All rights reserved."*

---

## 📂 Project Structure

```
projetopdf/
├── index.html                      # Standalone, runnable landing page (React 18 + Tailwind)
├── package.json                    # Project configuration
├── tailwind.config.js              # Custom Tailwind configuration
├── README.md                       # Documentation
├── assets/                         # Watercolor illustrations & game vector SVGs
│   ├── hero-bg.jpg                 # Hero floating islands illustration
│   ├── airship-adventure.jpg       # Airship over islands illustration
│   ├── app-mascots.jpg             # Purple monster & orange fox illustration
│   ├── explore-mascots.jpg         # Bunny & signpost illustration
│   ├── bunny-mascot.jpg            # Cropped bunny sprite
│   ├── signpost-bird.jpg           # Cropped signpost sprite
│   ├── monster-tablet.jpg          # Cropped monster sprite
│   ├── fox-phone.jpg               # Cropped fox sprite
│   ├── story-starry-balloon.jpg    # Story 1 cover
│   ├── story-luna-glow.jpg         # Story 2 cover
│   ├── story-brave-sailor.jpg      # Story 3 cover
│   ├── story-secret-garden.jpg     # Story 4 cover
│   ├── game-math-knight.jpg        # Game 1 thumbnail
│   ├── game-abc-balloons.svg       # Game 2 vector thumbnail
│   ├── game-puzzle-pieces.svg      # Game 3 vector thumbnail
│   ├── game-atom-flask.svg         # Game 4 vector thumbnail
│   └── game-memory-cards.svg       # Game 5 vector thumbnail
└── src/                            # Modular React component source code
    ├── App.jsx
    ├── main.jsx
    ├── index.css
    └── components/
        ├── Navbar.jsx
        ├── Hero.jsx
        ├── FeatureBar.jsx
        ├── ExploreTopics.jsx
        ├── MagicalStories.jsx
        ├── PlayLearn.jsx
        ├── FeaturedAdventures.jsx
        ├── LovedByParents.jsx
        ├── AppCTA.jsx
        ├── Footer.jsx
        ├── CloudDividers.jsx
        └── Icons.jsx
```

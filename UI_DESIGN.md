# fuega.ai UI Design Specification

> Definitive design reference for the fuega.ai discussion platform.
> All components, colors, typography, and visual effects defined here.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Layout System](#layout-system)
5. [Tailwind Configuration](#tailwind-configuration)
6. [Component Specifications](#component-specifications)
7. [Visual Effects](#visual-effects)
8. [Navigation](#navigation)
9. [Hero Section](#hero-section)
10. [Page Templates](#page-templates)
11. [Responsive Design](#responsive-design)
12. [Accessibility](#accessibility)
13. [Animation Reference](#animation-reference)

---

## Design Philosophy

fuega.ai uses a **dark terminal aesthetic** with volcanic/fire theming.
The visual language evokes a hacker terminal crossed with molten lava:
sharp corners, monospace type, CRT scanlines, glowing text, and ember particles.

Core principles:
- **Dark-first**: Pure black backgrounds, no light mode
- **Sharp geometry**: Zero border-radius on everything (--radius: 0px)
- **Monospace everything**: JetBrains Mono for all text, no sans-serif
- **Fire palette**: Lava oranges and reds as primary, teal as accent
- **Terminal language**: Prompt prefixes, cursor blinks, command-line metaphors
- **Glow effects**: Text shadows and border glows create depth on black
- **Mobile = Desktop priority**: Mobile-first responsive, equal importance

---

## Color System

### Brand Colors

| Token          | Hex       | RGB              | Usage                          |
|----------------|-----------|------------------|--------------------------------|
| `--lava-hot`   | `#FF4500` | `255, 69, 0`     | Primary brand, CTAs, links     |
| `--lava`       | `#FF5722` | `255, 87, 34`    | Secondary fire accent          |
| `--lava-mid`   | `#FF6B2C` | `255, 107, 44`   | Hover states, gradients        |
| `--ember`      | `#FF3D00` | `255, 61, 0`     | Destructive-adjacent, alerts   |
| `--fire`       | `#FF4500` | `255, 69, 0`     | Legacy alias for lava-hot      |
| `--teal`       | `#00D4AA` | `0, 212, 170`    | Secondary accent, success      |

### Neutral Colors

| Token          | Hex       | RGB              | Usage                          |
|----------------|-----------|------------------|--------------------------------|
| `--void`       | `#000000` | `0, 0, 0`        | Primary background             |
| `--coal`       | `#0A0A0A` | `10, 10, 10`     | Card/surface background        |
| `--charcoal`   | `#1A1A1A` | `26, 26, 26`     | Muted backgrounds, borders     |
| `--smoke`      | `#555555` | `85, 85, 85`     | Tertiary text, dividers        |
| `--ash`        | `#8B8B8B` | `139, 139, 139`  | Secondary text, muted labels   |
| `--foreground` | `#F0F0F0` | `240, 240, 240`  | Primary text                   |

### Semantic Tokens (CSS Custom Properties)

```css
:root {
  /* Backgrounds */
  --background: #000000;
  --card: #0A0A0A;
  --muted: #1A1A1A;

  /* Text */
  --foreground: #F0F0F0;
  --muted-foreground: #8B8B8B;
  --primary-foreground: #000000;

  /* Interactive */
  --primary: #FF4500;
  --secondary: #00D4AA;
  --destructive: #EF4444;
  --ring: #FF4500;

  /* Borders */
  --border: rgba(255, 69, 0, 0.2);

  /* Radius */
  --radius: 0px;
}
```

### Border Colors

| Context                | Value                        |
|------------------------|------------------------------|
| Default border         | `rgba(255, 69, 0, 0.2)`     |
| Hover border           | `rgba(255, 69, 0, 0.4)`     |
| Focus ring             | `#FF4500` solid 2px         |
| Input focus border     | `#FF4500`                    |
| Glass button border    | `rgba(255, 69, 0, 0.2)`     |

### Opacity Scale

| Usage            | Opacity  | Example                         |
|------------------|----------|----------------------------------|
| Badge background | 0.10     | `bg-lava-hot/10`, `bg-teal/10`  |
| Default border   | 0.20     | `border-lava-hot/20`            |
| Text selection   | 0.30     | `rgba(255, 69, 0, 0.3)`        |
| Hover border     | 0.40     | `border-lava-hot/40`            |
| Glass background | 0.50     | `bg-charcoal/50`                |
| Nav scroll bg    | 0.90     | `bg-void/90`                    |

---

## Typography

### Font Family

```css
:root {
  --font-sans: "JetBrains Mono", monospace;
  --font-mono: "JetBrains Mono", monospace;
}
```

Load via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet">
```

Or via `next/font`:
```typescript
import { JetBrains_Mono } from 'next/font/google'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})
```

### Type Scale

All text uses JetBrains Mono. No sans-serif anywhere.

| Element             | Tailwind Classes                           | Notes                    |
|---------------------|--------------------------------------------|--------------------------|
| Hero title          | `text-5xl sm:text-6xl md:text-7xl font-bold` | Per-character animation |
| Section heading     | `text-3xl sm:text-4xl font-bold`           | With glow-text           |
| Card title          | `text-lg sm:text-xl font-semibold`         |                          |
| Body text           | `text-sm sm:text-base`                     | Default                  |
| Small/caption       | `text-xs sm:text-sm`                       | Muted foreground         |
| Badge text          | `text-xs font-medium`                      |                          |
| Button text         | `text-sm font-medium`                      |                          |
| Terminal button     | `text-sm font-medium uppercase tracking-wider` |                     |
| Nav link            | `text-sm`                                  |                          |
| Prompt prefix       | `text-sm font-bold`                        | "$ " in lava-hot         |

### Text Colors

| Context              | Color Class              | Hex       |
|----------------------|--------------------------|-----------|
| Primary text         | `text-foreground`        | `#F0F0F0` |
| Secondary text       | `text-ash`               | `#8B8B8B` |
| Tertiary text        | `text-smoke`             | `#555555` |
| Link / accent        | `text-lava-hot`          | `#FF4500` |
| Teal accent          | `text-teal`              | `#00D4AA` |
| Destructive          | `text-destructive`       | `#EF4444` |
| On primary (btn)     | `text-primary-foreground` | `#000000` |

---

## Layout System

### Page Container

```html
<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-12">
  <!-- page content -->
</div>
```

- Max width: `max-w-7xl` (80rem / 1280px)
- Horizontal padding: `px-3` (12px) -> `sm:px-6` (24px) -> `lg:px-12` (48px)
- Centering: `mx-auto`

### Section Spacing

```html
<section class="py-8 sm:py-12 px-3 sm:px-6 lg:px-12">
  <div class="max-w-7xl mx-auto">
    <!-- section content -->
  </div>
</section>
```

- Vertical: `py-8` (32px) -> `sm:py-12` (48px)
- Horizontal: same as page container

### Grid System

```html
<!-- Standard 3-column grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- cards -->
</div>

<!-- 2-column layout -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <!-- content -->
</div>
```

- Gap: `gap-4` (16px)
- Breakpoints: `md` (768px), `lg` (1024px)
- Mobile: always single column

### Border Radius

**All border-radius is 0px. No rounded corners anywhere.**

```css
--radius: 0px;
```

Every component: `rounded-none` or inherits `--radius: 0px`.

---

## Tailwind Configuration

### tailwind.config.ts

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-mono)", "monospace"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        // Brand fire palette
        "lava-hot": "#FF4500",
        "lava": "#FF5722",
        "lava-mid": "#FF6B2C",
        "ember": "#FF3D00",
        "fire": "#FF4500",

        // Neutral palette
        "ash": "#8B8B8B",
        "smoke": "#555555",
        "charcoal": "#1A1A1A",
        "void": "#000000",
        "coal": "#0A0A0A",

        // Accent
        "teal": "#00D4AA",

        // Semantic (shadcn/ui compatible)
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--foreground)",
        },
        border: "var(--border)",
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
      },
      keyframes: {
        "cursor-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "ember-rise": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-100vh) scale(0)", opacity: "0" },
        },
      },
      animation: {
        "cursor-blink": "cursor-blink 1s step-end infinite",
        "ember-rise": "ember-rise 4s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

### globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --lava-hot: #FF4500;
  --lava: #FF5722;
  --lava-mid: #FF6B2C;
  --ember: #FF3D00;
  --ash: #8B8B8B;
  --smoke: #555555;
  --charcoal: #1A1A1A;
  --void: #000000;
  --coal: #0A0A0A;
  --fire: #FF4500;
  --teal: #00D4AA;

  --background: #000000;
  --foreground: #F0F0F0;
  --card: #0A0A0A;
  --primary: #FF4500;
  --primary-foreground: #000000;
  --secondary: #00D4AA;
  --muted: #1A1A1A;
  --muted-foreground: #8B8B8B;
  --border: rgba(255, 69, 0, 0.2);
  --destructive: #EF4444;
  --ring: #FF4500;
  --radius: 0px;

  --font-sans: "JetBrains Mono", monospace;
  --font-mono: "JetBrains Mono", monospace;
}

/* ===== CRT SCANLINE OVERLAY ===== */
body::after {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.03) 0px,
    rgba(0, 0, 0, 0.03) 1px,
    transparent 1px,
    transparent 2px
  );
  opacity: 0.03;
}

/* ===== GLOW TEXT CLASSES ===== */
@layer utilities {
  .glow-text {
    text-shadow:
      0 0 20px rgba(255, 69, 0, 0.5),
      0 0 40px rgba(255, 69, 0, 0.3);
  }

  .glow-text-subtle {
    text-shadow:
      0 0 10px rgba(255, 69, 0, 0.3);
  }

  .glow-text-intense {
    text-shadow:
      0 0 10px rgba(255, 69, 0, 0.8),
      0 0 30px rgba(255, 69, 0, 0.6),
      0 0 60px rgba(255, 69, 0, 0.4),
      0 0 100px rgba(255, 69, 0, 0.2);
  }
}

/* ===== SCROLLBAR ===== */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: #000000;
}

::-webkit-scrollbar-thumb {
  background: #FF4500;
}

/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: #FF4500 #000000;
}

/* ===== TEXT SELECTION ===== */
::selection {
  background: rgba(255, 69, 0, 0.3);
}

/* ===== FOCUS RING ===== */
*:focus-visible {
  outline: 2px solid #FF4500;
  outline-offset: 2px;
}

/* ===== LAVA RULE (HR) ===== */
.lava-rule {
  border: none;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    #FF4500,
    transparent
  );
}
```

---

## Component Specifications

### Buttons

All buttons use `rounded-none` (0px border-radius).

#### Default Button
```html
<button class="bg-primary text-primary-foreground rounded-none px-4 py-2
  text-sm font-medium hover:bg-primary/90 transition-colors">
  Action
</button>
```

#### Fire Button
```html
<button class="bg-fire text-black rounded-none px-4 py-2 text-sm font-medium
  hover:shadow-[0_0_20px_rgba(255,69,0,0.5)] transition-all">
  Spark It
</button>
```

#### Teal Button
```html
<button class="bg-teal text-black rounded-none px-4 py-2 text-sm font-medium
  hover:shadow-[0_0_20px_rgba(0,212,170,0.5)] transition-all">
  Success
</button>
```

#### Glass Button
```html
<button class="bg-charcoal/50 backdrop-blur text-foreground rounded-none
  px-4 py-2 text-sm font-medium border border-lava-hot/20
  hover:border-lava-hot/40 transition-all">
  Glass
</button>
```

#### Terminal Button
```html
<button class="bg-transparent text-lava-hot rounded-none px-4 py-2
  text-sm font-medium uppercase tracking-wider
  border border-lava-hot hover:bg-lava-hot hover:text-black
  transition-all">
  $ execute
</button>
```

#### Button Size Variants

| Size    | Padding        | Text      |
|---------|----------------|-----------|
| sm      | `px-3 py-1.5`  | `text-xs` |
| default | `px-4 py-2`    | `text-sm` |
| lg      | `px-6 py-3`    | `text-base` |
| icon    | `p-2`          | `text-sm` |

### Cards

#### Standard Card
```html
<div class="bg-coal border border-lava-hot/20 rounded-none p-4
  hover:border-lava-hot/40 transition-colors">
  <h3 class="text-lg font-semibold text-foreground">Title</h3>
  <p class="text-sm text-ash mt-2">Description text here.</p>
</div>
```

#### Terminal Card
```html
<div class="bg-coal rounded-none overflow-hidden"
  style="border: 1px solid rgba(255, 69, 0, 0.2);">
  <!-- Title bar -->
  <div class="flex items-center gap-2 px-4 py-2 border-b border-lava-hot/20">
    <div class="w-3 h-3 rounded-full bg-ember"></div>
    <div class="w-3 h-3 rounded-full bg-lava-mid"></div>
    <div class="w-3 h-3 rounded-full bg-ash"></div>
    <span class="text-xs text-smoke ml-2">terminal</span>
  </div>
  <!-- Content -->
  <div class="p-4 font-mono text-sm">
    <span class="text-lava-hot font-bold">$ </span>
    <span class="text-foreground">command output here</span>
  </div>
</div>
```
On hover, the border color transitions to `rgba(255, 69, 0, 0.4)`.

#### Post Card (Discussion Platform)
```html
<div class="bg-coal border border-lava-hot/20 rounded-none p-4
  hover:border-lava-hot/40 transition-colors">
  <!-- Header -->
  <div class="flex items-center gap-2 text-xs text-ash mb-2">
    <span class="text-lava-hot">f/community</span>
    <span class="text-smoke">|</span>
    <span>3h ago</span>
  </div>
  <!-- Title -->
  <h3 class="text-base font-semibold text-foreground mb-2">
    Post title here
  </h3>
  <!-- Body preview -->
  <p class="text-sm text-ash line-clamp-3">
    Post body preview text...
  </p>
  <!-- Footer -->
  <div class="flex items-center gap-4 mt-3 text-xs text-smoke">
    <span class="text-lava-hot">42 sparks</span>
    <span>15 comments</span>
  </div>
</div>
```

### Inputs

#### Text Input
```html
<input type="text"
  class="w-full bg-transparent border-0 border-b border-lava-hot/30
  rounded-none px-0 py-2 text-sm text-foreground
  placeholder:text-smoke
  focus:border-lava-hot focus:ring-0 focus:outline-none
  transition-colors"
  placeholder="Type here..."
/>
```

#### Textarea
```html
<textarea
  class="w-full bg-transparent border border-lava-hot/20 rounded-none
  p-3 text-sm text-foreground placeholder:text-smoke
  focus:border-lava-hot focus:ring-0 focus:outline-none
  resize-y min-h-[100px] transition-colors"
  placeholder="Write your post..."
></textarea>
```

#### Search Input
```html
<div class="relative">
  <input type="text"
    class="w-full bg-coal border border-lava-hot/20 rounded-none
    pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-smoke
    focus:border-lava-hot focus:ring-0 transition-colors"
    placeholder="Search... (Cmd+K)"
  />
  <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke">
    <!-- search icon -->
  </svg>
</div>
```

### Badges

#### Fire Badge
```html
<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium
  bg-lava-hot/10 text-lava-hot border border-lava-hot/20 rounded-none">
  Hot
</span>
```

#### Teal Badge
```html
<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium
  bg-teal/10 text-teal border border-teal/20 rounded-none">
  Active
</span>
```

#### Neutral Badge
```html
<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium
  bg-charcoal text-ash border border-charcoal rounded-none">
  Draft
</span>
```

### Spark/Douse Voting Component

```html
<div class="flex flex-col items-center gap-1">
  <!-- Spark button -->
  <button class="p-1 text-smoke hover:text-lava-hot transition-colors
    group" aria-label="Spark">
    <svg class="w-5 h-5 group-hover:drop-shadow-[0_0_6px_rgba(255,69,0,0.5)]">
      <!-- flame/up icon -->
    </svg>
  </button>
  <!-- Score -->
  <span class="text-sm font-bold text-lava-hot">42</span>
  <!-- Douse button -->
  <button class="p-1 text-smoke hover:text-teal transition-colors
    group" aria-label="Douse">
    <svg class="w-5 h-5 group-hover:drop-shadow-[0_0_6px_rgba(0,212,170,0.5)]">
      <!-- water/down icon -->
    </svg>
  </button>
</div>
```

- Sparked state: icon fills with `text-lava-hot`, glow shadow active
- Doused state: icon fills with `text-teal`, glow shadow active
- Neutral state: `text-smoke`
- Score color: `text-lava-hot` when positive, `text-teal` when negative, `text-smoke` when zero

### Community Header (f/ page)

```html
<div class="border-b border-lava-hot/20 pb-6 mb-6">
  <div class="flex items-start justify-between">
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold text-foreground">
        <span class="text-lava-hot">f/</span>community_name
      </h1>
      <p class="text-sm text-ash mt-1">Community description here</p>
      <div class="flex items-center gap-4 mt-3 text-xs text-smoke">
        <span><span class="text-foreground font-medium">12.4k</span> members</span>
        <span><span class="text-teal font-medium">342</span> online</span>
      </div>
    </div>
    <button class="bg-lava-hot text-black rounded-none px-4 py-2
      text-sm font-medium hover:shadow-[0_0_20px_rgba(255,69,0,0.5)]
      transition-all">
      Join
    </button>
  </div>
</div>
```

### Comment Component

```html
<div class="pl-4 border-l border-lava-hot/20">
  <!-- Comment header -->
  <div class="flex items-center gap-2 text-xs text-ash mb-1">
    <span class="text-foreground font-medium">anonymous_user</span>
    <span class="text-smoke">|</span>
    <span>2h ago</span>
    <span class="text-smoke">|</span>
    <span class="text-lava-hot">+8 sparks</span>
  </div>
  <!-- Comment body -->
  <p class="text-sm text-foreground">
    Comment text here...
  </p>
  <!-- Comment actions -->
  <div class="flex items-center gap-3 mt-2 text-xs text-smoke">
    <button class="hover:text-lava-hot transition-colors">Reply</button>
    <button class="hover:text-lava-hot transition-colors">Report</button>
  </div>
</div>
```

Nested comments increase `pl-4` per level. Thread lines use `border-l border-lava-hot/20`.

### Moderation Log Entry

```html
<div class="bg-coal border border-lava-hot/20 rounded-none p-3">
  <div class="flex items-center gap-2 mb-2">
    <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium
      bg-lava-hot/10 text-lava-hot border border-lava-hot/20 rounded-none">
      AI Decision
    </span>
    <span class="text-xs text-smoke">2 minutes ago</span>
  </div>
  <p class="text-sm text-foreground">
    <span class="text-lava-hot font-bold">$ </span>
    Post flagged: confidence 0.87
  </p>
  <p class="text-xs text-ash mt-1">
    Reasoning: Content violates community guideline #3...
  </p>
</div>
```

### Modal / Dialog

```html
<div class="fixed inset-0 z-50 flex items-center justify-center
  bg-void/80 backdrop-blur-sm">
  <div class="bg-coal border border-lava-hot/20 rounded-none
    w-full max-w-lg mx-4 p-6">
    <!-- Title bar -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-foreground">Dialog Title</h2>
      <button class="text-smoke hover:text-lava-hot transition-colors">
        <!-- X icon -->
      </button>
    </div>
    <!-- Content -->
    <div class="text-sm text-ash">
      Dialog content here...
    </div>
    <!-- Actions -->
    <div class="flex justify-end gap-3 mt-6">
      <button class="bg-transparent text-ash border border-charcoal
        rounded-none px-4 py-2 text-sm hover:border-lava-hot/40
        transition-colors">
        Cancel
      </button>
      <button class="bg-lava-hot text-black rounded-none px-4 py-2
        text-sm font-medium">
        Confirm
      </button>
    </div>
  </div>
</div>
```

### Toast / Notification

```html
<div class="fixed bottom-4 right-4 z-50 bg-coal border border-lava-hot/20
  rounded-none p-4 max-w-sm shadow-[0_0_20px_rgba(255,69,0,0.1)]">
  <div class="flex items-start gap-3">
    <span class="text-lava-hot"><!-- icon --></span>
    <div>
      <p class="text-sm font-medium text-foreground">Notification title</p>
      <p class="text-xs text-ash mt-1">Description text here.</p>
    </div>
  </div>
</div>
```

### Dropdown Menu

```html
<div class="bg-coal border border-lava-hot/20 rounded-none py-1 min-w-[160px]
  shadow-[0_0_20px_rgba(0,0,0,0.5)]">
  <button class="w-full text-left px-4 py-2 text-sm text-foreground
    hover:bg-charcoal hover:text-lava-hot transition-colors">
    Menu item
  </button>
  <div class="lava-rule mx-2 my-1"></div>
  <button class="w-full text-left px-4 py-2 text-sm text-destructive
    hover:bg-charcoal transition-colors">
    Destructive item
  </button>
</div>
```

### Tab Navigation

```html
<div class="flex border-b border-lava-hot/20">
  <button class="px-4 py-2 text-sm font-medium text-lava-hot
    border-b-2 border-lava-hot -mb-px">
    Active Tab
  </button>
  <button class="px-4 py-2 text-sm text-smoke
    hover:text-ash transition-colors">
    Inactive Tab
  </button>
</div>
```

### Loading / Skeleton

```html
<!-- Skeleton card -->
<div class="bg-coal border border-lava-hot/20 rounded-none p-4 animate-pulse">
  <div class="h-3 w-24 bg-charcoal rounded-none mb-3"></div>
  <div class="h-5 w-3/4 bg-charcoal rounded-none mb-2"></div>
  <div class="h-3 w-full bg-charcoal rounded-none mb-1"></div>
  <div class="h-3 w-2/3 bg-charcoal rounded-none"></div>
</div>

<!-- Cursor blink loader -->
<span class="inline-block w-2 h-4 bg-lava-hot animate-cursor-blink"></span>
```

### Prompt Prefix Pattern

Use throughout the UI where terminal metaphor applies:

```html
<span class="text-lava-hot font-bold">$ </span>
```

Examples:
- Search: `$ search...`
- Empty states: `$ no posts found`
- Loading: `$ loading...` with cursor blink
- Moderation logs: `$ decision: approved`

---

## Visual Effects

### CRT Scanline Overlay

Applied to `body::after`. A full-screen fixed overlay of repeating horizontal
lines at 0.03 opacity. Creates a subtle CRT monitor effect.

```css
body::after {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.03) 0px,
    rgba(0, 0, 0, 0.03) 1px,
    transparent 1px,
    transparent 2px
  );
  opacity: 0.03;
}
```

### Glow Text

Three levels of text glow using `text-shadow`:

| Class                | Shadows                                          |
|----------------------|--------------------------------------------------|
| `.glow-text`         | 20px @ 0.5 opacity, 40px @ 0.3 opacity           |
| `.glow-text-subtle`  | 10px @ 0.3 opacity                                |
| `.glow-text-intense` | 10px @ 0.8, 30px @ 0.6, 60px @ 0.4, 100px @ 0.2 |

All shadows use `rgba(255, 69, 0, ...)` (lava-hot).

### Ember Particles (CSS)

Small dots that float upward from the bottom of the viewport:

```css
.ember-particle {
  position: fixed;
  bottom: 0;
  width: 3px;
  height: 3px;
  background: #FF4500;
  box-shadow: 0 0 6px rgba(255, 69, 0, 0.5);
  animation: ember-rise 4s ease-out forwards;
  pointer-events: none;
  z-index: 1;
}

@keyframes ember-rise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) scale(0);
    opacity: 0;
  }
}
```

### FireParticles (Canvas)

A canvas-based particle system for the hero section.
Particles have magnetic attraction to the mouse cursor.

Particle colors:
- `#FF6B2C` (lava-mid)
- `#FF8F5C` (light orange)
- `#CC4A10` (dark ember)
- `#00D4AA` (teal)
- `#33E0BE` (light teal)

Behavior:
- Particles drift slowly by default
- On mouse move, particles within a radius are attracted toward the cursor
- Teal particles are rarer (roughly 20% of total)
- Canvas covers the hero section, positioned absolute behind content

### Cursor Blink Animation

```css
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.animate-cursor-blink {
  animation: cursor-blink 1s step-end infinite;
}
```

Used for:
- Terminal-style loading indicators
- Text input cursor effects
- Typewriter animation endpoints

### Lava Rule (Horizontal Divider)

```css
.lava-rule {
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, #FF4500, transparent);
}
```

Use instead of standard `<hr>` elements. Fades in from both sides with
lava-hot at center.

### Custom Scrollbar

Minimal 4px wide scrollbar:
- Track: `#000000` (void/black)
- Thumb: `#FF4500` (lava-hot)
- Firefox: `scrollbar-width: thin; scrollbar-color: #FF4500 #000000;`

### Text Selection

```css
::selection {
  background: rgba(255, 69, 0, 0.3);
}
```

Orange-tinted selection highlight.

### Focus Ring

```css
*:focus-visible {
  outline: 2px solid #FF4500;
  outline-offset: 2px;
}
```

All focusable elements get a lava-hot outline on keyboard focus.

---

## Navigation

### Desktop Nav

```html
<nav class="fixed top-0 left-0 right-0 z-50 h-14 transition-colors duration-300"
  data-scrolled="false">
  <!-- Transparent initially, becomes bg-void/90 backdrop-blur on scroll -->
  <div class="max-w-7xl mx-auto h-full flex items-center justify-between
    px-3 sm:px-6 lg:px-12">
    <!-- Logo -->
    <a href="/" class="flex items-center text-lg font-bold">
      <span class="text-lava-hot">fuega</span>
      <span class="text-smoke">.</span>
      <span class="text-ash">ai</span>
    </a>

    <!-- Desktop links (hidden on mobile) -->
    <div class="hidden md:flex items-center gap-6">
      <a href="/communities" class="text-sm text-ash hover:text-lava-hot
        transition-colors">Communities</a>
      <a href="/feed" class="text-sm text-ash hover:text-lava-hot
        transition-colors">Feed</a>
      <a href="/about" class="text-sm text-ash hover:text-lava-hot
        transition-colors">About</a>
      <!-- Keyboard shortcut hint -->
      <kbd class="text-xs text-smoke border border-smoke/30 rounded-none
        px-1.5 py-0.5">Cmd+K</kbd>
    </div>

    <!-- Mobile hamburger (visible on mobile) -->
    <button class="md:hidden p-2 text-ash hover:text-lava-hot">
      <!-- hamburger icon -->
    </button>
  </div>
</nav>
```

### Scroll Behavior

```typescript
// Nav becomes opaque on scroll
const [scrolled, setScrolled] = useState(false)

useEffect(() => {
  const handleScroll = () => setScrolled(window.scrollY > 10)
  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [])

// Apply: bg-transparent -> bg-void/90 backdrop-blur-md
```

### Mobile Nav (Sheet)

```html
<!-- Sheet slides in from right -->
<div class="fixed inset-y-0 right-0 z-50 w-48 sm:w-56 bg-coal
  border-l border-lava-hot/20 p-6 transform transition-transform">
  <div class="flex flex-col gap-4">
    <a href="/communities" class="text-sm text-ash hover:text-lava-hot
      transition-colors">Communities</a>
    <a href="/feed" class="text-sm text-ash hover:text-lava-hot
      transition-colors">Feed</a>
    <a href="/about" class="text-sm text-ash hover:text-lava-hot
      transition-colors">About</a>
    <div class="lava-rule my-2"></div>
    <a href="/login" class="text-sm text-lava-hot">Login</a>
  </div>
</div>
```

- Width: `w-48` (192px) -> `sm:w-56` (224px)
- Background: `bg-coal` with `border-l border-lava-hot/20`
- Overlay behind: `bg-void/50` with click-to-close

---

## Hero Section

### Structure

```html
<section class="relative min-h-screen flex flex-col items-center
  justify-center overflow-hidden">
  <!-- FireParticles canvas (background) -->
  <canvas class="absolute inset-0 z-0"></canvas>

  <!-- Content -->
  <div class="relative z-10 text-center px-3 sm:px-6">
    <!-- Terminal window -->
    <div class="bg-coal rounded-none overflow-hidden mb-8 max-w-xl mx-auto"
      style="border: 1px solid rgba(255, 69, 0, 0.2);">
      <!-- Title bar with dots -->
      <div class="flex items-center gap-2 px-4 py-2 border-b border-lava-hot/20">
        <div class="w-3 h-3 rounded-full bg-ember"></div>
        <div class="w-3 h-3 rounded-full bg-lava-mid"></div>
        <div class="w-3 h-3 rounded-full bg-ash"></div>
        <span class="text-xs text-smoke ml-2">bash</span>
      </div>
      <!-- Terminal content -->
      <div class="p-4">
        <span class="text-lava-hot font-bold text-sm">$ </span>
        <span class="text-foreground text-sm">initializing fuega.ai...</span>
      </div>
    </div>

    <!-- Giant title -->
    <h1 class="text-5xl sm:text-6xl md:text-7xl font-bold text-foreground
      glow-text-intense mb-4">
      <!-- Each character animated individually -->
      <span>f</span><span>u</span><span>e</span><span>g</span>
      <span>a</span><span class="text-smoke">.</span>
      <span class="text-ash">a</span><span class="text-ash">i</span>
    </h1>

    <!-- Typewriter tagline -->
    <p class="text-lg sm:text-xl text-ash mb-8 h-8">
      <!-- Cycles through phrases with typewriter effect -->
      <span class="text-lava-hot">></span> community-driven moderation_
      <span class="inline-block w-2 h-5 bg-lava-hot animate-cursor-blink
        align-middle ml-1"></span>
    </p>

    <!-- CTA buttons -->
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <button class="bg-transparent text-lava-hot rounded-none px-6 py-3
        text-sm font-medium uppercase tracking-wider border border-lava-hot
        hover:bg-lava-hot hover:text-black transition-all">
        $ explore communities
      </button>
      <button class="bg-charcoal/50 backdrop-blur text-foreground rounded-none
        px-6 py-3 text-sm font-medium border border-lava-hot/20
        hover:border-lava-hot/40 transition-all">
        Learn more
      </button>
    </div>
  </div>
</section>
```

### Typewriter Phrases

Cycle through these taglines:
- `community-driven moderation_`
- `transparent AI governance_`
- `your rules, your community_`
- `spark the conversation_`

---

## Page Templates

### Feed Page Layout

```html
<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-12 py-8 sm:py-12">
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
    <!-- Main feed -->
    <div class="space-y-4">
      <!-- Sort tabs -->
      <div class="flex border-b border-lava-hot/20 mb-4">
        <button class="px-4 py-2 text-sm font-medium text-lava-hot
          border-b-2 border-lava-hot -mb-px">Hot</button>
        <button class="px-4 py-2 text-sm text-smoke
          hover:text-ash">New</button>
        <button class="px-4 py-2 text-sm text-smoke
          hover:text-ash">Top</button>
      </div>
      <!-- Post cards -->
      <!-- ... PostCard components ... -->
    </div>

    <!-- Sidebar (hidden on mobile) -->
    <aside class="hidden lg:block space-y-4">
      <!-- Community info cards, trending, etc -->
    </aside>
  </div>
</div>
```

### Community Page Layout

```html
<div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-12 py-8 sm:py-12">
  <!-- Community header -->
  <!-- ... CommunityHeader component ... -->

  <!-- Tabs: Posts | About | Mod Log | Governance -->
  <div class="flex border-b border-lava-hot/20 mb-6">
    <!-- ... Tab buttons ... -->
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
    <!-- Posts list -->
    <div class="space-y-4">
      <!-- ... PostCard components ... -->
    </div>
    <!-- Sidebar -->
    <aside class="hidden lg:block space-y-4">
      <!-- Community rules, stats, join button -->
    </aside>
  </div>
</div>
```

### Post Detail Page

```html
<div class="max-w-3xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
  <!-- Post content -->
  <div class="bg-coal border border-lava-hot/20 rounded-none p-4 sm:p-6">
    <div class="flex gap-4">
      <!-- Voting column -->
      <!-- ... SparkDouse component ... -->
      <!-- Content -->
      <div class="flex-1">
        <!-- Header -->
        <div class="flex items-center gap-2 text-xs text-ash mb-2">
          <span class="text-lava-hot">f/community</span>
          <span class="text-smoke">|</span>
          <span>posted 3h ago</span>
        </div>
        <h1 class="text-xl sm:text-2xl font-bold text-foreground mb-4">
          Post Title
        </h1>
        <div class="text-sm text-foreground prose-invert">
          Post body content...
        </div>
      </div>
    </div>
  </div>

  <!-- Comments section -->
  <div class="mt-6 space-y-4">
    <h2 class="text-lg font-semibold text-foreground">
      <span class="text-lava-hot font-bold">$ </span>comments
    </h2>
    <!-- Comment input -->
    <!-- ... Comment components (nested) ... -->
  </div>
</div>
```

### Auth Pages (Login / Register)

```html
<div class="min-h-screen flex items-center justify-center px-3">
  <div class="w-full max-w-sm">
    <!-- Terminal card style -->
    <div class="bg-coal rounded-none overflow-hidden"
      style="border: 1px solid rgba(255, 69, 0, 0.2);">
      <div class="flex items-center gap-2 px-4 py-2 border-b border-lava-hot/20">
        <div class="w-3 h-3 rounded-full bg-ember"></div>
        <div class="w-3 h-3 rounded-full bg-lava-mid"></div>
        <div class="w-3 h-3 rounded-full bg-ash"></div>
        <span class="text-xs text-smoke ml-2">login</span>
      </div>
      <div class="p-6">
        <h1 class="text-xl font-bold text-foreground mb-6">
          <span class="text-lava-hot font-bold">$ </span>authenticate
        </h1>
        <form class="space-y-4">
          <div>
            <label class="text-xs text-ash uppercase tracking-wider mb-1 block">
              username
            </label>
            <input class="w-full bg-transparent border-0 border-b
              border-lava-hot/30 rounded-none px-0 py-2 text-sm
              text-foreground focus:border-lava-hot focus:ring-0" />
          </div>
          <div>
            <label class="text-xs text-ash uppercase tracking-wider mb-1 block">
              password
            </label>
            <input type="password" class="w-full bg-transparent border-0
              border-b border-lava-hot/30 rounded-none px-0 py-2 text-sm
              text-foreground focus:border-lava-hot focus:ring-0" />
          </div>
          <button class="w-full bg-lava-hot text-black rounded-none py-2
            text-sm font-medium uppercase tracking-wider
            hover:shadow-[0_0_20px_rgba(255,69,0,0.5)] transition-all mt-6">
            $ login
          </button>
        </form>
      </div>
    </div>
  </div>
</div>
```

---

## Responsive Design

### Breakpoints (Tailwind defaults)

| Breakpoint | Min-width | Usage                               |
|------------|-----------|-------------------------------------|
| (default)  | 0px       | Mobile-first base styles            |
| `sm`       | 640px     | Small tablets, larger phones        |
| `md`       | 768px     | Tablets, 2-column grids             |
| `lg`       | 1024px    | Desktop, 3-column grids, sidebar    |
| `xl`       | 1280px    | Wide desktop                        |

### Responsive Patterns

| Property          | Mobile          | `sm`            | `md`            | `lg`            |
|-------------------|-----------------|-----------------|-----------------|-----------------|
| Container padding | `px-3`          | `px-6`          | `px-6`          | `px-12`         |
| Section padding   | `py-8`          | `py-12`         | `py-12`         | `py-12`         |
| Grid columns      | 1               | 1               | 2               | 3               |
| Nav links         | Sheet (right)   | Sheet           | Inline flex     | Inline flex     |
| Hero title        | `text-5xl`      | `text-6xl`      | `text-7xl`      | `text-7xl`      |
| Sidebar           | Hidden          | Hidden          | Hidden          | Visible (300px) |
| Card titles       | `text-lg`       | `text-xl`       | `text-xl`       | `text-xl`       |
| Mobile nav sheet  | `w-48`          | `w-56`          | Hidden          | Hidden          |
| CTA buttons       | `flex-col`      | `flex-row`      | `flex-row`      | `flex-row`      |

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Disable ember particles, typewriter effect, fire particles canvas,
and glow animations when the user prefers reduced motion.

---

## Accessibility

### Color Contrast

| Combination                    | Ratio  | WCAG Level |
|--------------------------------|--------|------------|
| Foreground (#F0F0F0) on Void   | 18.1:1 | AAA        |
| Lava-hot (#FF4500) on Void     | 4.6:1  | AA         |
| Ash (#8B8B8B) on Void          | 5.3:1  | AA         |
| Teal (#00D4AA) on Void         | 9.0:1  | AAA        |
| Smoke (#555555) on Void        | 3.0:1  | Fails AA*  |
| Black on Lava-hot              | 4.6:1  | AA         |

*Smoke (#555555) is used only for decorative/tertiary elements, never for
essential information. Pair with icons or provide alternative text.

### Keyboard Navigation

- All interactive elements focusable with Tab
- Focus ring: `2px solid #FF4500`, offset `2px`
- Skip-to-content link at top of page
- Escape closes modals/sheets
- Arrow keys navigate within menus
- Enter/Space activate buttons

### ARIA Patterns

- Spark button: `aria-label="Spark this post"`, `aria-pressed="true|false"`
- Douse button: `aria-label="Douse this post"`, `aria-pressed="true|false"`
- Score: `aria-live="polite"` for dynamic updates
- Mobile nav: `role="dialog"`, `aria-modal="true"`
- Moderation badges: `role="status"`
- Sort tabs: `role="tablist"` / `role="tab"` / `role-tabpanel"`

### Screen Reader Text

```html
<span class="sr-only">42 sparks</span>
```

Use `sr-only` class for context that is visually represented by icons
or color alone.

---

## Animation Reference

### Keyframes

```css
/* Cursor blink - terminal cursor effect */
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Ember rise - floating particles */
@keyframes ember-rise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) scale(0);
    opacity: 0;
  }
}

/* Typewriter - text reveal */
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

/* Fade in up - content entrance */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Glow pulse - subtle pulsing glow */
@keyframes glow-pulse {
  0%, 100% {
    text-shadow: 0 0 10px rgba(255, 69, 0, 0.5);
  }
  50% {
    text-shadow: 0 0 20px rgba(255, 69, 0, 0.8),
                 0 0 40px rgba(255, 69, 0, 0.4);
  }
}
```

### Tailwind Animation Classes

| Class                    | Duration | Easing    | Usage                    |
|--------------------------|----------|-----------|--------------------------|
| `animate-cursor-blink`   | 1s       | step-end  | Terminal cursors         |
| `animate-ember-rise`     | 4s       | ease-out  | Floating particles       |
| `animate-pulse`          | 2s       | ease      | Skeleton loading         |

### Transition Defaults

```html
<!-- Color transitions -->
<element class="transition-colors duration-200">

<!-- All property transitions -->
<element class="transition-all duration-300">

<!-- Transform transitions -->
<element class="transition-transform duration-200">
```

Standard duration: `200ms` for micro-interactions, `300ms` for layout
changes, `500ms` for entrances.

---

## Icon System

Use Lucide React icons throughout. They pair well with the monospace
terminal aesthetic at small sizes.

Recommended icons for platform features:

| Feature        | Icon Name       | Context                       |
|----------------|-----------------|-------------------------------|
| Spark (up)     | `Flame`         | Spark voting                  |
| Douse (down)   | `Droplets`      | Douse voting                  |
| Comment        | `MessageSquare` | Comment count/action          |
| Share          | `Share2`        | Share post                    |
| Report         | `Flag`          | Report content                |
| Community      | `Users`         | Community member count        |
| Settings       | `Settings`      | Community/user settings       |
| Search         | `Search`        | Search bar                    |
| Menu           | `Menu`          | Mobile hamburger              |
| Close          | `X`             | Close modals/sheets           |
| AI Agent       | `Bot`           | AI moderation indicator       |
| Governance     | `Vote`          | Prompt voting                 |
| Edit           | `Pencil`        | Edit post/comment             |
| History        | `History`       | Edit history                  |
| Lock           | `Lock`          | Locked/archived post          |
| Online         | `Circle` (filled) | Online status indicator     |

Icon sizing: `w-4 h-4` (default), `w-5 h-5` (voting), `w-6 h-6` (nav logo area).
Icon color: `text-smoke` default, `text-lava-hot` on hover/active.

---

## Z-Index Scale

| Layer                | Z-Index | Usage                          |
|----------------------|---------|--------------------------------|
| Base content         | 0       | Page content                   |
| Ember particles      | 1       | Background decorative          |
| Sticky elements      | 10      | Sticky headers within content  |
| Navigation           | 50      | Fixed top nav                  |
| Dropdowns            | 40      | Dropdown menus                 |
| Modal overlay        | 50      | Modal backdrop                 |
| Modal content        | 50      | Modal dialog                   |
| Toast notifications  | 50      | Bottom-right toasts            |
| Mobile nav sheet     | 50      | Slide-out mobile nav           |
| CRT scanlines        | 9999    | Always on top, pointer-events: none |

---

## Shadow System

No traditional box shadows. All depth is created through border glow
and text-shadow effects.

| Token                  | CSS Value                                    | Usage               |
|------------------------|----------------------------------------------|----------------------|
| Glow small             | `0 0 10px rgba(255, 69, 0, 0.3)`            | Subtle hover glow    |
| Glow medium            | `0 0 20px rgba(255, 69, 0, 0.5)`            | Button hover, active |
| Glow large             | `0 0 40px rgba(255, 69, 0, 0.3)`            | Hero elements        |
| Teal glow              | `0 0 20px rgba(0, 212, 170, 0.5)`           | Teal button hover    |
| Drop shadow (menus)    | `0 0 20px rgba(0, 0, 0, 0.5)`               | Dropdown menus       |
| Toast shadow           | `0 0 20px rgba(255, 69, 0, 0.1)`            | Notification cards   |

Tailwind arbitrary values:
```html
hover:shadow-[0_0_20px_rgba(255,69,0,0.5)]
hover:shadow-[0_0_20px_rgba(0,212,170,0.5)]
shadow-[0_0_20px_rgba(0,0,0,0.5)]
```

---

## Platform-Specific Component Patterns

### Spark Score Display

Positive scores display in lava-hot, negative in teal, zero in smoke:

```typescript
function getScoreColor(score: number): string {
  if (score > 0) return 'text-lava-hot'
  if (score < 0) return 'text-teal'
  return 'text-smoke'
}
```

### Community Prefix

Always render community names with the `f/` prefix in lava-hot:

```html
<span>
  <span class="text-lava-hot font-medium">f/</span>
  <span class="text-foreground">community_name</span>
</span>
```

### Moderation Status Indicators

| Status    | Badge                                          |
|-----------|------------------------------------------------|
| Approved  | Teal badge: `bg-teal/10 text-teal`             |
| Flagged   | Fire badge: `bg-lava-hot/10 text-lava-hot`     |
| Removed   | Destructive: `bg-destructive/10 text-destructive` |
| Pending   | Neutral: `bg-charcoal text-ash`                |

### Empty States

```html
<div class="text-center py-12">
  <p class="text-smoke text-sm font-mono">
    <span class="text-lava-hot font-bold">$ </span>
    no posts found
    <span class="inline-block w-2 h-4 bg-lava-hot animate-cursor-blink
      align-middle ml-1"></span>
  </p>
  <p class="text-smoke text-xs mt-2">
    Be the first to post in this community.
  </p>
</div>
```

### Error States

```html
<div class="bg-coal border border-destructive/20 rounded-none p-4">
  <p class="text-sm text-destructive">
    <span class="font-bold">$ error: </span>
    Something went wrong. Please try again.
  </p>
</div>
```

---

## File Reference

When implementing, these are the key files that define the design system:

| File                        | Purpose                              |
|-----------------------------|--------------------------------------|
| `globals.css`               | CSS custom properties, base styles   |
| `tailwind.config.ts`        | Extended theme, custom colors        |
| `components/ui/button.tsx`  | Button variants (shadcn/ui)          |
| `components/ui/card.tsx`    | Card component (shadcn/ui)           |
| `components/ui/input.tsx`   | Input component (shadcn/ui)          |
| `components/ui/badge.tsx`   | Badge variants (shadcn/ui)           |
| `components/ui/sheet.tsx`   | Mobile nav sheet (shadcn/ui)         |
| `components/nav.tsx`        | Navigation bar                       |
| `components/fire-particles.tsx` | Canvas particle system           |
| `app/layout.tsx`            | Root layout, font loading            |

---

*This document is the single source of truth for all fuega.ai UI decisions.
All components must conform to these specifications. When in doubt,
default to the terminal aesthetic: sharp corners, monospace, dark background,
lava-hot accents, and prompt-style prefixes.*

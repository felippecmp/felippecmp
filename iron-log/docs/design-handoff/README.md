# Handoff: Training Log — Home redesign + Workout flow

## Overview

Redesign of a training-log app built in React Native. This handoff focuses on:

1. **Home ("Hoje") as the true hub** — the Frequência chart was moved here from Progresso so that Hoje → Treino → Progresso forms a clear loop. Streak, weekly volume, next workout, and goals all live on Home.
2. **Three home directions** explored (A · Safe, B · Bold, C · Hub) so the team can pick the aesthetic level they want to push to.
3. **Full live workout-logging flow** — active set logger with +/− steppers for kg / reps / RIR, rest-timer ring that auto-starts when a set is checked, finish sheet, post-workout summary.
4. **Refined color system** — coral primary + cream neutral + amber energy. No verdes/azuis/dourados competing.

All copy is in PT-BR.

---

## About the Design Files

The files in this bundle are **design references created in HTML + React (via Babel standalone)** — prototypes showing intended look and behavior, **not production code to copy directly**.

The task is to **recreate these designs in the target codebase's environment** (likely React Native given the original app), using its established patterns, component libraries, and navigation stack.

The component files are organized to mirror a probable real app structure — `design-system.jsx` holds tokens, `home-variants.jsx` holds the three home directions, each major screen is its own file — so they should be straightforward to translate screen-by-screen.

---

## Fidelity

**High-fidelity.** Final colors, typography, spacing, animations, and interactions are all locked in. Recreate pixel-perfectly using the codebase's RN equivalents (View / Text / Pressable / Animated, or NativeWind / Tamagui / etc.).

---

## Design Tokens

All tokens live in `components/design-system.jsx` → `TOKENS`.

### Colors

```
// Surfaces (dark theme)
ink:          #0A0D13   // deepest — bottom of stack
bg:           #0E1218   // app background
surf1:        #141924   // cards
surf2:        #1A2030   // raised cards, sheets
surf3:        #212838   // input wells, inactive chips
border:       rgba(255,255,255,0.06)
borderStrong: rgba(255,255,255,0.10)

// Text
tPrim:  #F4F5F7                      // primary
tSec:   rgba(244,245,247,0.62)       // secondary
tTer:   rgba(244,245,247,0.38)       // tertiary / captions
tQuat:  rgba(244,245,247,0.22)       // disabled

// Accents
coral:  #FF4D5E    // PRIMARY — CTAs, today indicator, key numbers, "brilho do rolê"
mint:   #F2E6C9    // CREAM — "feito/OK", checks, streak, positive deltas, e1RM
amber:  #FFB86B    // energy — streak flame, occasional highlights
violet: #B48CFF    // brand mark only
rose:   #FF8FA3    // rare accent

// States
red:   #FF5B5B     // destructive / warning
```

**Palette rationale:** one saturated primary (coral) + a warm off-white (cream) + muted amber. Avoids the classic "dark UI with 5 competing saturated colors" problem. Cream replaces mint/green for success states because it reads clean on dark without fighting coral.

### Typography

- **Family:** system stack (SF Pro / Inter). The prototype uses `-apple-system, BlinkMacSystemFont, "Inter", sans-serif`.
- **Weights used:** 400, 600, 700, 800.
- **Tabular numerics:** all stat values, timers, weight, reps use `font-variant-numeric: tabular-nums`. Essential for stable layout when numbers tick.
- **Scale:**
  - `44px / 800 / -1.5 letter-spacing` — editorial headlines (Bold home, post-workout "finalizado.")
  - `32–34px / 800 / -1` — hero numbers (weekly volume, streak count)
  - `22–24px / 700 / -0.5` — screen titles ("Olá, Lucas")
  - `14–15px / 600–700` — section labels, card titles
  - `12–13px / 600–700` — meta, inline labels
  - `10–11px / 700 / 1–2 letter-spacing / uppercase` — eyebrows ("PRÓXIMO TREINO", "STREAK", "VOLUME · 30D")

### Spacing

8-point grid. Common values: `6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32`.
Card padding typically `14` or `16`. Screen horizontal padding `16`.

### Radii

- `7` — small chips (set-number badges)
- `8–10` — buttons, small pills
- `12` — inputs, medium cards
- `14–16` — main cards
- `18–20` — large hero cards
- `999` — circular (avatars, weekstrip dots, filter pills)

### Shadows

Used sparingly — only for floating elements (rest timer banner, sheets):
```
0 10px 30px rgba(0,0,0,0.5)
```

---

## Screens / Views

### 1. Home (Hoje) — three directions

The prototype exposes **three variants** of Home; the team should pick one (or mix). All three are in `components/home-variants.jsx`.

#### Direction A · Safe (`HomeSafe`)
Refined version of the existing design. Tightens hierarchy, moves Frequência chart onto Home, keeps current density.
- Greeting row with streak pill (cream flame + day count)
- Three stat cards (Treinos / Cardio / Peso) with sparklines
- Frequência · 4 semanas chart
- Metas (goals) as horizontal chips

#### Direction B · Bold (`HomeBold`)
Editorial typography, huge greeting, data-as-moments.
- 44px "Boa noite." headline
- Oversized weekly stats treated as magazine pull-quotes
- Weekstrip with day letters + filled coral for today

#### Direction C · Hub (`HomeHub`) **← recommended**
Command-center layout, most unified. Brings everything into one scannable screen.
- Date + streak header
- **Hero ring** around "Olá, Lucas" — animated progress ring (weekly training goal)
- **Próximo treino** card with play icon, muscle-group chips
- **Streak + Volume** dual cards
- **Frequência** compact chart (Força = cream bars, Cardio = coral)
- **Metas** grid (2 cols)
- **IA sidekick** card — gradient violet, optional command input

### 2. Treinar (`components/train-screen.jsx`)
Pattern library / workout picker.
- Hero ring shared with Home
- Search + filter chips
- AI card (violet gradient) — "Pedir treino"
- Template list with per-template icon tint and "PRÓXIMO" highlight row

### 3. Active workout (`components/active-workout.jsx`)
The flow starts when the user taps "Iniciar treino" from Home or Treinar.

- **Top bar:** elapsed timer + Finalizar button (cream pill)
- **Exercise strip** (horizontal scroll of numbered chips — active = coral, done = cream tint + check)
- **Current exercise header** — name, target sets × reps, current e1RM (cream)
- **Set list** — each row: badge (gray when pending, cream when done) / kg stepper / reps stepper / RIR stepper / check button
- **Stepper:** tap − / + to change value in 2.5kg or 1 rep/RIR increments
- **Checking a set** → row turns cream-tinted, rest-timer banner appears at bottom with coral ring countdown (auto-dismisses when timer hits 0)
- **Finish sheet** — slide-up confirmation with elapsed / sets / volume summary
- **Post-workout summary** — big "Lower A *finalizado.*" headline, cream "TREINO COMPLETO" eyebrow, stats row, "PR em RDL" callout

### 4. Progresso (`components/progress-screen.jsx`)
- Editorial hero — "27.8 toneladas" in 34px/800, "+241% vs anterior" in cream
- 7d / 30d / 90d segmented toggle
- Three KPI cards (Sessões / Streak / Tempo)
- Frequência chart (same component as Home, 4 semanas)
- Recent exercises list with e1RM in cream

### 5. Mais (`components/progress-screen.jsx` → `MoreScreen`)
Settings-style list with profile card up top (gradient avatar, name, subtitle) and categorized rows (Conta / Treino / App) with colored icons.

---

## Interactions & Behavior

### Navigation
Bottom tab bar with 4 tabs: Hoje / Treinar / Progresso / Mais. Pressable with subtle scale-down (`transform: scale(0.96)` on active).

### Active workout flow
- `Iniciar treino` on any template → pushes `active-workout` screen.
- Tapping the check button on a set:
  1. Marks set as done (cream tint, number badge fills cream).
  2. Starts rest-timer (default 90s, per-exercise override).
  3. Rest banner appears at bottom with coral progress ring.
  4. On timer end, banner auto-dismisses; haptic on native.
- `Finalizar` (top-right) → slide-up sheet with summary + Continuar / Salvar.
- `Salvar` → post-workout screen.

### Steppers
- Tap − / + buttons: ±2.5kg on weight, ±1 on reps/RIR.
- Long-press: continuous increment (native only; in RN use `onLongPress` + interval).
- Tap the value itself → numeric keypad.

### Animations
- Ring progress: 600ms ease-out on mount and value change.
- Sheet transitions: slide up from bottom, 250ms ease-out.
- Set completion: row background fades from `surf1` to cream@10% over 200ms.
- Rest banner: fade + slide up 15px, 200ms.

### Hover / pressed states
- Buttons: `opacity: 0.85` + `scale: 0.97` on press.
- Cards (tappable): `background` lerps toward `surf2` on press.

---

## State Management

For a React Native port, keep it simple:

- **Workout session state** (active or null) — holds current template, exercises, per-set kg/reps/RIR/done flags, start time, rest-timer state. Context or Zustand.
- **History** — array of completed sessions. Persist with AsyncStorage or SQLite (react-native-mmkv is fastest).
- **Templates** — user-defined workout templates. Same persistence.
- **Streak / weekly metrics** — derived from history; memoize.
- **Tweaks (accent color, home direction)** — user preference, AsyncStorage.

The prototype has sample data in `components/sample-data.jsx`; use it as a schema reference.

---

## Assets

- **Icons:** the prototype uses an inline stroked icon set in `design-system.jsx` → `<Icon>`. For RN, swap to `react-native-svg` with the same paths, or use Phosphor / Lucide RN — paths are near-identical.
- **Illustrations:** none. All visual interest comes from typography + color + data viz.
- **Fonts:** system. If the brand team later picks a custom display face, only the 34–44px headlines need it.

---

## Files

Bundled in this handoff:

```
Training Log.html                   — entry point, Babel setup, Tweaks panel
components/
  design-system.jsx                 — TOKENS, Icon set, primitives (Card, Ring, Chip, Tab bar)
  shared-viz.jsx                    — StatCard, Sparkline, Frequência chart, KPI card
  sample-data.jsx                   — sample user / workouts / history
  home-variants.jsx                 — HomeSafe / HomeBold / HomeHub
  train-screen.jsx                  — Treinar tab
  active-workout.jsx                — Live workout flow + finish sheet + post-workout summary
  progress-screen.jsx               — Progresso + Mais tabs
  ios-frame.jsx                     — iOS device bezel (prototype-only, do NOT port)
```

To preview: open `Training Log.html` in a browser. Use the **Tweaks** panel (bottom-right gear) to switch home direction and accent color.

---

## Recommended port order

1. Design tokens → theme file (one module, export `colors` / `spacing` / `radii` / `type`).
2. Shared primitives (Card, Ring, Chip, Icon, StatCard, Sparkline).
3. Home (start with **Direction C · Hub** — it's the most complete).
4. Active workout flow — highest behavioral complexity, do it early to validate state shape.
5. Treinar, Progresso, Mais.
6. Tab navigation + deep-link from Home "Próximo treino" → Active workout.

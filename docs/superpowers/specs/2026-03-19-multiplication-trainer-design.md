# Multiplication Trainer — Design Spec

## Overview

An adaptive multiplication training app for the 1–10 times table, targeting students ages 9–12 drilling for speed and fluency. Built with SvelteKit. Clean, efficient, keyboard-first interface.

## Screen Flow

Three screens in a linear flow:

```
Start → Quiz → Results
         ↑        |
         └────────┘ (Play Again)
```

### Start Screen
- App title
- **Mode selector:** Adaptive (default), Random, Tables Drill
- **Table picker** (visible only in Tables Drill mode): buttons 1–10 to select which table
- **Question count:** 10, 20, or 30 (default 20)
- Start button
- Lifetime stats summary: sessions completed, average accuracy

### Quiz Screen
- Progress indicator: "Question N / Total"
- Progress bar filling left-to-right
- Per-question timer (counts up, top-right corner)
- Large question text: "A × B = ?"
- Centered numeric input field, auto-focused
- Submit with Enter key
- Immediate feedback:
  - **Correct:** Green flash, advance after ~400ms
  - **Wrong:** Red flash, show correct answer for ~1.5s, then advance
- No skip — every question must be answered

### Results Screen
- Session summary: score (e.g., 18/20), average response time
- 10×10 difficulty heatmap (aggregated across all sessions)
  - Rows and columns labeled 1–10
  - Cell color: green (easy) → yellow (medium) → red (hard)
  - Hoverable cells showing details (error rate, avg time, attempts)
- "Play Again" button (returns to Quiz with same settings)
- "Home" button (returns to Start)

## Data Model

### Performance Matrix

Stored in `localStorage` under key `mt_matrix`. A 10×10 structure where each cell tracks:

```typescript
type PairStats = {
  attempts: number;    // total times asked
  correct: number;     // total correct answers
  totalTime: number;   // cumulative response time in ms
}
```

**Commutativity:** 3×7 and 7×3 are the same pair. Store under `[min(a,b)][max(a,b)]`. The quiz can present either order for variety.

### Derived Values (computed, not stored)

- `errorRate = 1 - (correct / attempts)` — 0 to 1
- `avgTime = totalTime / attempts` — in ms
- `difficultyScore` — weighted combination: `0.7 * errorRate + 0.3 * normalizedTime`
  - `normalizedTime = clamp((avgTime - 1000) / 4000, 0, 1)` — maps 1s–5s to 0–1

### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `mt_matrix` | `Record<number, Record<number, PairStats>>` | 10×10 performance data |
| `mt_sessions` | `number` | Lifetime session count |
| `mt_totalQuestions` | `number` | Lifetime questions answered |

## Modes

### Adaptive (default)
Weighted random selection from all 55 unique pairs. Weight formula:

```
weight(a, b) = 1 + difficultyScore × aggressiveness
aggressiveness = min(totalLifetimeAttempts / 200, 3)
```

- With no history: uniform random (aggressiveness ≈ 0)
- After ~200 attempts: moderate weighting toward weak pairs
- After ~600+ attempts: strong weighting (capped at 3×)
- Pairs with zero attempts get a small bonus (+0.5) to ensure coverage
- Anti-repeat: last 3 asked pairs excluded from selection

### Random
Pure uniform random across all 55 unique pairs. Anti-repeat still applies. Performance data still tracked.

### Tables Drill
User selects a number N (1–10). Questions are drawn only from the 10 pairs involving N (N×1 through N×10), in random order. No adaptive weighting. Performance data still tracked.

## Heatmap Visualization

Rendered as a CSS grid or SVG on the Results screen.

- **Grid:** 11×11 (header row + header column + 10×10 data cells)
- **Color scale:** Green (#22c55e) → Yellow (#eab308) → Red (#ef4444), interpolated by difficultyScore
- **Empty cells** (no data): neutral gray
- **Hover tooltip:** Shows pair (e.g., "7 × 8"), attempts, accuracy %, avg time
- **Cell content:** The product value (e.g., 56 for 7×8)

## Technology

- **Framework:** SvelteKit
- **Styling:** Plain CSS (no framework), CSS custom properties for theming
- **State management:** Svelte stores, synced to localStorage
- **Routing:** SvelteKit file-based routing (`/`, `/quiz`, `/results`)
- **Build:** Vite (via SvelteKit)
- **No backend** — fully client-side, static adapter for deployment

## Project Structure

```
src/
  routes/
    +page.svelte          # Start screen
    +layout.svelte        # Shared layout (minimal)
    quiz/
      +page.svelte        # Quiz screen
    results/
      +page.svelte        # Results screen
  lib/
    stores/
      performance.ts      # Performance matrix store + localStorage sync
    engine/
      question.ts         # Question selection (adaptive, random, drill)
      scoring.ts          # Difficulty score computation
    components/
      Heatmap.svelte      # 10×10 heatmap visualization
      ProgressBar.svelte  # Quiz progress bar
      Timer.svelte        # Per-question timer
      Feedback.svelte     # Correct/wrong feedback overlay
static/
  favicon.png
```

## Key Behaviors

1. **Auto-focus:** Input field is always focused during quiz. Re-focus after feedback animation.
2. **Keyboard-only flow:** Enter submits answer. No mouse needed during quiz.
3. **Persistence:** localStorage is read on app init, written after each answer. No batch saves.
4. **Fresh start:** A "Reset Data" option (on Start screen, behind a confirm dialog) to clear all history.
5. **Responsive:** Works on desktop and tablet. Not optimized for phone (typing numbers on phone keyboard is awkward for this use case).

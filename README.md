# Snake Game — Ojas Kale's Arcade

A neon cyber-themed Snake game with swipe controls, leaderboard, and sound effects. Built with vanilla HTML, CSS, and JavaScript.

## Play

Open `index.html` in any browser, or [play on GitHub Pages](https://YOUR_USERNAME.github.io/snake-game/).

## Controls

| Input | Action |
|-------|--------|
| Arrow keys | Steer the snake (desktop) |
| Swipe on canvas | Steer the snake (mobile/tablet) |

## Features

- Neon cyber aesthetic with glow effects
- Snake head with eyes that follow the movement direction
- Gradient body colors
- Grid-based movement with direction buffering (prevents reverse-into-self)
- Procedural game-over sound via Web Audio API
- Eat and collision sound effects
- Score tracking with speed increase as score grows
- Player name entry on first load
- Persistent leaderboard (top 20 scores) in localStorage
- Responsive layout for mobile and desktop

## Files

```
index.html      — Game structure
style.css       — Styling and layout
script.js       — Game logic and audio
sounds/
  eat.mp3       — Eating sound
  boing.wav     — Collision sound
```

## Setup

No build tools or dependencies required. Clone and open `index.html`:

```bash
git clone <repo-url>
cd snake-game
open index.html
```

## Deploy to GitHub Pages

```bash
git remote add origin https://github.com/YOUR_USERNAME/snake-game.git
git push -u origin main
```

Then enable Pages in your repo settings — deploy from `main` branch root.

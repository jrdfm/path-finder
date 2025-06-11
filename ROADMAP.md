# Optimal Escape – Roadmap

> Last updated: <!-- date here if needed -->

This roadmap is split into **7 phases**, each with deliverables and estimated effort.  You can treat phases as weekly sprints or compress them if you have more developer bandwidth.

---
## Phase 0 – Repository & Tooling  (½ day)

- [ ] Initialise Git repository and push to GitHub.
- [ ] Scaffold front-end with Vite + React + TypeScript.
- [ ] Add ESLint, Prettier, and Husky pre-commit hook.
- [ ] Add Vitest and write a passing dummy test.
- [ ] Configure GitHub Actions: `npm ci`, `npm run test`, `npm run build`.

---
## Phase 1 – Core Data Model & Solver  (1 day)

- [ ] Define types: `Pos`, `Level`, `RunState`.
- [ ] Implement BFS (and Dijkstra/A* for weighted boards) in `/src/game/solver.ts`.
- [ ] Unit-test solver on toy 5×5 grids.
- [ ] Wrap solver in a Web Worker and expose async API.

---
## Phase 2 – Grey-Box UI Prototype  (1 day)

- [ ] Render grid with CSS Grid; basic walls and player square.
- [ ] WASD / arrow-key controls update player position.
- [ ] Maintain `runHistory` for Undo / Replay.
- [ ] Display live move count.

---
## Phase 3 – Scoring & Validation  (1 day)

- [ ] Load `optCost` from level JSON.
- [ ] On victory, compare player cost to optimal; award stars.
- [ ] Implement Undo (pop history) and Reset.

---
## Phase 4 – Level Generator & Loader  (2 days)

- [ ] Create `scripts/generateLevels.ts` (Node) that:
  - Carves maze or noise grid.
  - Picks random `start` and `exit`.
  - Solves with core algorithm; filters by difficulty metrics.
  - Stores `grid`, `start`, `optCost` in `src/levels/`.
- [ ] Build Level-Select screen listing all levels with difficulty colouring.
- [ ] Support `?daily` parameter for a daily challenge.

---
## Phase 5 – UX Polish  (2 days)

- [ ] Cell animation & victory confetti.
- [ ] Mobile-responsive layout (swipe controls).
- [ ] Heatmap overlay (distance heuristic) unlock after first clear.
- [ ] "Show Optimal Path" hint using solverWorker.
- [ ] Sound effects.

---
## Phase 6 – Persistence & Leaderboards  (1–2 days)

- [ ] LocalStorage for stars and last solved path.
- [ ] Integrate Supabase/Firebase for online leaderboards.
- [ ] Global ranking table on win screen.

---
## Phase 7 – Launch & Feedback (ongoing)

- [ ] Collect play-tester feedback.
- [ ] Add anonymised usage analytics.
- [ ] Iterate on generator parameters for smoother difficulty.
- [ ] Promote daily puzzle on social media.

---
### Nice-to-Have / Stretch Goals

- Level editor accessible from browser.
- Theme-switching (dark/light, colour-blind friendly palettes).
- Multiplayer race mode (WebSocket room – first to exit wins).
- Tutorial onboarding with guided overlay.

---
### Legend

| Symbol | Meaning |
| ------ | ------- |
| ✅     | Completed |
| 🔄     | In progress |
| ❌     | Postponed / removed |

</rewritten_file> 
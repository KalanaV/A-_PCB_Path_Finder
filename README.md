# PCB Pathfinding Visualizer

A browser-based visualizer for teaching and comparing search algorithms on a PCB-like grid (Manhattan routing, no diagonals). Includes:
- BFS (uninformed)
- Dijkstra (uninformed)
- A* (Manhattan heuristic, with optional weighted A*)
- Greedy Best-First (informed)
- Turn penalty β (applied in A* to discourage bends)

## Try it (GitHub Pages)

1) Commit these files to your repository (root).
2) In your GitHub repo: Settings → Pages → Build and deployment → Source: "Deploy from a branch"; Branch: "main" (or your default) / root.
3) Wait ~1–2 minutes. Your app will be live at:
```
https://<your-username>.github.io/<repo-name>/
```

Example:
```
https://nuwanRnR.github.io/pcb-pathfinding-visualizer/
```

## Run locally

- Easiest: use VS Code + "Live Server" extension and open `index.html`.
- Or run a simple server:
```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

## How to use

- Tools:
  - Draw Obstacles: click-drag to place walls
  - Erase: click-drag to remove walls
  - Set Start / Set Goal: click a cell
- Controls:
  - Algorithm: BFS, Dijkstra, A*, Greedy
  - Heuristic weight (w): A* uses f = g + w·h (w=1 is standard A*, w>1 speeds up but may sacrifice optimality)
  - Turn penalty (β): discourages bends (A* only in this demo)
  - Animation speed: ms between frames
  - Grid size: change cols/rows and click Resize
  - Buttons: Run, Step, Pause, Reset, Clear Walls, Random Obstacles
- Metrics:
  - Nodes expanded
  - Path length (steps)
  - Compute time (algorithm only; animation time excluded)
  - Animation frames

## Teaching tips

- Show BFS vs A*: BFS explores in "rings" and is optimal for unit-cost but slow; A* directs search to the goal.
- Increase `w` to demonstrate Weighted A* speeding up exploration.
- Add turn penalty β to mimic PCB trace aesthetics (fewer bends).
- Use narrow corridors and dead-ends to highlight algorithm differences.

## Notes

- Single layer only, Manhattan neighbors (no diagonals) to mirror PCB routing constraints.
- Dijkstra and BFS are equivalent on uniform unit-cost grids; both included to show algorithmic mechanics.
- For multi-layer routing (via costs), consider extending to a 3D grid or switch to Python + OR-Tools for richer constraints.

## License

MIT
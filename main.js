/* PCB Pathfinding Visualizer
   Algorithms: BFS, Dijkstra, A*, Greedy Best-First
   Grid: Manhattan (no diagonals)
   Added: A* g/h/f display overlay and inspector
*/

const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');

const controls = {
  algorithm: document.getElementById('algorithm'),
  heuristicWeight: document.getElementById('heuristicWeight'),
  heuristicWeightValue: document.getElementById('heuristicWeightValue'),
  turnPenalty: document.getElementById('turnPenalty'),
  turnPenaltyValue: document.getElementById('turnPenaltyValue'),
  speed: document.getElementById('speed'),
  speedValue: document.getElementById('speedValue'),
  cols: document.getElementById('cols'),
  rows: document.getElementById('rows'),
  resize: document.getElementById('resize'),
  run: document.getElementById('run'),
  step: document.getElementById('step'),
  pause: document.getElementById('pause'),
  reset: document.getElementById('reset'),
  clearWalls: document.getElementById('clearWalls'),
  randomMaze: document.getElementById('randomMaze'),
  showScores: document.getElementById('showScores'),
};
const metrics = {
  nodesExpanded: document.getElementById('nodesExpanded'),
  pathLength: document.getElementById('pathLength'),
  computeTime: document.getElementById('computeTime'),
  frames: document.getElementById('frames'),
  inspectX: document.getElementById('inspectX'),
  inspectY: document.getElementById('inspectY'),
  inspectG: document.getElementById('inspectG'),
  inspectH: document.getElementById('inspectH'),
  inspectF: document.getElementById('inspectF'),
  inspectW: document.getElementById('inspectW'),
};

const COLORS = {
  bg: '#1f263a',
  wall: '#3b4252',
  start: '#20c997',
  goal: '#ff6b6b',
  visited: '#ffc857',
  frontier: '#4cc9f0',
  path: '#90ee90',
  gridLine: 'rgba(255,255,255,0.06)',
  text: '#e7ecf3'
};

const DIRS = [
  [1, 0], [0, 1], [-1, 0], [0, -1]
]; // Right, Down, Left, Up

let state = {
  cols: 40,
  rows: 24,
  cell: 24, // pixels
  grid: [], // 0 empty, 1 wall
  start: { x: 2, y: 2 },
  goal: { x: 30, y: 18 },
  tool: 'draw',
  isMouseDown: false,
  lastPaint: null,
  hoverCell: null,
  animation: {
    steps: [],
    i: 0,
    timer: null,
    running: false
  },
  showScores: false,
  lastRun: {
    algo: '',
    w: 1,
    computeMs: 0,
    nodesExpanded: 0,
    pathLength: 0,
    frames: 0,
    scores: new Map(), // key -> { g, h, f }
  }
};

function initGrid(cols, rows) {
  state.cols = cols;
  state.rows = rows;
  state.grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  // Keep start/goal in-bounds
  state.start.x = Math.min(state.start.x, cols - 1);
  state.start.y = Math.min(state.start.y, rows - 1);
  state.goal.x = Math.min(state.goal.x, cols - 1);
  state.goal.y = Math.min(state.goal.y, rows - 1);
  resizeCanvas();
  draw();
}

function resizeCanvas() {
  const containerWidth = canvas.clientWidth;
  const cellSizeW = Math.floor(containerWidth / state.cols);
  const cellSize = Math.max(8, Math.min(32, cellSizeW));
  state.cell = cellSize;
  canvas.width = state.cols * state.cell;
  canvas.height = state.rows * state.cell;
}

window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});

// Drawing
function draw() {
  const { cols, rows, cell, grid, start, goal } = state;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cells (walls)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === 1) fillCell(x, y, COLORS.wall);
    }
  }

  // Grid lines
  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= cols; x++) {
    const X = x * cell + 0.5;
    ctx.moveTo(X, 0);
    ctx.lineTo(X, rows * cell);
  }
  for (let y = 0; y <= rows; y++) {
    const Y = y * cell + 0.5;
    ctx.moveTo(0, Y);
    ctx.lineTo(cols * cell, Y);
  }
  ctx.stroke();

  // Start and Goal
  fillCell(start.x, start.y, COLORS.start);
  fillCell(goal.x, goal.y, COLORS.goal);

  // Optional: overlay g/h/f values for A*
  if (state.showScores && state.lastRun.algo === 'astar') {
    drawAllScoresOverlay();
  }
}

function drawAllScoresOverlay() {
  const scores = state.lastRun.scores;
  if (!scores || scores.size === 0) return;
  for (const k of scores.keys()) {
    const [x, y] = k.split(',').map(Number);
    drawCellScores(x, y);
  }
}

function fillCell(x, y, color) {
  const { cell } = state;
  ctx.fillStyle = color;
  ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
}

function drawText(x, y, text, color, font) {
  ctx.fillStyle = color ?? COLORS.text;
  ctx.font = font ?? '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillText(text, x, y);
}

function drawCellScores(x, y) {
  const s = state.lastRun.scores.get(key(x, y));
  if (!s) return;
  const c = state.cell;
  // Small padding
  const px = x * c + 3;
  const py = y * c + 10;

  // Outline text for readability on colored cells
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.strokeText(`g:${fmt(s.g)}`, px, py);
  ctx.strokeText(`h:${fmt(s.h)}`, px + Math.floor(c / 2), py);
  ctx.strokeText(`f:${fmt(s.f)}`, px, py + 10);

  ctx.fillStyle = COLORS.text;
  ctx.fillText(`g:${fmt(s.g)}`, px, py);
  ctx.fillText(`h:${fmt(s.h)}`, px + Math.floor(c / 2), py);
  ctx.fillText(`f:${fmt(s.f)}`, px, py + 10);
  ctx.restore();
}

function fmt(v) {
  if (v === undefined || v === null || Number.isNaN(v)) return '-';
  // show integer if close, else 1 decimal
  return Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(1);
}

function outlineCell(x, y, color) {
  const { cell } = state;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
}

// Interaction
canvas.addEventListener('mousedown', (e) => {
  state.isMouseDown = true;
  handlePaint(e);
});
canvas.addEventListener('mousemove', (e) => {
  if (state.isMouseDown) handlePaint(e);
  updateHover(e);
});
canvas.addEventListener('mouseup', () => {
  state.isMouseDown = false;
  state.lastPaint = null;
});
canvas.addEventListener('mouseleave', () => {
  state.isMouseDown = false;
  state.lastPaint = null;
  state.hoverCell = null;
  updateInspector();
});

function eventToCell(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / state.cell);
  const y = Math.floor((e.clientY - rect.top) / state.cell);
  if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return null;
  return { x, y };
}

function handlePaint(e) {
  const cell = eventToCell(e);
  if (!cell) return;
  const { x, y } = cell;

  const tool = state.tool;
  if (tool === 'draw' || tool === 'erase') {
    const val = tool === 'draw' ? 1 : 0;

    if (state.lastPaint && state.lastPaint.x === x && state.lastPaint.y === y && state.grid[y][x] === val) return;
    if ((x === state.start.x && y === state.start.y) || (x === state.goal.x && y === state.goal.y)) return;

    state.grid[y][x] = val;
    state.lastPaint = { x, y };
  } else if (tool === 'start') {
    if (state.grid[y][x] === 1 || (x === state.goal.x && y === state.goal.y)) return;
    state.start = { x, y };
  } else if (tool === 'goal') {
    if (state.grid[y][x] === 1 || (x === state.start.x && y === state.start.y)) return;
    state.goal = { x, y };
  }
  draw();
}

function updateHover(e) {
  const cell = eventToCell(e);
  state.hoverCell = cell;
  updateInspector();
}

function updateInspector() {
  const a = state.lastRun.algo;
  const w = state.lastRun.w ?? parseFloat(controls.heuristicWeight.value);
  metrics.inspectW.textContent = Number(w).toFixed(1);

  if (!state.hoverCell || a !== 'astar') {
    metrics.inspectX.textContent = '-';
    metrics.inspectY.textContent = '-';
    metrics.inspectG.textContent = '-';
    metrics.inspectH.textContent = '-';
    metrics.inspectF.textContent = '-';
    return;
  }
  const { x, y } = state.hoverCell;
  metrics.inspectX.textContent = String(x);
  metrics.inspectY.textContent = String(y);

  const s = state.lastRun.scores.get(key(x, y));
  if (!s) {
    metrics.inspectG.textContent = '-';
    metrics.inspectH.textContent = '-';
    metrics.inspectF.textContent = '-';
  } else {
    metrics.inspectG.textContent = fmt(s.g);
    metrics.inspectH.textContent = fmt(s.h);
    metrics.inspectF.textContent = fmt(s.f);
  }
}

const toolsRadios = [...document.querySelectorAll('input[name="tool"]')];
toolsRadios.forEach(r => {
  r.addEventListener('change', () => {
    state.tool = document.querySelector('input[name="tool"]:checked').value;
  });
});

// Controls
controls.heuristicWeight.addEventListener('input', () => {
  controls.heuristicWeightValue.textContent = Number(controls.heuristicWeight.value).toFixed(1);
  metrics.inspectW.textContent = Number(controls.heuristicWeight.value).toFixed(1);
});
controls.turnPenalty.addEventListener('input', () => {
  controls.turnPenaltyValue.textContent = Number(controls.turnPenalty.value).toFixed(1);
});
controls.speed.addEventListener('input', () => {
  controls.speedValue.textContent = controls.speed.value;
});
controls.showScores.addEventListener('change', () => {
  state.showScores = controls.showScores.checked;
  draw();
});

controls.resize.addEventListener('click', () => {
  const c = clamp(parseInt(controls.cols.value || '40', 10), 5, 80);
  const r = clamp(parseInt(controls.rows.value || '24', 10), 5, 60);
  initGrid(c, r);
});

controls.clearWalls.addEventListener('click', () => {
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      if ((x === state.start.x && y === state.start.y) || (x === state.goal.x && y === state.goal.y)) continue;
      state.grid[y][x] = 0;
    }
  }
  draw();
});

controls.randomMaze.addEventListener('click', () => {
  const density = 0.25;
  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      if ((x === state.start.x && y === state.start.y) || (x === state.goal.x && y === state.goal.y)) {
        state.grid[y][x] = 0;
      } else {
        state.grid[y][x] = Math.random() < density ? 1 : 0;
      }
    }
  }
  draw();
});

controls.run.addEventListener('click', run);
controls.step.addEventListener('click', stepOnce);
controls.pause.addEventListener('click', pause);
controls.reset.addEventListener('click', reset);

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

// Search and animation
function run() {
  pause();
  const algo = controls.algorithm.value;
  const w = parseFloat(controls.heuristicWeight.value);
  const beta = parseFloat(controls.turnPenalty.value);

  const result = compute(algo, { w, beta });
  state.animation.steps = result.steps;
  state.animation.i = 0;
  state.animation.running = true;

  // Update metrics
  metrics.nodesExpanded.textContent = result.nodesExpanded.toString();
  metrics.pathLength.textContent = result.pathLength.toString();
  metrics.computeTime.textContent = result.computeMs.toFixed(2);
  metrics.frames.textContent = result.steps.length.toString();

  // Cache last run
  state.lastRun.algo = algo;
  state.lastRun.w = result.w ?? w;
  state.lastRun.scores = result.scores ?? new Map();

  // Draw base grid before animating
  draw();
  // Start animation loop
  animate();
}

function stepOnce() {
  if (!state.animation.steps.length) {
    run();
    pause();
    return;
  }
  if (state.animation.i >= state.animation.steps.length) return;
  applyStep(state.animation.steps[state.animation.i++]);
  metrics.frames.textContent = state.animation.i.toString();
}

function pause() {
  state.animation.running = false;
  if (state.animation.timer) {
    clearTimeout(state.animation.timer);
    state.animation.timer = null;
  }
}

function reset() {
  pause();
  state.animation.steps = [];
  state.animation.i = 0;
  metrics.nodesExpanded.textContent = '0';
  metrics.pathLength.textContent = '0';
  metrics.computeTime.textContent = '0';
  metrics.frames.textContent = '0';
  state.lastRun = { algo: '', w: 1, computeMs: 0, nodesExpanded: 0, pathLength: 0, frames: 0, scores: new Map() };
  draw();
}

function animate() {
  if (!state.animation.running) return;
  const sp = parseInt(controls.speed.value, 10);
  if (state.animation.i >= state.animation.steps.length) {
    state.animation.running = false;
    return;
  }
  applyStep(state.animation.steps[state.animation.i++]);
  metrics.frames.textContent = state.animation.i.toString();
  state.animation.timer = setTimeout(() => requestAnimationFrame(animate), sp);
}

function applyStep(step) {
  const { type } = step;
  if (type === 'visit') {
    fillCell(step.x, step.y, COLORS.visited);
  } else if (type === 'frontier') {
    fillCell(step.x, step.y, COLORS.frontier);
  } else if (type === 'path') {
    fillCell(step.x, step.y, COLORS.path);
  }
  // Optional: draw g/h/f for this cell if available
  if (state.showScores && state.lastRun.algo === 'astar') {
    drawCellScores(step.x, step.y);
  }

  // Keep start/goal visible
  fillCell(state.start.x, state.start.y, COLORS.start);
  fillCell(state.goal.x, state.goal.y, COLORS.goal);
}

function neighbors(x, y) {
  const out = [];
  for (let d = 0; d < 4; d++) {
    const nx = x + DIRS[d][0];
    const ny = y + DIRS[d][1];
    if (nx >= 0 && ny >= 0 && nx < state.cols && ny < state.rows && state.grid[ny][nx] === 0) {
      out.push({ x: nx, y: ny, dir: d });
    }
  }
  return out;
}

function key(x, y) { return `${x},${y}`; }

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan
}

// Priority Queue (simple)
class MinQueue {
  constructor(scoreFn) {
    this.items = [];
    this.scoreFn = scoreFn;
  }
  push(item) { this.items.push(item); }
  pop() {
    if (this.items.length === 0) return undefined;
    let bestIdx = 0;
    let bestScore = this.scoreFn(this.items[0]);
    for (let i = 1; i < this.items.length; i++) {
      const s = this.scoreFn(this.items[i]);
      if (s < bestScore) { bestScore = s; bestIdx = i; }
    }
    return this.items.splice(bestIdx, 1)[0];
  }
  isEmpty() { return this.items.length === 0; }
}

function reconstructPath(prev, endK) {
  const path = [];
  let cur = endK;
  while (cur && prev.has(cur)) {
    const [x, y] = cur.split(',').map(Number);
    path.push({ x, y });
    const next = prev.get(cur);
    if (next === null) break;
    cur = next;
  }
  return path.reverse();
}

function compute(algo, opts) {
  const startT = performance.now();
  const steps = [];
  const start = state.start;
  const goal = state.goal;
  const prev = new Map(); // key -> key
  let nodesExpanded = 0;

  if (state.grid[start.y][start.x] === 1 || state.grid[goal.y][goal.x] === 1) {
    return { steps, nodesExpanded: 0, pathLength: 0, computeMs: 0, scores: new Map(), w: opts?.w ?? 1 };
  }

  // For A* value display
  const scores = new Map(); // key -> { g, h, f }

  if (algo === 'bfs') {
    const visited = new Set();
    const q = [];
    q.push({ x: start.x, y: start.y });
    prev.set(key(start.x, start.y), null);
    visited.add(key(start.x, start.y));
    while (q.length) {
      const cur = q.shift();
      if (!(cur.x === start.x && cur.y === start.y)) steps.push({ type: 'visit', x: cur.x, y: cur.y });
      nodesExpanded++;
      if (cur.x === goal.x && cur.y === goal.y) break;

      for (const nb of neighbors(cur.x, cur.y)) {
        const k = key(nb.x, nb.y);
        if (!visited.has(k)) {
          visited.add(k);
          prev.set(k, key(cur.x, cur.y));
          steps.push({ type: 'frontier', x: nb.x, y: nb.y });
          q.push({ x: nb.x, y: nb.y });
        }
      }
    }
  } else if (algo === 'dijkstra') {
    const dist = new Map();
    const mq = new MinQueue((n) => dist.get(key(n.x, n.y)) ?? Infinity);
    const sk = key(start.x, start.y);
    dist.set(sk, 0);
    prev.set(sk, null);
    mq.push({ x: start.x, y: start.y });

    const seen = new Set();
    while (!mq.isEmpty()) {
      const cur = mq.pop();
      const ck = key(cur.x, cur.y);
      if (seen.has(ck)) continue;
      seen.add(ck);
      if (!(cur.x === start.x && cur.y === start.y)) steps.push({ type: 'visit', x: cur.x, y: cur.y });
      nodesExpanded++;
      if (cur.x === goal.x && cur.y === goal.y) break;

      for (const nb of neighbors(cur.x, cur.y)) {
        const nk = key(nb.x, nb.y);
        const alt = (dist.get(ck) ?? Infinity) + 1; // uniform cost
        if (alt < (dist.get(nk) ?? Infinity)) {
          dist.set(nk, alt);
          prev.set(nk, ck);
          steps.push({ type: 'frontier', x: nb.x, y: nb.y });
          mq.push({ x: nb.x, y: nb.y });
        }
      }
    }
  } else if (algo === 'astar' || algo === 'greedy') {
    const w = opts?.w ?? 1;
    const beta = opts?.beta ?? 0;
    const g = new Map();
    const dirMap = new Map(); // key -> direction index used to arrive
    const sk = key(start.x, start.y);
    g.set(sk, 0);
    prev.set(sk, null);

    // Record start node scores
    const h0 = heuristic(start, goal);
    scores.set(sk, { g: 0, h: h0, f: (algo === 'greedy' ? h0 : 0 + w * h0) });

    const mq = new MinQueue((n) => {
      const kk = key(n.x, n.y);
      const gn = g.get(kk) ?? Infinity;
      const hn = heuristic(n, goal);
      if (algo === 'greedy') return hn;
      return gn + w * hn;
    });

    mq.push({ x: start.x, y: start.y });

    const closed = new Set();
    while (!mq.isEmpty()) {
      const cur = mq.pop();
      const ck = key(cur.x, cur.y);
      if (closed.has(ck)) continue;
      closed.add(ck);
      if (!(cur.x === start.x && cur.y === start.y)) steps.push({ type: 'visit', x: cur.x, y: cur.y });
      nodesExpanded++;
      if (cur.x === goal.x && cur.y === goal.y) break;

      const curDir = dirMap.get(ck) ?? null;
      for (const nb of neighbors(cur.x, cur.y)) {
        const nk = key(nb.x, nb.y);
        const turnCost = (curDir === null || curDir === nb.dir) ? 0 : beta;
        const stepCost = 1 + (algo === 'greedy' ? 0 : turnCost); // turn penalty for A*
        const tentativeG = (g.get(ck) ?? Infinity) + stepCost;

        if (tentativeG < (g.get(nk) ?? Infinity)) {
          g.set(nk, tentativeG);
          prev.set(nk, ck);
          dirMap.set(nk, nb.dir);

          const hn = heuristic(nb, goal);
          const fn = (algo === 'greedy') ? hn : tentativeG + w * hn;

          // Store scores for overlay/inspector (A* only; we store for Greedy too if you switch overlays later)
          scores.set(nk, { g: tentativeG, h: hn, f: fn });

          steps.push({ type: 'frontier', x: nb.x, y: nb.y });
          mq.push({ x: nb.x, y: nb.y });
        }
      }
    }

    // Return w with results so inspector shows correct formula
    const endK = key(goal.x, goal.y);
    const endT = performance.now();
    const path = prev.has(endK) ? reconstructPath(prev, endK) : [];
    for (const p of path) steps.push({ type: 'path', x: p.x, y: p.y });
    return {
      steps,
      nodesExpanded,
      pathLength: path.length ? path.length - 1 : 0,
      computeMs: endT - startT,
      scores, // for overlays
      w
    };
  }

  // For BFS/Dijkstra, finish normally
  const endK = key(goal.x, goal.y);
  let path = [];
  if (prev.has(endK)) {
    path = reconstructPath(prev, endK);
    for (const p of path) steps.push({ type: 'path', x: p.x, y: p.y });
  }
  const endT2 = performance.now();
  return {
    steps,
    nodesExpanded,
    pathLength: path.length ? path.length - 1 : 0,
    computeMs: endT2 - startT,
    scores: new Map(),
    w: opts?.w ?? 1
  };
}

// Sync UI labels initially
controls.heuristicWeightValue.textContent = Number(controls.heuristicWeight.value).toFixed(1);
controls.turnPenaltyValue.textContent = Number(controls.turnPenalty.value).toFixed(1);
controls.speedValue.textContent = controls.speed.value;
metrics.inspectW.textContent = Number(controls.heuristicWeight.value).toFixed(1);

// Initialize
initGrid(state.cols, state.rows);
draw();

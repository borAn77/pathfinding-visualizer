# 🧭 Pathfinding Visualizer

> Visualize 6 pathfinding algorithms in real time — watch how each one explores the grid differently, generates mazes, and finds (or fails to find) the shortest path.

[![Live Demo](https://img.shields.io/badge/▶%20Live%20Demo-Play%20Now-6366f1?style=for-the-badge)](https://pathfinding-visualizer-eta-eight.vercel.app)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)](https://reactjs.org)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000?style=for-the-badge&logo=vercel)](https://vercel.com)

---

## 🎮 [Click here to play → pathfinding-visualizer-eta-eight.vercel.app](https://pathfinding-visualizer-eta-eight.vercel.app)

---

## Algorithms

| Algorithm | Weighted | Optimal | Time Complexity | Data Structure |
|-----------|----------|---------|-----------------|----------------|
| Dijkstra | ✅ | ✅ | O(E log V) | MinHeap |
| A\* Search | ✅ | ✅ | O(E log V) | MinHeap + Heuristic |
| BFS | ❌ | ✅ | O(V + E) | Queue (FIFO) |
| DFS | ❌ | ❌ | O(V + E) | Stack (LIFO) |
| Greedy BFS | ❌ | ❌ | O(E log V) | MinHeap + Heuristic |
| Bidirectional BFS | ❌ | ✅ | O(b^(d/2)) | Dual Queue |

## Features

- **6 pathfinding algorithms** with real-time animation
- **MinHeap implementation** for O(log n) priority queue operations — not array sort
- **3 maze generators** — Recursive Backtracking, Prim's Algorithm, Random
- **Weighted nodes** — place cost ×5 nodes to demonstrate Dijkstra vs Greedy differences
- **Complexity panel** — time complexity, space complexity, optimal/weighted info per algorithm
- **Draggable start/end nodes** — reposition without redrawing walls
- **3 animation speeds** — Slow, Normal, Fast
- **Stats** — nodes visited, path length, and calculation time after each run

## How to Use

1. Select an algorithm from the top bar
2. Click and drag on the grid to draw walls
3. Toggle **⚖ Weights** to place weighted nodes
4. Click **Visualize** to run
5. Use **Recursive / Prim's / Random** to generate mazes
6. Drag the green ▶ (start) or red ◉ (end) node anywhere on the grid

## Key Implementation Details

**MinHeap** — Dijkstra, A\*, Greedy, and Bi-BFS all use a proper binary heap instead of `array.sort()`, giving true O(log n) push/pop:

```js
class MinHeap {
  push(v) { this.heap.push(v); this._bubbleUp(this.heap.length - 1); }
  pop()   { /* sift down */ }
}
```

**A\* Heuristic** — Manhattan distance `h(n) = |Δrow| + |Δcol|`, admissible for 4-directional grid movement:

```js
function manhattan(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}
```

**Bidirectional BFS** — searches from both start and end simultaneously, meeting in the middle. Explores O(b^(d/2)) nodes vs O(b^d) for standard BFS.

## Running Locally

```bash
git clone https://github.com/boran77/pathfinding-visualizer.git
cd pathfinding-visualizer
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Built With

- React 18
- CSS animations (no external animation library)
- Deployed on Vercel

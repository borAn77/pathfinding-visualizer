import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
const ROWS = 21;
const COLS = 48;
const START = { row: 10, col: 4 };
const END   = { row: 10, col: 43 };

const T = {
  EMPTY: "empty", WALL: "wall", START: "start", END: "end",
  VISITED: "visited", PATH: "path", WEIGHT: "weight",
};

const SPEED_MS = { Slow: 55, Normal: 18, Fast: 3 };

// ─────────────────────────────────────────────
//  MIN-HEAP  O(log n) push / pop
// ─────────────────────────────────────────────
class MinHeap {
  constructor(cmp) { this.heap = []; this.cmp = cmp; }
  push(v) { this.heap.push(v); this._up(this.heap.length - 1); }
  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length) { this.heap[0] = last; this._down(0); }
    return top;
  }
  get size() { return this.heap.length; }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.heap[i], this.heap[p]) >= 0) break;
      [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
      i = p;
    }
  }
  _down(i) {
    const n = this.heap.length;
    while (true) {
      let m = i, l = 2*i+1, r = 2*i+2;
      if (l < n && this.cmp(this.heap[l], this.heap[m]) < 0) m = l;
      if (r < n && this.cmp(this.heap[r], this.heap[m]) < 0) m = r;
      if (m === i) break;
      [this.heap[i], this.heap[m]] = [this.heap[m], this.heap[i]];
      i = m;
    }
  }
}

// ─────────────────────────────────────────────
//  GRID
// ─────────────────────────────────────────────
function makeNode(r, c) {
  return {
    row: r, col: c,
    type: r===START.row&&c===START.col ? T.START : r===END.row&&c===END.col ? T.END : T.EMPTY,
    dist: Infinity, g: Infinity, h: 0, f: Infinity,
    visited: false, parent: null, weight: 1,
  };
}
function createGrid() {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => makeNode(r, c))
  );
}
const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];
function nbrs(g, n) {
  return DIRS.map(([dr,dc]) => g[n.row+dr]?.[n.col+dc])
             .filter(nb => nb && nb.type !== T.WALL);
}
function manhattan(a, b) { return Math.abs(a.row-b.row)+Math.abs(a.col-b.col); }
function buildPath(end) {
  const p=[]; let cur=end;
  while(cur){p.unshift(cur);cur=cur.parent;}
  return p.length>1?p:[];
}

// ─────────────────────────────────────────────
//  ALGORITHMS
// ─────────────────────────────────────────────
function dijkstra(g, s, e) {
  const vis=[];
  s.dist=0;
  const pq=new MinHeap((a,b)=>a.dist-b.dist);
  pq.push(s);
  while(pq.size){
    const cur=pq.pop();
    if(cur.visited)continue;
    cur.visited=true; vis.push(cur);
    if(cur===e)break;
    for(const nb of nbrs(g,cur)){
      const d=cur.dist+nb.weight;
      if(d<nb.dist){nb.dist=d;nb.parent=cur;pq.push(nb);}
    }
  }
  return{visited:vis,path:buildPath(e)};
}

function aStar(g, s, e) {
  const vis=[];
  s.g=0;s.h=manhattan(s,e);s.f=s.h;
  const open=new MinHeap((a,b)=>a.f-b.f);
  const closed=new Set();
  open.push(s);
  while(open.size){
    const cur=open.pop();
    if(closed.has(cur))continue;
    closed.add(cur);cur.visited=true;vis.push(cur);
    if(cur===e)break;
    for(const nb of nbrs(g,cur)){
      if(closed.has(nb))continue;
      const tg=cur.g+nb.weight;
      if(tg<nb.g){
        nb.g=tg;nb.h=manhattan(nb,e);nb.f=nb.g+nb.h;nb.parent=cur;open.push(nb);
      }
    }
  }
  return{visited:vis,path:buildPath(e)};
}

function bfs(g, s, e) {
  const vis=[],q=[s];s.visited=true;
  while(q.length){
    const cur=q.shift();vis.push(cur);
    if(cur===e)break;
    for(const nb of nbrs(g,cur)){
      if(!nb.visited){nb.visited=true;nb.parent=cur;q.push(nb);}
    }
  }
  return{visited:vis,path:buildPath(e)};
}

function dfs(g, s, e) {
  const vis=[],stack=[s];s.visited=true;
  while(stack.length){
    const cur=stack.pop();vis.push(cur);
    if(cur===e)break;
    for(const nb of nbrs(g,cur)){
      if(!nb.visited){nb.visited=true;nb.parent=cur;stack.push(nb);}
    }
  }
  return{visited:vis,path:buildPath(e)};
}

function greedy(g, s, e) {
  const vis=[];
  s.h=manhattan(s,e);
  const open=new MinHeap((a,b)=>a.h-b.h);
  s.visited=true;open.push(s);
  while(open.size){
    const cur=open.pop();vis.push(cur);
    if(cur===e)break;
    for(const nb of nbrs(g,cur)){
      if(!nb.visited){nb.visited=true;nb.h=manhattan(nb,e);nb.parent=cur;open.push(nb);}
    }
  }
  return{visited:vis,path:buildPath(e)};
}

function bidiBFS(g, s, e) {
  const vis=[];
  if(s===e)return{visited:[],path:[s]};
  const fQ=[s],bQ=[e];
  const fS=new Map([[s,null]]),bS=new Map([[e,null]]);
  s.visited=true;e.visited=true;
  let meet=null;
  outer:while(fQ.length&&bQ.length){
    const cf=fQ.shift();vis.push(cf);
    for(const nb of nbrs(g,cf)){
      if(!fS.has(nb)){fS.set(nb,cf);nb.parent=cf;fQ.push(nb);if(bS.has(nb)){meet=nb;break outer;}}
    }
    const cb=bQ.shift();vis.push(cb);
    for(const nb of nbrs(g,cb)){
      if(!bS.has(nb)){bS.set(nb,cb);bQ.push(nb);if(fS.has(nb)){meet=nb;break outer;}}
    }
  }
  if(!meet)return{visited:vis,path:[]};
  const fwd=[],bwd=[];
  let cur=meet;while(cur){fwd.unshift(cur);cur=fS.get(cur);}
  cur=bS.get(meet);while(cur){bwd.push(cur);cur=bS.get(cur);}
  return{visited:vis,path:[...fwd,...bwd]};
}

// ─────────────────────────────────────────────
//  MAZE GENERATORS
// ─────────────────────────────────────────────
function baseWall(g) {
  return g.map(row=>row.map(n=>({...n,type:n.type===T.START||n.type===T.END?n.type:T.WALL,dist:Infinity,g:Infinity,h:0,f:Infinity,visited:false,parent:null})));
}

function mazeRecursive(g) {
  const gr=baseWall(g);
  function carve(r,c){
    const ds=[[...DIRS[0]],[...DIRS[1]],[...DIRS[2]],[...DIRS[3]]].map(d=>d.map(x=>x*2)).sort(()=>Math.random()-.5);
    for(const[dr,dc]of ds){
      const nr=r+dr,nc=c+dc;
      if(nr>0&&nr<ROWS-1&&nc>0&&nc<COLS-1&&gr[nr][nc].type===T.WALL){
        gr[nr][nc].type=T.EMPTY;gr[r+dr/2][c+dc/2].type=T.EMPTY;carve(nr,nc);
      }
    }
  }
  const sr=START.row%2===0?START.row+1:START.row,sc=START.col%2===0?START.col+1:START.col;
  gr[sr][sc].type=T.EMPTY;carve(sr,sc);
  gr[START.row][START.col].type=T.START;gr[END.row][END.col].type=T.END;
  return gr;
}

function mazePrim(g) {
  const gr=baseWall(g);
  const inM=new Set();const walls=[];
  function addW(r,c){
    for(const[dr,dc]of DIRS.map(d=>d.map(x=>x*2))){
      const nr=r+dr,nc=c+dc;
      if(nr>0&&nr<ROWS-1&&nc>0&&nc<COLS-1)walls.push([r,c,nr,nc,r+dr/2,c+dc/2]);
    }
  }
  const sr=START.row%2===0?START.row+1:START.row,sc=START.col%2===0?START.col+1:START.col;
  gr[sr][sc].type=T.EMPTY;inM.add(`${sr},${sc}`);addW(sr,sc);
  while(walls.length){
    const idx=Math.floor(Math.random()*walls.length);
    const[,,nr,nc,mr,mc]=walls.splice(idx,1)[0];
    const k=`${nr},${nc}`;
    if(!inM.has(k)){gr[nr][nc].type=T.EMPTY;gr[mr][mc].type=T.EMPTY;inM.add(k);addW(nr,nc);}
  }
  gr[START.row][START.col].type=T.START;gr[END.row][END.col].type=T.END;
  return gr;
}

function mazeRandom(g) {
  return g.map(row=>row.map(n=>({
    ...n,type:n.type===T.START||n.type===T.END?n.type:Math.random()<0.28?T.WALL:T.EMPTY,
    dist:Infinity,g:Infinity,h:0,f:Infinity,visited:false,parent:null
  })));
}

// ─────────────────────────────────────────────
//  METADATA
// ─────────────────────────────────────────────
const ALGOS = {
  "Dijkstra": { fn:dijkstra,  weighted:true,  optimal:true,  time:"O(E log V)", space:"O(V)",       impl:"MinHeap",             color:"#06b6d4", desc:"Explores by shortest known distance. Optimal on weighted graphs." },
  "A*":       { fn:aStar,     weighted:true,  optimal:true,  time:"O(E log V)", space:"O(V)",       impl:"MinHeap + h(n)",       color:"#8b5cf6", desc:"Dijkstra guided by Manhattan heuristic f = g + h. Fewer expansions." },
  "BFS":      { fn:bfs,       weighted:false, optimal:true,  time:"O(V + E)",   space:"O(V)",       impl:"Queue (FIFO)",         color:"#10b981", desc:"Level-by-level expansion. Guarantees shortest path (unweighted)." },
  "DFS":      { fn:dfs,       weighted:false, optimal:false, time:"O(V + E)",   space:"O(V)",       impl:"Stack (LIFO)",         color:"#f59e0b", desc:"Dives deep before backtracking. Does NOT guarantee shortest path." },
  "Greedy":   { fn:greedy,    weighted:false, optimal:false, time:"O(E log V)", space:"O(V)",       impl:"MinHeap + h(n)",       color:"#f43f5e", desc:"Always moves toward target via heuristic only. Fast, not optimal." },
  "Bi-BFS":   { fn:bidiBFS,   weighted:false, optimal:true,  time:"O(b^(d/2))", space:"O(b^(d/2))",impl:"Dual Queue",           color:"#a78bfa", desc:"Searches from both ends. Exponentially faster than one-way BFS." },
};

const MAZES = { "Recursive": mazeRecursive, "Prim's": mazePrim, "Random": mazeRandom };

// ─────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────
export default function PathfindingVisualizer() {
  const [grid, setGrid]       = useState(() => createGrid());
  const [algo, setAlgo]       = useState("A*");
  const [speed, setSpeed]     = useState("Normal");
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const [stats, setStats]     = useState(null);
  const [mouseDown, setMouseDown] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [weightMode, setWeightMode] = useState(false);
  const timers = useRef([]);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const killTimers = () => { timers.current.forEach(clearTimeout); timers.current=[]; };

  const resetAll = useCallback(() => {
    killTimers(); setRunning(false); setDone(false); setStats(null); setGrid(createGrid());
  }, []);

  const clearPath = useCallback(() => {
    killTimers(); setRunning(false); setDone(false); setStats(null);
    setGrid(g => g.map(row => row.map(n => ({
      ...n,
      type: n.type===T.VISITED||n.type===T.PATH ? T.EMPTY : n.type,
      dist:Infinity, g:Infinity, h:0, f:Infinity, visited:false, parent:null,
    }))));
  }, []);

  const applyMaze = useCallback((name) => {
    killTimers(); setRunning(false); setDone(false); setStats(null);
    setGrid(g => MAZES[name](g));
  }, []);

  const visualize = useCallback(() => {
    if (running) return;
    clearPath();
    setTimeout(() => {
      const g = gridRef.current.map(row => row.map(n => ({
        ...n, dist:Infinity, g:Infinity, h:0, f:Infinity, visited:false, parent:null,
      })));
      let s, e;
      for (const row of g) for (const n of row) {
        if(n.type===T.START) s=n; if(n.type===T.END) e=n;
      }
      if(!s||!e) return;
      const t0=performance.now();
      const {visited,path}=ALGOS[algo].fn(g,s,e);
      const elapsed=(performance.now()-t0).toFixed(2);
      setRunning(true);
      const ms=SPEED_MS[speed];

      visited.forEach((n,i) => {
        if(n.type===T.START||n.type===T.END) return;
        const tid=setTimeout(()=>{
          setGrid(prev=>{const nx=prev.map(r=>[...r]);nx[n.row][n.col]={...nx[n.row][n.col],type:T.VISITED};return nx;});
        }, i*ms);
        timers.current.push(tid);
      });
      const base=visited.length*ms;
      path.forEach((n,i) => {
        if(n.type===T.START||n.type===T.END) return;
        const tid=setTimeout(()=>{
          setGrid(prev=>{const nx=prev.map(r=>[...r]);nx[n.row][n.col]={...nx[n.row][n.col],type:T.PATH};return nx;});
        }, base+i*ms*2.5);
        timers.current.push(tid);
      });
      const fin=setTimeout(()=>{
        setRunning(false);setDone(true);
        setStats({visited:visited.length,path:path.length,time:elapsed});
      }, base+path.length*ms*2.5+80);
      timers.current.push(fin);
    }, 30);
  }, [algo, speed, running, clearPath]);

  const interact = useCallback((r,c) => {
    if(running) return;
    setGrid(prev=>{
      const g=prev.map(row=>[...row]);
      const n=g[r][c];
      if(n.type===T.START||n.type===T.END) return prev;
      if(weightMode){
        g[r][c]={...n,type:n.type===T.WEIGHT?T.EMPTY:T.WEIGHT,weight:n.type===T.WEIGHT?1:5};
      } else {
        if(erasing) g[r][c]={...n,type:T.EMPTY};
        else g[r][c]={...n,type:n.type===T.WALL?T.EMPTY:T.WALL};
      }
      return g;
    });
  }, [running, weightMode, erasing]);

  const onDown = (r,c) => {
    if(running) return;
    const n=grid[r][c];
    if(n.type===T.START||n.type===T.END){setDragging(n.type);return;}
    setErasing(n.type===T.WALL);
    setMouseDown(true);
    interact(r,c);
  };
  const onEnter = (r,c) => {
    if(running||(!mouseDown&&!dragging)) return;
    if(dragging){
      setGrid(prev=>{
        const g=prev.map(row=>[...row]);
        const tgt=g[r][c];
        const other=dragging===T.START?T.END:T.START;
        if(tgt.type===T.WALL||tgt.type===other) return prev;
        for(const row of g) for(const node of row) if(node.type===dragging) node.type=T.EMPTY;
        g[r][c]={...g[r][c],type:dragging};
        return g;
      });
    } else interact(r,c);
  };
  const onUp = () => { setMouseDown(false);setDragging(null);setErasing(false); };
  useEffect(()=>{window.addEventListener("mouseup",onUp);return()=>window.removeEventListener("mouseup",onUp);},[]);

  const meta = ALGOS[algo];
  const ns = Math.min(Math.floor((window.innerWidth-260)/COLS), 25);

  const nodeColor = t => ({
    [T.EMPTY]:"#0c1220",[T.WALL]:"#182030",[T.START]:"#34d399",[T.END]:"#f43f5e",
    [T.VISITED]:"#1d4ed8",[T.PATH]:"#f59e0b",[T.WEIGHT]:"#1e3a5f",
  }[t]||"#0c1220");

  const nodeClass = t => "nd" + ({[T.VISITED]:" nv",[T.PATH]:" np",[T.WALL]:" nw",[T.START]:" ns",[T.END]:" ne"}[t]||"");

  return (
    <div style={{minHeight:"100vh",background:"#080810",fontFamily:"'IBM Plex Mono',monospace",color:"#c8d4e8",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Mono:wght@300;400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .nd{cursor:pointer;border-radius:2px;transition:background 0.06s;display:flex;align-items:center;justify-content:center}
        .nd:hover{filter:brightness(1.6)}
        @keyframes vis{0%{transform:scale(0.15);border-radius:50%;background:#7c3aed}60%{transform:scale(1.1)}100%{transform:scale(1);background:#1d4ed8}}
        @keyframes pth{0%{transform:scale(0.3);background:#fbbf24}65%{transform:scale(1.2);box-shadow:0 0 8px #f59e0b}100%{transform:scale(1);background:#f59e0b}}
        @keyframes wll{0%{transform:scale(0)}85%{transform:scale(1.05)}100%{transform:scale(1)}}
        @keyframes spulse{0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.6)}50%{box-shadow:0 0 0 4px rgba(52,211,153,0)}}
        @keyframes epulse{0%,100%{box-shadow:0 0 0 0 rgba(244,63,94,.6)}50%{box-shadow:0 0 0 4px rgba(244,63,94,0)}}
        .nv{animation:vis .32s ease forwards}
        .np{animation:pth .22s ease forwards}
        .nw{animation:wll .12s ease forwards}
        .ns{animation:spulse 2s infinite}
        .ne{animation:epulse 2s infinite}
        .btn{cursor:pointer;border:none;outline:none;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;padding:7px 13px;border-radius:5px;transition:all .13s}
        .btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.2)}
        .btn:disabled{opacity:.4;cursor:not-allowed}
        .btn-p{background:linear-gradient(135deg,#5b21b6,#7c3aed);color:#fff;padding:8px 22px;font-size:11px}
        .btn-g{background:rgba(255,255,255,.05);color:#6b7a99;border:1px solid rgba(255,255,255,.08)}
        .btn-g:hover:not(:disabled){background:rgba(255,255,255,.1);color:#c8d4e8}
        .btn-d{background:rgba(239,68,68,.12);color:#ef4444;border:1px solid rgba(239,68,68,.2)}
        .ab{padding:7px 12px;border-radius:5px;cursor:pointer;border:1px solid transparent;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;letter-spacing:.06em;transition:all .13s;background:rgba(255,255,255,.04);color:#505d78}
        .ab:hover{background:rgba(255,255,255,.08);color:#c8d4e8}
        .sep{width:1px;height:24px;background:rgba(255,255,255,.07);flex-shrink:0}
        select{background:rgba(255,255,255,.05);color:#c8d4e8;border:1px solid rgba(255,255,255,.1);border-radius:5px;padding:7px 10px;font-family:'IBM Plex Mono',monospace;font-size:10px;cursor:pointer;outline:none}
        .cx{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:14px 16px}
        .cxr{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)}
        .cxr:last-child{border-bottom:none}
        .cxl{font-size:9px;color:#3d4f6a;letter-spacing:.1em;text-transform:uppercase}
        .cxv{font-size:11px;color:#a0aec0;font-weight:600}
        .chip{display:inline-flex;align-items:center;padding:2px 7px;border-radius:3px;font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase}
        .cg{background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.3)}
        .cr{background:rgba(244,63,94,.15);color:#f43f5e;border:1px solid rgba(244,63,94,.3)}
        .cb{background:rgba(99,102,241,.15);color:#818cf8;border:1px solid rgba(99,102,241,.3)}
        .st{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:10px 16px;min-width:88px}
        .sv{font-size:21px;font-weight:700;font-family:'Syne',sans-serif;line-height:1}
        .sl{font-size:9px;color:#3d4f6a;letter-spacing:.12em;text-transform:uppercase;margin-top:3px}
      `}</style>

      {/* TOP */}
      <div style={{padding:"14px 18px 10px",borderBottom:"1px solid rgba(255,255,255,.06)",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20,letterSpacing:"-0.03em",color:"#f0f4ff"}}>PATHFINDER</div>
          <div style={{fontSize:9,letterSpacing:"0.18em",color:"#2d3f5a",textTransform:"uppercase"}}>Algorithm Visualizer</div>
        </div>
        <div style={{flex:1}}/>
        {stats && (
          <div style={{display:"flex",gap:8}}>
            <div className="st"><div className="sv" style={{color:"#6366f1"}}>{stats.visited}</div><div className="sl">Visited</div></div>
            <div className="st"><div className="sv" style={{color:"#f59e0b"}}>{stats.path||"—"}</div><div className="sl">Path len</div></div>
            <div className="st"><div className="sv" style={{color:"#34d399",fontSize:17}}>{stats.time}ms</div><div className="sl">Calc time</div></div>
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <div style={{padding:"9px 18px",display:"flex",gap:6,alignItems:"center",borderBottom:"1px solid rgba(255,255,255,.05)",flexWrap:"wrap"}}>
        {Object.entries(ALGOS).map(([name,m])=>(
          <button key={name} className="ab"
            onClick={()=>{if(!running){setAlgo(name);if(done)clearPath();}}}
            style={algo===name?{background:`${m.color}18`,borderColor:m.color,color:m.color}:{}}
          >{name}</button>
        ))}
        <div className="sep"/>
        <select value={speed} onChange={e=>setSpeed(e.target.value)} disabled={running}>
          {Object.keys(SPEED_MS).map(s=><option key={s}>{s}</option>)}
        </select>
        <div className="sep"/>
        <button className="btn btn-g"
          style={weightMode?{borderColor:"#f59e0b",color:"#f59e0b",background:"rgba(245,158,11,.1)"}:{}}
          onClick={()=>setWeightMode(w=>!w)} disabled={running}>⚖ Weights</button>
        <div className="sep"/>
        {Object.keys(MAZES).map(m=>(
          <button key={m} className="btn btn-g" onClick={()=>applyMaze(m)} disabled={running}>{m}</button>
        ))}
        <div className="sep"/>
        <button className="btn btn-g" onClick={clearPath} disabled={running}>Clear</button>
        <button className="btn btn-d" onClick={resetAll} disabled={running}>Reset</button>
        <div style={{flex:1}}/>
        <button className="btn btn-p" onClick={visualize} disabled={running}>
          {running?"▶ Running…":"▶  Visualize"}
        </button>
      </div>

      {/* BODY */}
      <div style={{display:"flex",gap:14,padding:"12px 18px",alignItems:"flex-start"}}>

        {/* GRID */}
        <div style={{flex:1}}>
          <div
            style={{display:"grid",gridTemplateColumns:`repeat(${COLS},${ns}px)`,gap:1,padding:6,borderRadius:10,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.05)"}}
            onMouseLeave={onUp}
          >
            {grid.map((row,r)=>row.map((node,c)=>(
              <div key={`${r}-${c}`}
                className={nodeClass(node.type)}
                onMouseDown={()=>onDown(r,c)}
                onMouseEnter={()=>onEnter(r,c)}
                style={{width:ns,height:ns,background:nodeColor(node.type),fontSize:7,color:"rgba(255,255,255,.2)"}}
              >
                {node.type===T.START&&"▶"}
                {node.type===T.END&&"◉"}
                {node.type===T.WEIGHT&&"·"}
              </div>
            )))}
          </div>

          {/* LEGEND */}
          <div style={{display:"flex",gap:12,marginTop:9,flexWrap:"wrap",alignItems:"center"}}>
            {[["#34d399","Start (drag)"],["#f43f5e","End (drag)"],["#182030","Wall"],["#1e3a5f","Weight ×5"],["#1d4ed8","Visited"],["#f59e0b","Path"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                <div style={{width:9,height:9,background:c,borderRadius:2}}/>
                <span style={{fontSize:9,color:"#3d4f6a"}}>{l}</span>
              </div>
            ))}
            <div style={{marginLeft:"auto",fontSize:9,color:"#2d3f5a"}}>Click/drag walls • ⚖ weights • drag ▶◉</div>
          </div>
        </div>

        {/* COMPLEXITY PANEL */}
        <div style={{width:210,flexShrink:0}}>
          <div className="cx">
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:meta.color,boxShadow:`0 0 6px ${meta.color}`}}/>
              <span style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:15,color:"#f0f4ff"}}>{algo}</span>
            </div>
            <div className="cxr"><span className="cxl">Time</span><span className="cxv" style={{color:meta.color}}>{meta.time}</span></div>
            <div className="cxr"><span className="cxl">Space</span><span className="cxv">{meta.space}</span></div>
            <div className="cxr"><span className="cxl">Structure</span><span className="cxv" style={{fontSize:9,textAlign:"right",maxWidth:120}}>{meta.impl}</span></div>
            <div className="cxr">
              <span className="cxl">Optimal</span>
              <span className={`chip ${meta.optimal?"cg":"cr"}`}>{meta.optimal?"YES":"NO"}</span>
            </div>
            <div className="cxr">
              <span className="cxl">Weighted</span>
              <span className={`chip ${meta.weighted?"cb":"cr"}`}>{meta.weighted?"YES":"NO"}</span>
            </div>
            <div style={{marginTop:11,fontSize:10,color:"#3d4f6a",lineHeight:1.65}}>{meta.desc}</div>
          </div>

          {/* COMPARE TABLE */}
          <div style={{marginTop:10,background:"rgba(255,255,255,.02)",border:"1px solid rgba(255,255,255,.06)",borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:"#2d3f5a",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>Quick Compare</div>
            {Object.entries(ALGOS).map(([name,m])=>(
              <div key={name} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 0",borderBottom:"1px solid rgba(255,255,255,.03)"}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:name===algo?m.color:"#1e2d45",flexShrink:0}}/>
                <span style={{fontSize:9,color:name===algo?m.color:"#3d4f6a",flex:1,fontWeight:name===algo?600:400}}>{name}</span>
                <span style={{fontSize:8,color:m.optimal?"#10b981":"#f43f5e"}}>{m.optimal?"✓":"✗"}</span>
                <span style={{fontSize:8,color:m.weighted?"#818cf8":"#2d3f5a",marginLeft:4}}>{m.weighted?"W":"—"}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:10,marginTop:6}}>
              <span style={{fontSize:8,color:"#1e2d45"}}>✓/✗ optimal  W=weighted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

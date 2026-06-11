/* GLASS ARCADE · 2048 */
"use strict";
window.GAMES = window.GAMES || [];

window.GAMES.push({
  id: "g2048",
  name: "2048",
  emoji: "💎",
  desc: "Сдвигайте грани, сплавляйте кристаллы и доберитесь до плитки 2048.",
  colors: ["#f0abfc", "#8b5cf6"],
  hintKeys: "Стрелки или WASD — сдвиг всех плиток.",
  hintTouch: "Свайпы по полю в любую сторону.",
  touchpad: false,

  create(api) {
    const COLORS = {
      2: ["#64748b", "#475569"], 4: ["#60a5fa", "#3b82f6"], 8: ["#22d3ee", "#0891b2"],
      16: ["#34d399", "#059669"], 32: ["#a3e635", "#65a30d"], 64: ["#fbbf24", "#d97706"],
      128: ["#fb923c", "#ea580c"], 256: ["#fb7185", "#e11d48"], 512: ["#f0abfc", "#c026d3"],
      1024: ["#a78bfa", "#7c3aed"], 2048: ["#fde047", "#f59e0b"],
    };

    let boardEl, grid, score, won, cellSize, gap;

    function cellPos(i) { return gap + i * (cellSize + gap); }

    function build() {
      boardEl = document.createElement("div");
      boardEl.className = "board2048";
      for (let i = 0; i < 16; i++) {
        const c = document.createElement("div");
        c.className = "board2048__cell";
        boardEl.appendChild(c);
      }
      api.stage.appendChild(boardEl);
      const cs = getComputedStyle(boardEl);
      cellSize = boardEl.querySelector(".board2048__cell").offsetWidth;
      gap = parseFloat(cs.gap) || 10;
    }

    function makeTile(v, r, c) {
      const el = document.createElement("div");
      el.className = "tile2048";
      const col = COLORS[v] || COLORS[2048];
      el.style.setProperty("--tc1", col[0]);
      el.style.setProperty("--tc2", col[1]);
      el.textContent = v;
      position(el, r, c);
      boardEl.appendChild(el);
      return { v, el, r, c };
    }

    function position(el, r, c) {
      el.style.transform = `translate(${cellPos(c) + 2}px, ${cellPos(r) + 2}px)`;
    }

    function addRandom() {
      const empty = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!grid[r][c]) empty.push([r, c]);
      if (!empty.length) return;
      const [r, c] = empty[(Math.random() * empty.length) | 0];
      grid[r][c] = makeTile(Math.random() < 0.9 ? 2 : 4, r, c);
    }

    /* сдвиг: dir = {dr, dc} */
    function slide(dr, dc) {
      let moved = false;
      const rs = dr === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
      const cs = dc === 1 ? [3, 2, 1, 0] : [0, 1, 2, 3];
      const merged = new Set();

      for (const r of rs) for (const c of cs) {
        const t = grid[r][c];
        if (!t) continue;
        let nr = r, nc = c;
        while (true) {
          const tr = nr + dr, tc = nc + dc;
          if (tr < 0 || tr > 3 || tc < 0 || tc > 3) break;
          const target = grid[tr][tc];
          if (!target) { nr = tr; nc = tc; continue; }
          if (target.v === t.v && !merged.has(target)) { nr = tr; nc = tc; }
          break;
        }
        if (nr === r && nc === c) continue;
        moved = true;
        const target = grid[nr][nc];
        grid[r][c] = null;
        if (target) {
          /* слияние */
          merged.add(target);
          target.v *= 2;
          score += target.v;
          grid[nr][nc] = target;
          position(t.el, nr, nc);
          const dead = t.el;
          setTimeout(() => {
            dead.remove();
            target.el.textContent = target.v;
            const col = COLORS[target.v] || COLORS[2048];
            target.el.style.setProperty("--tc1", col[0]);
            target.el.style.setProperty("--tc2", col[1]);
            target.el.classList.remove("is-merged");
            void target.el.offsetWidth;
            target.el.classList.add("is-merged");
          }, 130);
          if (target.v === 2048 && !won) {
            won = true;
            setTimeout(() => api.gameOver(score, { win: true, text: "Кристалл 2048 собран!" }), 350);
          }
        } else {
          grid[nr][nc] = t;
          t.r = nr; t.c = nc;
          position(t.el, nr, nc);
        }
      }

      if (moved) {
        api.setScore(score);
        setTimeout(() => {
          addRandom();
          if (isStuck()) api.gameOver(score, { text: "Ходов больше нет." });
        }, 140);
      }
    }

    function isStuck() {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const t = grid[r][c];
        if (!t) return false;
        if (r < 3 && grid[r + 1][c] && grid[r + 1][c].v === t.v) return false;
        if (c < 3 && grid[r][c + 1] && grid[r][c + 1].v === t.v) return false;
      }
      return true;
    }

    return {
      start() {
        score = 0; won = false;
        grid = Array.from({ length: 4 }, () => Array(4).fill(null));
        build();
        api.setScore(0);
        addRandom(); addRandom();
        api.onDir((d) => {
          const m = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[d];
          if (m) slide(m[0], m[1]);
        });
      },
      stop() {},
    };
  },
});

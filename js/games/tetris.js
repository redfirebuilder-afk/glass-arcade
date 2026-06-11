/* GLASS ARCADE · Тетрис */
"use strict";
window.GAMES = window.GAMES || [];

window.GAMES.push({
  id: "tetris",
  name: "Тетрис",
  emoji: "🧊",
  desc: "Ледяные кристаллы падают сквозь стекло. Собирайте линии и поднимайте уровень.",
  colors: ["#22d3ee", "#8b5cf6"],
  hintKeys: "← → — движение, ↑ — поворот, ↓ — ускорить, Пробел — сброс.",
  hintTouch: "Кнопки: ◀ ▶ — движение, ● — поворот, ▼ — вниз, ▲ — сброс.",
  touchpad: true,

  create(api) {
    const COLS = 10, ROWS = 20, CELL = 24;
    const W = COLS * CELL, H = ROWS * CELL;

    const SHAPES = {
      I: { m: [[1, 1, 1, 1]], c: "#22d3ee" },
      O: { m: [[1, 1], [1, 1]], c: "#fbbf24" },
      T: { m: [[0, 1, 0], [1, 1, 1]], c: "#8b5cf6" },
      S: { m: [[0, 1, 1], [1, 1, 0]], c: "#34d399" },
      Z: { m: [[1, 1, 0], [0, 1, 1]], c: "#fb7185" },
      J: { m: [[1, 0, 0], [1, 1, 1]], c: "#60a5fa" },
      L: { m: [[0, 0, 1], [1, 1, 1]], c: "#f0abfc" },
    };
    const KEYS = Object.keys(SHAPES);

    let cv, board, piece, score, lines, level, dropTime, acc, stopLoop, alive, bag;

    function fromBag() {
      if (!bag || !bag.length) bag = KEYS.slice().sort(() => Math.random() - 0.5);
      return bag.pop();
    }

    function spawn() {
      const k = fromBag();
      piece = { m: SHAPES[k].m.map((r) => r.slice()), c: SHAPES[k].c, x: 3, y: -1 };
      if (collides(piece.m, piece.x, piece.y + 1)) {
        alive = false;
        api.gameOver(score, { text: "Стакан переполнен." });
      }
    }

    function collides(m, px, py) {
      for (let y = 0; y < m.length; y++)
        for (let x = 0; x < m[y].length; x++) {
          if (!m[y][x]) continue;
          const nx = px + x, ny = py + y;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      return false;
    }

    function rotate() {
      const m = piece.m[0].map((_, i) => piece.m.map((r) => r[i]).reverse());
      for (const kick of [0, -1, 1, -2, 2]) {
        if (!collides(m, piece.x + kick, piece.y)) {
          piece.m = m; piece.x += kick; return;
        }
      }
    }

    function move(dx) {
      if (!collides(piece.m, piece.x + dx, piece.y)) piece.x += dx;
    }

    function drop(soft) {
      if (!collides(piece.m, piece.x, piece.y + 1)) {
        piece.y++;
        if (soft) addScore(1);
        return true;
      }
      lock();
      return false;
    }

    function hardDrop() {
      let d = 0;
      while (!collides(piece.m, piece.x, piece.y + 1)) { piece.y++; d++; }
      addScore(d * 2);
      lock();
    }

    function lock() {
      piece.m.forEach((row, y) => row.forEach((v, x) => {
        if (v && piece.y + y >= 0) board[piece.y + y][piece.x + x] = piece.c;
      }));
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(Boolean)) {
          board.splice(y, 1);
          board.unshift(Array(COLS).fill(0));
          cleared++; y++;
        }
      }
      if (cleared) {
        lines += cleared;
        addScore([0, 100, 300, 500, 800][cleared] * level);
        level = 1 + (lines / 10 | 0);
        dropTime = Math.max(0.09, 0.8 * Math.pow(0.85, level - 1));
      }
      spawn();
    }

    function addScore(n) { score += n; api.setScore(score); }

    function ghostY() {
      let y = piece.y;
      while (!collides(piece.m, piece.x, y + 1)) y++;
      return y;
    }

    function cell(ctx, x, y, color, alpha) {
      const px = x * CELL, py = y * CELL;
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(px + 1.5, py + 1.5, CELL - 3, CELL - 3, 5);
      ctx.fill();
      ctx.globalAlpha = (alpha == null ? 1 : alpha) * 0.5;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(px + 3.5, py + 3.5, CELL - 7, (CELL - 7) / 2.4, 4);
      ctx.fill();
      ctx.restore();
    }

    function draw() {
      const { ctx } = cv;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.045)";
      for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke(); }
      for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke(); }

      board.forEach((row, y) => row.forEach((c, x) => { if (c) cell(ctx, x, y, c); }));

      if (alive && piece) {
        const gy = ghostY();
        piece.m.forEach((row, y) => row.forEach((v, x) => {
          if (v && gy + y >= 0) cell(ctx, piece.x + x, gy + y, piece.c, 0.16);
        }));
        piece.m.forEach((row, y) => row.forEach((v, x) => {
          if (v && piece.y + y >= 0) cell(ctx, piece.x + x, piece.y + y, piece.c);
        }));
      }

      ctx.fillStyle = "rgba(244,242,255,0.5)";
      ctx.font = "600 11px Manrope, sans-serif";
      ctx.fillText(`Уровень ${level} · Линий ${lines}`, 8, H - 8);
    }

    return {
      start() {
        cv = api.makeCanvas(W, H);
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        score = 0; lines = 0; level = 1; dropTime = 0.8; acc = 0; alive = true; bag = null;
        api.setScore(0);
        spawn();

        api.onDir((d) => {
          if (!alive) return;
          if (d === "left") move(-1);
          else if (d === "right") move(1);
          else if (d === "down") drop(true);
          else if (d === "up" && api.isTouch()) hardDrop();
          else if (d === "up") rotate();
        });
        api.onAction(() => { if (alive) (api.isTouch() ? rotate() : hardDrop()); });

        stopLoop = api.loop((dt) => {
          if (!alive) return;
          acc += dt;
          while (acc >= dropTime) { acc -= dropTime; if (!drop(false)) break; }
          draw();
        });
      },
      stop() { stopLoop && stopLoop(); },
    };
  },
});

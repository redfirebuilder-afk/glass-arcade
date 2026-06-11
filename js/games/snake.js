/* GLASS ARCADE · Змейка */
"use strict";
window.GAMES = window.GAMES || [];

window.GAMES.push({
  id: "snake",
  name: "Змейка",
  emoji: "🐍",
  desc: "Неоновая классика: ешьте, растите, не врезайтесь. Скорость растёт с каждой ягодой.",
  colors: ["#34d399", "#0ea5e9"],
  hintKeys: "Стрелки или WASD — движение, P — пауза.",
  hintTouch: "Свайпы по полю или кнопки внизу.",
  touchpad: true,

  create(api) {
    const N = 21, CELL = 22, SIZE = N * CELL;
    let cv, snake, dir, nextDir, food, score, stepTime, acc, stopLoop, alive;

    function reset() {
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir = { x: 1, y: 0 };
      nextDir = dir;
      score = 0;
      stepTime = 0.16;
      acc = 0;
      alive = true;
      placeFood();
      api.setScore(0);
    }

    function placeFood() {
      do {
        food = { x: (Math.random() * N) | 0, y: (Math.random() * N) | 0 };
      } while (snake.some((s) => s.x === food.x && s.y === food.y));
    }

    function step() {
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N ||
          snake.some((s) => s.x === head.x && s.y === head.y)) {
        alive = false;
        api.gameOver(score, { text: "Змейка разбилась о стекло." });
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        api.setScore(score);
        stepTime = Math.max(0.07, stepTime * 0.97);
        placeFood();
      } else {
        snake.pop();
      }
    }

    function draw(t) {
      const { ctx } = cv;
      ctx.clearRect(0, 0, SIZE, SIZE);

      /* сетка */
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let i = 1; i < N; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE, i * CELL); ctx.stroke();
      }

      /* еда — пульсирующая ягода */
      const pulse = 1 + Math.sin(t / 180) * 0.12;
      ctx.save();
      ctx.shadowColor = "#f0abfc";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#f0abfc";
      ctx.beginPath();
      ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, (CELL / 2 - 4) * pulse, 0, 7);
      ctx.fill();
      ctx.restore();

      /* змейка с градиентом по телу */
      snake.forEach((s, i) => {
        const k = i / snake.length;
        const r = 7 - k * 3;
        ctx.save();
        ctx.shadowColor = "#34d399";
        ctx.shadowBlur = i === 0 ? 16 : 6;
        ctx.fillStyle = i === 0 ? "#a7f3d0" : `rgba(${52 + k * 0},${211 - k * 80},${153 + k * 60},${1 - k * 0.5})`;
        roundRect(ctx, s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, r);
        ctx.fill();
        ctx.restore();
      });

      /* глаза */
      const h = snake[0];
      ctx.fillStyle = "#052e1f";
      const ex = h.x * CELL + CELL / 2 + dir.x * 4, ey = h.y * CELL + CELL / 2 + dir.y * 4;
      ctx.beginPath();
      ctx.arc(ex - dir.y * 4, ey - dir.x * 4, 2.2, 0, 7);
      ctx.arc(ex + dir.y * 4, ey + dir.x * 4, 2.2, 0, 7);
      ctx.fill();
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    return {
      start() {
        cv = api.makeCanvas(SIZE, SIZE);
        reset();
        api.onDir((d) => {
          const m = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[d];
          if (m && (m.x !== -dir.x || m.y !== -dir.y)) nextDir = m;
        });
        stopLoop = api.loop((dt, t) => {
          if (!alive) return;
          acc += dt;
          while (acc >= stepTime) { acc -= stepTime; step(); if (!alive) break; }
          draw(t);
        });
      },
      stop() { stopLoop && stopLoop(); },
    };
  },
});

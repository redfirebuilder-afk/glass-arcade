/* GLASS ARCADE · Арканоид */
"use strict";
window.GAMES = window.GAMES || [];

window.GAMES.push({
  id: "breakout",
  name: "Арканоид",
  emoji: "🔮",
  desc: "Разбейте витраж из стеклянных кирпичей. Три жизни, осколки летят во все стороны.",
  colors: ["#fb7185", "#fbbf24"],
  hintKeys: "Мышь или ← → — платформа. Пробел — запуск шара.",
  hintTouch: "Ведите пальцем по полю. Тап — запуск шара.",
  touchpad: false,

  create(api) {
    const W = 420, H = 520;
    const ROWS = 6, COLS = 8;
    const BW = (W - 24) / COLS, BH = 22;
    const PALETTE = ["#fb7185", "#fb923c", "#fbbf24", "#a3e635", "#34d399", "#22d3ee"];

    let cv, paddle, ball, bricks, score, livesLeft, stuck, particles, stopLoop, keys, level;

    function buildBricks() {
      bricks = [];
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          bricks.push({ x: 12 + c * BW, y: 56 + r * (BH + 6), c: PALETTE[r], hp: 1 + (r < 2 ? 1 : 0) });
    }

    function resetBall() {
      stuck = true;
      ball = { x: paddle.x + paddle.w / 2, y: H - 64, r: 7, vx: 0, vy: 0 };
    }

    function launch() {
      if (!stuck) return;
      stuck = false;
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      const sp = 320 + level * 30;
      ball.vx = Math.cos(a) * sp;
      ball.vy = Math.sin(a) * sp;
    }

    function burst(x, y, color) {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 160;
        particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6, color });
      }
    }

    function update(dt) {
      /* платформа: клавиши */
      const pv = 460 * dt;
      if (keys.left) paddle.x -= pv;
      if (keys.right) paddle.x += pv;
      paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

      if (stuck) { ball.x = paddle.x + paddle.w / 2; ball.y = H - 64; return; }

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -1; }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; }

      /* платформа */
      if (ball.vy > 0 && ball.y + ball.r >= H - 26 && ball.y + ball.r <= H - 12 &&
          ball.x >= paddle.x - 4 && ball.x <= paddle.x + paddle.w + 4) {
        const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        const sp = Math.hypot(ball.vx, ball.vy) * 1.015;
        const a = -Math.PI / 2 + hit * 1.05;
        ball.vx = Math.cos(a) * sp;
        ball.vy = Math.sin(a) * sp;
        ball.y = H - 26 - ball.r;
      }

      /* кирпичи */
      for (const b of bricks) {
        if (b.hp <= 0) continue;
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + BW - 4 &&
            ball.y + ball.r > b.y && ball.y - ball.r < b.y + BH) {
          b.hp--;
          if (b.hp <= 0) { score += 20; burst(ball.x, ball.y, b.c); }
          else score += 5;
          api.setScore(score);
          const ox = Math.min(ball.x + ball.r - b.x, b.x + BW - 4 - (ball.x - ball.r));
          const oy = Math.min(ball.y + ball.r - b.y, b.y + BH - (ball.y - ball.r));
          if (ox < oy) ball.vx *= -1; else ball.vy *= -1;
          break;
        }
      }

      if (bricks.every((b) => b.hp <= 0)) {
        level++;
        score += 100;
        api.setScore(score);
        buildBricks();
        resetBall();
      }

      /* мяч улетел */
      if (ball.y > H + 20) {
        livesLeft--;
        if (livesLeft <= 0) api.gameOver(score, { text: "Все шары разбились." });
        else resetBall();
      }

      particles = particles.filter((p) => (p.life -= dt) > 0);
      particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; });
    }

    function draw() {
      const { ctx } = cv;
      ctx.clearRect(0, 0, W, H);

      for (const b of bricks) {
        if (b.hp <= 0) continue;
        ctx.save();
        ctx.globalAlpha = b.hp > 1 ? 1 : 0.85;
        ctx.shadowColor = b.c; ctx.shadowBlur = 12;
        ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.roundRect(b.x, b.y, BW - 4, BH, 7); ctx.fill();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.roundRect(b.x + 2, b.y + 2, BW - 8, BH / 2.6, 5); ctx.fill();
        if (b.hp > 1) {
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = "rgba(255,255,255,0.7)";
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.roundRect(b.x + 1, b.y + 1, BW - 6, BH - 2, 6); ctx.stroke();
        }
        ctx.restore();
      }

      /* платформа */
      ctx.save();
      ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 16;
      const g = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.w, 0);
      g.addColorStop(0, "#22d3ee"); g.addColorStop(1, "#8b5cf6");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.roundRect(paddle.x, H - 24, paddle.w, 11, 6); ctx.fill();
      ctx.restore();

      /* мяч */
      ctx.save();
      ctx.shadowColor = "#fff"; ctx.shadowBlur = 18;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill();
      ctx.restore();

      /* частицы */
      particles.forEach((p) => {
        ctx.globalAlpha = p.life / 0.6;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3.5, 3.5);
      });
      ctx.globalAlpha = 1;

      /* жизни */
      for (let i = 0; i < livesLeft; i++) {
        ctx.fillStyle = "rgba(251,113,133,0.95)";
        ctx.beginPath(); ctx.arc(16 + i * 18, 20, 5.5, 0, 7); ctx.fill();
      }
    }

    function pointerMove(e) {
      const r = cv.canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * W;
      paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2));
    }

    function keyDown(e) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
    }
    function keyUp(e) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
    }

    return {
      start() {
        cv = api.makeCanvas(W, H);
        paddle = { x: W / 2 - 44, w: 88 };
        score = 0; livesLeft = 3; particles = []; keys = {}; level = 1;
        buildBricks();
        resetBall();
        api.setScore(0);

        api.stage.addEventListener("pointermove", pointerMove);
        document.addEventListener("keydown", keyDown);
        document.addEventListener("keyup", keyUp);
        api.onAction(launch);

        stopLoop = api.loop((dt) => { update(dt); draw(); });
      },
      stop() {
        stopLoop && stopLoop();
        api.stage.removeEventListener("pointermove", pointerMove);
        document.removeEventListener("keydown", keyDown);
        document.removeEventListener("keyup", keyUp);
      },
    };
  },
});

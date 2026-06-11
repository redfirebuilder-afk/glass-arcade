/* GLASS ARCADE · Светлячок (flappy) */
"use strict";
window.GAMES = window.GAMES || [];

window.GAMES.push({
  id: "flappy",
  name: "Светлячок",
  emoji: "✨",
  desc: "Проведите светящуюся сферу сквозь стеклянные колонны. Один тап — один взмах.",
  colors: ["#fbbf24", "#fb7185"],
  hintKeys: "Пробел или клик — взмах вверх.",
  hintTouch: "Тап по полю — взмах вверх.",
  touchpad: false,

  create(api) {
    const W = 380, H = 520;
    const GAP = 158, PIPE_W = 64, SPEED = 140;

    let cv, bird, pipes, score, stopLoop, alive, spawnAcc, trail;

    function flap() {
      if (!alive) return;
      bird.vy = -300;
    }

    function spawnPipe() {
      const cy = 110 + Math.random() * (H - 220);
      pipes.push({ x: W + PIPE_W, cy, passed: false, hue: Math.random() * 360 });
    }

    function update(dt) {
      bird.vy += 900 * dt;
      bird.y += bird.vy * dt;

      trail.push({ x: bird.x, y: bird.y, life: 0.5 });
      trail = trail.filter((t) => (t.life -= dt) > 0);

      spawnAcc += dt;
      if (spawnAcc > 1.55) { spawnAcc = 0; spawnPipe(); }

      for (const p of pipes) {
        p.x -= SPEED * dt;
        if (!p.passed && p.x + PIPE_W < bird.x) {
          p.passed = true;
          score++;
          api.setScore(score);
        }
        /* столкновение */
        if (bird.x + 11 > p.x && bird.x - 11 < p.x + PIPE_W) {
          if (bird.y - 11 < p.cy - GAP / 2 || bird.y + 11 > p.cy + GAP / 2) die();
        }
      }
      pipes = pipes.filter((p) => p.x > -PIPE_W - 10);

      if (bird.y > H - 10 || bird.y < -30) die();
    }

    function die() {
      if (!alive) return;
      alive = false;
      api.gameOver(score, { text: "Светлячок погас." });
    }

    function pipeBody(ctx, x, y, h, hue) {
      ctx.save();
      ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.22)`;
      ctx.strokeStyle = `hsla(${hue}, 90%, 75%, 0.65)`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = `hsla(${hue}, 90%, 65%, 0.8)`;
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.roundRect(x, y, PIPE_W, h, 12); ctx.fill(); ctx.stroke();
      /* стеклянный блик */
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath(); ctx.roundRect(x + 6, y + 6, 10, Math.max(0, h - 12), 5); ctx.fill();
      ctx.restore();
    }

    function draw(t) {
      const { ctx } = cv;
      ctx.clearRect(0, 0, W, H);

      for (const p of pipes) {
        pipeBody(ctx, p.x, -12, p.cy - GAP / 2 + 12, p.hue);
        pipeBody(ctx, p.x, p.cy + GAP / 2, H - (p.cy + GAP / 2) + 12, p.hue);
      }

      /* шлейф */
      trail.forEach((tr) => {
        ctx.globalAlpha = tr.life;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath(); ctx.arc(tr.x - 4, tr.y, 4 * tr.life + 1, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;

      /* сфера */
      const wob = Math.sin(t / 120) * 1.5;
      ctx.save();
      ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 26;
      const g = ctx.createRadialGradient(bird.x - 4, bird.y - 4 + wob, 2, bird.x, bird.y + wob, 13);
      g.addColorStop(0, "#fff7d6"); g.addColorStop(0.5, "#fbbf24"); g.addColorStop(1, "#f59e0b");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(bird.x, bird.y + wob, 11, 0, 7); ctx.fill();
      ctx.restore();
    }

    return {
      start() {
        cv = api.makeCanvas(W, H);
        bird = { x: 96, y: H / 2, vy: 0 };
        pipes = []; trail = [];
        score = 0; alive = true; spawnAcc = 1.0;
        api.setScore(0);
        api.onAction(flap);
        api.onDir((d) => { if (d === "up") flap(); });
        stopLoop = api.loop((dt, t) => {
          if (!alive) return;
          update(dt);
          draw(t);
        });
      },
      stop() { stopLoop && stopLoop(); },
    };
  },
});

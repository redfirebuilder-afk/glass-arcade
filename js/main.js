/* ============================================================
   GLASS ARCADE · main.js
   Реестр игр, карточки, 3D-tilt, модальный лист, общий Game API
   ============================================================ */
"use strict";

window.GAMES = window.GAMES || [];

(function () {
  const $ = (s, r) => (r || document).querySelector(s);

  const grid = $("#grid");
  const modal = $("#modal");
  const sheet = $("#modalSheet");
  const stage = $("#stage");
  const hint = $("#hint");
  const touchpad = $("#touchpad");
  const overlay = $("#overlay");
  const hudScore = $("#hudScore");
  const hudBest = $("#hudBest");

  const store = {
    get(id) { try { return Number(localStorage.getItem("ga-best-" + id)) || 0; } catch (e) { return 0; } },
    set(id, v) { try { localStorage.setItem("ga-best-" + id, String(v)); } catch (e) {} },
  };

  /* ---------- Карточки игр ---------- */
  function renderCards() {
    grid.innerHTML = "";
    window.GAMES.forEach((g, i) => {
      const btn = document.createElement("button");
      btn.className = "card glass glass--lens";
      btn.style.setProperty("--i", i);
      btn.style.setProperty("--c1", g.colors[0]);
      btn.style.setProperty("--c2", g.colors[1]);
      btn.innerHTML = `
        <span class="card__sheen"></span>
        <span class="card__inner">
          <span class="card__emoji">${g.emoji}</span>
          <span class="card__name">${g.name}</span>
          <span class="card__desc">${g.desc}</span>
          <span class="card__meta">
            <span class="card__best">Рекорд: <b>${store.get(g.id)}</b></span>
            <span class="card__play">Играть ↗</span>
          </span>
        </span>`;
      btn.addEventListener("click", () => openGame(g));
      attachTilt(btn);
      grid.appendChild(btn);
    });
  }

  /* ---------- 3D tilt + блик за курсором ---------- */
  function attachTilt(el) {
    const max = 9;
    let raf = 0;
    el.addEventListener("pointermove", (e) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
        el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
        el.style.setProperty("--ry", ((px - 0.5) * max * 2).toFixed(2) + "deg");
        el.style.setProperty("--rx", ((0.5 - py) * max * 2).toFixed(2) + "deg");
        el.style.setProperty("--edge", (px * 360).toFixed(0) + "deg");
      });
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  }

  /* ---------- Жизненный цикл игры ---------- */
  let current = null; // { game, instance, api, state }

  function openGame(g) {
    document.body.classList.add("modal-open");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    $("#modalEmoji").textContent = g.emoji;
    $("#modalTitle").textContent = g.name;
    hint.textContent = isTouch() ? g.hintTouch : g.hintKeys;
    touchpad.hidden = !g.touchpad || !isTouch();
    stage.innerHTML = "";
    hudScore.textContent = "0";
    hudBest.textContent = store.get(g.id);

    const api = makeApi(g);
    const instance = g.create(api);
    current = { game: g, instance, api, paused: false, over: false, started: false };

    showOverlay(g.emoji, g.name, isTouch() ? g.hintTouch : g.hintKeys, "Играть", () => {
      current.started = true;
      instance.start();
    });
  }

  function closeGame() {
    if (!current) return;
    try { current.instance.stop(); } catch (e) {}
    current = null;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    overlay.hidden = true;
    renderCards(); // обновить рекорды на карточках
  }

  function togglePause() {
    if (!current || !current.started || current.over) return;
    current.paused = !current.paused;
    if (current.paused) {
      current.instance.pause && current.instance.pause();
      showOverlay("⏸", "Пауза", "Передохните. Стекло никуда не денется.", "Продолжить", () => {
        current.paused = false;
        current.instance.resume && current.instance.resume();
      });
    } else {
      overlay.hidden = true;
      current.instance.resume && current.instance.resume();
    }
  }

  function showOverlay(emoji, title, text, btnLabel, onBtn) {
    $("#overlayEmoji").textContent = emoji;
    $("#overlayTitle").textContent = title;
    $("#overlayText").textContent = text;
    const btn = $("#overlayBtn");
    btn.textContent = btnLabel;
    btn.onclick = () => { overlay.hidden = true; onBtn && onBtn(); };
    overlay.hidden = false;
    btn.focus({ preventScroll: true });
  }

  /* ---------- Общий API для игр ---------- */
  function isTouch() {
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
  }

  function makeApi(g) {
    const dirHandlers = [];
    const actionHandlers = [];

    const api = {
      stage,
      isTouch,

      /* canvas с учётом DPR */
      makeCanvas(w, h) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const c = document.createElement("canvas");
        const maxW = Math.min(stage.clientWidth - 8, w);
        const scale = maxW / w;
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        c.style.width = Math.round(w * scale) + "px";
        c.style.height = Math.round(h * scale) + "px";
        stage.appendChild(c);
        const ctx = c.getContext("2d");
        ctx.scale(dpr, dpr);
        return { canvas: c, ctx, W: w, H: h };
      },

      /* rAF-цикл с автопаузой */
      loop(fn) {
        let last = performance.now();
        let id = 0;
        const tick = (t) => {
          id = requestAnimationFrame(tick);
          if (!current || current.paused || current.over) { last = t; return; }
          const dt = Math.min((t - last) / 1000, 0.05);
          last = t;
          fn(dt, t);
        };
        id = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(id);
      },

      setScore(n) {
        hudScore.textContent = n;
        if (n > store.get(g.id)) {
          store.set(g.id, n);
          hudBest.textContent = n;
        }
      },

      gameOver(score, opts) {
        if (!current || current.over) return;
        current.over = true;
        const best = store.get(g.id);
        const isRecord = score >= best && score > 0;
        const o = opts || {};
        showOverlay(
          o.win ? "🏆" : "💔",
          o.win ? "Победа!" : "Игра окончена",
          (o.text ? o.text + " " : "") +
            `Ваш счёт: ${score}.` +
            (isRecord ? " Новый рекорд! ✨" : ` Рекорд: ${best}.`),
          "Ещё раз",
          () => {
            current.over = false;
            current.instance.stop();
            stage.innerHTML = "";
            hudScore.textContent = "0";
            /* свежий API — чтобы обработчики ввода не дублировались */
            current.api = makeApi(g);
            current.instance = g.create(current.api);
            current.instance.start();
          }
        );
      },

      onDir(cb) { dirHandlers.push(cb); },
      onAction(cb) { actionHandlers.push(cb); },
      _fireDir(d) { if (current && !current.paused && !current.over && current.started) dirHandlers.forEach((f) => f(d)); },
      _fireAction() { if (current && !current.paused && !current.over && current.started) actionHandlers.forEach((f) => f()); },
    };
    return api;
  }

  /* ---------- Глобальный ввод ---------- */
  const KEYMAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  };

  document.addEventListener("keydown", (e) => {
    if (!current) return;
    if (e.code === "Escape") { closeGame(); return; }
    if (e.code === "KeyP") { togglePause(); return; }
    if (!overlay.hidden) return;
    const d = KEYMAP[e.code];
    if (d) { e.preventDefault(); current.api._fireDir(d); }
    if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); current.api._fireAction(); }
  });

  /* свайпы и тапы по игровому полю */
  let sx = 0, sy = 0, st = 0;
  stage.addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); });
  stage.addEventListener("pointerup", (e) => {
    if (!current) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (Math.max(adx, ady) < 24 && performance.now() - st < 350) {
      current.api._fireAction();
      return;
    }
    if (Math.max(adx, ady) < 24) return;
    current.api._fireDir(adx > ady ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });

  /* экранные кнопки */
  touchpad.addEventListener("pointerdown", (e) => {
    const btn = e.target.closest("[data-dir]");
    if (!btn || !current) return;
    e.preventDefault();
    const d = btn.dataset.dir;
    if (d === "action") current.api._fireAction();
    else current.api._fireDir(d);
    /* автоповтор при удержании */
    let rep = setInterval(() => {
      if (d === "action") current && current.api._fireAction();
      else current && current.api._fireDir(d);
    }, 140);
    const stop = () => clearInterval(rep);
    btn.addEventListener("pointerup", stop, { once: true });
    btn.addEventListener("pointerleave", stop, { once: true });
    btn.addEventListener("pointercancel", stop, { once: true });
  });

  $("#btnClose").addEventListener("click", closeGame);
  $("#btnPause").addEventListener("click", togglePause);
  $("#modalBackdrop").addEventListener("click", closeGame);

  /* автопауза при сворачивании вкладки */
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && current && current.started && !current.paused && !current.over) togglePause();
  });

  renderCards();
})();

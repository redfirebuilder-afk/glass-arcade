/* GLASS ARCADE · Память */
"use strict";
window.GAMES = window.GAMES || [];

window.GAMES.push({
  id: "memory",
  name: "Память",
  emoji: "🃏",
  desc: "Шестнадцать стеклянных карт, восемь пар. Чем меньше ходов — тем выше счёт.",
  colors: ["#a78bfa", "#34d399"],
  hintKeys: "Кликайте по картам, ищите пары.",
  hintTouch: "Тапайте по картам, ищите пары.",
  touchpad: false,

  create(api) {
    const EMOJI = ["🍇", "🌊", "🔥", "🌙", "⚡", "🌸", "🧿", "🍀"];
    let gridEl, open, lock, matched, moves, score;

    function build() {
      const deck = [...EMOJI, ...EMOJI].sort(() => Math.random() - 0.5);
      gridEl = document.createElement("div");
      gridEl.className = "memgrid";
      deck.forEach((em) => {
        const card = document.createElement("button");
        card.className = "memcard";
        card.setAttribute("aria-label", "Закрытая карта");
        card.innerHTML = `
          <span class="memcard__inner">
            <span class="memcard__face memcard__face--back">✦</span>
            <span class="memcard__face memcard__face--front">${em}</span>
          </span>`;
        card.dataset.v = em;
        card.addEventListener("click", () => flip(card));
        gridEl.appendChild(card);
      });
      api.stage.appendChild(gridEl);
    }

    function flip(card) {
      if (lock || card.classList.contains("is-open")) return;
      card.classList.add("is-open");
      open.push(card);
      if (open.length < 2) return;

      moves++;
      lock = true;
      const [a, b] = open;
      open = [];
      if (a.dataset.v === b.dataset.v) {
        setTimeout(() => {
          a.classList.add("is-matched");
          b.classList.add("is-matched");
          matched += 1;
          score = Math.max(10, 200 - (moves - matched) * 15) * matched;
          api.setScore(score);
          lock = false;
          if (matched === EMOJI.length) {
            setTimeout(() => api.gameOver(score, { win: true, text: `Все пары найдены за ${moves} ходов!` }), 450);
          }
        }, 380);
      } else {
        setTimeout(() => {
          a.classList.remove("is-open");
          b.classList.remove("is-open");
          lock = false;
        }, 750);
      }
    }

    return {
      start() {
        open = []; lock = false; matched = 0; moves = 0; score = 0;
        api.setScore(0);
        build();
      },
      stop() {},
    };
  },
});

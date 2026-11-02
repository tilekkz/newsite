/* Two small games between the scenes: a memory match before the second song,
   a sliding puzzle of the two of them before the lanterns. Rules live in logic.js. */
(() => {
  'use strict';
  const L = window.SiteLogic;
  if (!L) return;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seed = () => Date.now() % 100000;

  // A small burst of petals from the middle of a finished board.
  function bloom(board) {
    if (reduced()) return;
    for (let i = 0; i < 18; i++) {
      const petal = document.createElement('i');
      petal.className = 'game-petal';
      const angle = i / 18 * Math.PI * 2, reach = 90 + Math.random() * 120;
      petal.style.cssText = `--dx:${Math.cos(angle) * reach}px;--dy:${Math.sin(angle) * reach - 40}px;--spin:${Math.random() * 360}deg;--delay:${Math.random() * .2}s`;
      board.append(petal);
      petal.addEventListener('animationend', () => petal.remove(), { once:true });
    }
  }

  /* Memory: six of the photos, twice each. */
  const memoryBoard = document.querySelector('#memory-board');
  if (memoryBoard) {
    const faces = ['trail-06', 'trail-09', 'trail-12', 'trail-15', 'trail-20', 'ribbon-12'];
    const status = document.querySelector('#memory-status'), finish = document.querySelector('#memory-finish');
    let state, waiting = 0;
    function render() {
      state.cards.forEach((card, i) => {
        const button = memoryBoard.children[i];
        button.classList.toggle('is-open', card.open || card.matched);
        button.classList.toggle('is-matched', card.matched);
        button.setAttribute('aria-label', card.open || card.matched ? `回忆 ${faces.indexOf(card.face) + 1}` : `卡片 ${i + 1}，未翻开`);
        button.disabled = card.matched;
      });
      status.textContent = `已找到 ${state.pairs} / ${faces.length} 对 · ${state.moves} 步`;
    }
    function deal() {
      clearTimeout(waiting);
      state = L.memoryDeal(faces, L.random(seed()));
      memoryBoard.replaceChildren(...state.cards.map((card, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'memory-tile';
        button.style.setProperty('--i', i);
        button.innerHTML = `<span class="memory-tile-inner"><span class="memory-tile-back" aria-hidden="true">♡<small>05:20</small></span><span class="memory-tile-face" aria-hidden="true"><img src="assets/photos/${card.face}.webp?v=2" alt="" loading="lazy" decoding="async" draggable="false"></span></span>`;
        button.addEventListener('click', () => turn(i));
        return button;
      }));
      finish.hidden = true;
      memoryBoard.classList.remove('is-done');
      render();
    }
    function turn(index) {
      const result = L.memoryTurn(state, index);
      if (!result.changed) return;
      state = result.state;
      render();
      if (result.miss) waiting = setTimeout(() => { state = L.memoryHide(state); render(); }, reduced() ? 500 : 900);
      if (L.memoryDone(state)) {
        memoryBoard.classList.add('is-done');
        finish.hidden = false;
        status.textContent = `全部找到了 · ${state.moves} 步`;
        bloom(memoryBoard);
      }
    }
    document.querySelector('#memory-again').addEventListener('click', deal);
    deal();
  }

  /* Sliding puzzle: 3×3, the last piece appears when the picture is whole. */
  const puzzleBoard = document.querySelector('#puzzle-board');
  if (puzzleBoard) {
    const size = 3, status = document.querySelector('#puzzle-status'), finish = document.querySelector('#puzzle-finish');
    const peek = document.querySelector('#puzzle-peek'), frame = puzzleBoard.closest('.puzzle-frame');
    let board, moves = 0;
    const tiles = Array.from({ length:size * size - 1 }, (_, i) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'puzzle-tile';
      tile.style.setProperty('--col', i % size);
      tile.style.setProperty('--row', Math.floor(i / size));
      tile.addEventListener('click', () => move(i + 1));
      return tile;
    });
    const last = document.createElement('span');
    last.className = 'puzzle-tile puzzle-last';
    last.style.setProperty('--col', size - 1);
    last.style.setProperty('--row', size - 1);
    last.setAttribute('aria-hidden', 'true');
    puzzleBoard.append(...tiles, last);
    function render() {
      const gap = board.indexOf(0);
      board.forEach((tile, index) => {
        if (!tile) return;
        const el = tiles[tile - 1];
        el.style.setProperty('--x', index % size);
        el.style.setProperty('--y', Math.floor(index / size));
        const movable = L.slide(board, size, index) !== null;
        el.classList.toggle('is-movable', movable);
        el.setAttribute('aria-label', `第 ${tile} 块${movable ? '，可以滑动' : ''}`);
      });
      status.textContent = `已经走了 ${moves} 步`;
      puzzleBoard.dataset.gap = gap;
    }
    function move(tile) {
      if (L.isSolved(board)) return;
      const next = L.slide(board, size, board.indexOf(tile));
      if (!next) {
        const el = tiles[tile - 1];
        el.classList.remove('is-stuck');
        void el.offsetWidth;
        el.classList.add('is-stuck');
        return;
      }
      board = next;
      moves++;
      render();
      if (L.isSolved(board)) {
        frame.classList.add('is-solved');
        finish.hidden = false;
        status.textContent = `拼好了 · ${moves} 步`;
        bloom(puzzleBoard);
      }
    }
    function shuffle() {
      board = L.scramble(size, 80, L.random(seed()));
      moves = 0;
      frame.classList.remove('is-solved');
      finish.hidden = true;
      render();
    }
    peek.addEventListener('click', () => {
      const on = !frame.classList.contains('is-peeking');
      frame.classList.toggle('is-peeking', on);
      peek.setAttribute('aria-pressed', String(on));
      peek.textContent = on ? '继续拼' : '看看原图';
    });
    document.querySelector('#puzzle-shuffle').addEventListener('click', shuffle);
    shuffle();
  }
})();

/* Pure rules shared by the page and the tests (node --test tests/): the two mini-games
   and the camera path of the blue ribbon. No DOM here. */
(root => {
  'use strict';

  // Seeded randomness, so a test (or a visit) can be replayed.
  function random(seed) {
    let state = seed >>> 0;
    return () => {
      state = state + 0x6D2B79F5 >>> 0;
      let t = Math.imul(state ^ state >>> 15, 1 | state);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(items, rand) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /* Memory: every face appears twice. Turn two cards; a pair stays open, a miss turns back. */
  function memoryDeal(faces, rand) {
    return { cards:shuffle([...faces, ...faces], rand).map(face => ({ face, open:false, matched:false })), turned:[], moves:0, pairs:0 };
  }
  // Returns the next state; `miss` means the two turned cards should be hidden after a beat.
  function memoryTurn(state, index) {
    const card = state.cards[index];
    if (!card || card.open || card.matched || state.turned.length >= 2) return { state, changed:false };
    const cards = state.cards.map((c, i) => i === index ? { ...c, open:true } : c);
    const turned = [...state.turned, index];
    if (turned.length < 2) return { state:{ ...state, cards, turned }, changed:true };
    const [a, b] = turned, match = cards[a].face === cards[b].face;
    const settled = match ? cards.map((c, i) => i === a || i === b ? { ...c, matched:true } : c) : cards;
    return {
      state:{ ...state, cards:settled, turned:match ? [] : turned, moves:state.moves + 1, pairs:state.pairs + (match ? 1 : 0) },
      changed:true, match, miss:!match
    };
  }
  function memoryHide(state) {
    return { ...state, cards:state.cards.map((c, i) => state.turned.includes(i) && !c.matched ? { ...c, open:false } : c), turned:[] };
  }
  const memoryDone = state => state.cards.every(card => card.matched);

  /* Sliding puzzle on a size×size board; tile 0 is the gap. Shuffling by legal moves keeps it solvable. */
  const solvedBoard = size => [...Array(size * size - 1).keys()].map(i => i + 1).concat(0);
  function neighbours(size, index) {
    const row = Math.floor(index / size), col = index % size;
    return [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
      .filter(([r, c]) => r >= 0 && c >= 0 && r < size && c < size).map(([r, c]) => r * size + c);
  }
  function slide(board, size, index) {
    const gap = board.indexOf(0);
    if (!neighbours(size, gap).includes(index)) return null;
    const next = [...board];
    [next[gap], next[index]] = [next[index], next[gap]];
    return next;
  }
  const isSolved = board => board.every((tile, i) => tile === (i === board.length - 1 ? 0 : i + 1));
  function scramble(size, moves, rand) {
    let board = solvedBoard(size), previous = -1;
    for (let i = 0; i < moves || isSolved(board); i++) {
      const gap = board.indexOf(0);
      const options = neighbours(size, gap).filter(index => index !== previous);
      board = slide(board, size, options[Math.floor(rand() * options.length)]);
      previous = gap;
    }
    return board;
  }
  // Inversion parity: the classic test that a shuffled board can still be solved.
  function solvable(board, size) {
    const tiles = board.filter(Boolean);
    let inversions = 0;
    for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) if (tiles[i] > tiles[j]) inversions++;
    if (size % 2) return inversions % 2 === 0;
    const gapRowFromBottom = size - Math.floor(board.indexOf(0) / size);
    return (inversions + gapRowFromBottom) % 2 === 1;
  }

  /* The ribbon camera walks a polyline; distance along it maps to a point. */
  function pathLength(points) {
    let total = 0;
    for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    return total;
  }
  function pointAlong(points, distance) {
    let left = Math.max(0, distance);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
      if (left <= length) {
        const t = length ? left / length : 0;
        return { x:a.x + (b.x - a.x) * t, y:a.y + (b.y - a.y) * t };
      }
      left -= length;
    }
    return { ...points[points.length - 1] };
  }

  const api = { random, shuffle, memoryDeal, memoryTurn, memoryHide, memoryDone, solvedBoard, slide, scramble, isSolved, solvable, pathLength, pointAlong };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SiteLogic = api;
})(typeof window === 'object' ? window : globalThis);

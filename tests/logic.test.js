// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic.js');

test('the same seed deals the same deck, every face exactly twice', () => {
  const a = L.memoryDeal(['a', 'b', 'c'], L.random(7)), b = L.memoryDeal(['a', 'b', 'c'], L.random(7));
  assert.deepEqual(a.cards.map(c => c.face), b.cards.map(c => c.face));
  for (const face of ['a', 'b', 'c']) assert.equal(a.cards.filter(c => c.face === face).length, 2);
  assert.ok(a.cards.every(c => !c.open && !c.matched));
});

test('a matching pair stays open and counts', () => {
  let state = { cards:['x', 'y', 'x', 'y'].map(face => ({ face, open:false, matched:false })), turned:[], moves:0, pairs:0 };
  state = L.memoryTurn(state, 0).state;
  const second = L.memoryTurn(state, 2);
  assert.equal(second.match, true);
  assert.equal(second.state.pairs, 1);
  assert.equal(second.state.moves, 1);
  assert.ok(second.state.cards[0].matched && second.state.cards[2].matched);
  assert.deepEqual(second.state.turned, []);
});

test('a miss stays turned until hidden, and blocks a third card', () => {
  let state = { cards:['x', 'y', 'x', 'y'].map(face => ({ face, open:false, matched:false })), turned:[], moves:0, pairs:0 };
  state = L.memoryTurn(state, 0).state;
  const miss = L.memoryTurn(state, 1);
  assert.equal(miss.miss, true);
  assert.equal(L.memoryTurn(miss.state, 2).changed, false, 'third card waits');
  const hidden = L.memoryHide(miss.state);
  assert.ok(hidden.cards.every(c => !c.open));
  assert.deepEqual(hidden.turned, []);
});

test('turning an open or matched card does nothing', () => {
  let state = { cards:['x', 'x'].map(face => ({ face, open:false, matched:false })), turned:[], moves:0, pairs:0 };
  state = L.memoryTurn(state, 0).state;
  assert.equal(L.memoryTurn(state, 0).changed, false);
  state = L.memoryTurn(state, 1).state;
  assert.ok(L.memoryDone(state));
  assert.equal(L.memoryTurn(state, 1).changed, false);
});

test('a full game always finishes', () => {
  const faces = ['1', '2', '3', '4', '5', '6'];
  let state = L.memoryDeal(faces, L.random(42));
  // Play perfectly by knowing the faces: turn each pair together.
  for (const face of faces) {
    const [a, b] = state.cards.map((c, i) => c.face === face ? i : -1).filter(i => i >= 0);
    state = L.memoryTurn(state, a).state;
    state = L.memoryTurn(state, b).state;
  }
  assert.ok(L.memoryDone(state));
  assert.equal(state.moves, 6);
});

test('the solved board is recognised and a scramble is not', () => {
  assert.ok(L.isSolved(L.solvedBoard(3)));
  for (let seed = 1; seed < 40; seed++) {
    const board = L.scramble(3, 60, L.random(seed));
    assert.equal(L.isSolved(board), false);
    assert.deepEqual([...board].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assert.ok(L.solvable(board, 3), `seed ${seed} solvable`);
  }
});

test('only tiles next to the gap can slide', () => {
  const board = L.solvedBoard(3); // gap at index 8
  assert.deepEqual(L.slide(board, 3, 7), [1, 2, 3, 4, 5, 6, 7, 0, 8]);
  assert.deepEqual(L.slide(board, 3, 5), [1, 2, 3, 4, 5, 0, 7, 8, 6]);
  assert.equal(L.slide(board, 3, 0), null);
  assert.equal(L.slide(board, 3, 4), null, 'diagonal does not slide');
});

test('undoing the scramble moves solves the board', () => {
  const rand = L.random(9);
  let board = L.solvedBoard(3);
  const gaps = [];
  for (let i = 0; i < 30; i++) {
    const gap = board.indexOf(0);
    const options = [gap - 3, gap + 3, gap % 3 ? gap - 1 : -1, gap % 3 < 2 ? gap + 1 : -1].filter(n => n >= 0 && n < 9);
    gaps.push(gap);
    board = L.slide(board, 3, options[Math.floor(rand() * options.length)]);
  }
  for (const gap of gaps.reverse()) board = L.slide(board, 3, gap);
  assert.ok(L.isSolved(board));
});

test('the parity test rejects an impossible board', () => {
  assert.equal(L.solvable([2, 1, 3, 4, 5, 6, 7, 8, 0], 3), false);
  assert.equal(L.solvable(L.solvedBoard(4), 4), true);
});

test('points along the camera path', () => {
  const path = [{ x:0, y:0 }, { x:100, y:0 }, { x:100, y:100 }];
  assert.equal(L.pathLength(path), 200);
  assert.deepEqual(L.pointAlong(path, 50), { x:50, y:0 });
  assert.deepEqual(L.pointAlong(path, 150), { x:100, y:50 });
  assert.deepEqual(L.pointAlong(path, -10), { x:0, y:0 });
  assert.deepEqual(L.pointAlong(path, 999), { x:100, y:100 });
  assert.deepEqual(L.pointAlong([{ x:0, y:0 }, { x:30, y:40 }], 25), { x:15, y:20 });
});

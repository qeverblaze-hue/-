import test from 'node:test';
import assert from 'node:assert/strict';
import { SnakeGame } from './game.js';

const makeGame = (options = {}) => new SnakeGame({ random: () => 0, ...options });

test('reset restores the centered four-cell snake and clears queued turns', () => {
  const game = makeGame();
  game.start();
  game.setDirection('up');
  game.score = 30;
  game.reset();
  assert.equal(game.status, 'ready');
  assert.equal(game.score, 0);
  assert.equal(game.direction, 'right');
  assert.deepEqual(game.snake, [
    { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 },
  ]);
  game.start();
  game.tick();
  assert.deepEqual(game.snake[0], { x: 11, y: 10 });
});

test('eating adds one segment and ten points, then spawns unoccupied food', () => {
  const game = makeGame();
  game.food = { x: 11, y: 10 };
  game.start();
  assert.equal(game.tick(), true);
  assert.equal(game.score, 10);
  assert.equal(game.snake.length, 5);
  assert.deepEqual(game.snake[0], { x: 11, y: 10 });
  assert.ok(!game.snake.some((cell) => cell.x === game.food.x && cell.y === game.food.y));
});

test('moving without eating preserves length and moves the tail', () => {
  const game = makeGame();
  game.start();
  game.tick();
  assert.equal(game.snake.length, 4);
  assert.deepEqual(game.snake.at(-1), { x: 8, y: 10 });
  assert.equal(game.score, 0);
});

test('wall collision ends the game without moving the snake out of bounds', () => {
  const game = makeGame({ size: 4 });
  const snakeBefore = structuredClone(game.snake);
  game.start();
  assert.equal(game.tick(), false);
  assert.equal(game.status, 'over');
  assert.deepEqual(game.snake, snakeBefore);
  assert.equal(game.setDirection('up'), false);
  game.start();
  assert.equal(game.status, 'over');
});

test('colliding with a body segment ends the game', () => {
  const game = makeGame();
  game.snake = [
    { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 },
    { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
  ];
  game.direction = 'right';
  game.setDirection('up');
  game.start();
  assert.equal(game.tick(), false);
  assert.equal(game.status, 'over');
});

test('a snake may move into the cell vacated by its tail', () => {
  const game = makeGame();
  game.snake = [{ x: 2, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 1 }];
  game.setDirection('up');
  game.start();
  assert.equal(game.tick(), true);
  assert.equal(game.status, 'running');
  assert.deepEqual(game.snake[0], { x: 2, y: 1 });
  assert.equal(new Set(game.snake.map(({ x, y }) => `${x},${y}`)).size, 4);
});

test('direction input rejects reversal, repeats, invalid input, and excess queued turns', () => {
  const game = makeGame();
  assert.equal(game.setDirection('left'), false);
  assert.equal(game.setDirection('right'), false);
  assert.equal(game.setDirection('toString'), false);
  assert.equal(game.setDirection('diagonal'), false);
  assert.equal(game.setDirection('up'), true);
  assert.equal(game.setDirection('down'), false);
  assert.equal(game.setDirection('left'), true);
  assert.equal(game.setDirection('down'), false);
  game.start();
  game.tick();
  assert.equal(game.direction, 'up');
  assert.deepEqual(game.snake[0], { x: 10, y: 9 });
  game.tick();
  assert.equal(game.direction, 'left');
  assert.deepEqual(game.snake[0], { x: 9, y: 9 });
});

test('only a running game advances; pause and resume preserve the board', () => {
  const game = makeGame();
  const initial = structuredClone(game.snake);
  assert.equal(game.tick(), false);
  game.pause();
  assert.equal(game.status, 'ready');
  game.start();
  game.pause();
  assert.equal(game.status, 'paused');
  assert.equal(game.tick(), false);
  assert.deepEqual(game.snake, initial);
  game.start();
  assert.equal(game.status, 'paused');
  game.resume();
  assert.equal(game.status, 'running');
  assert.equal(game.tick(), true);
  assert.notDeepEqual(game.snake, initial);
});

test('eating the final free cell wins and leaves no food', () => {
  const game = makeGame({ size: 4 });
  const path = [];
  for (let y = 0; y < 4; y += 1) {
    for (let offset = 0; offset < 4; offset += 1) {
      path.push({ x: y % 2 === 0 ? offset : 3 - offset, y });
    }
  }
  game.snake = path.slice(1);
  game.direction = 'left';
  game.food = path[0];
  game.start();
  assert.equal(game.tick(), true);
  assert.equal(game.status, 'won');
  assert.equal(game.snake.length, 16);
  assert.equal(game.food, null);
  assert.equal(game.score, 10);
  assert.equal(game.tick(), false);
});

test('food selection can reach every free cell without landing on the snake', () => {
  const game = makeGame({ size: 4 });
  const freeCount = game.size ** 2 - game.snake.length;
  const seen = new Set();
  for (let index = 0; index < freeCount; index += 1) {
    game.random = () => (index + 0.5) / freeCount;
    const food = game.createFood();
    assert.ok(!game.snake.some((cell) => cell.x === food.x && cell.y === food.y));
    seen.add(`${food.x},${food.y}`);
  }
  assert.equal(seen.size, freeCount);
});

test('rejects boards that cannot contain the starting snake', () => {
  for (const size of [0, 3, 4.5, NaN]) {
    assert.throws(() => makeGame({ size }), RangeError);
  }
});

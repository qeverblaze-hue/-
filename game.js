const VECTORS = Object.freeze({
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
});

const OPPOSITE = Object.freeze({
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
});

const sameCell = (a, b) => a.x === b.x && a.y === b.y;

/** A rendering-independent, one-cell-at-a-time Snake game. */
export class SnakeGame {
  constructor({ size = 20, random = Math.random } = {}) {
    if (!Number.isInteger(size) || size < 4) {
      throw new RangeError('The board size must be an integer of at least 4.');
    }
    this.size = size;
    this.random = random;
    this.reset();
  }

  reset() {
    const headX = Math.max(3, Math.floor(this.size / 2));
    const y = Math.floor(this.size / 2);
    this.snake = Array.from({ length: 4 }, (_, index) => ({ x: headX - index, y }));
    this.direction = 'right';
    this.directionQueue = [];
    this.score = 0;
    this.status = 'ready';
    this.food = this.createFood();
  }

  start() {
    if (this.status === 'ready') this.status = 'running';
  }

  pause() {
    if (this.status === 'running') this.status = 'paused';
  }

  resume() {
    if (this.status === 'paused') this.status = 'running';
  }

  setDirection(name) {
    if (!Object.hasOwn(VECTORS, name) || this.status === 'over' || this.status === 'won') {
      return false;
    }
    const previous = this.directionQueue.at(-1) ?? this.direction;
    if (name === previous || name === OPPOSITE[previous] || this.directionQueue.length >= 2) {
      return false;
    }
    this.directionQueue.push(name);
    return true;
  }

  tick() {
    if (this.status !== 'running') return false;
    if (this.directionQueue.length) this.direction = this.directionQueue.shift();

    const vector = VECTORS[this.direction];
    const head = {
      x: this.snake[0].x + vector.x,
      y: this.snake[0].y + vector.y,
    };
    const eating = this.food !== null && sameCell(head, this.food);
    // When moving without eating, the tail leaves its cell during this same step.
    const occupied = eating ? this.snake : this.snake.slice(0, -1);
    const outOfBounds = head.x < 0 || head.y < 0 || head.x >= this.size || head.y >= this.size;

    if (outOfBounds || occupied.some((cell) => sameCell(cell, head))) {
      this.status = 'over';
      this.directionQueue = [];
      return false;
    }

    this.snake.unshift(head);
    if (eating) {
      this.score += 10;
      this.food = this.createFood();
      if (this.food === null) {
        this.status = 'won';
        this.directionQueue = [];
      }
    } else {
      this.snake.pop();
    }
    return true;
  }

  createFood() {
    const occupied = new Set(this.snake.map(({ x, y }) => y * this.size + x));
    const available = [];
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        if (!occupied.has(y * this.size + x)) available.push({ x, y });
      }
    }
    if (available.length === 0) return null;
    return available[Math.floor(this.random() * available.length)];
  }
}

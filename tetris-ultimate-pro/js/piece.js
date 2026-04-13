/* ===== PIECE (Tetromino) ===== */
const TETROMINOES = {
  I: { color: '#0ff',  shadow: 'rgba(0,255,255,.3)',
       shapes: [
         [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
         [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
         [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
         [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
       ]},
  O: { color: '#ff0',  shadow: 'rgba(255,255,0,.3)',
       shapes: [
         [[1,1],[1,1]],
         [[1,1],[1,1]],
         [[1,1],[1,1]],
         [[1,1],[1,1]]
       ]},
  T: { color: '#c0f',  shadow: 'rgba(192,0,255,.3)',
       shapes: [
         [[0,1,0],[1,1,1],[0,0,0]],
         [[0,1,0],[0,1,1],[0,1,0]],
         [[0,0,0],[1,1,1],[0,1,0]],
         [[0,1,0],[1,1,0],[0,1,0]]
       ]},
  S: { color: '#0f4',  shadow: 'rgba(0,255,68,.3)',
       shapes: [
         [[0,1,1],[1,1,0],[0,0,0]],
         [[0,1,0],[0,1,1],[0,0,1]],
         [[0,0,0],[0,1,1],[1,1,0]],
         [[1,0,0],[1,1,0],[0,1,0]]
       ]},
  Z: { color: '#f22',  shadow: 'rgba(255,34,34,.3)',
       shapes: [
         [[1,1,0],[0,1,1],[0,0,0]],
         [[0,0,1],[0,1,1],[0,1,0]],
         [[0,0,0],[1,1,0],[0,1,1]],
         [[0,1,0],[1,1,0],[1,0,0]]
       ]},
  J: { color: '#04f',  shadow: 'rgba(0,68,255,.3)',
       shapes: [
         [[1,0,0],[1,1,1],[0,0,0]],
         [[0,1,1],[0,1,0],[0,1,0]],
         [[0,0,0],[1,1,1],[0,0,1]],
         [[0,1,0],[0,1,0],[1,1,0]]
       ]},
  L: { color: '#f80',  shadow: 'rgba(255,136,0,.3)',
       shapes: [
         [[0,0,1],[1,1,1],[0,0,0]],
         [[0,1,0],[0,1,0],[0,1,1]],
         [[0,0,0],[1,1,1],[1,0,0]],
         [[1,1,0],[0,1,0],[0,1,0]]
       ]}
};

const PIECE_TYPES = Object.keys(TETROMINOES);

// Wall-kick offsets for SRS (simplified)
const WALL_KICKS = {
  default: [
    [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]]
  ],
  I: [
    [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    [[0,0],[1,0],[-2,0],[1,-2],[-2,1]]
  ]
};

class Piece {
  constructor(type) {
    this.type    = type || PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    this.data    = TETROMINOES[this.type];
    this.color   = this.data.color;
    this.shadow  = this.data.shadow;
    this.rotation= 0;
    this.x       = 3;
    this.y       = 0;
  }

  getShape() { return this.data.shapes[this.rotation]; }

  clone() {
    const p = new Piece(this.type);
    p.rotation = this.rotation;
    p.x = this.x; p.y = this.y;
    return p;
  }

  // Returns rotated piece (does not mutate)
  rotated(dir = 1) {
    const p = this.clone();
    p.rotation = (p.rotation + dir + 4) % 4;
    return p;
  }

  getKickOffsets(fromRot) {
    const table = this.type === 'I' ? WALL_KICKS.I : WALL_KICKS.default;
    return table[fromRot] || [[0,0]];
  }
}

// Bag-7 randomizer
class PieceBag {
  constructor() { this.bag = []; }
  next() {
    if (!this.bag.length) this.bag = [...PIECE_TYPES].sort(() => Math.random() - .5);
    return new Piece(this.bag.shift());
  }
  peek(count = 3) {
    while (this.bag.length < count) {
      this.bag = this.bag.concat([...PIECE_TYPES].sort(() => Math.random() - .5));
    }
    return this.bag.slice(0, count).map(t => new Piece(t));
  }
}

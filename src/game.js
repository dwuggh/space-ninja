// copy from web
CanvasRenderingContext2D.prototype.fillCircle = function (x, y, r) {
  this.beginPath()
  this.arc(x, y, r, 0, 2 * Math.PI)
  this.fill()
}

// the game board global variable
// we represent the site's coordinate by its top-left vertex's coordinate.
var board
var gameStat

function draw() {
  const canvas = document.getElementById('game-canvas')
  if (canvas.getContext) {
    const M = 5, N = 5
    board = new Board(M, N, 'game-canvas')
    gameStat = new GameStat(M, N)
    window.addEventListener('resize', resizeCanvas, false)
	requestAnimationFrame(animate)
  }
}

function animate() {
  board.draw(gameStat)
  requestAnimationFrame(animate)
}

function resizeCanvas() {
  const canvas = document.getElementById('game-canvas')
  canvas.width = window.innerWidth - 50
  canvas.height = window.innerHeight - 50
  board.draw()
}

// render the game board inside a canvas
class Board {
  // a MxN board.
  constructor(M, N, id) {
    this.M = M
    this.N = N
    this.canvas = document.getElementById(id)
    this.ctx = this.canvas.getContext('2d')
    // the grid's spacing constant
    this.gridSpacing = 50
    this.chessRadius = 17
    this.margin = 50
    // colors
    this.playerChessColor = ['rgb(200, 0, 0)', 'rgb(200, 200, 200)']
    this.playerFillColor = ['rgb(100, 50, 0)', 'rgb(100, 100, 100)']
  }

  // draw the entire board, gs: GameStat
  draw(gs) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = 'rgb(0, 0, 0)'
    this.drawGrid()

    for (let m = 0; m < this.M; m++) {
      for (let n = 0; n < this.N; n++) {
        const p = gs.occupation[m][n]
        if (p != -1) {
          this.drawSite(m, n, p)
        }
      }
    }

    for (let m = 0; m < this.M + 1; m++) {
      for (let n = 0; n < this.N + 1; n++) {
        const c = gs.chesses[m][n]
        if (c !== null) {
          // console.log(c)
          this.drawChess(c.m, c.n, c.player)
        }
      }
    }

    // score
    this.ctx.fillStyle = 'rgb(0, 0, 0)'
    this.ctx.font = '24px serif'
    this.ctx.fillText('player 1: ' + gs.score[0], 380, 400)
    this.ctx.fillText('player 2: ' + gs.score[1], 380, 450)
  }

  // draw the whole chess board.
  drawGrid() {
    const margin = 50
    this.ctx.beginPath()
    const x0 = this.getX(this.N)
    for (let m = 0; m <= this.M; m ++) {
      const y = this.getY(m)
      this.ctx.moveTo(margin, y)
      this.ctx.lineTo(x0, y)
    }
    const y0 = this.getY(this.M)
    for (let n = 0; n <= this.N; n ++) {
      const x = this.getX(n)
      this.ctx.moveTo(x, margin)
      this.ctx.lineTo(x, y0)
    }
    this.ctx.closePath()
    this.ctx.stroke()
  }

  drawChess(m, n, player) {
    const x = this.getX(n)
    const y = this.getY(m)
    this.ctx.fillStyle = this.playerChessColor[player]
    this.ctx.fillCircle(x, y, this.chessRadius)
  }

  drawSite(m, n, player) {
    const x = this.getX(n)
    const y = this.getY(m)
    const g = this.gridSpacing
    this.ctx.fillStyle = this.playerFillColor[player]
    this.ctx.fillRect(x, y, g, g)
  }

  // canvas coordinate to lattice position tranform
  getX(n) {
    return this.margin + n * this.gridSpacing
  }

  getY(m) {
    return this.margin + m * this.gridSpacing
  }
}

class GameStat {
  constructor(M, N) {
    this.M = M
    this.N = N
    /*
		  moves & chesses contain objects in the following form:
		  move : {
		      count: number,
			  player: number,
			  x: number,
			  y: number
		  }
		 */
    this.moves = []
    this.boundary = []
    this.score = [0, 0]
    this.occupation = new Array(M).fill(0).map(x => new Array(N).fill(-1))
    this.chesses = new Array(M + 1).fill(0).map(x => new Array(N + 1).fill(null))
    this.count = 0
    this.currentPlayer = 0
  }

  isEmpty(m, n) {
    return this.chesses[m][n] === null
  }

  calcOccupation(m, n) {
    let c = new Array(4)
    c[0] = this.chesses[m][n]
    c[1] = this.chesses[m][n + 1]
    c[2] = this.chesses[m + 1][n]
    c[3] = this.chesses[m + 1][n + 1]
    if (c.reduce((x, y) => x && y) === null) {
      return
    }
    const winner = c.reduce((x, y) => {
      return x.count < y.count ? y : x
    }).player
    this.occupation[m][n] = winner
  }

  calcScore() {
    let score = [0, 0]
    for (let arr of this.occupation) {
      for (let p of arr) {
        if (p != -1) {
          score[p]++
        }
      }
    }
    this.score = score
  }

  addMove(m, n, player) {
    if (!this.isEmpty(m, n) || !this.isValidPos(m, n)) {
      // early stop
      return
    }
    const move = {
      count: this.count,
      player: player,
      m: m,
      n: n
    }
    this.count++
    this.moves.push(move)
    this.chesses[m][n] = move

    // calculate occupation, mind the boundaries
    if (m > 0 && n != this.N) {
      this.calcOccupation(m - 1, n)
    }
    if (n > 0 && m != this.M) {
      this.calcOccupation(m, n - 1)
    }
    if (m != this.M && n != this.N) {
      this.calcOccupation(m, n)
    }
    if (m > 0 && n > 0) {
      this.calcOccupation(m - 1, n - 1)
    }

    this.calcScore()
  }

  move(m, n) {
    if (m < 0 || m > this.M || n < 0 || n > this.N) {
      return
    }
    if (!this.isEmpty(m, n) || !this.isValidPos(m, n)) {
      // early stop
      return
    }
    this.addMove(m, n, this.currentPlayer)
    this.currentPlayer = 1 - this.currentPlayer
  }

  // only short-range interaction
  isValidPos(m, n) {
    // the first move can be arbitrary
    if (this.count === 0) {
      return true
    }
    // return this.boundary.find(val => val === (m, n))
    let c = []
    if (m > 0) { c.push(this.chesses[m - 1][n]) }
    if (m < this.M - 1) { c.push(this.chesses[m + 1][n]) }
    if (n > 0) { c.push(this.chesses[m][n - 1]) }
    if (n < this.N - 1) { c.push(this.chesses[m][n + 1]) }
    // if find chess around the position
    return c.reduce((x, y) => x || y) != null
  }
}


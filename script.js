const canvas = document.getElementById('tetris')
const context = canvas.getContext('2d')
const scoreElement = document.getElementById('score')
const highScoreElement = document.getElementById('high-score')
const startButton = document.getElementById('start-button')
const pauseButton = document.getElementById('pause-button')
const messageContainer = document.getElementById('message-container')
const overlay = document.getElementById('overlay') // Added overlay element selection

// Mobile control buttons
const leftButton = document.getElementById('left-button')
const rightButton = document.getElementById('right-button')
const upButton = document.getElementById('up-button')
const downButton = document.getElementById('down-button')

context.scale(20, 20)
context.imageSmoothingEnabled = false // Ensure crisp rendering

// Define colors for each piece
const COLORS = [
  null,
  '#FF0D72', // T
  '#0DC2FF', // O
  '#0DFF72', // L
  '#F538FF', // J
  '#FF8E0D', // I
  '#FFE138', // S
  '#3877FF', // Z
]

// Initialize score and high score
let score = 0
let highScore = localStorage.getItem('highScore') || 0
scoreElement.innerText = `Score: ${score}`
highScoreElement.innerText = `High: ${highScore}`
let dropCounter = 0
let dropInterval = 1000
let lastTime = 0
let animationId
let isPaused = false
let isStarted = false

// Draw grid
function drawGrid() {
  context.strokeStyle = 'rgba(255, 255, 255, 0.1)'
  context.lineWidth = 0.05
  for (let x = 0; x < canvas.width / 20; x++) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, canvas.height / 20)
    context.stroke()
  }
  for (let y = 0; y < canvas.height / 20; y++) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(canvas.width / 20, y)
    context.stroke()
  }
}

function arenaSweep() {
  let rowCount = 0
  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer
      }
    }
    const row = arena.splice(y, 1)[0].fill(0)
    arena.unshift(row)
    y++
    rowCount++
  }
  if (rowCount > 0) {
    // Update score based on the number of rows cleared
    score += rowCount * 100
    scoreElement.innerText = `Score: ${score}`

    // Check and update high score
    if (score > highScore) {
      highScore = score
      highScoreElement.innerText = `High: ${highScore}`
      localStorage.setItem('highScore', highScore)
    }
  }
}

function collide(arena, player) {
  const m = player.matrix
  const o = player.pos
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true
      }
    }
  }
  return false
}

function createMatrix(w, h) {
  const matrix = []
  while (h--) {
    matrix.push(new Array(w).fill(0))
  }
  return matrix
}

function createPiece(type) {
  if (type === 'T') {
    return [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ]
  }
  if (type === 'O') {
    return [
      [2, 2],
      [2, 2],
    ]
  }
  if (type === 'L') {
    return [
      [0, 3, 0],
      [0, 3, 0],
      [0, 3, 3],
    ]
  }
  if (type === 'J') {
    return [
      [0, 4, 0],
      [0, 4, 0],
      [4, 4, 0],
    ]
  }
  if (type === 'I') {
    return [
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
    ]
  }
  if (type === 'S') {
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ]
  }
  if (type === 'Z') {
    return [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0],
    ]
  }
  return null
}

function draw() {
  context.fillStyle = '#000'
  context.fillRect(0, 0, canvas.width, canvas.height)
  drawGrid()
  drawMatrix(arena, { x: 0, y: 0 })
  drawMatrix(player.matrix, player.pos)
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = COLORS[value]
        context.fillRect(x + offset.x, y + offset.y, 1, 1)
      }
    })
  })
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value
      }
    })
  })
}

function playerDrop() {
  player.pos.y++
  if (collide(arena, player)) {
    player.pos.y--
    merge(arena, player)
    arenaSweep()
    playerReset()
  }
  dropCounter = 0
}

function playerMove(dir) {
  player.pos.x += dir
  if (collide(arena, player)) {
    player.pos.x -= dir
  }
}

function rotate(matrix, dir) {
  // Transpose
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      ;[matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]]
    }
  }
  // Reverse rows for clockwise, columns for counter
  if (dir > 0) {
    matrix.forEach((row) => row.reverse())
  } else {
    matrix.reverse()
  }
}

function playerRotate(dir) {
  rotate(player.matrix, dir)
  const pos = { ...player.pos }
  let offset = 1
  while (collide(arena, player)) {
    player.pos.x += offset
    offset = -(offset + (offset > 0 ? 1 : -1))
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir)
      player.pos = pos
      return
    }
  }
}

function playerReset() {
  const pieces = 'ILJOTSZ'
  player.matrix = createPiece(pieces[Math.floor(Math.random() * pieces.length)])
  player.pos.y = 0
  player.pos.x =
    Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2)

  if (collide(arena, player)) {
    arena.forEach((row) => row.fill(0))
    score = 0
    scoreElement.innerText = `Score: ${score}`
    showMessage('Game Over')
    startButton.style.display = 'block' // Show Start button
    pauseButton.style.display = 'none' // Hide Pause button

    // Show the overlay to dim the game
    overlay.style.display = 'block'

    // Stop the game loop
    isStarted = false
    cancelAnimationFrame(animationId)

    // Update high score if current score is greater
    if (score > highScore) {
      highScore = score
      highScoreElement.innerText = `High: ${highScore}`
      localStorage.setItem('highScore', highScore)
    }
  }
}

function update(time = 0) {
  if (!isStarted || isPaused) return
  const deltaTime = time - lastTime
  lastTime = time
  dropCounter += deltaTime
  if (dropCounter > dropInterval) {
    playerDrop()
  }
  draw()
  animationId = requestAnimationFrame(update)
}

const arena = createMatrix(12, 20)

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
}

function showMessage(message) {
  messageContainer.innerText = message
  messageContainer.style.display = 'block'
}

function hideMessage() {
  messageContainer.style.display = 'none'
}

function startGame() {
  if (isStarted) return
  isStarted = true
  isPaused = false
  score = 0
  scoreElement.innerText = `Score: ${score}`
  arena.forEach((row) => row.fill(0))
  playerReset()
  startButton.style.display = 'none' // Hide Start button
  pauseButton.style.display = 'block' // Show Pause button
  pauseButton.disabled = false // Enable Pause button
  lastTime = performance.now()
  animationId = requestAnimationFrame(update)
  hideMessage()

  // Hide the overlay when the game starts
  overlay.style.display = 'none'
}

function pauseGame() {
  if (!isStarted) return
  if (isPaused) {
    // Resume the game
    isPaused = false
    pauseButton.innerText = 'Pause'
    pauseButton.classList.remove('resume') // Remove Resume styling
    lastTime = performance.now()
    animationId = requestAnimationFrame(update)
    hideMessage()
  } else {
    // Pause the game
    isPaused = true
    pauseButton.innerHTML = '<span style="color: #11ff00;">Resume</span>'
    pauseButton.classList.add('resume') // Add Resume styling
    cancelAnimationFrame(animationId)
    showMessage('Paused')
  }
}

startButton.addEventListener('click', startGame)
pauseButton.addEventListener('click', pauseGame)

// Handle keyboard controls
document.addEventListener('keydown', (event) => {
  if (!isStarted || isPaused) return
  if (event.key === 'ArrowLeft') {
    playerMove(-1)
  } else if (event.key === 'ArrowRight') {
    playerMove(1)
  } else if (event.key === 'ArrowDown') {
    playerDrop()
  } else if (event.key === 'ArrowUp') {
    playerRotate(1)
  }
})

// Handle mobile controls
leftButton.addEventListener('click', () => {
  if (!isStarted || isPaused) return
  playerMove(-1)
})

rightButton.addEventListener('click', () => {
  if (!isStarted || isPaused) return
  playerMove(1)
})

downButton.addEventListener('click', () => {
  if (!isStarted || isPaused) return
  playerDrop()
})

upButton.addEventListener('click', () => {
  if (!isStarted || isPaused) return
  playerRotate(1)
})

// Initial setup
playerReset()
draw()

class Tetris {
    constructor(boardId = 'board', nextPieceId = 'nextPiece') {
        this.canvas = document.getElementById(boardId);
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById(nextPieceId);
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // Set width and height for vertical rectangle, maintaining square grid cells
        this.BOARD_WIDTH = 10;
        this.BOARD_HEIGHT = 20;
        
        this.BLOCK_SIZE = 30;
        this.NEXT_BLOCK_SIZE = 20;

        // Define pieces first
        this.pieces = [
            [[1, 1, 1, 1]],                         // I
            [[2, 2], [2, 2]],                       // O
            [[3, 3, 3], [0, 3, 0]],                // T
            [[4, 4, 4], [4, 0, 0]],                // L
            [[5, 5, 5], [0, 0, 5]],                // J
            [[6, 6, 0], [0, 6, 6]],                // Z
            [[0, 7, 7], [7, 7, 0]]                 // S
        ];
        
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        
        this.currentPiece = null;
        this.nextPiece = this.createPiece();
        
        this.dropCounter = 0;
        this.lastTime = 0;
        this.dropInterval = 1000;
        
        this.gameOver = false;
        this.isPaused = false;
        this.isRunning = false;
        this.isSoftDropping = false;
        
        this.colors = [
            '#000000',
            '#FF0000',
            '#00FF00',
            '#0000FF',
            '#FFFF00',
            '#00FFFF',
            '#FF00FF',
            '#FFA500'
        ];
        
        this.controlBtn = document.getElementById('controlBtn');
        this.gameState = 'stopped'; // 'stopped', 'playing', 'paused'
        
        this.initializeControls();
        this.initializeMobileControls();
        this.initializeResizeHandler();
        this.reset();
    }

    initializeControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameState !== 'playing') return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.moveLeft();
                    break;
                case 'ArrowRight':
                    this.moveRight();
                    break;
                case 'ArrowDown':
                    this.isSoftDropping = true;
                    break;
                case 'ArrowUp':
                    this.rotate();
                    break;
                case ' ':
                    this.hardDrop();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowDown') {
                this.isSoftDropping = false;
            }
        });
        
        this.controlBtn.addEventListener('click', () => {
            // Request fullscreen on mobile devices when starting the game
            if (window.innerWidth <= 768 && this.gameState === 'stopped') {
                const element = document.documentElement;
                if (element.requestFullscreen) {
                    element.requestFullscreen();
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen();
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen();
                }
            }

            switch (this.gameState) {
                case 'stopped':
                    this.gameState = 'playing';
                    this.controlBtn.innerHTML = '⏸';
                    this.controlBtn.classList.add('playing');
                    this.start();
                    break;
                case 'playing':
                    this.gameState = 'paused';
                    this.controlBtn.innerHTML = '▶';
                    this.controlBtn.classList.remove('playing');
                    this.isPaused = true;
                    break;
                case 'paused':
                    this.gameState = 'playing';
                    this.controlBtn.innerHTML = '⏸';
                    this.controlBtn.classList.add('playing');
                    this.isPaused = false;
                    requestAnimationFrame(this.gameLoop.bind(this));
                    break;
            }
        });
    }

    start() {
        if (this.gameOver) {
            this.reset();
        }
        if (!this.isRunning) {
            this.isRunning = true;
            this.gameState = 'playing';
            this.isPaused = false;
            this.lastTime = 0;
            this.dropCounter = 0;
            this.spawnNewPiece();
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    reset() {
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.board = Array(this.BOARD_HEIGHT).fill().map(() => Array(this.BOARD_WIDTH).fill(0));
        this.gameOver = false;
        this.isPaused = false;
        this.isRunning = false;
        this.gameState = 'stopped';
        this.lastTime = 0;
        this.dropCounter = 0;
        this.controlBtn.innerHTML = '▶';
        this.controlBtn.classList.remove('playing');
        this.currentPiece = null;
        this.nextPiece = this.createPiece();
        this.updateScore();
        this.draw();
    }

    handleGameOver() {
        this.gameOver = true;
        this.isRunning = false;
        this.gameState = 'stopped';
        this.controlBtn.innerHTML = '▶';
        this.controlBtn.classList.remove('playing');
    }

    initializeMobileControls() {
        const addTouchHandler = (elementId, handler, isDropButton = false) => {
            const element = document.getElementById(elementId);
            
            if (isDropButton) {
                // Mouse events for drop button
                element.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    if (!this.gameOver && !this.isPaused) this.isSoftDropping = true;
                });
                
                element.addEventListener('mouseup', (e) => {
                    e.preventDefault();
                    this.isSoftDropping = false;
                });
                
                element.addEventListener('mouseleave', (e) => {
                    e.preventDefault();
                    this.isSoftDropping = false;
                });
                
                // Touch events for drop button
                element.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (!this.gameOver && !this.isPaused) this.isSoftDropping = true;
                });
                
                element.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.isSoftDropping = false;
                });
                
                element.addEventListener('touchcancel', (e) => {
                    e.preventDefault();
                    this.isSoftDropping = false;
                });
            } else {
                // Regular click/touch handler for other buttons
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!this.gameOver && !this.isPaused) handler();
                });
                
                element.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    if (!this.gameOver && !this.isPaused) handler();
                });
            }
        };
        
        addTouchHandler('leftBtn', () => this.moveLeft());
        addTouchHandler('rightBtn', () => this.moveRight());
        addTouchHandler('rotateBtn', () => this.rotate());
        addTouchHandler('dropBtn', null, true);
        
        // Prevent default touch behavior to avoid scrolling
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.mobile-controls')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    initializeResizeHandler() {
        this.resizeCanvas(); // Initial resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.resizeCanvas();
            }, 250);
        });
    }

    updateBlockSize() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            const maxWidth = window.innerWidth - 20;
            this.BLOCK_SIZE = Math.floor(maxWidth / this.BOARD_WIDTH);
        } else {
            const maxHeight = window.innerHeight - 100;
            this.BLOCK_SIZE = Math.floor(maxHeight / this.BOARD_HEIGHT);
        }
        
        // Update canvas dimensions
        this.canvas.width = this.BLOCK_SIZE * this.BOARD_WIDTH;
        this.canvas.height = this.BLOCK_SIZE * this.BOARD_HEIGHT;
        
        // Redraw if game is in progress
        if (this.currentPiece) {
            this.draw();
        }
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = Math.min(container.clientWidth, 800); // Increased max width
        const mobileControls = document.querySelector('.mobile-controls');
        const controlsHeight = mobileControls ? mobileControls.offsetHeight : 0;
        const topOffset = 80; // Reduced top offset
        
        // Calculate available height (up to mobile controls)
        const containerHeight = window.innerHeight - topOffset - controlsHeight - 10; // Reduced buffer
        
        // Calculate the block size that will fit in the container
        // while maintaining square cells
        const maxBlockSizeByWidth = Math.floor(containerWidth / this.BOARD_WIDTH);
        const maxBlockSizeByHeight = Math.floor(containerHeight / this.BOARD_HEIGHT);
        this.BLOCK_SIZE = Math.min(maxBlockSizeByWidth, maxBlockSizeByHeight);
        
        // Ensure minimum block size for visibility
        this.BLOCK_SIZE = Math.max(this.BLOCK_SIZE, 35); // Increased minimum block size
        
        // Set canvas dimensions based on the calculated block size
        const canvasWidth = this.BLOCK_SIZE * this.BOARD_WIDTH;
        const canvasHeight = this.BLOCK_SIZE * this.BOARD_HEIGHT;
        
        // Update canvas size
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        
        // Ensure next piece preview maintains square ratio
        this.nextCanvas.width = this.BLOCK_SIZE * 4;
        this.nextCanvas.height = this.BLOCK_SIZE * 4;
        
        // Redraw everything
        this.draw();
        this.drawNextPiece();
    }

    spawnNewPiece() {
        if (!this.nextPiece) {
            this.nextPiece = this.createPiece();
        }
        
        this.currentPiece = this.nextPiece;
        this.currentPiece.x = Math.floor(this.BOARD_WIDTH / 2) - Math.floor(this.currentPiece.matrix[0].length / 2);
        this.currentPiece.y = 0;
        
        this.nextPiece = this.createPiece();
        this.drawNextPiece();
        
        if (this.checkCollision()) {
            this.handleGameOver();
        }
    }

    createPiece() {
        const index = Math.floor(Math.random() * this.pieces.length);
        // Deep clone the piece matrix to avoid reference issues
        const matrix = this.pieces[index].map(row => [...row]);
        const x = Math.floor((this.BOARD_WIDTH - matrix[0].length) / 2);
        return {
            matrix,
            x,
            y: 0
        };
    }

    moveLeft() {
        this.currentPiece.x--;
        if (this.checkCollision()) {
            this.currentPiece.x++;
        }
    }

    moveRight() {
        this.currentPiece.x++;
        if (this.checkCollision()) {
            this.currentPiece.x--;
        }
    }

    hardDrop() {
        while (!this.checkCollision()) {
            this.currentPiece.y++;
        }
        this.currentPiece.y--;
        this.mergePiece();
        this.clearLines();
        this.spawnNewPiece();
    }

    rotate() {
        const matrix = this.currentPiece.matrix;
        const N = matrix.length;
        const M = matrix[0].length;
        const rotated = Array(M).fill().map(() => Array(N).fill(0));
        
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < M; x++) {
                rotated[x][N - 1 - y] = matrix[y][x];
            }
        }
        const previousMatrix = this.currentPiece.matrix;
        this.currentPiece.matrix = rotated;
        
        if (this.checkCollision()) {
            this.currentPiece.matrix = previousMatrix;
        }
    }

    checkCollision() {
        const matrix = this.currentPiece.matrix;
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] !== 0) {
                    const boardX = this.currentPiece.x + x;
                    const boardY = this.currentPiece.y + y;
                    
                    if (boardX < 0 || boardX >= this.BOARD_WIDTH ||
                        boardY >= this.BOARD_HEIGHT ||
                        (boardY >= 0 && this.board[boardY][boardX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    mergePiece() {
        const matrix = this.currentPiece.matrix;
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] !== 0) {
                    const boardY = this.currentPiece.y + y;
                    if (boardY >= 0) {
                        this.board[boardY][this.currentPiece.x + x] = matrix[y][x];
                    }
                }
            }
        }
    }

    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(value => value !== 0)) {
                this.board.splice(y, 1);
                this.board.unshift(Array(this.BOARD_WIDTH).fill(0));
                linesCleared++;
                y++;
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += this.calculateScore(linesCleared);
            this.level = Math.floor(this.lines / 10) + 1;
            this.updateScore();
        }
    }

    calculateScore(linesCleared) {
        const basePoints = [40, 100, 300, 1200];
        return basePoints[linesCleared - 1] * this.level;
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    drawBlock(x, y, color, ctx = this.ctx) {
        const blockSize = this.BLOCK_SIZE;
        
        // Main block fill
        ctx.fillStyle = color;
        ctx.fillRect(
            x * blockSize,
            y * blockSize,
            blockSize,
            blockSize
        );
        
        // Block border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            x * blockSize,
            y * blockSize,
            blockSize,
            blockSize
        );
    }

    draw() {
        // Clear canvas with background color
        const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim();
        this.ctx.fillStyle = backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--color-grid').trim();
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let x = 0; x <= this.BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * this.BLOCK_SIZE, this.BOARD_HEIGHT * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let y = 0; y <= this.BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.BLOCK_SIZE);
            this.ctx.lineTo(this.BOARD_WIDTH * this.BLOCK_SIZE, y * this.BLOCK_SIZE);
            this.ctx.stroke();
        }
        
        // Draw board pieces
        for (let y = 0; y < this.BOARD_HEIGHT; y++) {
            for (let x = 0; x < this.BOARD_WIDTH; x++) {
                if (this.board[y][x] !== 0) {
                    this.drawBlock(x, y, this.colors[this.board[y][x]]);
                }
            }
        }
        
        // Draw current piece
        if (this.currentPiece) {
            const matrix = this.currentPiece.matrix;
            for (let y = 0; y < matrix.length; y++) {
                for (let x = 0; x < matrix[y].length; x++) {
                    if (matrix[y][x] !== 0) {
                        this.drawBlock(
                            x + this.currentPiece.x,
                            y + this.currentPiece.y,
                            this.colors[matrix[y][x]]
                        );
                    }
                }
            }
        }
    }

    drawNextPiece() {
        if (!this.nextPiece) return;
        
        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        const matrix = this.nextPiece.matrix;
        const blockSize = this.BLOCK_SIZE;
        const offsetX = (this.nextCanvas.width - matrix[0].length * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - matrix.length * blockSize) / 2;
        
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] !== 0) {
                    this.nextCtx.fillStyle = this.colors[matrix[y][x]];
                    this.nextCtx.fillRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize,
                        blockSize
                    );
                    this.nextCtx.strokeStyle = '#fff';
                    this.nextCtx.strokeRect(
                        offsetX + x * blockSize,
                        offsetY + y * blockSize,
                        blockSize,
                        blockSize
                    );
                }
            }
        }
    }

    gameLoop(timestamp = 0) {
        if (!this.gameOver && !this.isPaused) {
            const deltaTime = timestamp - this.lastTime;
            this.lastTime = timestamp;
            
            // Update drop counter
            this.dropCounter += deltaTime;
            
            // Calculate drop interval based on level
            const baseInterval = Math.max(100, 800 - (this.level - 1) * 50);
            const currentInterval = this.isSoftDropping ? baseInterval / 4 : baseInterval;
            
            if (this.dropCounter > currentInterval) {
                this.moveDown();
                this.dropCounter = 0;
            }
            
            this.draw();
        }
        
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#00ff00';  // Same as --color-score
            this.ctx.font = "24px 'Press Start 2P'";
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over!', this.canvas.width / 2, this.canvas.height / 2);
            return;
        }
        
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    moveDown() {
        this.currentPiece.y++;
        if (this.checkCollision()) {
            this.currentPiece.y--;
            this.mergePiece();
            this.clearLines();
            this.spawnNewPiece();
        }
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    const game = new Tetris();
});

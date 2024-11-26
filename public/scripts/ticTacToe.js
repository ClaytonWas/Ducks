//Code adapted from https://www.geeksforgeeks.org/simple-tic-tac-toe-game-using-javascript/
export default class TicTacToe {
    constructor (socket) {
        this.state = Array(9).fill(null)
        this.marker = null
        this.opponentName = null
        this.turn = false
        this.socket = socket
    }

    //static state = Array(9).fill(null)

    //static marker = null

    generateBoard() {
        const board = document.getElementById("game-board")
        board.innerHTML = "" // Clear previous board

        // Clear existing event listeners
        // const newBoard = board.cloneNode(true);
        // board.parentNode.replaceChild(newBoard, board);

        this.state.forEach((_, i) => {
            const cell = document.createElement("div")
            cell.classList.add("cell")
            cell.dataset.index = i
            board.appendChild(cell)
            console.log('Created cell ', i)

            // Attach click listener to individual cells
            cell.addEventListener("click", (e) => this.playerCheckCell(e));
        })
    }

    setMarker(marker) {
        this.marker = marker
    }

    setOpponentName(name) {
        this.opponentName = name
    }

    playerCheckCell(e) {
        const cell = e.target
        const i = cell.dataset.index

        if (!cell.classList.contains("taken")) {
            // Update board state and UI
            this.state[i] = this.marker
            cell.textContent = this.marker
            cell.classList.add("taken")
        }

        this.socket.emit('playerCheckCell', {index: i, marker: this.marker})

        this.checkGameState()

        this.turn = false
        this.disableCellClicks()
        this.setGameInfoMessage(`Game is active: ${this.opponentName}'s turn`)
        
    }

    oppentCheckCell(moveData) {
        // Get the game board and locate the specific cell by index
        const board = document.getElementById("game-board")
        const cell = board.querySelector(`[data-index="${moveData.index}"]`)

        if (cell) {
            cell.textContent = moveData.marker
            cell.classList.add("taken")
            this.state[moveData.index] = moveData.marker

            this.turn = true
            this.enableCellClicks()
            this.setGameInfoMessage('Game is active: Your turn')
        }
    }

    enableCellClicks() {
        const cells = document.getElementsByClassName('cell');
        for (const cell of cells) {
            if (!cell.classList.contains('taken')) {
                cell.style.pointerEvents = 'auto';
            }
        }
    }

    disableCellClicks() {
        const cells = document.getElementsByClassName('cell');
        for (const cell of cells) {
            cell.style.pointerEvents = 'none';
        }
        console.log("Cell clicks disabled.")
    }

    setGameInfoMessage(message) {
        document.getElementById('gameInfoMessage').textContent = message
    }

    // Check if there's a winning combination
    checkWin() {
        const wins = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8], // Rows
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8], // Columns
            [0, 4, 8],
            [2, 4, 6], // Diagonals
        ];
        return wins.find((combo) =>
            combo.every((i) => this.state[i] === this.marker)
        );
    }

    checkGameState() {
        const winCombo = this.checkWin()

        if (winCombo) {
            console.log('Winning combo is ', winCombo)
            this.socket.emit('endGame', {message: 'socketWon', winCombo: winCombo})
        } else if (this.state.every((cell) =>cell)) {
            this.socket.emit('endGame', {message: 'tieGame'})
        }
    }

    highlight(winCombo, comboColor) {

        if (winCombo) {
            winCombo.forEach((i) => {
                document.getElementById("game-board").children[i].style.color = comboColor
            })
        }
    }

    static showBoards() {
        document.getElementById('boardsOverlay').classList.remove('hidden');
    }
    
    static hideBoards() {
        document.getElementById('boardsOverlay').classList.add('hidden');
    }

    static showBoard() {
        document.getElementById('boardOverlay').classList.remove('hidden')
    }

    static leaveBoard () {
        document.getElementById('boardOverlay').classList.add('hidden')
    }
}




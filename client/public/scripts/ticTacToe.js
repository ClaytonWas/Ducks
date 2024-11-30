//Code adapted from https://www.geeksforgeeks.org/simple-tic-tac-toe-game-using-javascript/
export default class TicTacToe {
    constructor (socket) {
        this.state = Array(9).fill(null) // Array representation of squares on the board
        this.marker = null // Either X or O
        this.opponentName = null // The username of the client socket's opponent
        this.turn = false // 
        this.socket = socket // Client socket
    }

    generateBoard() {
        const board = document.getElementById("game-board")
        board.innerHTML = "" // Clear previous board

       // Generate the cells on the game board
        this.state.forEach((_, i) => {
            const cell = document.createElement("div")
            cell.classList.add("cell")
            cell.dataset.index = i
            board.appendChild(cell)
            console.log('Created cell ', i)

            // Attach click listener to individual cells
            cell.addEventListener("click", (e) => this.playerCheckCell(e))
        })
    }

    setMarker(marker) {
        this.marker = marker
    }

    setOpponentName(name) {
        this.opponentName = name
    }

    // Check's an available cell with the client socket's marker
    playerCheckCell(e) {
        const cell = e.target
        const i = cell.dataset.index

        if (!cell.classList.contains("taken")) {
            // Update board state and UI
            this.state[i] = this.marker
            cell.textContent = this.marker
            cell.classList.add("taken")
        }

        // Prompt server to inform opponent socket of the move
        this.socket.emit('playerCheckCell', {index: i, marker: this.marker})

        // Check for game completion
        this.checkGameState()

        this.turn = false

        // Prevent client socket from clicking cells until it is their turn again
        this.disableCellClicks()

        this.setGameInfoMessage(`Game is active: ${this.opponentName}'s turn`)
        
    }

    // Update the client's socket board with a move made by their opponent
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

    // Enables a client socket's ability to mark cells on the game board
    enableCellClicks() {
        const cells = document.getElementsByClassName('cell')
        for (const cell of cells) {
            if (!cell.classList.contains('taken')) {
                cell.style.pointerEvents = 'auto'
            }
        }
    }

    // Disables a client socket's ability to mark cells on the game board
    disableCellClicks() {
        const cells = document.getElementsByClassName('cell')
        for (const cell of cells) {
            cell.style.pointerEvents = 'none'
        }
        console.log("Cell clicks disabled.")
    }

    // Update's the message displayed at the bottom of the game board
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
        ]
        return wins.find((combo) =>
            combo.every((i) => this.state[i] === this.marker)
        )
    }

    // Check if either a player has won or if the game is tied
    // On either condition, inform server that the game ended
    checkGameState() {
        const winCombo = this.checkWin()

        if (winCombo) {
            console.log('Winning combo is ', winCombo)
            this.socket.emit('endGame', {message: 'socketWon', winCombo: winCombo})
        } else {
            let fillCount = 0

            this.state.forEach(cell => {
                if (cell != null) {
                    fillCount++
                }
            })

            if (fillCount == 9) {
                this.socket.emit('endGame', {message: 'tieGame'})
            }
        }
        
    }

    // Highlight the marker's within the winning streak of cells on the game board
    highlight(winCombo, comboColor) {

        if (winCombo) {
            winCombo.forEach((i) => {
                document.getElementById("game-board").children[i].style.color = comboColor
            })
        }
    }

    // Makes the boards menu visible
    static showBoards() {
        document.getElementById('boardsOverlay').classList.remove('hidden')
    }
    
    // Hides the boards menu
    static hideBoards() {
        document.getElementById('boardsOverlay').classList.add('hidden')
    }

    // Makes the game board visible
    static showBoard() {
        document.getElementById('boardOverlay').classList.remove('hidden')
    }

    // Hides the game board
    static leaveBoard () {
        document.getElementById('boardOverlay').classList.add('hidden')
    }

    // Update a game board's description
    static updateBoardDescription (updateData) {

        const board = document.getElementById(updateData.boardId)

        if (board) {

            const description = board.querySelector('p')

            description.textContent = updateData.boardMessage

        }

    }

    // Prevents game board from being clickable while a game is in progress
    static lockBoard (boardId) {

        const board = document.getElementById(boardId)

        if (board) {

            board.style.pointerEvents = 'none'

        }

    }

    // Allows a game board to be clickable again after a game has ended
    static unlockBoard(boardId) {

        const board = document.getElementById(boardId)

        if (board) {

             board.style.pointerEvents = 'auto'

        }

    }
}




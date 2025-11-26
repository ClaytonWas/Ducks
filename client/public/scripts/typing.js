export default class Typing {
    constructor (socket) {

        this.quoteDisplay = document.getElementById('quoteDisplay')
        this.quoteInput = document.getElementById('quoteInput')
        this.timer = document.getElementById('timer')
        this.textArea = document.querySelector('#quoteInput')

        this.quote = ""

        this.startTime = null
        this.interval = null

        this.socket = socket
        
        // Create progress bar if it doesn't exist
        this.createProgressBar()
    }
    
    createProgressBar() {
        // Check if progress bar already exists
        if (document.getElementById('typing-progress')) return
        
        const modal = document.getElementById('modal-type-display')
        if (modal) {
            const progressContainer = document.createElement('div')
            progressContainer.className = 'typing-progress'
            progressContainer.id = 'typing-progress'
            progressContainer.innerHTML = '<div class="typing-progress-bar" id="typing-progress-bar" style="width: 0%"></div>'
            
            // Insert after quoteDisplay
            const quoteDisplay = document.getElementById('quoteDisplay')
            if (quoteDisplay && quoteDisplay.parentNode) {
                quoteDisplay.parentNode.insertBefore(progressContainer, quoteDisplay.nextSibling)
            }
        }
    }
    
    updateProgress(percentage) {
        const progressBar = document.getElementById('typing-progress-bar')
        if (progressBar) {
            progressBar.style.width = Math.min(percentage, 100) + '%'
        }
    }
    
    
    //Timer Functions

    getTimerTime() {
        return Math.floor((new Date() - this.startTime) / 1000)
    }

    startTimer() {

        this.timer.innerText = 0
        this.startTime = new Date()

        this.interval = setInterval(() => {this.timer.innerText = this.getTimerTime()}, 1000)
    }

    stopTimer() {

        clearInterval(this.interval)
        this.timer.innerText = this.getTimerTime()

    }

    // Quote related functions

    requestQuote (quoteSize) {
        
        let params

        if (quoteSize == 'short') {
            params = '?maxLength=149'
        } else if (quoteSize == 'medium') {
            params = '?minLength=150&maxLength=299'
        } else {
            params = '?minLength=300'
        }

        console.log('parameters to api are ', params)

        this.socket.emit('requestQuote', params)
    }

    loadQuote (quoteData) {

        if (!quoteData || !quoteData.content) {
            console.error('Invalid quote data:', quoteData)
            if (this.quoteDisplay) {
                this.quoteDisplay.innerHTML = '<div style="color: #D32F2F; padding: 20px; text-align: center;">Error: Invalid quote data received</div>'
            }
            return
        }

        if (!this.quoteDisplay) {
            console.error('quoteDisplay element not found')
            return
        }

        this.quote = quoteData.content

        console.log('Loading quote:', this.quote.substring(0, 50) + '...')

        this.quoteDisplay.innerHTML = ''
        
        // Reset progress
        this.updateProgress(0)

        this.quote.split('').forEach(character => {
            const characterSpan = document.createElement('span')
            characterSpan.innerText = character
            this.quoteDisplay.append(characterSpan)
        })

        if (this.textArea) {
            this.textArea.removeAttribute('disabled')
            this.quoteInput.value = null
        }
        
        this.startTimer()

    }

    // Game Logic Functions
    typeInput() {

        console.log('typeInput function called')

        console.log(this.quote.length)

        if (this.quote && this.quote.length > 0) {

            console.log('Enter typing loop')

            this.quoteInput.addEventListener('input', () => {

                const arrQuote = this.quoteDisplay.querySelectorAll('span')
                const arrValue = this.quoteInput.value.split('')

                let correct = true

                arrQuote.forEach((charSpan, index) => {
                    const char = arrValue[index]

                    if (char == null) {
                        charSpan.classList.remove('correct')
                        charSpan.classList.add('incorrect')
                        correct = false
                    }
                    else if (char == charSpan.innerText) {
                        charSpan.classList.add('correct')
                        charSpan.classList.remove('incorrect')
                    } else {
                        charSpan.classList.remove('correct')
                        charSpan.classList.add('incorrect')
                        correct = false
                    }
                    
                })

                // Update progress
                const progress = (arrValue.length / this.quote.length) * 100
                this.updateProgress(progress)

                if (correct) {

                    this.textArea.setAttribute('disabled', true)

                    this.stopTimer()

                    const wpm = Math.round(this.quote.split(" ").length / (this.getTimerTime() / 60))

                    const timeTaken = this.getTimerTime()

                    const victoryString = `🎉 Amazing! You typed the quote in ${timeTaken} seconds at a speed of ${wpm} words per minute! 🎉`
                    
                    // Create styled victory message
                    this.quoteDisplay.innerHTML = `<div style="
                        font-size: 24px;
                        font-weight: 700;
                        color: #2E7D32;
                        text-align: center;
                        padding: 20px;
                        background: linear-gradient(145deg, rgba(76, 175, 80, 0.1) 0%, rgba(129, 199, 132, 0.2) 100%);
                        border-radius: 15px;
                        border: 3px solid #4CAF50;
                        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
                        animation: victoryPulse 1s ease;
                    ">${victoryString}</div>`

                }

            })
        } 

    }


    // Static Functions

    static showTypingOptions () {
        document.getElementById('typing-options').classList.remove('typing-hidden')
    }

    static hideTypingOptions () {
        document.getElementById('typing-options').classList.add('typing-hidden')
    }
    
    static showInterface() {
        document.getElementById('typing-interface').classList.remove('typing-hidden')
    }

    static hideInterface() {
        document.getElementById('typing-interface').classList.add('typing-hidden')
    }

}
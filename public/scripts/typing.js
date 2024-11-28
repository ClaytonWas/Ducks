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

        this.quote = quoteData.content

        console.log(this.quote)

        this.quoteDisplay.innerHTML = ''

        this.quote.split('').forEach(character => {
            const characterSpan = document.createElement('span')
            characterSpan.innerText = character
            this.quoteDisplay.append(characterSpan)
        })

        this.textArea.removeAttribute('disabled')
        this.quoteInput.value = null
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

                if (correct) {

                    this.textArea.setAttribute('disabled', true)

                    this.stopTimer()

                    const wpm = Math.round(this.quote.split(" ").length / (this.getTimerTime() / 60))

                    const timeTaken = this.getTimerTime()

                    const victoryString = `You typed the quote in ${timeTaken} seconds at a speed of ${wpm} words per minute!`

                    this.quoteDisplay.innerHTML = victoryString

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
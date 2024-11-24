//Code for handling response codes from the server at the login page.
async function responseCheck(){
    loginButton = document.getElementById('loginButton')
    createAccountButton = document.getElementById('createAccountButton')

    loginButton.addEventListener('click', async () => {        
        const username = document.getElementById('username').value
        const password = document.getElementById('password').value
        const updateMessage = document.getElementById('updateMessage')
    

        try {
            const response = await fetch('/login', {
                method:'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password})
            })
            if (response.ok) {
                data = await response.json()
                localStorage.setItem('token', data.token);
                window.location.href = '/home'
            } else {
                data = await response.json()
                message = JSON.stringify(data.message).slice(1, -1)
                updateMessage.textContent = message
            }
        } catch (error) {
            console.error(error.message)
            updateMessage.textContent = 'Unexpected error occurred.'
            updateMessage.style.color = 'red'
        }
        return false
    })

    createAccountButton.addEventListener('click', async () => {
        const username = document.getElementById('username').value
        const password = document.getElementById('password').value
        const shape = document.getElementById('shape').value
        const color = document.getElementById('color').value
        const updateMessage = document.getElementById('updateMessage')

        try {
            const response = await fetch('/register', {
                method:'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password, shape, color})
            })
            data = await response.json()
            message = JSON.stringify(data.message).slice(1, -1)
            updateMessage.textContent = message
        } catch (error) {
            console.error(error.message)
            updateMessage.textContent = 'Unexpected error occurred.'
            updateMessage.style.color = 'red'
        }
        return false
    })
}

document.addEventListener('DOMContentLoaded', () => {
    responseCheck()
})

//Code for handling response codes from the server towards login.html

//Goal, create a response check to handle if login responses are correct
//Optional but good, get the register account working on the same webpage such that inputing values into the form can also be submitted as registration
async function responseCheck(){
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const form = document.getElementById('form')
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
                window.location.href = '/home'
            } else if (response.status === 404) {
                updateMessage.textContent = 'User not found.';
            } else {
                const result = await response.json();
                if (result.message) {
                    updateMessage.textContent = result.message;
                } else {
                    updateMessage.textContent = 'Unexpected error occurred.';
                    updateMessage.style.color = 'red';
                }
            }
        } catch (error) {
            console.error(error.message)
            updateMessage.textContent = 'Unexpected error occurred.'
            updateMessage.style.color = 'red'
        }
        
        return false
    })
};

document.addEventListener('DOMContentLoaded', () => {
    responseCheck()
});

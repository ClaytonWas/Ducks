// Handler for register page only
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm')
    const updateMessage = document.getElementById('updateMessage')

    const handleRegister = async (e) => {
        e.preventDefault()
        const username = document.getElementById('username').value
        const password = document.getElementById('password').value
        const shape = document.getElementById('shape').value
        const color = document.getElementById('color').value

        updateMessage.textContent = ''
        updateMessage.classList.add('hidden')

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password, shape, color})
            })

            const data = await response.json()

            if (response.ok) {
                updateMessage.textContent = data.message + ' Redirecting to login...'
                updateMessage.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'border-red-300')
                updateMessage.classList.add('bg-green-100', 'text-green-700', 'border-2', 'border-green-300')
                setTimeout(() => {
                    window.location.href = '/login'
                }, 2000)
            } else {
                updateMessage.textContent = data.message
                updateMessage.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'border-green-300')
                updateMessage.classList.add('bg-red-100', 'text-red-700', 'border-2', 'border-red-300')
            }
        } catch (error) {
            console.error(error)
            updateMessage.textContent = 'Unexpected error occurred. Please try again.'
            updateMessage.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'border-green-300')
            updateMessage.classList.add('bg-red-100', 'text-red-700', 'border-2', 'border-red-300')
        }
    }

    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister)
    }
})


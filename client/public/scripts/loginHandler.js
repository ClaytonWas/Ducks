// Handler for login page only
document.addEventListener('DOMContentLoaded', () => {
    const loginButton = document.getElementById('loginButton')
    const loginForm = document.getElementById('loginForm')
    const updateMessage = document.getElementById('updateMessage')

    const handleLogin = async (e) => {
        e.preventDefault()
        const username = document.getElementById('username').value
        const password = document.getElementById('password').value

        updateMessage.textContent = ''
        updateMessage.classList.add('hidden')

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password})
            })

            const data = await response.json()

            if (response.ok) {
                localStorage.setItem('token', data.token)
                updateMessage.textContent = 'Login successful! Redirecting...'
                updateMessage.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'border-red-300')
                updateMessage.classList.add('bg-green-100', 'text-green-700', 'border-2', 'border-green-300')
                setTimeout(() => {
                    window.location.href = '/home'
                }, 500)
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

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin)
    }
})


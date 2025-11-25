// Handler for account settings page
document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveButton')
    const cancelButton = document.getElementById('cancelButton')
    const updateMessage = document.getElementById('updateMessage')
    const colorInput = document.getElementById('color')
    const colorPreview = document.getElementById('colorPreview')
    const settingsForm = document.getElementById('settingsForm')

    // Update color preview when color changes
    if (colorInput && colorPreview) {
        colorInput.addEventListener('input', (e) => {
            colorPreview.style.backgroundColor = e.target.value
        })
    }

    const handleSave = async (e) => {
        if (e) e.preventDefault()
        const shape = document.getElementById('shape').value
        const color = document.getElementById('color').value

        updateMessage.textContent = ''
        updateMessage.classList.add('hidden')

        try {
            const response = await fetch('/settings/update', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({shape, color})
            })

            const data = await response.json()

            if (response.ok) {
                updateMessage.textContent = data.message || 'Settings saved successfully!'
                updateMessage.classList.remove('hidden', 'bg-red-100', 'text-red-700', 'border-red-300')
                updateMessage.classList.add('bg-green-100', 'text-green-700', 'border-2', 'border-green-300')
                
                // Update token if provided
                if (data.token) {
                    localStorage.setItem('token', data.token)
                }

                // Show success message for 2 seconds, then redirect
                setTimeout(() => {
                    window.location.href = '/home'
                }, 2000)
            } else {
                updateMessage.textContent = data.message || 'Error updating settings.'
                updateMessage.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'border-green-300')
                updateMessage.classList.add('bg-red-100', 'text-red-700', 'border-2', 'border-red-300')
            }
        } catch (error) {
            console.error(error)
            updateMessage.textContent = 'Unexpected error occurred.'
            updateMessage.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'border-green-300')
            updateMessage.classList.add('bg-red-100', 'text-red-700', 'border-2', 'border-red-300')
        }
    }

    if (saveButton) {
        saveButton.addEventListener('click', handleSave)
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSave)
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            window.location.href = '/home'
        })
    }
})

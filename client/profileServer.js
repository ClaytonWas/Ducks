// Server for profile creation and edits.
/*
*   Note: This system signs JSON web tokens when a user logs in, this may result in issues in production environments.
*           If a user changes their account data, it is pushed to the database without directly communicating with the game servers.
*           Any database updates that happen from the game servers need to be passed to here if they relate to account information.
*/


const express = require('express')
const session = require('express-session')
const sqlite3 = require('sqlite3').verbose()
//const sqlite3 = require('better-sqlite3').verbose()
const bcrypt = require('bcrypt')
const path = require('path')
const jsonWebToken = require('jsonwebtoken')
const ejs = require('ejs')
const fs = require('fs')



const app = express()
const port = process.env.PORT || process.env.CLIENT_PORT || 3000                       // Port for profile server.
const secretKey = process.env.SECRET_KEY || process.env.JWT_SECRET || 'runescapefan'         // Secret key for signing session token.
const gameServerUrl = process.env.GAME_SERVER_URL || 'http://localhost:3030'         // Game server URL for client connections.

// Track active sessions/tokens per user to prevent duplicate logins
// Maps user ID to their current active token and session info
const activeSessions = new Map()

// Clean up expired sessions periodically (every 5 minutes)
setInterval(() => {
    const now = Math.floor(Date.now() / 1000) // Current time in seconds
    
    for (const [userId, sessionInfo] of activeSessions.entries()) {
        try {
            // Decode token to check expiration
            const decoded = jsonWebToken.decode(sessionInfo.token)
            
            if (!decoded || !decoded.exp) {
                // Token has no expiration - remove it
                activeSessions.delete(userId)
                console.log(`Cleaned up session with invalid token for user ID: ${userId}`)
                continue
            }
            
            // Check if token is expired (exp is in seconds)
            if (decoded.exp < now) {
                activeSessions.delete(userId)
                console.log(`Cleaned up expired session for user ID: ${userId}`)
            }
        } catch (error) {
            // Error decoding token - remove it
            activeSessions.delete(userId)
            console.log(`Cleaned up session with unreadable token for user ID: ${userId}`)
        }
    }
}, 5 * 60 * 1000) // Check every 5 minutes



// EJS view engine for dynamic HTML updates
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))



// SQLite database interaction functions.
// Reads the accounts.db.
const dbPath = path.join(__dirname, './db/accounts.db')
const dbDir = path.dirname(dbPath)

// Ensure db directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
}

// Initialize database if it doesn't exist
if (!fs.existsSync(dbPath)) {
    console.log('Database not found, initializing...')
    try {
        const sqlPath = path.join(__dirname, './db/accounts.sql')
        if (fs.existsSync(sqlPath)) {
            const accountsDB = new sqlite3.Database(dbPath, (error) => {
                if (error) {
                    console.error('Error creating database:', error)
                } else {
                    const sql = fs.readFileSync(sqlPath, 'utf-8')
                    accountsDB.exec(sql, (error) => {
                        if (error) {
                            console.error('Error initializing schema:', error)
                        } else {
                            console.log('Database initialized successfully')
                        }
                        accountsDB.close()
                    })
                }
            })
        } else {
            console.error('SQL file not found:', sqlPath)
        }
    } catch (error) {
        console.error('Error initializing database:', error)
    }
}

const db = new sqlite3.Database(dbPath, (error) => {
    if (error) {
        return console.error(error.message)
    }
})



// Express middleware for parsing json, serving website views, and managing sessions
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(express.static(path.join(__dirname, './public')))
app.use(session({secret: secretKey, resave: false, saveUninitialized: false}))



// HTTP Methods
// GET route for the home
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './views', 'index.html'))
})

// GET route for the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, './views', 'login.html'))
})

// GET route for the register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, './views', 'register.html'))
})

// POST route for login
app.post('/login', (req, res) => {
    const {username, password} = req.body

    if (!username || !password) {
        return res.status(400).json({message: 'Username and password are required to login.'})
    }

    db.get('SELECT * FROM accounts WHERE username = ?', [username], (error, row) => {
        if(error){
            console.error(error.message)
            return res.status(500).json({message: 'The server encountered an error reading the database.'})
        }
        if(row){
            bcrypt.compare(password, row.hash, (error, matches) => {
                if(error){
                    console.error(error)
                    return res.status(500).json({message: 'The server encountered an error authenticating your login.'})
                } else if(matches){
                    // Check if user already has an active session
                    const userId = row.id
                    
                    // Helper function to complete login
                    const completeLogin = () => {
                        /*
                        *   On valid logins, the express-session browser is assigned with the data of the row.
                        *       ^       (this is pretty unsafe and in production should just be the accounts id and username)
                        */
                        req.session.user = row
                        const token = jsonWebToken.sign(
                            {id: req.session.user.id, username: req.session.user.username, shape: req.session.user.shape, color: req.session.user.color},
                            secretKey,
                            {expiresIn: '3h'}
                        )
                        
                        // Track this active session
                        activeSessions.set(userId, {
                            token: token,
                            sessionId: req.sessionID,
                            loginTime: Date.now()
                        })
                        
                        return res.status(200).json({token})
                    }
                    
                    if (activeSessions.has(userId)) {
                        // Check if the existing token is still valid (not expired)
                        const existingSession = activeSessions.get(userId)
                        
                        // Verify the existing token synchronously (decode without verification first to check expiration)
                        try {
                            // Decode without verification to check expiration
                            const decoded = jsonWebToken.decode(existingSession.token)
                            
                            if (!decoded || !decoded.exp) {
                                // Token has no expiration or is malformed - clear and allow login
                                activeSessions.delete(userId)
                                console.log(`Cleared invalid session for user ID: ${userId}`)
                                return completeLogin()
                            }
                            
                            // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
                            const now = Math.floor(Date.now() / 1000)
                            if (decoded.exp < now) {
                                // Token is expired - clear the session and allow new login
                                activeSessions.delete(userId)
                                console.log(`Cleared expired session for user ID: ${userId}`)
                                return completeLogin()
                            }
                            
                            // Token is still valid - reject new login
                            return res.status(409).json({
                                message: 'This account is already logged in. Please log out from the other session first.'
                            })
                        } catch (error) {
                            // Error decoding token - clear session and allow new login
                            activeSessions.delete(userId)
                            console.log(`Cleared invalid session for user ID: ${userId}`, error.message)
                            return completeLogin()
                        }
                    } else {
                        // No existing session - proceed with login
                        return completeLogin()
                    }
                }else{
                    console.error(error)
                    return res.status(401).json({message: 'Invalid password.'})
                }
            })
        }else{
            return res.status(401).json({message: 'No account with this username exists.'})
        }
    })
})

// POST route for registering new users
app.post('/register', (req, res) => {
    const {username, password, shape, color} = req.body;

    if (!username || !password || !shape || !color) {
        return res.status(400).json({message: 'All fields are required to create an account.'})
    }

    bcrypt.genSalt(10, (error, salt) => {
        bcrypt.hash(password, salt, (error, hash) => {    
            db.get('SELECT * FROM accounts WHERE username = ?', [username], (error, row) => {
                if (error) {
                    console.error(error.name, error.message)
                    return res.status(500).json({message: 'The server encountered an error reading the database.'})
                }
                if (!row) {
                    db.run('INSERT INTO accounts (username, password, salt, hash, shape, color) VALUES (?, ?, ?, ?, ?, ?)', [username, password, salt, hash, shape, color], (error) => {
                        if (error) {
                            console.error(error.name, error.message)
                            return res.status(500).json({message: 'The server encountered an error registering account details into the database.'})
                        }
                        console.log(`Player Created: ${username}, ${shape}, ${color}`)
                        return res.status(201).json({message: 'Account Successfully Created.'})
                    })
                } else {
                    return res.status(409).json({message: 'Username is already taken.'})
                }
            })
        })
        if (error) {
            console.error(error.name, error.message)
            return res.status(500).json({message: 'Error encrypting the password.'})
        }
    })
})

// GET route for the restricted user home page
app.get('/home', (req, res) => {
    if (req.session.user) {
        res.render('home', {username: req.session.user.username});
    } else {
        req.session.error = 'Access denied! Please log in.'
        res.redirect('/login');
    }
})

// GET route for logging out (web browser redirect)
app.get('/logout', (req, res) => {
    // Remove from active sessions if user was logged in
    if (req.session.user && req.session.user.id) {
        activeSessions.delete(req.session.user.id)
        console.log(`User ${req.session.user.username} logged out (session cleared)`)
    }
    
    req.session.destroy((error) => {
        if (error) {
            return res.send('Error logging out')
        }
        res.redirect('/')
    })
})

// POST route for logging out (API call)
app.post('/logout', (req, res) => {
    // Remove from active sessions if user was logged in
    if (req.session.user && req.session.user.id) {
        activeSessions.delete(req.session.user.id)
        console.log(`User ${req.session.user.username} logged out via API (session cleared)`)
    }
    
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({message: 'Error logging out'})
        }
        res.status(200).json({message: 'Logged out successfully'})
    })
})

// GET route for account settings
app.get('/settings', (req, res) => {
    if (req.session.user) {
        res.render('settings', {
            username: req.session.user.username,
            shape: req.session.user.shape,
            color: req.session.user.color
        })
    } else {
        req.session.error = 'Access denied! Please log in.'
        res.redirect('/login');
    }
})

// POST route for updating user settings (color and shape)
app.post('/settings/update', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({message: 'Not authenticated.'})
    }

    const { shape, color } = req.body
    const userId = req.session.user.id

    if (!shape || !color) {
        return res.status(400).json({message: 'Shape and color are required.'})
    }

    // Validate shape
    if (!['cube', 'sphere', 'cone'].includes(shape)) {
        return res.status(400).json({message: 'Invalid shape. Must be cube, sphere, or cone.'})
    }

    // Validate color format (hex color)
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
        return res.status(400).json({message: 'Invalid color format. Must be a hex color (e.g., #FF5733).'})
    }

    db.run('UPDATE accounts SET shape = ?, color = ? WHERE id = ?', [shape, color, userId], (error) => {
        if (error) {
            console.error(error.name, error.message)
            return res.status(500).json({message: 'Error updating account settings.'})
        }

        // Update session user data
        req.session.user.shape = shape
        req.session.user.color = color

        // Update JWT token with new shape and color
        const token = jsonWebToken.sign(
            {id: req.session.user.id, username: req.session.user.username, shape: shape, color: color},
            secretKey,
            {expiresIn: '3h'}
        )

        console.log(`Settings updated for user: ${req.session.user.username}, ${shape}, ${color}`)
        return res.status(200).json({message: 'Settings updated successfully.', token: token})
    })
})

// GET route for joining the game world
app.get('/join', (req, res) => {
    if (req.session.user) {
        res.render('world', { gameServerUrl: gameServerUrl })
    } else {
        req.session.error = 'Access denied! Please log in.'
        res.redirect('/login');
    }
})

// Server start
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Login server running on http://0.0.0.0:${port}`)
    })
}
  
module.exports = app
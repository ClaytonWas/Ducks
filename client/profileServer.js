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



const app = express()
const port = 3000                       // Port for profile server.
const secretKey = 'runescapefan'         // Secret key for signing session token.



// EJS view engine for dynamic HTML updates
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))



// SQLite database interaction functions.
// Reads the accounts.db.
const db = new sqlite3.Database(path.join(__dirname, './db/accounts.db'), (error) => {
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
                    /*
                    *   On valid logins, the express-session browser is assigned with the data of the row.
                    *       ^       (this is pretty unsafe and in production should just be the accounts id and username)
                    */
                    req.session.user = row
                    token = jsonWebToken.sign(
                        {id: req.session.user.id, username: req.session.user.username, shape: req.session.user.shape, color: req.session.user.color},
                        secretKey,
                        {expiresIn: '3h'}
                    )
                    return res.status(200).json({token})
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

// GET route for logging out
app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.send('Error logging out')
        }
        res.redirect('/')
    })
})

// GET route for joining the game world
app.get('/join', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, './views', 'world.html'))
    } else {
        req.session.error = 'Access denied! Please log in.'
        res.redirect('/login');
    }
})

// Server start
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Login server running on http://localhost:${port}`)
    })
}
  
module.exports = app
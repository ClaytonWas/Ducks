// Server for authenticating login requests

// Modules
const express = require('express')
const session = require('express-session')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcrypt')
const path = require('path')
const ejs = require('ejs')

// Server initalization
const app = express()
const port = 3000

// EJS view engine for dynamic HTML updates
app.set('view engine', 'ejs')
app.set('views', './views')

// SQLite database interaction functions
const db = new sqlite3.Database(path.join(__dirname, 'db/accounts.db'), (error) => {
    if(error){
        console.error(error.message)
        return res.status(500).json({message: 'Database read error.'})
    }
})

// Express-session for parsing request bodies and managing sessions
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({
    secret: 'supersecret',       // Secret key for signing session cookies
    resave: false,               // Avoid resaving unchanged sessions
    saveUninitialized: false     // Don't save uninitialized sessions
}));

// GET route for the home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'))
});

// GET route for the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'))
});

// POST route for login
app.post('/login', (req, res) => {
    var user //Function-scope tracker for an account existing in the database

    const {username, password} = req.body;

    db.get('SELECT * FROM accounts WHERE username = ?', [username], (error, row) => {
        if(error){
            console.error(error.message)
            return res.status(500).json({message: 'Database read error.'})
        }
        if(row){
            bcrypt.compare(password, row.hash, (error, matches) => {
                if(error){
                    console.error(error)
                    return res.status(500).json({message: 'Authentication verification error.'})
                } else if(matches){
                    req.session.user = row
                    return res.status(200).json({message: 'Login Successful'})
                }else{
                    console.error(error)
                    return res.status(401).json({message: 'Invalid username or password.'})
                }
            })
        }else{
            return res.status(401).json({message: 'Invalid username or password.'})
        }
    })
});

// GET route for the restricted user home page
app.get('/home', (req, res) => {
    if(req.session.user){
        res.render('home', {username: req.session.user.username});
    }else{
        req.session.error = 'Access denied! Please log in.';
        res.redirect('/login');
    }
});

// GET route for logging out
app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) return res.send('Error logging out');
        res.redirect('/')
    })
});

// GET route for registering new users, hashing passwords, and adding to database
app.get('/register', (req, res) => {
    const username = "parsa"
    const password = "foobar"

    // Generate salt and hash the password
    bcrypt.genSalt(10, (error, salt) => {
        bcrypt.hash(password, salt, (error, hash) => {
            users[username].salt = salt;
            users[username].hash = hash;
            res.send('User registered successfully!');
            console.log(salt)
            console.log(hash)
        })
    })
});

// Server start
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
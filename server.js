// Server for authenticating login requests


//TODO:
//  SQLite Database set up
//  Change the current hard coded user login system to handle dynamic login requests
//          - switch users{} to a database that is accessed by the server
//          - update or at least understand the current hashing/salt/password code


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

// Dummy "database" for users
let users = {
    "clay": {
        username: "clay",
        salt: "",      // Will store the salt here
        hash: ""       // Will store the hashed password here
    }
};

// Express-session for parsing request bodies and managing sessions
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: 'supersecret',       // Secret key for signing session cookies
    resave: false,               // Avoid resaving unchanged sessions
    saveUninitialized: false     // Don't save uninitialized sessions
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')))

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
    const {username, password} = req.body;
    
    console.log(username, password)

    // Check if user exists in the "database"
    if (!users[username]) {
        return res.redirect('/login')
    }

    const user = users[username]

    // Compare the entered password with the stored hashed password
    bcrypt.hash(password, user.salt, (err, hashedPassword) => {
        if (hashedPassword === user.hash) {
            // Password match
            req.session.user = user;  // Store the user data in the session
            res.redirect('/home');
        } else {
            // Password doesn't match
            res.redirect('/login');
        }
    });
});

// GET route for the restricted user home page
app.get('/home', (req, res) => {
    if (req.session.user) {
        res.render('home', {username: req.session.user.username});
    } else {
        req.session.error = 'Access denied! Please log in.';
        res.redirect('/login');
    }
});

// GET route for logging out
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.send('Error logging out');
        res.redirect('/');
    });
});

// GET route for registering new users, hashing passwords, and adding to database
app.get('/register', (req, res) => {
    const username = "clay";
    const password = "foobar";

    // Generate salt and hash the password
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
            users[username].salt = salt;
            users[username].hash = hash;
            res.send('User registered successfully!');
        });
    });
});

// Server start
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
// Server for authenticating login requests


//TODO:
//  SQLite Database set up
//  Change the current hard coded user login system to handle dynamic login requests
//          - switch users{} to a database that is accessed by the server, CURRENTLY CHECKING IF USER EXISTS IN DB
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

// SQLite database interaction functions
const db = new sqlite3.Database(path.join(__dirname, 'db/accounts.db'), (err) => {
    if(err){console.error(err.message)}
})



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

// Currently doing
//      Get response codes working (I want the page to refresh still, but just add 'invalid username/password' somewhere on the login page)
//      Stop website from infinitely processing if a user inputs a correct username with incorrect password
//      Stop website from infinitely proccessing if user inputs a correct username and correct password.


app.post('/login', (req, res) => {
    var user //Function-scope tracker for an account existing in the database

    const {username, password} = req.body;

    db.get('SELECT * FROM accounts WHERE username = ?', [username], (err, row) => {
        if(err){console.error(err.message)}
        if(row){
            user = row
            bcrypt.hash(password, user.salt, (err, hashedPassword) => {
                if (hashedPassword === user.hash) {
                    // Password match
                    req.session.user = user  // Store the user data in the session
                    res.redirect('/home')
                } else {
                    return res.status(401).send('Invalid username or password.')
                }
            });
        }else{
            return res.status(401).send('Invalid username or password.')
        }
    })
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
    const username = "parsa";
    const password = "foobar";

    // Generate salt and hash the password
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
            users[username].salt = salt;
            users[username].hash = hash;
            res.send('User registered successfully!');
            console.log(salt)
            console.log(hash)
        });
    });
});


app.get('/test', (req, res) => {
    db.all(`SELECT * FROM accounts`, [], (err, rows) => {
        if (err) {
          throw err;
        }
        // Print all rows
        rows.forEach((row) => {
          console.log(row);
        });
});})
    

// Server start
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
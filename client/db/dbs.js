const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const dbPath = path.join(__dirname, 'accounts.db')

// Only delete if in development (not in production)
if (process.env.NODE_ENV !== 'production' && fs.existsSync(dbPath)) {
    try {
        fs.unlinkSync(dbPath)
        console.log('Existing database deleted.')
    } catch (error) {
        console.error('Error deleting database:', error)
    }
}

// Create database if it doesn't exist
const accountsDB = new sqlite3.Database(dbPath, (error) => {
    if (error) {
        console.error('DB Error: ', error)
        process.exit(1)
    } else {
        console.log('Database connection established.')
    }
})

// Read and execute SQL schema
const sqlPath = path.join(__dirname, 'accounts.sql')
if (!fs.existsSync(sqlPath)) {
    console.error('SQL file not found:', sqlPath)
    process.exit(1)
}

const sql = fs.readFileSync(sqlPath, 'utf-8')
accountsDB.exec(sql, (error) => {
    if (error) {
        console.error('SQL Error:', error)
        accountsDB.close()
        process.exit(1)
    } else {
        console.log('Database schema initialized successfully.')
        accountsDB.close((error) => {
            if (error) {
                console.error('Error closing database:', error)
            } else {
                console.log('Database initialization complete.')
            }
        })
    }
})

const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()

if (fs.existsSync(path.join(__dirname, 'accounts.db'))) {
    fs.unlinkSync(path.join(__dirname, 'accounts.db'))
    console.log('Existing database deleted.')
}

const accountsDB = new sqlite3.Database(path.join(__dirname, 'accounts.db'), (error) => {
    if (error) {
        console.error('DB Error: ', error)
    }
})

accountsDB.exec(fs.readFileSync(path.join(__dirname, 'accounts.sql'), 'utf-8'), (error) => {
    if (error) {
        console.error('SQL Error.')
    }

    accountsDB.close((error) => {
        if (error) {
            console.error('SQL Error.')
        }
    })
})

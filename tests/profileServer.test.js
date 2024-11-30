const request = require('supertest')
const fs = require('fs')
const path = require('path')
const app = require('../client/profileServer.js')

describe('GET /', () => {
    it('should respond with a 200 status and index.html', async () => {
        const response = await request(app).get('/')
        expect(response.status).toBe(200)
        
        let htmlContent = fs.readFileSync(path.join(__dirname, '../client/views', 'index.html'), 'utf-8')
        expect(response.text).toBe(htmlContent)
    })
})

describe('GET /login', () => {
    it('should respond with a 200 status and login.html', async () => {
        const response = await request(app).get('/login')
        expect(response.status).toBe(200)
        
        let htmlContent = fs.readFileSync(path.join(__dirname, '../client/views', 'login.html'), 'utf-8')
        expect(response.text).toBe(htmlContent)
    })
})

describe('POST /login', () => {
    it('should respond with a 200 status and return a signed token', async () => {
        const knownGoodAccount = {username: 'clay', password: 'foobar'}
        const response = await request(app).post('/login')
        .send(knownGoodAccount)
        expect(response.status).toBe(200)
        expect(response.text).toContain('token')
    })
})

describe('GET /logout', () => {
    it('should respond with a redirect to /', async () => {
        const response = await request(app).get('/logout')
        expect(response.text).toBe('Found. Redirecting to /')
        expect(response.redirect).toBe(true)
    })
})

describe('POST /join', () => {
    it('should respond with a redirect to /login', async () => {
        const response = await request(app).get('/join')
        expect(response.text).toBe('Found. Redirecting to /login')
        expect(response.redirect).toBe(true)
        // To get the condition where a user is logged in a joins working I need to simulate a req.session.user
    })
})

describe('POST /register', () => {
    it('should respond with a 201 status and add the account to the database', async () => {
        const registerableAccount = {username: 'george1234', password: 'foobar', shape: 'cone', color: '#aaaaaa'}
        const response = await request(app).post('/register')
        .send(registerableAccount)
        expect(response.status).toBe(201)
        expect(response.body.message).toBe('Account Successfully Created.')
    })
})
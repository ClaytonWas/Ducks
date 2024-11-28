const request = require('supertest')
const fs = require('fs')
const path = require('path')
const app = require('../profileServer.js')

describe('GET /', () => {
    it('should respond with a 200 status and index.html', async () => {
        const response = await request(app).get('/')
        expect(response.status).toBe(200)
        
        let htmlContent = fs.readFileSync(path.join(__dirname, '../views/index.html'), 'utf-8')
        expect(response.text).toBe(htmlContent)
    })
})

describe('GET /login', () => {
    it('should respond with a 200 status and login.html', async () => {
        const response = await request(app).get('/login')
        expect(response.status).toBe(200)
        
        let htmlContent = fs.readFileSync(path.join(__dirname, '../views/login.html'), 'utf-8')
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
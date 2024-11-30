const request = require('supertest')
const fs = require('fs')
const path = require('path')
const app = require('../server/gameServer.js')

describe('GET textures/', () => {
    it('should respond with a json body of the textures directory', async () => {
        const response = await request(app).get('/textures/')
        expect(response.status).toBe(200)
        console.log(response.json)

        expect(response.text).toBe("")
    })
})
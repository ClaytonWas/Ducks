const request = require('supertest')
const fs = require('fs')
const path = require('path')
const app = require('../server/gameServer.js')

describe('GET textures/', () => {
    it('should respond with a json body of the textures directory', async () => {
        const response = await request(app).get('/textures/')
        expect(response.status).toBe(200)
        
        // Should return JSON array of texture files
        expect(Array.isArray(response.body)).toBe(true)
        expect(response.body.length).toBeGreaterThan(0)
        
        // Verify texture files have image extensions
        response.body.forEach(texture => {
            expect(texture).toMatch(/\.(png|jpg|jpeg|webp|gif)$/i)
        })
    })
})
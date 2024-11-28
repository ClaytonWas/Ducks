const request = require('supertest')
const app = require('../profileServer.js')

describe('GET /', () => {
  it('should respond with a 200 status and a message', async () => {
    const response = await request(app).get('/')
    expect(response.status).toBe(200)
  })
})

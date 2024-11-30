const axios = require('axios');
const https = require('https');

const TIME_API = 'http://worldtimeapi.org/api/timezone/America/Toronto'
const QUOTE_API = 'https://api.quotable.io'

describe("GET Quote", () => {

    it("should return a quote json response object with 8 attributes", async () => {
        
        const agent = new https.Agent({ rejectUnauthorized: false })

        try {

            const response = await axios.get(QUOTE_API + '/quotes/random', { httpsAgent: agent })

            expect(response.headers['content-type']).toMatch(/application\/json/)

            expect(response.status).toBe(200)

            const quoteData = response.data[0]

            const numKeyValuePairs = Object.keys(quoteData).length

            expect( numKeyValuePairs).toBe(8)

        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        } 
    })

})

describe("GET Short Quote", () => {

    it("should return a quote with a maximum length of 149 characters", async () => {
        
        const agent = new https.Agent({ rejectUnauthorized: false })

        try {

            const response = await axios.get(QUOTE_API + '/quotes/random/?maxLength=149', { httpsAgent: agent })

            expect(response.headers['content-type']).toMatch(/application\/json/)

            expect(response.status).toBe(200)

            const quoteContent = response.data[0].content

            expect(quoteContent.length).toBeLessThanOrEqual(149)

        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        } 
    })

})

describe("GET Medium Quote", () => {

    it("should return a quote with a length between 150 and 299 characters", async () => {
        
        const agent = new https.Agent({ rejectUnauthorized: false })

        try {

            const response = await axios.get(QUOTE_API + '/quotes/random/?minLength=150&maxLength=299', { httpsAgent: agent })

            expect(response.headers['content-type']).toMatch(/application\/json/)

            expect(response.status).toBe(200)

            const quoteContent = response.data[0].content

            expect(quoteContent.length).toBeGreaterThanOrEqual(150)

            expect(quoteContent.length).toBeLessThanOrEqual(299)

        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        } 
    })

})


describe("GET Long Quote", () => {

    it("should return a quote with a length greater than 300 characters", async () => {
        
        const agent = new https.Agent({ rejectUnauthorized: false })

        try {

            const response = await axios.get(QUOTE_API + '/quotes/random/?minLength=300', { httpsAgent: agent })

            expect(response.headers['content-type']).toMatch(/application\/json/)

            expect(response.status).toBe(200)

            const quoteContent = response.data[0].content

            expect(quoteContent.length).toBeGreaterThanOrEqual(300)

        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        } 
    })

})

describe("GET Time Data", () => {

    it("should return a timejson response object with 15 attributes", async () => {

        try {

            const response = await axios.get(TIME_API)

            expect(response.headers['content-type']).toMatch(/application\/json/)

            expect(response.status).toBe(200)

            const timeData = response.data

            const numKeyValuePairs = Object.keys(timeData).length

            expect(numKeyValuePairs).toBe(15)

            expect(timeData.timezone).toBe("America/Toronto")

        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        } 
    })

})

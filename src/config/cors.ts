const cors = require('nextjs-cors')

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3456',
  process.env.WEB_URL,
].filter(Boolean)

export default function withCors(handler) {
  return async (req, res) => {
    try {
      await cors(req, res, {
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        origin: allowedOrigins,
        credentials: true,
        optionsSuccessStatus: 200,
      })
      
      if (req.method === 'OPTIONS') {
        return res.status(200).end()
      }
      
      return handler(req, res)
    } catch (error) {
      return res.status(500).json({ error: 'CORS error: ' + error.message })
    }
  }
}

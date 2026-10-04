import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { join } from 'node:path'
import { basicAuth } from './basicAuth.js'

export function createWebApp({ api, clientDir, username, password }) {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'img-src': [
          "'self'",
          'data:',
          'blob:',
          'https://books.google.com'
        ]
      }
    }
  }))

  app.get('/healthz', (request, response) => {
    response.status(200).json({ ok: true })
  })

  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    requestWasSuccessful: (request, response) => response.statusCode !== 401,
  }))

  app.use(basicAuth({ username, password }))

  app.use(express.static(clientDir))

  app.get(/.*/, (request, response, next) => {
    if (
      request.path === '/api' ||
      request.path.startsWith('/api/') ||
      request.path === '/readyz'
    ) return next()

    response.sendFile(join(clientDir, 'index.html'))
  })

  app.use(api)

  return app
}
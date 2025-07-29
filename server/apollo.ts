import express from 'express'
import http from 'http'
import cors from 'cors'
import bodyParser from 'body-parser'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { makeExecutableSchema } from '@graphql-tools/schema'

import { useServer } from 'graphql-ws/lib/use/ws'
import { WebSocketServer } from 'ws'

import { typeDefs } from './schema'
import { resolvers } from './resolvers'

async function startServer() {
  // สร้าง schema
  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // สร้าง Apollo Server instance
  const apolloServer = new ApolloServer({
    schema,
  })

  await apolloServer.start()

  // สร้าง express app และ HTTP server
  const app = express()
  const httpServer = http.createServer(app)

  // ตั้งค่า WebSocket Server สำหรับ subscription
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  })

  // เชื่อมต่อ graphql-ws กับ WebSocketServer และ schema
  useServer({ schema }, wsServer)

  // Middleware สำหรับ HTTP (query, mutation)
  app.use(
    '/graphql',
    cors(),
    bodyParser.json(),
    expressMiddleware(apolloServer)
  )

  const PORT = process.env.PORT || 4000

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`)
    console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}/graphql`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})

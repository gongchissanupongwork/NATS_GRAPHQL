import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { makeExecutableSchema } from '@graphql-tools/schema'
import express from 'express'
import http from 'http'
import cors from 'cors'
import bodyParser from 'body-parser'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { startNatsSubscriber, stopNatsSubscriber } from './natsSubscriber'

const PORT = 4000

async function start() {
  let serverCleanup: ReturnType<typeof useServer> | null = null
  const app = express()
  const httpServer = http.createServer(app)

  try {
    const schema = makeExecutableSchema({ typeDefs, resolvers })

    const wsServer = new WebSocketServer({
      server: httpServer,
      path: '/graphql',
    })

    serverCleanup = useServer({ schema }, wsServer)

    const apolloServer = new ApolloServer({ schema })
    await apolloServer.start()

    app.use(
      '/graphql',
      cors(),
      bodyParser.json(),
      expressMiddleware(apolloServer),
    )

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`)
      console.log(`📡 Subscriptions ready at ws://localhost:${PORT}/graphql`)
    })

    await startNatsSubscriber()
    console.log('📡 NATS subscriber started')

    const shutdown = async () => {
      console.log('🛑 Shutting down gracefully...')

      if (serverCleanup) {
        await serverCleanup.dispose()
        console.log('✅ GraphQL WS server stopped')
      }

      httpServer.close(() => {
        console.log('✅ HTTP server closed')
      })

      await stopNatsSubscriber()
      console.log('✅ NATS subscriber stopped')

      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

start()

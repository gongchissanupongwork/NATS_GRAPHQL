import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { makeExecutableSchema } from '@graphql-tools/schema'
import express from 'express'
import http from 'http'
import cors from 'cors'
import bodyParser from 'body-parser'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { connect, StringCodec, JSONCodec, Subscription } from 'nats'
import { typeDefs } from './schema'
import { resolvers, pubsub } from './resolvers'

const PORT = 4000
const NATS_URL = 'nats://localhost:4222'

const topicToFieldMap: Record<string, string> = {
  'agent.overview.updated': 'onOverviewUpdated',
  'agent.tools.updated': 'onToolStatusUpdated',
  'agent.recommendation.updated': 'onRecommendationUpdated',
  'agent.checklist.updated': 'onChecklistItemUpdated',
  'agent.executive.updated': 'onExecutiveItemUpdated',
  'agent.attack.updated': 'onAttackTypeUpdated',
  'agent.timeline.updated': 'onTimelineUpdated',
}

async function start() {
  let serverCleanup: ReturnType<typeof useServer> | null = null
  let natsConnection: Awaited<ReturnType<typeof connect>> | null = null
  let subscriptions: Subscription[] = []

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

    // ▶ Start NATS subscriber inline
    natsConnection = await connect({ servers: NATS_URL })
    const jc = JSONCodec()

    for (const [topic, field] of Object.entries(topicToFieldMap)) {
      const sub = natsConnection.subscribe(topic)
      subscriptions.push(sub)
      ;(async () => {
        for await (const msg of sub) {
          try {
            const decoded = jc.decode(msg.data) as { data?: any }
            if (decoded?.data !== undefined) {
              pubsub.publish(field, { [field]: decoded.data })
              console.log(`📥 ${topic} → ${field}`, decoded.data)
            } else {
              console.warn(`⚠️ ${topic} received message without 'data' field`)
            }
          } catch (err) {
            console.error(`❌ Error parsing message on ${topic}:`, err)
          }
        }
      })()
    }

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

      if (subscriptions.length > 0) {
        for (const sub of subscriptions) {
          sub.unsubscribe()
        }
        console.log('✅ All NATS subscriptions unsubscribed')
      }

      if (natsConnection) {
        await natsConnection.drain()
        console.log('✅ NATS connection drained and closed')
      }

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

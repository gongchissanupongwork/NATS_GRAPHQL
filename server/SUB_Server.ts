import express from 'express'
import http from 'http'
import cors from 'cors'
import bodyParser from 'body-parser'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import {
  connect,
  JSONCodec,
  consumerOpts,
  JetStreamPullSubscription,
  NatsConnection,
} from 'nats'
import { PubSub } from 'graphql-subscriptions'
import gql from 'graphql-tag'

import { resolvers } from './resolvers'

// === PubSub สำหรับ GraphQL Subscription ===
export const pubsub = new PubSub()

// === GraphQL Schema Definition ===
export const typeDefs = gql`
  type OverviewData {
    description: String
  }

  type ToolStatus {
    name: String
    status: String
  }

  type Recommendation {
    description: String
    content: String
  }

  type ChecklistItemData {
    title: String
    content: String
  }

  type ExecutiveItemData {
    title: String
    content: String
  }

  type AttackType {
    tacticID: String
    tacticName: String
    confidence: Float
  }

  type TimelineData {
    stage: String
    status: String
    errorMessage: String
  }

  type Subscription {
    onOverviewUpdated: [OverviewData]
    onToolStatusUpdated: [ToolStatus]
    onRecommendationUpdated: [Recommendation]
    onChecklistItemUpdated: [ChecklistItemData]
    onExecutiveItemUpdated: [ExecutiveItemData]
    onAttackTypeUpdated: [AttackType]
    onTimelineUpdated: [TimelineData]
  }

  type Query {
    _empty: String
  }
`

// === คอนฟิกหลัก ===
const PORT = 4000
const NATS_URL = 'nats://localhost:4222'

// Mapping จาก NATS subject → GraphQL subscription field
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
  let natsConnection: NatsConnection | null = null

  // ====== สร้าง Express + HTTP Server ======
  const app = express()
  const httpServer = http.createServer(app)

  try {
    // ====== สร้าง GraphQL schema ======
    const schema = makeExecutableSchema({ typeDefs, resolvers })

    // ====== Apollo Server Setup ======
    // สร้าง instance Apollo Server จาก schema ที่ทำไว้
    const apolloServer = new ApolloServer({ schema })
    await apolloServer.start()

    // ====== WebSocket Server สำหรับ GraphQL Subscription (graphql-ws) ======
    const wsServer = new WebSocketServer({
      server: httpServer,
      path: '/graphql',
    })
    // เชื่อม graphql-ws เข้ากับ schema
    serverCleanup = useServer({ schema }, wsServer)

    // ====== Middleware HTTP (Apollo + CORS + bodyParser) ======
    app.use(
      '/graphql',
      cors(),
      bodyParser.json(),
      expressMiddleware(apolloServer)
    )

    // ====== เชื่อมต่อ NATS JetStream และ Pull Subscribe ======
    natsConnection = await connect({ servers: NATS_URL })
    const js = natsConnection.jetstream()
    const jc = JSONCodec()

    for (const [subject, field] of Object.entries(topicToFieldMap)) {
      const durableName = `${field}-consumer`

      const opts = consumerOpts()
      opts.durable(durableName)
      opts.manualAck()
      opts.ackExplicit()
      // ไม่ต้องใช้ deliverTo เพราะเป็น pull subscription

      const sub = await js.pullSubscribe(subject, opts) as JetStreamPullSubscription

      ;(async () => {
        console.log(`🌀 JetStream pull subscriber ready: ${subject}`)

        while (true) {
          try {
            sub.pull({ batch: 10, expires: 5000 })

            for await (const msg of sub) {
              const decoded = jc.decode(msg.data) as { data?: any }
              if (decoded?.data !== undefined) {
                // ส่งข้อมูลเข้า pubsub ให้ GraphQL Subscription ใช้งานได้
                pubsub.publish(field, { [field]: decoded.data })

                msg.ack()
                console.log(`📥 ${subject} → ${field}`, decoded.data)
              } else {
                console.warn(`⚠️ ${subject} missing data field`, msg.data)
              }
            }
          } catch (err) {
            console.error(`❌ Error on pull from ${subject}:`, err)
            // รอ 1 วินาทีก่อน retry
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }
      })()
    }

    // ====== เริ่มฟังพอร์ต HTTP + WS ======
    httpServer.listen(PORT, () => {
      console.log(`✅ HTTP + WS Server listening on http://localhost:${PORT}/graphql`)
    })

    // ====== Shutdown Gracefully ======
    const shutdown = async () => {
      console.log('🛑 Shutting down...')
      if (serverCleanup) await serverCleanup.dispose()
      if (httpServer) httpServer.close()
      if (natsConnection) {
        await natsConnection.drain()
        console.log('✅ NATS connection drained')
      }
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (err) {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  }
}

start()

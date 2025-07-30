import express from 'express'
import http from 'http'
import cors from 'cors'
import bodyParser from 'body-parser'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { connect, JSONCodec, Subscription } from 'nats'

import { typeDefs } from './schema'
import { resolvers, pubsub } from './resolvers'
import { transformNATSDataToGraphQLInput, RawNATSMessage, AIAgentSummaryInput } from './transform'

const PORT = 4000
const NATS_URL = 'nats://localhost:4222'

// Mapping NATS subjects → GraphQL subscription fields
const topicToFieldMap: Record<string, keyof typeof resolvers.Subscription> = {
  'agent.overview.updated': 'onOverviewUpdated',
  'agent.tools.updated': 'onToolStatusUpdated',
  'agent.recommendation.updated': 'onRecommendationUpdated',
  'agent.checklist.updated': 'onChecklistItemUpdated',
  'agent.executive.updated': 'onExecutiveItemUpdated',
  'agent.attack.updated': 'onAttackTypeUpdated',
  'agent.timeline.updated': 'onTimelineUpdated',
}

async function start() {
  const app = express()
  const httpServer = http.createServer(app)

  // GraphQL schema ที่รวม typeDefs และ resolvers
  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // ตั้งค่า WebSocket server สำหรับ GraphQL Subscriptions
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' })
  const serverCleanup = useServer({ schema }, wsServer)

  // ตั้งค่า Apollo Server สำหรับ GraphQL HTTP
  const apolloServer = new ApolloServer({ schema })
  await apolloServer.start()

  // Middleware สำหรับ REST/GraphQL HTTP endpoint
  app.use(
    '/graphql',
    cors(),
    bodyParser.json(),
    expressMiddleware(apolloServer)
  )

  // Start HTTP/WebSocket server
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`)
    console.log(`📡 Subscriptions ready at ws://localhost:${PORT}/graphql`)
  })

  // === NATS: Connect & Listen ===
  const nc = await connect({ servers: NATS_URL })
  const jc = JSONCodec()
  const subscriptions: Subscription[] = []

  for (const [topic, field] of Object.entries(topicToFieldMap)) {
    const sub = nc.subscribe(topic)
    subscriptions.push(sub)

    // ใช้ async iterator เพื่อ consume แต่ละ message จาก subject
    ;(async () => {
      for await (const msg of sub) {
        try {
          const decoded = jc.decode(msg.data) as { alert_id: string; data: any }
          console.log(`📥 Received message on ${topic}:`, decoded)

          const rawMsg: RawNATSMessage = { [topic]: decoded }
          const inputs = transformNATSDataToGraphQLInput(rawMsg)

          for (const input of inputs) {
            // 🔁 Mutation แบบ UPDATE สำหรับข้อมูลที่รับเข้ามา
            const result = await resolvers.Mutation.AIAgentSummaryEdit(
              null,
              { action: 'UPDATE', input }
            )
            console.log(`✅ Mutation applied for alert_id=${input.alert_id}`)

            // Map GraphQL field จาก topic → field ใน input
            const fieldMap: Record<keyof typeof topicToFieldMap, keyof AIAgentSummaryInput> = {
              'agent.overview.updated': 'overviewUpdated',
              'agent.tools.updated': 'toolStatusUpdated',
              'agent.recommendation.updated': 'recommendationUpdated',
              'agent.checklist.updated': 'checklistItemUpdated',
              'agent.executive.updated': 'executiveItemUpdated',
              'agent.attack.updated': 'attackTypeUpdated',
              'agent.timeline.updated': 'timelineUpdated',
            }

            const mappedKey = fieldMap[topic as keyof typeof fieldMap]
            const valueToPublish = input[mappedKey]

            // ✅ Publish เฉพาะ field ที่เป็น array และมีข้อมูลเท่านั้น
            if (valueToPublish && Array.isArray(valueToPublish)) {
              pubsub.publish(`${field}:${input.alert_id}`, {
                [field]: valueToPublish
              })
              console.log(`📨 Published update on '${field}:${input.alert_id}'`)
            } else {
              console.warn(`⚠️ Skipped publish for '${field}:${input.alert_id}' — no data`)
            }
          }
        } catch (err) {
          console.error(`❌ Error handling message from topic '${topic}':`, err)
        }
      }
    })()
  }

  // Graceful shutdown สำหรับ NATS + HTTP Server
  const shutdown = async () => {
    console.log('🛑 Shutting down...')

    await serverCleanup.dispose()
    httpServer.close(() => console.log('✅ HTTP server closed'))

    for (const sub of subscriptions) sub.unsubscribe()
    await nc.drain()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start()

import { connect, StringCodec, NatsConnection, Subscription } from 'nats'
import { pubsub } from './resolvers'

const sc = StringCodec()

const topics = [
  { topic: 'agent.tools.updated', gqlField: 'onToolStatusUpdated' },
  { topic: 'agent.recomendation.updated', gqlField: 'onRecomendationUpdated' },
  { topic: 'agent.checklist.updated', gqlField: 'onChecklistItemUpdated' },
  { topic: 'agent.executive.updated', gqlField: 'onExecutiveItemUpdated' },
  { topic: 'agent.attack.updated', gqlField: 'onAttackTypeUpdated' },
  { topic: 'agent.timeline.updated', gqlField: 'onTimelineUpdated' },
  { topic: 'agent.overview.updated', gqlField: 'onOverviewUpdated' },
]

let nc: NatsConnection | null = null
const subs: Subscription[] = []

function safePublish(gqlField: string, data: unknown) {
  if (data === undefined || data === null) {
    console.warn(`⚠️ Skipping publish: null/undefined data for [${gqlField}]`)
    return
  }

  return pubsub.publish(gqlField, { [gqlField]: data })
}

async function subscribeToTopic(nc: NatsConnection, topic: string, gqlField: string) {
  const sub = nc.subscribe(topic)
  subs.push(sub)
  console.log(`📡 Subscribed to topic: ${topic}`)

  try {
    for await (const msg of sub) {
      try {
        const payload = sc.decode(msg.data)
        const parsed = JSON.parse(payload)

        if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
          console.warn(`⚠️ Invalid payload format for topic [${topic}]:`, payload)
          continue
        }

        const data = parsed.data
        console.log(`📩 Received from NATS [${topic}]:`, data)

        await safePublish(gqlField, data)
        console.log(`🔔 Published to GraphQL: ${gqlField}`)
      } catch (err) {
        console.error(`❌ Error processing message from topic [${topic}]:`, err)
      }
    }
  } catch (err) {
    console.error(`❌ Error in NATS loop for topic [${topic}]:`, err)
  }
}

export async function startNatsSubscriber() {
  if (nc) {
    console.warn('⚠️ NATS subscriber is already started.')
    return
  }

  try {
    nc = await connect({
      servers: 'nats://localhost:4222',
      reconnect: true,
    })

    console.log('✅ Connected to NATS')

    for (const { topic, gqlField } of topics) {
      subscribeToTopic(nc, topic, gqlField).catch(err => {
        console.error(`❌ Subscription failed for topic [${topic}]:`, err)
      })
    }

    nc.closed()
      .then(() => console.log('❌ NATS connection closed'))
      .catch(err => console.error('❌ Error closing NATS connection:', err))
  } catch (err) {
    console.error('❌ Failed to connect to NATS:', err)
    nc = null
  }
}

export async function stopNatsSubscriber() {
  if (!nc) {
    console.warn('⚠️ NATS connection is not established or already closed.')
    return
  }

  try {
    console.log('🛑 Draining NATS connection...')
    await nc.drain()

    // ปิด subscription ทั้งหมดก่อนปิด connection
    for (const sub of subs) {
      sub.unsubscribe()
    }
    subs.length = 0

    await nc.close()
    console.log('✅ NATS connection closed gracefully.')
  } catch (error) {
    console.error('❌ Error while closing NATS connection:', error)
  } finally {
    nc = null
  }
}

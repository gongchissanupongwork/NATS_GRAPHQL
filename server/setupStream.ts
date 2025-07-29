import {
  connect,
  RetentionPolicy,
  StorageType,
  AckPolicy,
  ReplayPolicy,
} from 'nats'

// 🔗 ดึง subject ทั้งหมดจาก mock schema
const mockMessages = {
  'agent.overview.updated': {},
  'agent.tools.updated': {},
  'agent.recommendation.updated': {},
  'agent.checklist.updated': {},
  'agent.executive.updated': {},
  'agent.attack.updated': {},
  'agent.timeline.updated': {},
}

async function setup() {
  const NATS_SERVER = process.env.NATS_SERVER || 'nats://localhost:4222'
  const STREAM_NAME = process.env.STREAM_NAME || 'AGENT_STREAM'
  const subjects = Object.keys(mockMessages)

  const nc = await connect({ servers: NATS_SERVER })
  console.log(`✅ Connected to NATS at ${NATS_SERVER}`)

  const jsm = await nc.jetstreamManager()

  // 🔄 ลบ Stream เก่า (ถ้ามี) เพื่อ clean setup
  try {
    await jsm.streams.delete(STREAM_NAME)
    console.log(`🗑 Deleted existing stream '${STREAM_NAME}'`)
  } catch (e: any) {
    if (e.message.includes('stream not found')) {
      console.log(`ℹ️ No existing stream '${STREAM_NAME}' to delete`)
    } else {
      console.warn(`⚠️ Could not delete stream '${STREAM_NAME}':`, e.message)
    }
  }

  // ✅ สร้าง Stream ใหม่
  await jsm.streams.add({
    name: STREAM_NAME,
    subjects,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    num_replicas: 1,
  })
  console.log(`✅ Created stream '${STREAM_NAME}' with subjects:\n - ${subjects.join('\n - ')}`)

  // ➕ สร้าง Consumer ให้ทุก subject
  for (const subject of subjects) {
    const CONSUMER_NAME = `${STREAM_NAME}-${subject.replace(/\./g, '_')}-consumer`
    try {
      await jsm.consumers.add(STREAM_NAME, {
        durable_name: CONSUMER_NAME,
        ack_policy: AckPolicy.Explicit,
        filter_subject: subject,
        replay_policy: ReplayPolicy.Instant,
        max_ack_pending: 20,
      })
      console.log(`✅ Created consumer '${CONSUMER_NAME}' for subject '${subject}'`)
    } catch (e: any) {
      console.error(`❌ Failed to create consumer for '${subject}':`, e.message)
    }
  }

  await nc.close()
  console.log('🛑 NATS connection closed')
}

setup().catch((err) => {
  console.error('❌ Setup failed:', err)
  process.exit(1)
})

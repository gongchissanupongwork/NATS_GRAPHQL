import { connect, JSONCodec, NatsConnection } from 'nats'

export const mockMessages = {
  'agent.overview.updated': {
    data: {
      description: '📊 ระบบแสดงผลรวมสถานะการปฏิบัติการล่าสุด',
    },
  },
  'agent.tools.updated': {
    data: [
      { name: 'Suricata IDS', status: 'active' },
      { name: 'OSQuery', status: 'inactive' },
      { name: 'YARA Scanner', status: 'missing' },
    ],
  },
  'agent.recommendation.updated': {
    data: [
      {
        description: 'อัปเดต rules ของ IDS',
        content: 'ควรอัปเดต signature rule ของ Suricata ภายใน 24 ชั่วโมง',
      },
      {
        description: 'ปิดช่องโหว่ CVE-2024-1234',
        content: 'แนะนำให้อัปเดต patch ล่าสุดของระบบฐานข้อมูล',
      },
    ],
  },
  'agent.checklist.updated': {
    data: [
      {
        title: 'ตรวจสอบการเชื่อมต่อ NATS',
        content: 'ทดสอบว่า agent สามารถ subscribe ข้อความได้ตามปกติ',
      },
      {
        title: 'ตรวจสอบ environment',
        content: 'ตรวจสอบว่า NODE_ENV เป็น production ก่อน deploy',
      },
    ],
  },
  'agent.executive.updated': {
    data: [
      {
        title: 'สถานะโดยรวมของระบบ',
        content: 'ระบบทำงานอยู่ในสถานะ Stable โดยมี tool 2/3 ทำงานปกติ',
      },
      {
        title: 'แนวโน้มภัยคุกคาม',
        content: 'มีการตรวจพบพฤติกรรมต้องสงสัยจาก IP ภายนอก 3 รายการ',
      },
    ],
  },
  'agent.attack.updated': {
    data: [
      {
        tacticID: 'TA0001',
        tacticName: 'Initial Access',
        confidence: 0.9,
      },
      {
        tacticID: 'TA0002',
        tacticName: 'Execution',
        confidence: 0.75,
      },
    ],
  },
  'agent.timeline.updated': {
    data: [
      {
        stage: 'Received Alert',
        status: 'success',
        errorMessage: '',
      },
      {
        stage: 'Type Agent',
        status: 'error',
        errorMessage: 'Disk quota exceeded',
      },
    ],
  },
}

async function publishAll(nc: NatsConnection) {
  const jc = JSONCodec()
  const js = nc.jetstream()

  for (const [subject, payload] of Object.entries(mockMessages)) {
    const pubAck = await js.publish(subject, jc.encode(payload))
    console.log(`📤 Published to ${subject}`, {
      seq: pubAck.seq,
      stream: pubAck.stream,
      payload: payload.data,
    })
  }
}

async function randomPublishWithTimeout(
  nc: NatsConnection,
  intervalMs = 2000,
  durationMs = 10000
) {
  const jc = JSONCodec()
  const js = nc.jetstream()
  const topics = Object.keys(mockMessages) as (keyof typeof mockMessages)[]

  const intervalId = setInterval(async () => {
    const topic = topics[Math.floor(Math.random() * topics.length)]
    const { data } = mockMessages[topic]
    const payload = { data }
    const ack = await js.publish(topic, jc.encode(payload))
    console.log(`🎲 [Random] Published to ${topic}`, {
      seq: ack.seq,
      stream: ack.stream,
      payload: data,
    })
  }, intervalMs)

  return new Promise<void>((resolve) => {
    setTimeout(async () => {
      clearInterval(intervalId)
      console.log('🛑 Stopping publisher...')
      await nc.drain()
      console.log('✅ Connection drained and closed')
      resolve()
    }, durationMs)
  })
}

async function main() {
  const mode = process.argv[2]?.toLowerCase() || 'both'
  const interval = Number(process.argv[3]) || 2000
  const duration = Number(process.argv[4]) || 10000

  if (!['all', 'random', 'both'].includes(mode)) {
    console.error(`❌ Unknown mode: ${mode}`)
    console.info(`📘 Usage: Publisher.ts [mode=all|random|both] [intervalMs] [durationMs]`)
    process.exit(1)
  }

  const nc = await connect({ servers: process.env.NATS_SERVER || 'nats://localhost:4222' })

  if (mode === 'all' || mode === 'both') {
    console.log('🚀 Publishing all messages once...')
    await publishAll(nc)
  }

  if (mode === 'random' || mode === 'both') {
    console.log(`🎯 Starting random publisher for ${duration}ms every ${interval}ms`)
    await randomPublishWithTimeout(nc, interval, duration)
  } else {
    await nc.drain()
    console.log('✅ Finished (no random mode), connection drained')
  }
}

main().catch((err) => {
  console.error('🔥 Publisher error:', err)
})

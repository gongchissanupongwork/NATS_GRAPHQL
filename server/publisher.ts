import { connect, StringCodec } from 'nats'

export const mockMessages = {
  'agent.overview.updated': {
    alert_id: 'alert-001',
    data: {
      description: '📊 ระบบแสดงผลรวมสถานะการปฏิบัติการล่าสุด',
    },
  },
  'agent.tools.updated': {
    alert_id: 'alert-001',
    data: [
      { name: 'Suricata IDS', status: 'active' },
      { name: 'OSQuery', status: 'inactive' },
      { name: 'YARA Scanner', status: 'missing' },
    ],
  },
  'agent.recommendation.updated': {
    alert_id: 'alert-001',
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
    alert_id: 'alert-001',
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
    alert_id: 'alert-001',
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
    alert_id: 'alert-001',
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
    alert_id: 'alert-001',
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

// 🧪 ส่งทุก topic ครบ 1 รอบ
async function publishAll(nc: Awaited<ReturnType<typeof connect>>) {
  const sc = StringCodec()
  for (const [topic, payload] of Object.entries(mockMessages)) {
    // แพ็คข้อมูลแบบเดียวกับที่ SUB_Server คาดหวัง
    const message = {
      alert_id: payload.alert_id,
      data: payload.data,
    }
    nc.publish(topic, sc.encode(JSON.stringify(message)))
    console.log(`📤 Published to ${topic}`, payload.data)
  }
}

// 🔁 ส่งแบบ random ทุก interval จนหยุดหลัง duration
async function randomPublishWithTimeout(
  nc: Awaited<ReturnType<typeof connect>>,
  intervalMs = 2000,
  durationMs = 10000
) {
  const sc = StringCodec()
  const topics = Object.keys(mockMessages) as (keyof typeof mockMessages)[]

  let intervalId: NodeJS.Timeout

  const stop = () =>
    new Promise<void>((resolve) => {
      clearInterval(intervalId)
      setTimeout(async () => {
        console.log('🛑 Stopping publisher...')
        await nc.drain()
        console.log('✅ Connection drained and closed')
        resolve()
      }, 500)
    })

  intervalId = setInterval(() => {
    const topic = topics[Math.floor(Math.random() * topics.length)]
    const { alert_id, data } = mockMessages[topic]

    const message = {
      alert_id,
      data,
    }
    nc.publish(topic, sc.encode(JSON.stringify(message)))
    console.log(`🎲 [Random] Published to ${topic}:`, data)
  }, intervalMs)

  await new Promise<void>((resolve) => setTimeout(() => resolve(), durationMs))
  await stop()
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

  const nc = await connect({ servers: 'nats://localhost:4222' })

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

main()

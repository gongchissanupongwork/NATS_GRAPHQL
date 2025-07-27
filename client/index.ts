import { createClient } from 'graphql-ws'
import ws from 'ws'

const GRAPHQL_ENDPOINT = 'ws://localhost:4000/graphql'

const client = createClient({
  url: GRAPHQL_ENDPOINT,
  webSocketImpl: ws,
  lazy: true,
  retryAttempts: Infinity, // พยายาม reconnect ไม่จำกัด
  retryWait: async (retries) => {
    const wait = Math.min(1000 * 2 ** retries, 15000)
    console.log(`🔄 Reconnecting in ${wait / 1000}s...`)
    return new Promise((resolve) => setTimeout(resolve, wait))
  },
})

const subscriptions = [
  { field: 'onOverviewUpdated', selection: 'description' },
  { field: 'onToolStatusUpdated', selection: 'name status' },
  { field: 'onRecomendationUpdated', selection: 'description content' },
  { field: 'onChecklistItemUpdated', selection: 'title content' },
  { field: 'onExecutiveItemUpdated', selection: 'title content' },
  { field: 'onAttackTypeUpdated', selection: 'tacticID tacticName confidence' },
  { field: 'onTimelineUpdated', selection: 'stage status errorMessage' },
]

function subscribeToField(field: string, selection: string) {
  console.log(`🔗 Subscribing to ${field}...`)

  const query = `
    subscription {
      ${field} {
        ${selection}
      }
    }
  `

  function doSubscribe() {
    client.subscribe(
      { query },
      {
        next: (data) => {
          if (!data.data || data.data[field] == null) {
            console.warn(`⚠️ Received null or empty data for [${field}]`)
            return
          }
          console.log(`📨 [${field}]`, JSON.stringify(data.data[field], null, 2))
        },
        error: (err) => {
          console.error(`❌ Subscription error for [${field}]:`, err)
          // ถ้า error เกิด ให้ลอง subscribe ใหม่ (รีเชื่อมต่อ)
          setTimeout(doSubscribe, 3000)
        },
        complete: () => {
          console.log(`🟢 Subscription [${field}] completed, retrying...`)
          // server อาจส่ง complete ทำให้ subscription จบ
          // retry subscribe ใหม่อัตโนมัติ
          setTimeout(doSubscribe, 1000)
        },
      }
    )
  }

  doSubscribe()
}

function main() {
  subscriptions.forEach(({ field, selection }) => {
    subscribeToField(field, selection)
  })
}

main()

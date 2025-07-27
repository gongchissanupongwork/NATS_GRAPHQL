import { createClient, Client, ClientOptions, SubscribePayload } from 'graphql-ws'
import ws from 'ws'

const GRAPHQL_ENDPOINT = 'ws://localhost:4000/graphql'

const clientOptions: ClientOptions = {
  url: GRAPHQL_ENDPOINT,
  webSocketImpl: ws,
  lazy: true,
  retryAttempts: Infinity,
  retryWait: async (retries) => {
    const wait = Math.min(1000 * 2 ** retries, 15000)
    console.log(`🔄 Reconnecting in ${wait / 1000}s...`)
    return new Promise((resolve) => setTimeout(resolve, wait))
  },
}

const client: Client = createClient(clientOptions)

const subscriptions = [
  { field: 'onOverviewUpdated', selection: 'description' },
  { field: 'onToolStatusUpdated', selection: 'name status' },
  { field: 'onRecommendationUpdated', selection: 'description content' },
  { field: 'onChecklistItemUpdated', selection: 'title content' },
  { field: 'onExecutiveItemUpdated', selection: 'title content' },
  { field: 'onAttackTypeUpdated', selection: 'tacticID tacticName confidence' },
  { field: 'onTimelineUpdated', selection: 'stage status errorMessage' },
]

const activeUnsubscribers: (() => void | Promise<void>)[] = []

function createQuery(field: string, selection: string): string {
  return `
    subscription {
      ${field} {
        ${selection}
      }
    }
  `
}

function subscribeToField(field: string, selection: string) {
  const query = createQuery(field, selection)

  function startSubscription() {
    console.log(`🔗 Subscribing to ${field}...`)
    const unsubscribe = client.subscribe(
      { query } as SubscribePayload,
      {
        next: ({ data }) => {
          const result = data?.[field]
          if (!result) {
            console.warn(`⚠️ Received null or empty data for [${field}]`)
            return
          }
          console.log(`📨 [${field}]`, JSON.stringify(result, null, 2))
        },
        error: (err) => {
          console.error(`❌ Subscription error for [${field}]:`, err)
        },
        complete: () => {
          console.warn(`🟢 Subscription completed for [${field}], will re-subscribe...`)
          setTimeout(startSubscription, 1000)
        },
      }
    )
    activeUnsubscribers.push(unsubscribe)
  }

  startSubscription()
}

async function shutdownGracefully() {
  console.log('🧼 Cleaning up subscriptions...')
  for (const unsubscribe of activeUnsubscribers) {
    const result = unsubscribe()
    if (result instanceof Promise) await result
  }
  console.log('👋 Exiting process')
  process.exit(0)
}

function main() {
  subscriptions.forEach(({ field, selection }) => {
    subscribeToField(field, selection)
  })

  process.on('SIGINT', shutdownGracefully)
  process.on('SIGTERM', shutdownGracefully)
}

main()

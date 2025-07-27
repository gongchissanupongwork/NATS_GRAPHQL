import { PubSub } from 'graphql-subscriptions'

export const pubsub = new PubSub()

function wrapInArray<T>(data: T | T[] | null | undefined): T[] {
  if (Array.isArray(data)) return data
  if (data == null) return []
  return [data]
}

export const resolvers = {
  Subscription: {
    onOverviewUpdated: {
      subscribe: () => pubsub.asyncIterator(['onOverviewUpdated']),
      resolve: (payload: any) => wrapInArray(payload.onOverviewUpdated),
    },
    onToolStatusUpdated: {
      subscribe: () => pubsub.asyncIterator(['onToolStatusUpdated']),
      resolve: (payload: any) => wrapInArray(payload.onToolStatusUpdated),
    },
    onRecommendationUpdated: {
      subscribe: () => pubsub.asyncIterator(['onRecommendationUpdated']),
      resolve: (payload: any) => wrapInArray(payload.onRecommendationUpdated),
    },
    onChecklistItemUpdated: {
      subscribe: () => pubsub.asyncIterator(['onChecklistItemUpdated']),
      resolve: (payload: any) => wrapInArray(payload.onChecklistItemUpdated),
    },
    onExecutiveItemUpdated: {
      subscribe: () => pubsub.asyncIterator(['onExecutiveItemUpdated']),
      resolve: (payload: any) => wrapInArray(payload.onExecutiveItemUpdated),
    },
    onAttackTypeUpdated: {
      subscribe: () => pubsub.asyncIterator(['onAttackTypeUpdated']),
      resolve: (payload: any) => wrapInArray(payload.onAttackTypeUpdated),
    },
    onTimelineUpdated: {
      subscribe: () => pubsub.asyncIterator(['onTimelineUpdated']),
      resolve: (payload: any) => wrapInArray(payload.onTimelineUpdated),
    },
  },
  Query: {
    _empty: () => 'OK',
  },
}

import gql from 'graphql-tag'

export const typeDefs = gql`
  type OverviewData {
    description: String
  }
  
  type ToolStatus {
    name: String
    status: String
  }
  
  type Recomendation {
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
    onRecomendationUpdated: [Recomendation] 
    onChecklistItemUpdated: [ChecklistItemData]
    onExecutiveItemUpdated: [ExecutiveItemData]
    onAttackTypeUpdated: [AttackType]
    onTimelineUpdated: [TimelineData]
  }

  type Query {
    _empty: String
  }
`

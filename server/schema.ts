import gql from 'graphql-tag'

export const typeDefs = gql`
  enum ActionType {
    ADD
    UPDATE
    DELETE
  }

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

  type AIAgentSummary {
    alert_id: String!
    overviewUpdated: [OverviewData]
    toolStatusUpdated: [ToolStatus]
    recommendationUpdated: [Recommendation]
    checklistItemUpdated: [ChecklistItemData]
    executiveItemUpdated: [ExecutiveItemData]
    attackTypeUpdated: [AttackType]
    timelineUpdated: [TimelineData]
  }

  type Query {
    AIAgentSummary(alert_id: String!): AIAgentSummary
    AIAgentSummarys: [AIAgentSummary]
  }

  input AIAgentSummaryInput {
    alert_id: String!
    overviewUpdated: [OverviewDataInput]
    toolStatusUpdated: [ToolStatusInput]
    recommendationUpdated: [RecommendationInput]
    checklistItemUpdated: [ChecklistItemDataInput]
    executiveItemUpdated: [ExecutiveItemDataInput]
    attackTypeUpdated: [AttackTypeInput]
    timelineUpdated: [TimelineDataInput]
  }

  input OverviewDataInput {
    description: String
  }

  input ToolStatusInput {
    name: String
    status: String
  }

  input RecommendationInput {
    description: String
    content: String
  }

  input ChecklistItemDataInput {
    title: String
    content: String
  }

  input ExecutiveItemDataInput {
    title: String
    content: String
  }

  input AttackTypeInput {
    tacticID: String
    tacticName: String
    confidence: Float
  }

  input TimelineDataInput {
    stage: String
    status: String
    errorMessage: String
  }

  type AIAgentSummaryEditPayload {
    success: Boolean!
    message: String
    data: AIAgentSummary
  }

  type Mutation {
    AIAgentSummaryEdit(action: ActionType!, input: AIAgentSummaryInput!): AIAgentSummaryEditPayload
  }

  type Subscription {
    onOverviewUpdated(alert_id: String!): [OverviewData]
    onToolStatusUpdated(alert_id: String!): [ToolStatus]
    onRecommendationUpdated(alert_id: String!): [Recommendation]
    onChecklistItemUpdated(alert_id: String!): [ChecklistItemData]
    onExecutiveItemUpdated(alert_id: String!): [ExecutiveItemData]
    onAttackTypeUpdated(alert_id: String!): [AttackType]
    onTimelineUpdated(alert_id: String!): [TimelineData]
  }
`

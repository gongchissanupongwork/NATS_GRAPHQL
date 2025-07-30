import { gql } from 'graphql-tag'

export const ON_OVERVIEW_UPDATED = gql`
  subscription OnOverviewUpdated($alert_id: String!) {
    onOverviewUpdated(alert_id: $alert_id) {
      description
    }
  }
`

export const ON_TOOLS_UPDATED = gql`
  subscription OnToolsUpdated($alert_id: String!) {
    onToolStatusUpdated(alert_id: $alert_id) {
      name
      status
    }
  }
`

export const ON_RECOMMENDATION_UPDATED = gql`
  subscription OnRecommendationUpdated($alert_id: String!) {
    onRecommendationUpdated(alert_id: $alert_id) {
      description
      content
    }
  }
`

export const ON_CHECKLIST_UPDATED = gql`
  subscription OnChecklistUpdated($alert_id: String!) {
    onChecklistItemUpdated(alert_id: $alert_id) {
      title
      content
    }
  }
`

export const ON_EXECUTIVE_UPDATED = gql`
  subscription OnExecutiveUpdated($alert_id: String!) {
    onExecutiveItemUpdated(alert_id: $alert_id) {
      title
      content
    }
  }
`

export const ON_ATTACKTYPE_UPDATED = gql`
  subscription OnAttackTypeUpdated($alert_id: String!) {
    onAttackTypeUpdated(alert_id: $alert_id) {
      tacticID
      tacticName
      confidence
    }
  }
`

export const ON_TIMELINE_UPDATED = gql`
  subscription OnTimelineUpdated($alert_id: String!) {
    onTimelineUpdated(alert_id: $alert_id) {
      stage
      status
      errorMessage
    }
  }
`

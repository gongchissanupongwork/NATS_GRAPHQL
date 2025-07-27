import { gql } from 'graphql-tag'

export const ON_OVERVIEW_UPDATED = gql`
  subscription OnOverviewUpdated {
    onOverviewUpdated {
      description
    }
  }
`

export const ON_TOOLS_UPDATED = gql`
  subscription OnToolsUpdated {
    onToolStatusUpdated {
      name
      status
    }
  }
`

export const ON_RECOMMENDATION_UPDATED = gql`
  subscription OnRecommendationUpdated {
    onRecommendationUpdated {
      description
      content
    }
  }
`

export const ON_CHECKLIST_UPDATED = gql`
  subscription OnChecklistUpdated {
    onChecklistItemUpdated {
      title
      content
    }
  }
`

export const ON_EXECUTIVE_UPDATED = gql`
  subscription OnExecutiveUpdated {
    onExecutiveItemUpdated {
      title
      content
    }
  }
`

export const ON_ATTACKTYPE_UPDATED = gql`
  subscription OnAttackTypeUpdated {
    onAttackTypeUpdated {
      tacticID
      tacticName
      confidence
    }
  }
`

export const ON_TIMELINE_UPDATED = gql`
  subscription OnTimelineUpdated {
    onTimelineUpdated {
      stage
      status
      errorMessage
    }
  }
`

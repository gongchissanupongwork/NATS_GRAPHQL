'use client'

import Box from '@mui/material/Box' // ✅ ใช้เฉพาะ Box จาก MUI ตามที่จำเป็น
import Typography from '@mui/material/Typography' // ✅ ใช้ Typography แทน <h2>, <h3> หากต้องการ MUI Style
import React, { useEffect, useRef, useState } from 'react'
import {
  AttackTypeCard,
  ChecklistItem,
  CustomerToolsCard,
  ExecutiveSummaryItem,
  Footer,
  OverviewCard,
  RecommendationCard,
  TimelineProcess,
} from '../components/componentsAgent'
import { ApolloProvider } from '@apollo/client'
import createAIApolloClient from '../components/apolloClient'
const client = createAIApolloClient();

import TextField from '@mui/material/TextField'
import Divider from '@mui/material/Divider'

// 🔁 ปรับ PageProps ให้รับ alert_id
interface PageProps {
  role: 'soc-dev' | 'customer'
  setRole: React.Dispatch<React.SetStateAction<PageProps['role']>>
  alert_id: string
}

// -------------------- Utility Components --------------------

/**
 * 📦 SectionWrapper: ใช้ครอบ Section ต่าง ๆ
 */
const SectionWrapper = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <Box className="sectionWrapper">
    <Typography className="sectionTitle">{title}</Typography>
    {children}
  </Box>
)


/**
 * 🧱 SectionCardList: สำหรับแสดง list ของ card ที่ต้องใช้ loop
 */
const SectionCardList = <T,>({
  items,
  renderItem,
}: {
  items: T[]
  renderItem: (item: T, idx: number) => React.ReactNode
}) => <Box className="sectionCardList"> {items.map(renderItem)} </Box>
  
// -------------------- DevSocPage --------------------

export function DevSocPage({ role, setRole, alert_id }: PageProps) {
  return (
    <Box className="container-max-width">
      <Box className="stack-section">
        <TimelineProcess alert_id={alert_id} />
      </Box>

      <Box className="responsive-card-grid">
        <Box>
          <SectionWrapper title="Overview">
            <OverviewCard alert_id={alert_id} />
          </SectionWrapper>
          <SectionWrapper title="Contextual Recommendations">
            <RecommendationCard alert_id={alert_id} />
          </SectionWrapper>
          <SectionWrapper title="Customer Tools">
            <CustomerToolsCard alert_id={alert_id} />
          </SectionWrapper>
        </Box>

        <Box>
          <SectionWrapper title="Attack Type Summary">
            <AttackTypeCard alert_id={alert_id} />
          </SectionWrapper>
          <SectionWrapper title="SOC Analyst Checklist">
            <ChecklistItem alert_id={alert_id} />
          </SectionWrapper>
        </Box>
      </Box>
    </Box>
  )
}

// -------------------- CustomerPage --------------------

export function CustomerPage({ role, setRole, alert_id }: PageProps) {
  return (
    <Box className="container-max-width">
      <Box className="stack-section">
        <TimelineProcess alert_id={alert_id} />
      </Box>

      <Box className="responsive-card-grid">
        <Box>
          <SectionWrapper title="Overview">
            <OverviewCard alert_id={alert_id} />
          </SectionWrapper>
          <SectionWrapper title="Contextual Recommendations">
            <RecommendationCard alert_id={alert_id} />
          </SectionWrapper>
          <SectionWrapper title="Customer Tools">
            <CustomerToolsCard alert_id={alert_id} />
          </SectionWrapper>
        </Box>

        <Box>
          <SectionWrapper title="Attack Type Summary">
            <AttackTypeCard alert_id={alert_id} />
          </SectionWrapper>
          <SectionWrapper title="Executive Summary">
            <ExecutiveSummaryItem alert_id={alert_id} />
          </SectionWrapper>
        </Box>
      </Box>
    </Box>
  )
}

// -------------------- Main HomePage --------------------

export default function HomePage() {
  const [role, setRole] = useState<'soc-dev' | 'customer'>('soc-dev')
  const [alertId, setAlertId] = useState('alert-001')

  const renderPage = () => {
    const pageProps = { role, setRole, alert_id: alertId }
    switch (role) {
      case 'soc-dev':
        return <DevSocPage {...pageProps} />
      case 'customer':
        return <CustomerPage {...pageProps} />
      default:
        return null
    }
  }

  return (
    <ApolloProvider client={client}>
      <main className="home-page-wrapper">
        <Box className="alert-id-controller">
          <Typography variant="h6" sx={{ mb: 1 }}>
            🔧 Debug: Alert ID
          </Typography>
          <TextField
            label="Alert ID"
            variant="outlined"
            size="small"
            value={alertId}
            onChange={(e) => setAlertId(e.target.value)}
            sx={{ width: 300 }}
          />
          <Divider sx={{ my: 2 }} />
        </Box>

        {renderPage()}

        <Footer role={role} setRole={setRole} />
      </main>
    </ApolloProvider>
  )
}
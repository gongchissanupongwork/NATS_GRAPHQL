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
import type { ToolStatus } from '../components/componentsAgent'
import '../components/styles_AgentSummary.scss';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { ApolloProvider } from '@apollo/client'
import client from '../components/apolloClient'


// กำหนดสีตามที่ SCSS ใช้ (ตัวอย่างสีเดียวกับ SCSS)
const confidenceHigh = '#f87171';   // สีความมั่นใจสูง (status-missing)
const confidenceMedium = '#facc15'; // สีความมั่นใจปานกลาง (status-inactive)
const confidenceLow = '#4ade80';    // สีความมั่นใจต่ำ (status-active)
const confidenceFallback = '#c084fc'; // fallback (purple-light)

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) {
    return confidenceHigh;
  } else if (confidence >= 0.5) {
    return confidenceMedium;
  } else if (confidence >= 0) {
    return confidenceLow;
  } else {
    return confidenceFallback;
  }
}

const statusColorMap: Record<string, string> = {
  active: '#4ade80',    // $status-active
  enabled: '#4ade80',   // $status-enabled
  inactive: '#facc15',  // $status-inactive
  missing: '#f87171',   // $status-missing
  fallback: '#c084fc',  // $purple-light
};

// -------------------- Interfaces --------------------
interface Recommendation {
  title: string
  content: string | React.ReactNode
}

interface ChecklistItemData {
  title: string
  content: string | React.ReactNode
}

interface ExecutiveData {
  title: React.ReactNode;
  content: React.ReactNode;
}

interface AttackType {
  tacticId: string
  tacticName: string
  confidence: number
}

interface OverviewData {
  description: string
}

interface TimelineData {
  stage: string
  status: 'success' | 'error'
  errorMessage?: string
}

interface PageProps {
  role: 'soc-dev' | 'customer' | 'testWS' 
  setRole: React.Dispatch<React.SetStateAction<PageProps['role']>>
}

// -------------------- Mock Data --------------------

const timelineStages = [
  'Received Alert',
  'Type Agent',
  'Specified Type',
  'Threat Analysis',
  'Analyze Context',
  'Summary',
  'Recommendation',
]

const timelineMockData: TimelineData[] = [
  { stage: 'Received Alert', status: 'success' },
  { stage: 'Type Agent', status: 'success'},
  { stage: 'Specified Type', status: 'error', errorMessage: 'Agent not Specified Type' },
]

const overviewMock: OverviewData = {
  description:
    'From the latest log data research, the system has checked the source of the credible credentials and researched again by looking at the pattern by looking at the technique in the MITRE ATT&CK framework, Credential Access category (TA0006). Sometimes, the attempt to access the data of the controller by aluminum',
}

const toolsMock: ToolStatus[] = [
  { name: 'EDR', status: 'missing' },
  { name: 'Antivirus', status: 'active' },
  { name: 'Firewall', status: 'inactive' },
  { name: 'MFA', status: 'enabled' },
]

const recommendationsMock: Recommendation[] = [
  {
    title: 'Reset password immediately',
    content: 'Please reset your password within 24 hours to ensure account safety.',
  },
  {
    title: 'Enable Endpoint Detection & Response (EDR)',
    content: 'Activate EDR solutions to monitor and respond to threats in real-time.',
  },
]

const checklistMock: ChecklistItemData[] = [
  {
    title: 'Check login time vs work hours',
    content: 'Review logs to confirm all access was during expected hours.',
  },
  {
    title: 'Review MFA logs',
    content: 'Verify multi-factor authentication attempts and failures.',
  },
  {
    title: 'Correlate with phishing alerts',
    content: 'Check if recent phishing campaigns align with suspicious activities.',
  },
]

const mockExecutiveSummary: ExecutiveData[] = [
  {
    title: 'Detected Suspicious Activity',
    content: 'System identified unusual outbound traffic from internal assets during non-business hours.',
  },
  {
    title: 'Initial Analysis',
    content: 'Indicators suggest possible data exfiltration attempts via encrypted channels.',
  },
  {
    title: 'Mitigation',
    content: 'Blocked affected IPs and initiated incident response procedures.',
  },
]

const attackTypeMock: AttackType = {
  tacticId: 'TA0006',
  tacticName: 'Credential Access',
  confidence: 0.345,
}

// -------------------- Utility Components --------------------

/**
 * 🔍 Highlight keywords ในข้อความ
 */
function highlightKeyword(
  text: string,
  keywords: string[] = ['attack', 'tools', 'checklist']
): React.ReactNode[] {
  const lowerKeywords = keywords.map((k) => k.toLowerCase())
  const regex = new RegExp(`(${keywords.join('|')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) =>
    lowerKeywords.includes(part.toLowerCase()) ? (
      <mark key={i} className="bg-yellow-300 font-semibold">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

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

// -------------------- Local Components for Static Data --------------------

/**
 * 🪪 OverviewCardLocal: Clone จาก OverviewCard ที่รับ prop ได้โดยตรง
 */
function OverviewCardLocal({ description }: { description: React.ReactNode }) {
  return (
    <Box className="overviewAgent-card">
      <Typography className="contentText">
        {description}
      </Typography>
    </Box>
  );
}

/**
 * 🛡️ RecommendationCardLocal
 */
function RecommendationCardLocal({ title, content }: Recommendation) {
  return (
    <Box className="card-wrapper">
      <Typography className="title-text">
        {title}
      </Typography>
      <Typography className="content-text">
        {content}
      </Typography>
    </Box>
  );
}

/**
 * 🧰 ChecklistItemLocal
 */
function ChecklistItemLocal({ title, content }: ChecklistItemData) {
  return (
    <Box className="card-wrapper">
      <Typography className="title-text">
        {title}
      </Typography>
      <Typography className="content-text">
        {content}
      </Typography>
    </Box>
  );
}

function ExcutiveSummaryLocal({ title, content }: ExecutiveData) {
  return (
    <Box className="card-wrapper">
      <Typography className="title-text">
        {title}
      </Typography>
      <Typography className="content-text">
        {content}
      </Typography>
    </Box>
  );
}


/**
 * 🛠️ CustomerToolsCardLocal
 */
function CustomerToolsCardLocal({ tools }: { tools: ToolStatus[] }) {
  const getStatusColor = (status: ToolStatus['status']) =>
    statusColorMap[status] ?? statusColorMap.fallback;

  return (
    <Box className="card-wrapper">
      <Box component="ul" className="list-wrapper">
        {tools.map((tool) => (
          <Box component="li" key={tool.name}>
            <strong style={{ color: '#e0e0e0' }}>{tool.name}</strong>:&nbsp;
            <Box component="span" style={{ color: getStatusColor(tool.status), fontWeight: 'bold' }}>
              {tool.status}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * 🔐 AttackTypeCardLocal
 */
function AttackTypeCardLocal({ tacticId, tacticName, confidence }: AttackType) {
  return (
    <Box className="card-wrapper">
      <Typography className="content-text">
        {tacticId} - {tacticName}
      </Typography>
      <Typography className="content-text">
        Confidence Score:{' '}
        <Box 
          component="span" 
          style={{ color: getConfidenceColor(confidence), fontWeight: 'bold' }}
        >
          {confidence}
        </Box>
      </Typography>
    </Box>
  )
}

function TimelineProcesslocal() {
  const [successStages, setSuccessStages] = useState<Set<string>>(new Set())
  const [errorStages, setErrorStages] = useState<Map<string, string>>(new Map())
  const [openError, setOpenError] = useState<{ stage: string; message: string } | null>(null)

  useEffect(() => {
    // ประมวลผล mock data เพียงครั้งเดียวตอน component mount
    const success = new Set<string>()
    const errorMap = new Map<string, string>()

    for (const item of timelineMockData) {
      if (!timelineStages.includes(item.stage)) continue

      if (item.status === 'success') {
        success.add(item.stage)
      } else if (item.status === 'error' && item.errorMessage) {
        errorMap.set(item.stage, item.errorMessage)
      }
    }

    setSuccessStages(success)
    setErrorStages(errorMap)
  }, [])

  return (
    <>
      <Box sx={{ overflowX: 'auto' }} className="timeline-wrapper-outer">
        <Box className="timeline-wrapper">
          {timelineStages.map((stage, idx) => {
            const isSuccess = successStages.has(stage)
            const isError = errorStages.has(stage)

            let dotClass = 'timeline-dot timeline-dot-inactive'
            if (isSuccess) dotClass = 'timeline-dot timeline-dot-active'
            if (isError) dotClass = 'timeline-dot timeline-dot-error'

            const labelClass = isSuccess
              ? 'timeline-label timeline-label-active'
              : isError
              ? 'timeline-label timeline-label-error'
              : 'timeline-label timeline-label-inactive'

            // Logic แสดงเส้น progress แค่ถ้า stage ปัจจุบันสำเร็จและ stage ถัดไปมีสถานะใด ๆ
            const nextStage = timelineStages[idx + 1]
            const isCurrentComplete = isSuccess
            const isNextPresent = successStages.has(nextStage) || errorStages.has(nextStage)
            const showProgressLine = isCurrentComplete && isNextPresent

            return (
              <Box key={stage} className="timeline-stage-wrapper">
                {/* Dot */}
                {isError ? (
                  <Tooltip title="Click to view error">
                    <Box
                      onClick={() =>
                        setOpenError({
                          stage,
                          message: errorStages.get(stage) ?? 'Unknown error',
                        })
                      }
                      className={dotClass}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Tooltip>
                ) : (
                  <Box className={dotClass} />
                )}

                {/* Label */}
                <Typography component="span" className={labelClass}>
                  {stage}
                </Typography>

                {/* เส้น progress ไปยัง stage ถัดไป */}
                {idx < timelineStages.length - 1 && (
                  <Box className="timeline-line-wrapper">
                    <Box className="timeline-line-base" />
                    <Box
                      className="timeline-line-progress"
                      style={{ width: showProgressLine ? '100%' : '0%' }}
                    />
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* Dialog แสดงข้อความ error เมื่อคลิก */}
      <Dialog open={!!openError} onClose={() => setOpenError(null)}>
        <DialogTitle>Error in {openError?.stage}</DialogTitle>
        <DialogContent>
          <Typography color="error">{openError?.message}</Typography>
        </DialogContent>
      </Dialog>
    </>
  )
}


  
// -------------------- DevSocPage --------------------

export function DevSocPage({ role, setRole }: PageProps) {
  const overview = overviewMock
  const tools = toolsMock
  const recommendations = recommendationsMock
  const checklist = checklistMock
  const attackType = attackTypeMock

  return (
    <Box className="container-max-width">
      <Box className="stack-section">
        <TimelineProcesslocal />
      </Box>

      <Box className="responsive-card-grid">
        {/* คอลัมน์ซ้าย */}
        <Box>
          <SectionWrapper title="Overview">
            <OverviewCardLocal description={highlightKeyword(overview.description)} />
          </SectionWrapper>

          <SectionWrapper title="Contextual Recommendations">
            <SectionCardList<Recommendation>
              items={recommendations}
              renderItem={(rec, idx) => <RecommendationCardLocal key={idx} title={rec.title} content={rec.content} />}
            />
          </SectionWrapper>

          <SectionWrapper title="Customer Tools">
            <CustomerToolsCardLocal tools={tools} />
          </SectionWrapper>
        </Box>

        {/* คอลัมน์ขวา */}
        <Box>
          <SectionWrapper title="Attack Type Summary">
            <AttackTypeCardLocal {...attackType} />
          </SectionWrapper>

          <SectionWrapper title="SOC Analyst Checklist">
            <SectionCardList<ChecklistItemData>
              items={checklist}
              renderItem={(item, idx) => (
                <ChecklistItemLocal key={idx} title={item.title} content={item.content} />
              )}
            />
          </SectionWrapper>
        </Box>
      </Box>
    </Box>
  )
}

// -------------------- Other Pages --------------------

export function CustomerPage({ role, setRole }: PageProps) {
  const overview = overviewMock
  const tools = toolsMock
  const recommendations = recommendationsMock
  const executive = mockExecutiveSummary
  const attackType = attackTypeMock

  return (
    <Box className="container-max-width">
      <Box className="stack-section">
        <TimelineProcesslocal />
      </Box>

      <Box className="responsive-card-grid">
        {/* คอลัมน์ซ้าย */}
        <Box>
          <SectionWrapper title="Overview">
            <OverviewCardLocal description={highlightKeyword(overview.description)} />
          </SectionWrapper>

          <SectionWrapper title="Contextual Recommendations">
            <SectionCardList<Recommendation>
              items={recommendations}
              renderItem={(rec, idx) => <RecommendationCardLocal key={idx} title={rec.title} content={rec.content} />}
            />
          </SectionWrapper>

          <SectionWrapper title="Customer Tools">
            <CustomerToolsCardLocal tools={tools} />
          </SectionWrapper>
        </Box>

        {/* คอลัมน์ขวา */}
        <Box>
          <SectionWrapper title="Attack Type Summary">
            <AttackTypeCardLocal {...attackType} />
          </SectionWrapper>

          <SectionWrapper title="Executive Summary">
            <SectionCardList<ExecutiveData>
              items={executive}
              renderItem={(item, idx) => (
                <ExcutiveSummaryLocal key={idx} title={item.title} content={item.content} />
              )}
            />
          </SectionWrapper>
        </Box>
      </Box>
    </Box>
  )
}


/**
 * TestWSPage
 * -----------------------
 * หน้าเพื่อทดสอบการเชื่อมต่อและแสดงข้อมูล WebSocket จริง
 * โดยเรียกใช้ component ที่ใช้ hook useWebSocket ภายใน componentsAgent2.tsx
 * 
 * จุดประสงค์:
 * - ไม่ใช้ mock data
 * - ให้ component ทำงานแบบ real-time ตาม WebSocket ที่ตั้งค่าใน useWebSocket
 * - เหมาะสำหรับตรวจสอบสถานะและข้อมูลจริงจาก backend ผ่าน WebSocket
 */
export function TestWSPage({ role, setRole }: PageProps) {
  return (
    <Box className="container-max-width">
      
      <Box className="stack-section">
        <TimelineProcess />
      </Box>

      <Box className="responsive-card-grid">
        {/* คอลัมน์ซ้าย */}
        <Box >

          <SectionWrapper title="Overview">
            <OverviewCard/>
          </SectionWrapper>

          <SectionWrapper title="Contextual Recommendations">
            <RecommendationCard />
          </SectionWrapper>

          <SectionWrapper title="Customer Tools">
            <CustomerToolsCard />
          </SectionWrapper>

        </Box>

        {/* คอลัมน์ขวา */}
        <Box>

          <SectionWrapper title="Attack Type Summary">
            <AttackTypeCard />
          </SectionWrapper>

          <SectionWrapper title="SOC Analyst Checklist">
            <ChecklistItem />
          </SectionWrapper>

        </Box>
      </Box>
    </Box>
  )
}

// -------------------- Main HomePage --------------------

export default function HomePage() {
  const [role, setRole] = useState<'soc-dev' | 'customer' | 'testWS' >('soc-dev');

  const renderPage = () => {
    switch (role) {
      case 'soc-dev':
        return <DevSocPage role={role} setRole={setRole} />;
      case 'customer':
        return <CustomerPage role={role} setRole={setRole} />;
      case 'testWS':
        return <TestWSPage role={role} setRole={setRole} />
      default:
        return null;
    }
  };

  return (
    <ApolloProvider client={client}>
      <main className="home-page-wrapper">
        {renderPage()}
        <Footer role={role} setRole={setRole} />
      </main>
    </ApolloProvider>
  )
}
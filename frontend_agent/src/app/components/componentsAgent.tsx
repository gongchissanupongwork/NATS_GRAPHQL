'use client'

import './styles_AgentSummary.scss';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createClient, Client, ClientOptions, SubscribePayload } from 'graphql-ws'
import {
  Box,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material'
import { useSubscription } from '@apollo/client'
import {
  ON_OVERVIEW_UPDATED,
  ON_TOOLS_UPDATED,
  ON_RECOMMENDATION_UPDATED,
  ON_CHECKLIST_UPDATED,
  ON_EXECUTIVE_UPDATED,
  ON_ATTACKTYPE_UPDATED,
  ON_TIMELINE_UPDATED,
} from './graphqlQueries'

const GRAPHQL_ENDPOINT = 'ws://localhost:4000/graphql'


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

const statusColorMap: Record<ToolStatus['status'] | 'fallback', string> = {
  active: '#4ade80',    // $status-active
  enabled: '#4ade80',   // $status-enabled
  inactive: '#facc15',  // $status-inactive
  missing: '#f87171',   // $status-missing
  fallback: '#c084fc',  // $purple-light
};

// ------------------------------------------------------------
// Create GraphQL client
// ใช้สำหรับเชื่อมต่อกับ GraphQL WebSocket
// ------------------------------------------------------------

const clientOptions: ClientOptions = {
  url: GRAPHQL_ENDPOINT,
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

// ------------------------------------------------------------
// AttackTypeCard: แสดง tactic และ confidence
// รับข้อมูล array ของ tactic ผ่าน WebSocket URL ที่ส่งเข้ามา
// ------------------------------------------------------------
interface AttackTypeData {
  tacticID: string;
  tacticName: string;
  confidence: number;
}

  // รับข้อมูลเป็น array ของ AttackTypeData
export function AttackTypeCard() {
  const { data, loading, error } = useSubscription<{ onAttackTypeUpdated: AttackTypeData[] }>(
    ON_ATTACKTYPE_UPDATED
  )

  const attackTypes = useMemo(() => data?.onAttackTypeUpdated ?? [], [data])

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress size={24} />
      </Box>
    )

  if (error)
    return (
      <Typography color="error" sx={{ m: 2 }}>
        Error loading attack types: {error.message}
      </Typography>
    )

  if (attackTypes.length === 0)
    return (
      <Typography sx={{ m: 2 }} color="text.secondary">
        No attack types available.
      </Typography>
    )

  return (
    <Box className="card-wrapper">
      {attackTypes.map((item) => (
        <Box key={item.tacticID} sx={{ mb: 2 }}>
          <Typography className="content-text">
            {item.tacticID} - {item.tacticName}
          </Typography>
          <Typography className="content-text">
            Confidence Score:{' '}
            <Box
              component="span"
              sx={{ color: getConfidenceColor(item.confidence), fontWeight: 'bold' }}
            >
              {item.confidence}
            </Box>
          </Typography>
        </Box>
      ))}
    </Box>
  )
}


// ------------------------------------------------------------
// ChecklistItem: แสดงรายการ checklist
// รับข้อมูล array ของ checklist ผ่าน WebSocket
// ------------------------------------------------------------
interface ChecklistData {
  title: string;
  content: string;
}

export function ChecklistItem() {
  const { data, loading, error } = useSubscription<{ onChecklistItemUpdated: ChecklistData[] }>(
    ON_CHECKLIST_UPDATED
  );

  const checklist = useMemo(() => data?.onChecklistItemUpdated ?? [], [data]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ m: 2 }}>
        Error loading checklist: {error.message}
      </Typography>
    );
  }

  if (checklist.length === 0) {
    return (
      <Typography sx={{ m: 2 }} color="text.secondary">
        No checklist items available.
      </Typography>
    );
  }

  return (
    <>
      {checklist.map((item) => (
        <Box key={item.title} className="card-wrapper">
          <Typography className="title-text" sx={{ marginBottom: 1 }}>
            {item.title}
          </Typography>
          <Typography className="content-text">{item.content}</Typography>
        </Box>
      ))}
    </>
  );
}

// ------------------------------------------------------------
// CustomerToolsCard: แสดงสถานะของ tools ที่ลูกค้าใช้
// รับข้อมูล array ของ tools ผ่าน WebSocket
// ------------------------------------------------------------
export interface ToolStatus {
  name: string;
  status: 'active' | 'inactive' | 'enabled' | 'missing';
}

function getStatusColor(status: ToolStatus['status']): string {
  return statusColorMap[status] ?? statusColorMap.fallback;
}

export const CustomerToolsCard: React.FC = () => {
  const { data, loading, error } = useSubscription<{ onToolStatusUpdated: ToolStatus[] }>(ON_TOOLS_UPDATED);

  const tools = useMemo(() => data?.onToolStatusUpdated ?? [], [data]);

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );

  if (error)
    return (
      <Typography color="error" sx={{ m: 2 }}>
        Error loading tools status: {error.message}
      </Typography>
    );

  if (tools.length === 0)
    return (
      <Typography sx={{ m: 2 }} color="text.secondary">
        No tools status available.
      </Typography>
    );

  return (
    <Box className="card-wrapper">
      <Box component="ul" className="list-wrapper">
        {tools.map((tool) => (
          <Box component="li" key={tool.name} sx={{ mb: 1, listStyleType: 'none' }}>
            <Typography component="strong" sx={{ color: '#e0e0e0' }}>
              {tool.name}
            </Typography>
            :{' '}
            <Typography
              component="span"
              sx={{ color: getStatusColor(tool.status), fontWeight: 'bold' }}
              aria-label={`Status is ${tool.status}`}
            >
              {tool.status}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ------------------------------------------------------------
// ExecutiveSummaryItem: ใช้ในรายงานสรุปผู้บริหาร
// รับข้อมูล array ของ executive summary ผ่าน WebSocket
// ------------------------------------------------------------
interface ExecutiveData {
  title: string;
  content: string;
}

export const ExecutiveSummaryItem: React.FC = () => {
  const { data, loading, error } = useSubscription<{ onExecutiveItemUpdated: ExecutiveData[] }>(
    ON_EXECUTIVE_UPDATED
  )

  const executive = useMemo(() => data?.onExecutiveItemUpdated ?? [], [data])

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress size={24} />
      </Box>
    )

  if (error)
    return (
      <Typography color="error" sx={{ m: 2 }}>
        Error loading executive summary: {error.message}
      </Typography>
    )

  if (executive.length === 0)
    return (
      <Typography sx={{ m: 2, color: 'text.secondary' }}>
        No executive summary data available.
      </Typography>
    )

  return (
    <>
      {executive.map((item, idx) => (
        <Box key={idx} className="card-wrapper">
          <Typography sx={{ color: '#a78bfa', fontWeight: 600, mb: 1 }}>
            {item.title}
          </Typography>
          <Typography className="content-text">{item.content}</Typography>
        </Box>
      ))}
    </>
  )
}

// ------------------------------------------------------------
// OverviewCard: แสดงคำอธิบายเบื้องต้น
// รับข้อมูล description ผ่าน WebSocket (single object)
// ------------------------------------------------------------
interface OverviewData {
  description: string;
}

export function OverviewCard() {
  const { data, loading, error } = useSubscription<{ onOverviewUpdated: OverviewData[] }>(
    ON_OVERVIEW_UPDATED
  )

  const overviewList = useMemo(() => data?.onOverviewUpdated ?? [], [data])

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress size={24} />
      </Box>
    )

  if (error)
    return (
      <Typography color="error" sx={{ m: 2 }}>
        Error loading overview: {error.message}
      </Typography>
    )

  if (overviewList.length === 0)
    return (
      <Typography sx={{ m: 2, color: 'text.secondary' }}>
        No overview description available.
      </Typography>
    )

  return (
    <Box className="overviewAgent-card">
      {overviewList.map((item, index) => (
        <Typography key={index} className="content-text">
          {item.description}
        </Typography>
      ))}
    </Box>
  )
}

// ------------------------------------------------------------
// RecommendationCard: แสดงคำแนะนำด้านความปลอดภัย
// รับข้อมูล array ของ recommendation ผ่าน WebSocket
// ------------------------------------------------------------
interface RecommendationData {
  title: string;
  content: string;
}

export function RecommendationCard() {
  const { data, loading, error } = useSubscription<{ onRecommendationUpdated: RecommendationData[] }>(
    ON_RECOMMENDATION_UPDATED
  )

  const [debouncedRecommendation, setDebouncedRecommendation] = useState<RecommendationData[]>([])

  const recommendation = useMemo(() => data?.onRecommendationUpdated ?? [], [data])

  const debounceUpdate = useCallback(() => {
    const timer = setTimeout(() => {
      setDebouncedRecommendation(recommendation)
    }, 300)

    return () => clearTimeout(timer)
  }, [recommendation])

  useEffect(() => {
    const cleanup = debounceUpdate()
    return cleanup
  }, [debounceUpdate])

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <CircularProgress size={24} />
      </Box>
    )

  if (error)
    return (
      <Typography color="error" sx={{ m: 2 }}>
        Error loading recommendation: {error.message}
      </Typography>
    )

  if (!debouncedRecommendation.length)
    return (
      <Typography sx={{ m: 2, color: 'text.secondary' }}>
        No recommendation available.
      </Typography>
    )

  return (
    <>
      {debouncedRecommendation.map((rec, idx) => (
        <Box key={idx} className="card-wrapper">
          <Typography
            className="content-text">
            {rec.title}
          </Typography>
          <Typography className="content-text">{rec.content}</Typography>
        </Box>
      ))}
    </>
  )
}


// ------------------------------------------------------------
// TimelineProcess:
// - แสดง Timeline process แบบ dynamic
// - รับข้อมูลแบบ real-time ผ่าน WebSocket URL
// - ใช้ requestAnimationFrame สำหรับ animation progress
// ------------------------------------------------------------
const timelineStages: string[] = [
  'Received Alert',
  'Type Agent',
  'Analyze Root Cause',
  'Triage Status',
  'Action Taken',
  'Tool Status',
  'Recommendation',
]

// รูปแบบข้อมูลที่รับจาก WebSocket สำหรับ timeline
interface TimelineData {
  stage: string
  status: 'success' | 'error'
  errorMessage?: string
}

export function TimelineProcess() {
  const { data, loading, error } = useSubscription<{ onTimelineUpdated: TimelineData[] }>(
    ON_TIMELINE_UPDATED
  )

  const [debouncedTimeline, setDebouncedTimeline] = useState<TimelineData[] | null>(null)
  const [openError, setOpenError] = useState<{ stage: string; message: string } | null>(null)
  const [successStages, setSuccessStages] = useState<Set<string>>(new Set())
  const [errorStages, setErrorStages] = useState<Map<string, string>>(new Map())

  // debounce update
  const debounceUpdate = useCallback(() => {
    const timer = setTimeout(() => {
      const timeline = data?.onTimelineUpdated ?? null
      setDebouncedTimeline(timeline)

      const success = new Set<string>()
      const errorMap = new Map<string, string>()

      if (timeline && timeline.length > 0) {
        for (const item of timeline) {
          if (!timelineStages.includes(item.stage)) continue
          if (item.status === 'success') success.add(item.stage)
          if (item.status === 'error' && item.errorMessage) {
            errorMap.set(item.stage, item.errorMessage)
          }
        }
      }

      setSuccessStages(success)
      setErrorStages(errorMap)
    }, 300)

    return () => clearTimeout(timer)
  }, [data])

  useEffect(() => {
    const cleanup = debounceUpdate()
    return cleanup
  }, [debounceUpdate])

  if (error)
    return (
      <Typography color="error" sx={{ m: 2 }}>
        Error loading timeline: {error.message}
      </Typography>
    )

  return (
    <>
      {loading && !error && (
        <Box sx={{ my: 3, px: 2 }}>
          <Typography color="error" fontWeight="bold">
            Loading...
          </Typography>
        </Box>
      )}
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

            const nextStage = timelineStages[idx + 1]
            const isCurrentComplete = isSuccess
            const isNextPresent = successStages.has(nextStage) || errorStages.has(nextStage)
            const showProgressLine = isCurrentComplete && isNextPresent

            return (
              <Box key={stage} className="timeline-stage-wrapper">
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
                      aria-label={`Error at ${stage}`}
                    />
                  </Tooltip>
                ) : (
                  <Box className={dotClass} aria-label={`Stage ${stage}`} />
                )}

                <Typography component="span" className={labelClass}>
                  {stage}
                </Typography>

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

      <Dialog open={!!openError} onClose={() => setOpenError(null)}>
        <DialogTitle>Error in {openError?.stage}</DialogTitle>
        <DialogContent>
          <Typography color="error">{openError?.message}</Typography>
        </DialogContent>
      </Dialog>
    </>
  )
}



// ------------------------------------------------------------
// Footer และ RoleButton: สำหรับเปลี่ยนบริบทผู้ใช้งาน
// ไม่มีข้อมูลจาก WebSocket
// ------------------------------------------------------------
interface FooterProps {
  role: 'soc-dev' | 'customer' | 'testWS';
  setRole: (role: FooterProps['role']) => void;
}

interface RoleButtonProps {
  roleName: FooterProps['role'];
  currentRole: FooterProps['role'];
  onClick: (role: FooterProps['role']) => void;
  children: React.ReactNode;
}

export function RoleButton({ roleName, currentRole, onClick, children }: RoleButtonProps) {
  const isActive = roleName === currentRole;
  const className = [
    'role-button-base',
    isActive ? 'role-button-active' : 'role-button-inactive',
  ].join(' ');

  return (
    <Box
      component="button"
      type="button"
      aria-current={isActive ? 'page' : undefined}
      onClick={() => onClick(roleName)}
      className={className}
    >
      {children}
    </Box>
  );
}

export function Footer({ role, setRole }: FooterProps) {
  return (
    <Box component="footer" className="footer-wrapper">
      <Box className="footer-role-group">
        <Typography component="p">Role:</Typography>
        <RoleButton roleName="soc-dev" currentRole={role} onClick={setRole}>
          SOC & DEV
        </RoleButton>
        <RoleButton roleName="customer" currentRole={role} onClick={setRole}>
          CUSTOMER
        </RoleButton>
        <RoleButton roleName="testWS" currentRole={role} onClick={setRole}>
          CUSTOMER SUCCESS
        </RoleButton>
      </Box>
    </Box>
  );
}
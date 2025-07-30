export interface AIAgentSummaryInput {
  alert_id: string;
  overviewUpdated?: OverviewDataInput[];
  toolStatusUpdated?: ToolStatusInput[];
  recommendationUpdated?: RecommendationInput[];
  checklistItemUpdated?: ChecklistItemDataInput[];
  executiveItemUpdated?: ExecutiveItemDataInput[];
  attackTypeUpdated?: AttackTypeInput[];
  timelineUpdated?: TimelineDataInput[];
}

export interface OverviewDataInput {
  description: string;
}

export interface ToolStatusInput {
  name: string;
  status: string;
}

export interface RecommendationInput {
  description: string;
  content: string;
}

export interface ChecklistItemDataInput {
  title: string;
  content: string;
}

export interface ExecutiveItemDataInput {
  title: string;
  content: string;
}

export interface AttackTypeInput {
  tacticID: string;
  tacticName: string;
  confidence: number;
}

export interface TimelineDataInput {
  stage: string;
  status: string;
  errorMessage: string;
}

export type RawNATSMessage = Record<string, { alert_id: string; data: any }>;

/**
 * แปลงข้อมูล Raw NATS messages เป็น array ของ AIAgentSummaryInput
 * โดยจัดกลุ่มตาม alert_id และ map topic ให้เป็นฟิลด์ของ GraphQL input
 * รวมข้อมูลซ้ำในฟิลด์แบบ array ให้ครบถ้วน (ไม่ overwrite)
 * 
 * @param messages RawNATSMessage - object ที่ key เป็น topic, value เป็น { alert_id, data }
 * @returns AIAgentSummaryInput[]
 */
export function transformNATSDataToGraphQLInput(messages: RawNATSMessage): AIAgentSummaryInput[] {
  // เก็บข้อมูล grouped ตาม alert_id
  const groupedByAlert: Record<string, Partial<AIAgentSummaryInput>> = {};

  // Mapping topic → field key ใน AIAgentSummaryInput
  const topicToFieldKey: Record<string, keyof AIAgentSummaryInput> = {
    'agent.overview.updated': 'overviewUpdated',
    'agent.tools.updated': 'toolStatusUpdated',
    'agent.recommendation.updated': 'recommendationUpdated',
    'agent.checklist.updated': 'checklistItemUpdated',
    'agent.executive.updated': 'executiveItemUpdated',
    'agent.attack.updated': 'attackTypeUpdated',
    'agent.timeline.updated': 'timelineUpdated',
  };

  for (const topic in messages) {
    const { alert_id, data } = messages[topic];

    // สร้าง object ตาม alert_id ถ้ายังไม่มี
    if (!groupedByAlert[alert_id]) {
      groupedByAlert[alert_id] = { alert_id };
    }

    const input = groupedByAlert[alert_id];
    const fieldKey = topicToFieldKey[topic];

    if (!fieldKey) {
      // กรณี topic ไม่ตรงกับ mapping ใดๆ ให้ข้ามไป
      console.warn(`[transform] Unknown topic '${topic}' - skipped`);
      continue;
    }

    // ตรวจสอบ data ว่าเป็น array หรือไม่
    // ถ้าไม่ใช่ array ให้แปลงเป็น array 1 ตัว
    const dataArray = Array.isArray(data) ? data : [data];

    // รวมข้อมูลเก่ากับใหม่ (ถ้ามี) โดยใช้ spread operator
    if (input[fieldKey]) {
      input[fieldKey] = ([...(input[fieldKey] as unknown as object[]), ...dataArray] as any);
    } else {
      input[fieldKey] = dataArray as any;
    }
  }

  // แปลง groupedByAlert เป็น array และ return
  return Object.values(groupedByAlert) as AIAgentSummaryInput[];
}

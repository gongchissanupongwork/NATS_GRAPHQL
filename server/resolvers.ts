import { PubSub } from 'graphql-subscriptions'

// สร้าง instance ของ PubSub สำหรับจัดการ event-based subscription
export const pubsub = new PubSub()

/**
 * ฟังก์ชันช่วยแปลงข้อมูลให้เป็น array เสมอ
 * กรณีข้อมูลเป็น null/undefined หรือเป็น single object จะถูกแปลงเป็น array เพื่อความคงที่
 */
function wrapInArray<T>(data: T | T[] | null | undefined): T[] {
  if (Array.isArray(data)) return data
  if (data == null) return []
  return [data]
}

/**
 * จำลองฐานข้อมูลแบบ in-memory ด้วย Object
 * key = alert_id, value = ข้อมูล AIAgentSummary ตาม schema
 * ในโปรเจคจริง ควรเปลี่ยนเป็นฐานข้อมูลจริง (เช่น MongoDB, Postgres)
 */
const inMemoryDB: Record<string, any> = {}

export const resolvers = {
  Query: {
    /**
     * Query สำหรับดึงข้อมูล AIAgentSummary ตาม alert_id
     * คืนค่า object หรือ null ถ้าไม่เจอ
     */
    AIAgentSummary: (_: any, { alert_id }: { alert_id: string }) => {
      return inMemoryDB[alert_id] || null
    },

    /**
     * Query สำหรับดึงข้อมูล AIAgentSummary ทั้งหมดในฐานข้อมูล
     */
    AIAgentSummarys: () => Object.values(inMemoryDB),
  },

  Mutation: {
    /**
     * Mutation สำหรับแก้ไขข้อมูล AIAgentSummary
     * รองรับ action: ADD, UPDATE, DELETE
     * input: ข้อมูลแบบ AIAgentSummaryInput
     */
    AIAgentSummaryEdit: (
      _: any,
      {
        action,
        input,
      }: {
        action: 'ADD' | 'UPDATE' | 'DELETE'
        input: any
      }
    ) => {
      const { alert_id } = input

      // กำหนดข้อความตอบกลับ และสถานะเริ่มต้น
      let message = ''
      let success = false

      // ทำให้แน่ใจว่าแต่ละ field เป็น array (ป้องกัน null/undefined หรือ object เดี่ยว)
      const normalizedInput = {
        alert_id,
        overviewUpdated: wrapInArray(input.overviewUpdated),
        toolStatusUpdated: wrapInArray(input.toolStatusUpdated),
        recommendationUpdated: wrapInArray(input.recommendationUpdated),
        checklistItemUpdated: wrapInArray(input.checklistItemUpdated),
        executiveItemUpdated: wrapInArray(input.executiveItemUpdated),
        attackTypeUpdated: wrapInArray(input.attackTypeUpdated),
        timelineUpdated: wrapInArray(input.timelineUpdated),
      }

      // ดำเนินการตาม action ที่ส่งมา
      switch (action) {
        case 'ADD':
          // กรณีเพิ่มใหม่ หาก alert_id มีอยู่แล้วแจ้งเตือน
          if (inMemoryDB[alert_id]) {
            message = `Alert ${alert_id} already exists.`
          } else {
            inMemoryDB[alert_id] = normalizedInput
            message = `Alert ${alert_id} added.`
            success = true
          }
          break

        case 'UPDATE':
          // กรณีอัปเดต รวมข้อมูลใหม่กับข้อมูลเดิม (merge)
          inMemoryDB[alert_id] = {
            ...inMemoryDB[alert_id],
            ...normalizedInput,
          }
          message = `Alert ${alert_id} updated.`
          success = true
          break

        case 'DELETE':
          // กรณีลบ ถ้าเจอ alert_id ให้ลบออก
          if (inMemoryDB[alert_id]) {
            delete inMemoryDB[alert_id]
            message = `Alert ${alert_id} deleted.`
            success = true
          } else {
            message = `Alert ${alert_id} not found.`
          }
          break

        default:
          message = 'Invalid action type.'
      }

      // ถ้าไม่ใช่การลบ ให้ส่ง event แจ้งเตือน subscription ที่เกี่ยวข้อง
      if (action !== 'DELETE') {
        pubsub.publish(`onOverviewUpdated:${alert_id}`, {
          onOverviewUpdated: normalizedInput.overviewUpdated,
        })
        pubsub.publish(`onToolStatusUpdated:${alert_id}`, {
          onToolStatusUpdated: normalizedInput.toolStatusUpdated,
        })
        pubsub.publish(`onRecommendationUpdated:${alert_id}`, {
          onRecommendationUpdated: normalizedInput.recommendationUpdated,
        })
        pubsub.publish(`onChecklistItemUpdated:${alert_id}`, {
          onChecklistItemUpdated: normalizedInput.checklistItemUpdated,
        })
        pubsub.publish(`onExecutiveItemUpdated:${alert_id}`, {
          onExecutiveItemUpdated: normalizedInput.executiveItemUpdated,
        })
        pubsub.publish(`onAttackTypeUpdated:${alert_id}`, {
          onAttackTypeUpdated: normalizedInput.attackTypeUpdated,
        })
        pubsub.publish(`onTimelineUpdated:${alert_id}`, {
          onTimelineUpdated: normalizedInput.timelineUpdated,
        })
      }

      // คืนค่าผลลัพธ์พร้อมสถานะและข้อความ
      return {
        success,
        message,
        data: inMemoryDB[alert_id] || null,
      }
    },
  },

  Subscription: {
    // Subscription แต่ละ field ตาม alert_id เฉพาะกลุ่มข้อมูลนั้น ๆ
    onOverviewUpdated: {
      subscribe: (_: any, { alert_id }: { alert_id: string }) =>
        pubsub.asyncIterator(`onOverviewUpdated:${alert_id}`),
      resolve: (payload: any) => wrapInArray(payload.onOverviewUpdated),
    },
    onToolStatusUpdated: {
      subscribe: (_: any, { alert_id }: { alert_id: string }) =>
        pubsub.asyncIterator(`onToolStatusUpdated:${alert_id}`),
      resolve: (payload: any) => wrapInArray(payload.onToolStatusUpdated),
    },
    onRecommendationUpdated: {
      subscribe: (_: any, { alert_id }: { alert_id: string }) =>
        pubsub.asyncIterator(`onRecommendationUpdated:${alert_id}`),
      resolve: (payload: any) => wrapInArray(payload.onRecommendationUpdated),
    },
    onChecklistItemUpdated: {
      subscribe: (_: any, { alert_id }: { alert_id: string }) =>
        pubsub.asyncIterator(`onChecklistItemUpdated:${alert_id}`),
      resolve: (payload: any) => wrapInArray(payload.onChecklistItemUpdated),
    },
    onExecutiveItemUpdated: {
      subscribe: (_: any, { alert_id }: { alert_id: string }) =>
        pubsub.asyncIterator(`onExecutiveItemUpdated:${alert_id}`),
      resolve: (payload: any) => wrapInArray(payload.onExecutiveItemUpdated),
    },
    onAttackTypeUpdated: {
      subscribe: (_: any, { alert_id }: { alert_id: string }) =>
        pubsub.asyncIterator(`onAttackTypeUpdated:${alert_id}`),
      resolve: (payload: any) => wrapInArray(payload.onAttackTypeUpdated),
    },
    onTimelineUpdated: {
      subscribe: (_: any, { alert_id }: { alert_id: string }) =>
        pubsub.asyncIterator(`onTimelineUpdated:${alert_id}`),
      resolve: (payload: any) => wrapInArray(payload.onTimelineUpdated),
    },
  },
}

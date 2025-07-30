import { PubSub } from 'graphql-subscriptions';
import { loadDB, saveDB } from './db';
import merge from 'deepmerge';

// สร้าง instance สำหรับจัดการ subscription event
export const pubsub = new PubSub();

/**
 * แปลงข้อมูลให้เป็น Array เสมอ
 * รองรับกรณีข้อมูลเป็น null, undefined หรือเป็น object เดี่ยว
 */
function wrapInArray<T>(data: T | T[] | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data == null) return [];
  return [data];
}

/**
 * ฟังก์ชันสำหรับ merge array โดยแทนที่ (replace) array เดิมด้วย array ใหม่
 * เพื่อป้องกัน concat หรือซ้ำซ้อนข้อมูล
 */
function arrayReplace(destinationArray: any[], sourceArray: any[]) {
  return sourceArray.length > 0 ? sourceArray : destinationArray;
}

/**
 * ตัวแปร Promise queue สำหรับจัดการการเขียนไฟล์ทีละงาน (atomic)
 * ป้องกัน race condition ในการเขียนไฟล์
 */
let writeLock = Promise.resolve();

/**
 * ฟังก์ชันอัปเดตฐานข้อมูลแบบ atomic ด้วย queue lock
 * updateFn คือ callback รับ db ปัจจุบันแล้วคืน db ที่แก้ไขแล้ว
 */
async function writeDBAtomic(updateFn: (db: Record<string, any>) => Record<string, any>) {
  // รอให้ write งานก่อนหน้าเสร็จ
  await writeLock;

  let releaseLock: () => void;
  writeLock = new Promise(resolve => {
    releaseLock = resolve;
  });

  try {
    const db = await loadDB();  // โหลด DB ปัจจุบัน
    const newDB = updateFn(db); // แก้ไข DB ตาม callback
    await saveDB(newDB);        // บันทึกลงไฟล์
    releaseLock!();             // ปลดล็อค queue
    return newDB;
  } catch (error) {
    releaseLock!();
    throw error;
  }
}

export const resolvers = {
  Query: {
    // ดึงข้อมูล alert_id เดียว
    AIAgentSummary: async (_: any, { alert_id }: { alert_id: string }) => {
      const db = await loadDB();
      return db[alert_id] || null;
    },
    // ดึงข้อมูลทั้งหมดเป็น array
    AIAgentSummarys: async () => {
      const db = await loadDB();
      return Object.values(db);
    },
  },

  Mutation: {
    // เพิ่ม, แก้ไข, หรือลบ alert data
    AIAgentSummaryEdit: async (
      _: any,
      { action, input }: { action: 'ADD' | 'UPDATE' | 'DELETE'; input: any }
    ) => {
      const { alert_id } = input;
      let message = '';
      let success = false;
      let savedData = null;

      // Normalize ทุก field ให้เป็น array เสมอ
      const normalizedInput = {
        alert_id,
        overviewUpdated: wrapInArray(input.overviewUpdated),
        toolStatusUpdated: wrapInArray(input.toolStatusUpdated),
        recommendationUpdated: wrapInArray(input.recommendationUpdated),
        checklistItemUpdated: wrapInArray(input.checklistItemUpdated),
        executiveItemUpdated: wrapInArray(input.executiveItemUpdated),
        attackTypeUpdated: wrapInArray(input.attackTypeUpdated),
        timelineUpdated: wrapInArray(input.timelineUpdated),
      };

      try {
        // อัปเดต DB แบบ atomic พร้อม queue lock ป้องกันเขียนทับพร้อมกัน
        const updatedDB = await writeDBAtomic(db => {
          switch (action) {
            case 'ADD':
              if (db[alert_id]) {
                message = `Alert ${alert_id} already exists.`;
                success = false;
                return db;
              }
              db[alert_id] = normalizedInput;
              message = `Alert ${alert_id} added.`;
              success = true;
              break;

            case 'UPDATE':
              if (!db[alert_id]) {
                // สร้างใหม่ถ้ายังไม่มีข้อมูลเดิม
                db[alert_id] = normalizedInput;
              } else {
                // Merge ข้อมูลแทนที่ array เดิมด้วย array ใหม่ (ไม่ concat)
                db[alert_id] = merge(db[alert_id], normalizedInput, { arrayMerge: arrayReplace });
              }
              message = `Alert ${alert_id} updated.`;
              success = true;
              break;

            case 'DELETE':
              if (db[alert_id]) {
                delete db[alert_id];
                message = `Alert ${alert_id} deleted.`;
                success = true;
              } else {
                message = `Alert ${alert_id} not found.`;
                success = false;
              }
              break;

            default:
              message = 'Invalid action type.';
              success = false;
              break;
          }
          return db;
        });

        savedData = action !== 'DELETE' ? updatedDB[alert_id] : null;

        // เผยแพร่ event สำหรับ subscription ถ้าไม่ใช่การลบข้อมูล
        if (action !== 'DELETE') {
          pubsub.publish(`onOverviewUpdated:${alert_id}`, { onOverviewUpdated: normalizedInput.overviewUpdated });
          pubsub.publish(`onToolStatusUpdated:${alert_id}`, { onToolStatusUpdated: normalizedInput.toolStatusUpdated });
          pubsub.publish(`onRecommendationUpdated:${alert_id}`, { onRecommendationUpdated: normalizedInput.recommendationUpdated });
          pubsub.publish(`onChecklistItemUpdated:${alert_id}`, { onChecklistItemUpdated: normalizedInput.checklistItemUpdated });
          pubsub.publish(`onExecutiveItemUpdated:${alert_id}`, { onExecutiveItemUpdated: normalizedInput.executiveItemUpdated });
          pubsub.publish(`onAttackTypeUpdated:${alert_id}`, { onAttackTypeUpdated: normalizedInput.attackTypeUpdated });
          pubsub.publish(`onTimelineUpdated:${alert_id}`, { onTimelineUpdated: normalizedInput.timelineUpdated });
        }
      } catch (err) {
        message = `Error updating DB: ${err instanceof Error ? err.message : String(err)}`;
        success = false;
      }

      return {
        success,
        message,
        data: savedData,
      };
    },
  },

  Subscription: {
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
};

import { promises as fs } from 'fs';
import path from 'path';

const DB_FILE_PATH = path.resolve(__dirname, '../data/ai_agent_db.json');

export async function loadDB(): Promise<Record<string, any>> {
  try {
    const content = await fs.readFile(DB_FILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    // ไฟล์ยังไม่มี หรืออ่านไม่ได้ คืนค่า object ว่างแทน
    return {};
  }
}

export async function saveDB(data: Record<string, any>): Promise<void> {
  // บันทึกไฟล์แบบจัดรูปแบบ (indent 2 spaces)
  await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

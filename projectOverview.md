[1]  
    ปัญหาที่พบ (Problems)
    ├─ ช่องว่างความรู้ (Knowledge Gap)
    │     ├─ ทีม SOC ไม่ทราบนโยบายหรือการตั้งค่าพิเศษของลูกค้าแต่ละราย
    │     ├─ ต้องเสียเวลาศึกษาเอกสารหรือสอบถามซ้ำ ๆ ก่อนวิเคราะห์เหตุการณ์
    │     └─ ข้อมูลทางเทคนิคส่วนใหญ่อยู่ในมือ Tech Team แต่ส่งต่อไม่ครอบคลุม
    ├─ งานแมนนวลสูง (Manual Overhead)
    │     ├─ นักวิเคราะห์ต้องเปิดดู Log จากหลายแหล่ง (Firewall, IDS, SIEM)
    │     ├─ กระบวนการกรอง False‑Positive/False‑Negative ซ้ำซ้อน & ใช้เวลานาน
    │     └─ ไม่มีการเก็บผลลัพธ์การวิเคราะห์อย่างเป็นระบบ ทำให้ต้องทำซ้ำ
    ├─ สื่อสารข้ามทีมไม่ราบรื่น (Cross‑Team Misalignment)
    │     ├─ Tech Team ให้ข้อมูลเชิงลึก (ระบบ, โปรโตคอล) แต่ Customer Success ต้องการภาษาง่าย
    │     ├─ การแปลงภาษาเทคนิคลึกเป็นสรุปธุรกิจยังพึ่งพามนุษย์
    │     └─ เกิดความเข้าใจผิดหรือข้อมูลตกหล่นระหว่าง handover
    └─ เวลาตอบสนองช้า (Slow Response)
        ├─ การ Triage ด้วยมือใช้เวลาหลายชั่วโมงหรือวัน
        ├─ ภัยคุกคามอาจลุกลามก่อนถึงมือผู้เชี่ยวชาญ
        └─ SLA การตอบสนองลูกค้าบางรายไม่เป็นไปตามมาตรฐาน
-------->

[2] โครงการนี้ช่วยยังไง (Solution Overview)
    ├─ Automate Investigation ด้วย AI Agents
    │     ├─ ลดขั้นตอน Manual Triage เช่น การเปิด Log ทีละระบบ
    │     ├─ ใช้โมเดล AI จำแนกประเภทภัยเบื้องต้นแทน rule‑based ทั้งหมด
    │     └─ ประหยัดเวลา 30–50% ในขั้นตอนเปิดดูข้อมูลเบื้องต้น
    ├─ Bridge Knowledge Gap ให้ทุกทีมเข้าใจบริบทเดียวกัน
    │     ├─ ContextAgent รวบรวมข้อมูลเชิงเทคนิค (Metadata, Logs) และธุรกิจ (นโยบายลูกค้า)
    │     ├─ LLM สร้างสรุปภาษาง่ายพร้อมคำแนะนำ Action Items
    │     └─ ลดความคลาดเคลื่อนระหว่าง Technical Report กับ Customer Summary
    ├─ Faster Triage & Response ผ่าน NATS (Async Messaging)
    │     ├─ คิวข้อความไม่บล็อกกระบวนการ เริ่มวิเคราะห์ทันทีที่รับ Log
    │     ├─ รองรับ Throughput สูง (พัน–หมื่นเหตุการณ์ต่อชั่วโมง)
    │     └─ แยก Service แต่ละส่วน (ingestion, classification, enrichment) ชัดเจน
    └─ Customer‑Specific Recommendations ปรับตามสภาพแวดล้อม
          ├─ RAG เลือกข้อมูลเฉพาะตามเครื่องมือที่ลูกค้าใช้จริง (EDR, Proxy, Firewall)
          ├─ Prompt Logic สร้างคำถามเชิงบริบท เช่น “นโยบายการบล็อคไฟล์นามสกุล .exe คืออะไร?”
          └─ ให้คำแนะนำเหมาะสม เช่น “เพิ่ม rule บล็อคการดาวน์โหลดไฟล์ .exe จากภายนอก”
-------->

[3] Team Members & Roles  
    ├─ Pimmada T. (Product Manager Intern)  
    │     ├─ ประสานงานโครงการ, รวบรวม User Requirements  
    │     └─ วางแผนระบบ, ติดตาม Task Progress  
    ├─ Natasha L., Nattawat S., Tanakorn Y. (AI Developers)  
    │     ├─ ฝึก/ปรับแต่ง TypeAgent & ContextAgent  
    │     ├─ ออกแบบ Prompt Logic & RAG Integration  
    │     └─ Implement Retrieval‑Augmented Generation (RAG)  
    ├─ Chissanupong S. (Fullstack Developer)  
    │     ├─ พัฒนา Frontend Dashboard & Backend Services  
    │     ├─ ออกแบบ Database Schema & GraphQL API  
    │     └─ Integrate NATS Messaging (Publisher/Subscriber)  
    └─ Akira S. (DevOps Engineer)  
          ├─ จัดการ Deployment ใน Docker Containers  
          ├─ ดูแล NATS Messaging Infrastructure  
          └─ ตั้งค่า Database Connections & Environments 
-------->

[4] System Architecture & Workflow  
    1. Alert Ingestion via NATS  
       ├─ รับ raw security alerts (Log) ผ่าน NATS message bus  
       ├─ NATS ทำหน้าที่ Bus กลาง ส่งข้อความแบบ Async ไม่บล็อกกระบวนการ  
       └─ ส่ง Log ดิบเข้าสู่ Processing Pipeline แบบ Asynchronous  
    -------->  
    2. TypeAgent (Threat Classification)  
       ├─ Subscribe “alerts.raw”
       ├─ ใช้ Rule‑based Logic หรือ ML Model Inference ในการจำแนก Phishing, Malware, Unauthorized Access  
       ├─ เพิ่มฟิลด์ “alert_type” เพื่อบันทึกผลการจำแนก
       └─ Publish ไปยัง Subject “alerts.classified”  
    -------->  
    3. ContextAgent (Contextual Enrichment)  
       ├─ Subscribe “alerts.classified”  
       ├─ Query GraphQL API เพื่อดึง:  
       │     ├─ Device Metadata (model, OS, location)  
       │     ├─ Incident History (severity, timestamp)  
       │     └─ Defense Config (EDR settings, SIEM rules, firewall policies)  
       ├─ ผสาน Log + Context เป็น “enriched_alert”  
       └─ Publish ไปยัง “alerts.enriched”  
    -------->  
    4. RAG Layer (Retrieval‑Augmented Generation)  
       ├─ Subscribe “alerts.enriched”  
       ├─ ประเมิน alert_type & investigation objective  
       ├─ ดึงข้อมูลจาก Knowledge Base (playbooks, SOPs), DB logs, Document Store  
       ├─ สร้าง Prompt Template (Context Summary + Key Questions)  
       └─ Publish Prompt ไปยัง “alerts.prompts”  
    -------->  
    5. LLM (Large Language Model)  
       ├─ Subscribe “alerts.prompts”  
       ├─ ใช้ GPT‑4 (หรือเทียบเท่า) วิเคราะห์เชิงลึก  
       ├─ สร้างผลลัพธ์ 2 ชุด:  
       │     ├─ Internal Analysis (technical details, evidence)  
       │     └─ Customer‑Friendly Summary (plain language, action items)  
       └─ Publish ผลลัพธ์ไปยัง “alerts.analysis”  
    -------->  
    6. Output & Presentation  
       ├─ Subscribe “alerts.analysis”  
       ├─ ส่งผ่าน NATS ไปยัง:  
       │     ├─ UI Dashboard: แสดงแผงควบคุมและสถานะเรียลไทม์    
       │     ├─ SOC Platform: บันทึกเป็น Ticket / Incident ในระบบจัดการภายใน
       |     └─ Email/Portal Alerts ให้ลูกค้าทราบ status & recommendations
       └─ เก็บ Log และผลลัพธ์ใน Database เพื่อการ Auditing & Reporting  
-------->

[5] Technology Stack  
    ├─ Backend: Node.js (JavaScript/TypeScript)  
    ├─ Message Broker: NATS (asynchronous, scalable)  
    ├─ GraphQL – Query Contextual Data แบบ Structured
    ├─ AI/ML Components:  
    │     ├─ TypeAgent: Rule‑based + ML Classifier (Scikit‑Learn, TensorFlow)  
    │     ├─ ContextAgent: RAG Retriever (Haystack, LangChain)  
    │     ├─ RAG Layer: internal Retriever + Prompt Builder  
    │     └─ LLM: GPT‑4 via OpenAI API (reasoning & summarization)  
    └─ Deployment & Ops:  
          ├─ Docker & Kubernetes (containerization, scaling)  
          ├─ CI/CD: GitHub Actions → Docker Registry → K8s  
          └─ Monitoring & Logging: Prometheus, Grafana, ELK Stack
-------->

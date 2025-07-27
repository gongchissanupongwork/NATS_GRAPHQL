"BACKEND" (run command on root)

run server dev mode
yarn dev

run server normal(BACKEND_SUB)
yarn start

run pubilsher (MockdataPUB_NATS)
yarn pub //ยิงทุก topic ก่อน แล้ว random ต่อ
yarn pub-all //ยิงทุก topic 1 รอบ แล้วปิด
yarn pub-random //ยิง random ทุก 2 วิ นาน 10 วิ แล้วปิด (ปรับได้ใน pubilsher.ts)
yarn pub-random-interval //ยิง random ทุก 1 วิ นาน 15 วิ (ปรับได้ใน script package.json)

run client (test CIL)
yarn client

----------------------------------------------------------------

"FRONTEND"

run frontend
cd .\frontend_agent\
npm run dev

Spanler V4.1 A+B 真功能版 - 一期Web

包含：
- 主站 spanler.com 78页骨架
- 子站 buy.spanler.com 电话号商城
- 通配符 *.buy.spanler.com Worker
- D1 phone_numbers表 + Marketplace表
- 新版AI客服 Groq Llama (无豆包)

本地跑：
npm install
npm run dev
http://localhost:3000  -> 主站
http://localhost:3000/buy/  -> 子站
模拟二级域名：http://localhost:3000/buy/number/2135551234

部署到 Cloudflare：
1. Pages 连接 GitHub
2. D1 建库，执行 d1/schema_v41.sql
3. R2 建两个桶 spanler-media, spanler-logs
4. Pages Env Vars 填 GROQ_API_KEY
5. DNS 加 *.buy CNAME到 Pages域名

电话号流程：
Sveltia admin 上传CSV -> D1 phone_numbers -> Worker *.buy解析 -> 落地页

# Quickstart: 員工課程申請與審核流程

**Feature**: 002-course-enrollment
**Date**: 2026-04-22

## 前置條件

- 001-hr-course-mgmt 已完成並有課程與梯次資料（ACTIVE 課程 + OPEN 梯次）
- Node.js 20+
- PostgreSQL 15+（同 001 使用的資料庫）
- `.env.local` 已設定（新增 Email 相關變數）

## 新增環境變數

```bash
# .env.local（新增至 001 的環境變數基礎上）
SMTP_HOST="smtp.company.com"
SMTP_PORT="587"
SMTP_USER="system@company.com"
SMTP_PASS="your-smtp-password"
SMTP_FROM="教育訓練系統 <system@company.com>"
CRON_SECRET="your-cron-secret"
```

## 安裝與初始化

```bash
# 在 app/ 目錄執行
cd app

# 安裝新增依賴（Nodemailer）
npm install nodemailer @types/nodemailer

# 執行新 migration（新增 Employee、CourseEnrollment、WaitlistEntry、NotificationLog）
npx prisma migrate dev --name add-enrollment-models

# 植入測試員工資料（employee、manager、hr 各一個測試帳號）
npx prisma db seed

# 啟動開發伺服器
npm run dev
```

## 驗證功能正常

### Step 1：員工報名（有名額）

1. 以員工帳號（AD 帳號）登入 `http://localhost:3000`
2. 進入「課程瀏覽」→ 選擇 ACTIVE 課程與 OPEN 梯次
3. 點擊「申請報名」→ 確認送出
4. 確認：「我的申請」出現此申請，狀態為「待主管審核」

### Step 2：主管審核核准

1. 以主管帳號登入（該員工的直屬主管）
2. 進入「待審核申請」→ 看到員工申請
3. 點擊「核准」
4. 確認：申請狀態更新為「待 HR 核准」，HR 收到通知 Email

### Step 3：HR 最終核准

1. 以 HR 帳號登入
2. 進入「HR 核准清單」→ 看到待核准申請
3. 點擊「核准」
4. 確認：申請狀態更新為「已確認」；員工收到「報名確認」Email；梯次報名人數 +1

### Step 4：名額已滿，等待名單

1. 建立名額為 1 的測試梯次（在 001 HR 後台）
2. 員工 A 報名→主管審核→HR 核准（名額佔用）
3. 員工 B 送出相同梯次申請
4. 確認：員工 B 收到「已加入等待名單」Email；等待名單顯示員工 B，`position = 1`

### Step 5：等待名單遞補

1. 員工 A 申請取消（HR 確認取消）
2. 確認：員工 B 收到「名額遞補」Email，確認期限 48 小時
3. 員工 B 點擊確認→申請進入主管審核流程
4. 確認：等待名單條目狀態更新為 `CONFIRMED`

### Step 6：主管退回

1. 員工送出申請（Step 1）
2. 主管選擇「退回」並填寫原因
3. 確認：員工收到退回通知 Email，包含退回原因；申請狀態為「已退回」

## 執行單元測試

```bash
cd app
# 執行所有測試
npm run test

# 執行 enrollment 模組測試
npm run test -- tests/unit/enrollments
```

## 觸發 Cron Job（本地測試）

```bash
# 測試等待名單逾期掃描
curl -X POST http://localhost:3000/api/cron/waitlist-expiry \
  -H "Authorization: Bearer ${CRON_SECRET}"

# 測試通知重試
curl -X POST http://localhost:3000/api/cron/notification-retry \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## 專案結構（此功能相關）

```
app/src/
├── app/
│   ├── (employee)/
│   │   └── courses/
│   │       ├── page.tsx              # 課程瀏覽（員工）
│   │       └── [id]/sessions/[sessionId]/enroll/page.tsx
│   ├── (manager)/
│   │   └── enrollments/
│   │       └── page.tsx              # 待審核清單
│   ├── (hr)/
│   │   └── enrollments/
│   │       └── page.tsx              # HR 核准清單
│   └── api/
│       ├── enrollments/              # 員工申請 API
│       ├── manager/enrollments/      # 主管審核 API
│       ├── hr/enrollments/           # HR 核准 API
│       ├── hr/notifications/         # 通知管理 API
│       └── cron/                     # Cron Job API
└── lib/
    └── enrollments/
        ├── service.ts
        ├── waitlist-service.ts
        ├── notification-service.ts
        ├── validations.ts
        └── actions.ts
```

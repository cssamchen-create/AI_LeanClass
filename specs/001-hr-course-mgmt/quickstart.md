# Quickstart: HR 課程管理

**Feature**: 001-hr-course-mgmt
**Date**: 2026-04-22

## 前置條件

- Node.js 20+
- PostgreSQL 15+（本地或 Docker）
- 專案根目錄已設定 `.env.local`

## 環境變數

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/leanclass"
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
LDAP_URI="ldap://your-ad-server"
LDAP_BASE_DN="DC=company,DC=com"
```

## 安裝與啟動

```bash
# 安裝依賴
npm install

# 初始化資料庫 schema
npx prisma migrate dev

# 種植初始類別資料
npx prisma db seed

# 啟動開發伺服器
npm run dev
```

## 驗證功能正常

1. 開啟 `http://localhost:3000`，使用 AD 帳號登入
2. 進入 HR 後台 → 課程管理
3. 建立一門測試課程（名稱：測試課程、類別：法治、時數：2）
4. 確認課程出現於列表
5. 為課程建立一個梯次（日期：任意未來日期、地點：測試地點、名額：10）
6. 確認梯次狀態為「開放」

## 執行單元測試

```bash
# 執行所有測試
npm run test

# 執行特定模組測試
npm run test -- src/lib/courses
```

## 專案結構（此功能相關）

```
src/
├── app/
│   ├── (hr)/
│   │   └── courses/
│   │       ├── page.tsx          # 課程列表頁
│   │       ├── new/page.tsx      # 建立課程頁
│   │       └── [id]/
│   │           ├── page.tsx      # 課程詳細頁
│   │           ├── edit/page.tsx # 編輯課程頁
│   │           └── sessions/
│   │               └── new/page.tsx  # 建立梯次頁
│   └── api/
│       ├── courses/
│       │   ├── route.ts          # GET /api/courses, POST /api/courses
│       │   └── [id]/
│       │       ├── route.ts      # GET, PUT /api/courses/[id]
│       │       ├── status/route.ts    # PATCH status
│       │       └── sessions/
│       │           ├── route.ts       # POST session
│       │           └── [sessionId]/
│       │               ├── route.ts   # PUT session
│       │               └── cancel/route.ts  # PATCH cancel
│       └── course-categories/
│           └── route.ts          # GET categories
├── lib/
│   └── courses/
│       ├── actions.ts            # Server Actions
│       ├── service.ts            # 業務邏輯（單元測試覆蓋）
│       └── validations.ts        # Zod schemas
└── prisma/
    ├── schema.prisma
    └── seed.ts
```

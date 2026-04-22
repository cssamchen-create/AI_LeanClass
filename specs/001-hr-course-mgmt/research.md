# Research: HR 課程管理

**Feature**: 001-hr-course-mgmt
**Date**: 2026-04-22

---

## 1. ORM 選型

**Decision**: Prisma

**Rationale**:
- 與 Next.js App Router 原生整合，支援 Server Actions 與 API Routes
- TypeScript 型別自動生成，符合 constitution strict mode 要求
- Schema migration 機制完整（prisma migrate），適合 PostgreSQL

**Alternatives considered**:
- Drizzle ORM：輕量但生態系較新，文件較少
- TypeORM：設定較繁瑣，decorator 與 Next.js Server Components 相容性差

---

## 2. 驗證與表單處理

**Decision**: Zod（schema 驗證） + React Hook Form（表單管理）

**Rationale**:
- Zod 可在前後端共用同一份驗證 schema，配合 Next.js Server Actions 型別安全
- React Hook Form 效能優異，與 Zod 整合透過 `@hookform/resolvers` 完成
- 符合 constitution 禁止 `any`、啟用 strict mode 的要求

**Alternatives considered**:
- Yup：功能相近，但 TypeScript 支援不如 Zod 完整
- 純 HTML5 驗證：無法處理複雜業務規則（如集團內課程邏輯）

---

## 3. SSO / 認證

**Decision**: NextAuth.js v5（Auth.js）配合 LDAP/AD provider

**Rationale**:
- 官方支援 Next.js App Router，Session 管理完整
- 支援 Credentials provider 可接 LDAP（透過 `ldapts` 套件）
- Phase 1 只需 SSO，無需備用登入

**Alternatives considered**:
- Clerk：managed service，但需要對外傳送使用者資料，有合規疑慮
- 自建 JWT：維護成本高，不符合 YAGNI 原則

---

## 4. 資料庫 Schema 策略

**Decision**: Soft delete（status 欄位）取代實體刪除

**Rationale**:
- Constitution 要求所有記錄永久保存（V. 資料永久保存）
- 課程有報名記錄時不可刪除，改為「下架（inactive）」狀態
- 梯次取消為狀態變更（cancelled），不刪除資料列

**Alternatives considered**:
- 實體刪除：違反 constitution，排除

---

## 5. API 設計策略

**Decision**: Next.js App Router API Routes（Route Handlers）+ Server Actions 混用

**Rationale**:
- 列表查詢、複雜篩選用 Route Handlers（GET）
- 表單提交（建立/編輯）用 Server Actions，減少 client-side JS
- 符合 Next.js App Router 最佳實踐

**Alternatives considered**:
- 純 REST API（全部 Route Handlers）：可行，但 Server Actions 更適合表單操作
- tRPC：類型安全佳，但增加學習成本，solo 開發不必要

---

## 6. 測試策略

**Decision**: Vitest（單元測試） + Testing Library（元件測試，選擇性）

**Rationale**:
- Vitest 與 Vite/Next.js 生態相容，速度快於 Jest
- 業務邏輯層（年度時數計算、梯次狀態邏輯）優先覆蓋
- Constitution 要求 services/utils/計算邏輯有對應單元測試

**Alternatives considered**:
- Jest：Next.js 官方文件使用，但 Vitest 設定更簡單

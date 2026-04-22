<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0 (initial ratification)
Modified principles: N/A (new)
Added sections:
  - Core Principles (5 principles)
  - Technical Constraints
  - Development Workflow
  - Governance
Removed sections: N/A
Templates reviewed:
  - .specify/templates/plan-template.md ✅ compatible
  - .specify/templates/spec-template.md ✅ compatible
  - .specify/templates/tasks-template.md ✅ compatible
Deferred TODOs:
  - 99.5% 可用率與響應式設計列為 Phase 2+ 目標，Phase 1 不強制
-->

# 教育訓練系統 Constitution

## Core Principles

### I. Next.js 全端單一專案

本系統以 **Next.js（App Router）+ TypeScript + Tailwind CSS** 為唯一技術棧。
前後端 MUST 共存於同一個 Next.js 專案中，不得引入獨立的後端服務或額外框架。

- 所有頁面與 API Routes MUST 使用 TypeScript，不接受 `.js` 檔案
- 樣式 MUST 使用 Tailwind CSS；禁止引入 CSS-in-JS 或其他 CSS 框架
- 共用型別定義 MUST 放置於 `src/types/` 目錄，前後端共享
- 資料庫存取 MUST 僅在 Server Components 或 API Routes 中進行，禁止在 Client Components 直接存取

### II. 角色驅動存取控制

系統的所有功能與介面 MUST 以使用者角色為設計起點。系統定義四個角色：**員工（Employee）、Team 主管（Team Manager）、部級主管（Dept Manager）、HR**。

- 每個功能需求 MUST 明確標記適用角色
- 存取控制 MUST 在 Server 端驗證，Client 端 UI 隱藏僅作輔助
- SSO（AD/LDAP）為 Phase 1 唯一登入方式；SSO 故障期間系統停止服務，此為已知取捨
- 離職員工帳號 MUST 停用但資料永久保留，不得刪除

### III. 分階段交付（Phase-Based Delivery）

功能開發 MUST 依照三個階段推進，每個 Phase 須可獨立部署與驗收。

- **Phase 1**：核心功能——課程管理、訓練計畫、報名與審核、測驗（選擇題）、基本報表、Email 通知
- **Phase 2**：擴充功能——知識庫、進階報表、響應式優化、99.5% 可用率目標、服務承諾管理
- **Phase 3**：進階功能——SCORM/xAPI 匯入、影片教材、多語系支援

跨 Phase 的功能 MUST NOT 提前實作；若需提前，須更新本 Constitution 並記錄原因。

### IV. 品質門檻（Quality Gates）

所有進入主線的程式碼 MUST 通過以下品質門檻：

- **Code Review**：所有 PR MUST 經過自我審查（checklist）後方可合併，即使獨自開發
- **單元測試**：業務邏輯層（services、utils、計算邏輯）MUST 有對應單元測試
- **型別安全**：禁止使用 `any`；TypeScript strict mode MUST 啟用
- 測試覆蓋範圍以業務邏輯為優先，UI 元件測試為選擇性

### V. 資料永久保存

系統所有業務記錄（申請、審核、結案、測驗、承諾書、通知）MUST 永久保存。

- 系統 MUST NOT 設計任何自動刪除或資料清除機制
- 每日備份，RPO ≤ 24 小時
- Email 通知失敗 MUST 重試最多 3 次（間隔 5/15/30 分鐘），仍失敗則記錄錯誤供 HR 手動補發

## Technical Constraints

- **語言/版本**：TypeScript（strict mode），Next.js App Router
- **樣式**：Tailwind CSS，響應式設計（桌機優先，Phase 2 完整行動裝置優化）
- **資料庫**：PostgreSQL
- **認證**：SSO / AD / LDAP（Phase 1 唯一方式）
- **部署**：Git-based CI/CD，部署至 Vercel
- **報表匯出**：Excel（.xlsx）與 PDF，不支援其他格式
- **介面語言**：繁體中文（多語系為 Phase 3 選項）

## Development Workflow

- **分支策略**：每個功能開一個 feature branch，完成後 PR 合併至 main
- **PR 規範**：PR 描述 MUST 包含：功能說明、測試方式、Constitution 符合性確認
- **Commit 規範**：使用 Conventional Commits（`feat:`, `fix:`, `test:`, `docs:`）
- **環境管理**：`.env.local` 管理本地環境變數，不得 commit 至 Git

## Governance

本 Constitution 為最高治理文件，優先於所有其他開發慣例。

- 修訂 MUST 更新版本號（依 Semantic Versioning）並記錄於 Sync Impact Report
- 所有 PR 審查 MUST 確認不違反本 Constitution 各原則
- 複雜度增加 MUST 於 plan.md 的 Complexity Tracking 表格中說明理由
- Phase 功能邊界變更視為 MINOR 版本升級，原則重新定義視為 MAJOR

**Version**: 1.0.1 | **Ratified**: 2026-04-22 | **Last Amended**: 2026-04-22

# Feature Specification: 進階功能整合

**Feature Branch**: `006-manager-kb-email`
**Created**: 2026-04-23
**Status**: Draft
**Input**: 管理者儀表板、知識庫、Email 通知寄送

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 管理者儀表板 (Priority: P1)

主管登入後可查看其直屬下屬的年度訓練達標狀況，包含每位下屬是否已完訓、申請中的課程清單，讓主管能主動督促訓練進度。

**Why this priority**: 管理者督導訓練完成是核心管理需求，有助提升整體達標率，且只需讀取現有資料。

**Independent Test**: 主管帳號登入後，儀表板顯示其 5 名下屬的訓練狀態（3 人已完訓、2 人未完訓），並列出下屬目前申請中的課程。

**Acceptance Scenarios**:

1. **Given** 主管有 5 名直屬下屬，其中 3 人本年度已完訓，**When** 主管登入查看儀表板，**Then** 顯示下屬達標率 60%，並列出每位下屬的完訓狀態。
2. **Given** 下屬有 2 筆待審課程申請，**When** 主管查看儀表板，**Then** 顯示「待主管審核」的申請清單，含課程名稱與申請日期。
3. **Given** 主管無任何下屬，**When** 查看儀表板，**Then** 顯示空白提示，不報錯。

---

### User Story 2 - 知識庫 (Priority: P2)

HR 可為每門課程新增學習資源（外部連結或說明文字），員工在課程詳情頁可瀏覽這些資源，作為課前預習或課後複習材料。

**Why this priority**: 知識庫豐富課程內容，但不影響核心訓練流程，可獨立交付。

**Independent Test**: HR 為「法治課程」新增 2 筆資源（一個連結、一段說明），員工課程頁即可看到這 2 筆資源。

**Acceptance Scenarios**:

1. **Given** HR 進入課程管理，**When** 新增一筆含標題與連結的知識庫資源，**Then** 資源儲存成功並顯示在清單中。
2. **Given** 課程有 3 筆知識庫資源，**When** 員工進入該課程詳情頁，**Then** 顯示 3 筆資源，可點擊連結開啟外部頁面。
3. **Given** HR 刪除一筆資源，**When** 員工再次查看，**Then** 該資源不再顯示。
4. **Given** 課程無任何知識庫資源，**When** 員工查看，**Then** 顯示「尚無學習資源」，不顯示錯誤。

---

### User Story 3 - Email 通知寄送 (Priority: P3)

系統在關鍵業務動作完成時（課程申請審核通過/拒絕、課程結案、承諾書待簽署等），實際透過 Email 將通知寄送給相關人員。

**Why this priority**: Email 是通知的最後一哩路，需 SMTP 服務配合；開發環境可靜默跳過。

**Independent Test**: HR 核准一筆課程申請後，系統在 2 分鐘內寄送通知 Email 給申請員工。

**Acceptance Scenarios**:

1. **Given** HR 核准一筆課程申請，**When** 核准動作完成，**Then** 系統寄送通知 Email 給申請員工，含課程名稱與日期。
2. **Given** HR 拒絕一筆申請，**When** 拒絕動作完成，**Then** 員工收到含拒絕原因的通知 Email。
3. **Given** SMTP 伺服器無法連線，**When** 系統嘗試寄信，**Then** 重試最多 3 次後記錄失敗，業務流程不受影響。
4. **Given** SMTP 未設定（開發環境），**When** 任何通知觸發，**Then** 系統靜默跳過寄信，僅記錄 log。

---

### Edge Cases

- 主管儀表板僅顯示直屬下屬（一層），不遞迴顯示下屬的下屬。
- 知識庫資源連結由 HR 自行確保可用，系統不驗證連結有效性。
- Email 通知失敗不影響原業務動作（核准仍然核准）。
- SMTP 未設定時靜默跳過，不拋出系統例外。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系統 MUST 在主管登入後顯示儀表板，列出所有直屬下屬的當年度訓練達標狀態（已完訓/未完訓）。
- **FR-002**: 系統 MUST 在主管儀表板中顯示下屬目前「待主管審核」的課程申請清單。
- **FR-003**: 系統 MUST 允許 HR 為課程新增、編輯、刪除知識庫資源（標題 + 連結或說明文字）。
- **FR-004**: 系統 MUST 在員工課程詳情頁顯示該課程的所有知識庫資源。
- **FR-005**: 系統 MUST 在課程申請核准、拒絕、HR 結案、承諾書待簽署時觸發 Email 通知。
- **FR-006**: Email MUST 包含：事件說明、課程名稱、相關日期、系統連結。
- **FR-007**: Email 寄送失敗時系統 MUST 重試最多 3 次，仍失敗則記錄錯誤，不中斷業務流程。
- **FR-008**: SMTP 未設定時，系統 MUST 靜默跳過寄信，僅記錄 log。

### Key Entities

- **知識庫資源**：附屬於課程的學習材料，含標題、類型（連結/說明）、內容、排序。
- **主管儀表板資料**：依主管 ID 彙整的下屬訓練狀態與待審申請（唯讀，無新資料表）。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 主管可在登入後 5 秒內看到下屬完整的訓練達標狀況。
- **SC-002**: HR 可在 3 步驟內為任一課程新增一筆知識庫資源。
- **SC-003**: 業務動作完成後，Email 通知在 2 分鐘內送達（SMTP 正常時）。
- **SC-004**: SMTP 故障時，原業務流程成功率維持 100%。

## Assumptions

- 主管儀表板「直屬下屬」= Employee.managerId = 主管 ID（一層，不遞迴）。
- 知識庫資源類型為連結或說明文字，不支援檔案上傳（v1）。
- Email 通知在現有 notification-service.ts 的基礎上補充 SMTP 實際寄送。
- SMTP 設定透過環境變數提供；未設定時靜默跳過。
- 重試為同步重試（最多 3 次），不引入非同步 Queue。
- 主管儀表板頁面路徑為 /manager/dashboard，沿用現有主管角色權限。
- 員工無法管理知識庫資源，唯讀。

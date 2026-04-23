# Tasks: 進階功能整合

**Input**: Design documents from `specs/006-manager-kb-email/`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/api-routes.md ✅, research.md ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story — US1 (Manager Dashboard), US2 (Knowledge Base), US3 (Email SMTP Guard).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 / US2 / US3
- Tests are included per constitution requirement (IV. 品質門檻: service 函式有單元測試)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prisma schema migration — foundation for US2 (KnowledgeBaseResource) and US3 (NotificationStatus.SKIPPED).

- [X] T001 Add `ResourceType` enum (`LINK`, `TEXT`) to `app/prisma/schema.prisma`
- [X] T002 Add `SKIPPED` value to `NotificationStatus` enum in `app/prisma/schema.prisma`
- [X] T003 Add `KnowledgeBaseResource` model and `resources` relation on `Course` in `app/prisma/schema.prisma`
- [ ] T004 Run `npx prisma migrate dev --name add-knowledge-base-and-notification-skipped` in `app/` and commit migration files

**Checkpoint**: `KnowledgeBaseResource` table created, `NotificationStatus.SKIPPED` available in Prisma client — all user stories can now begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Manager route auth guard — must exist before US1 page/route can be implemented.

- [X] T005 Add `/manager/dashboard` to MANAGER route guard in `app/src/middleware.ts` (add `isManagerRoute` helper similar to `isHRRoute`)
- [X] T006 Add 管理者儀表板 nav link to `app/src/app/(manager)/layout.tsx` (create file if not exist)

**Checkpoint**: Manager routes are protected — US1 implementation can proceed.

---

## Phase 3: User Story 1 — 管理者儀表板 (Priority: P1) 🎯 MVP

**Goal**: Manager can see subordinate training compliance and pending approvals on `/manager/dashboard`.

**Independent Test**: Login as `manager01 / dev` → navigate to `/manager/dashboard` → subordinates with trained/untrained status displayed, pending approvals listed.

### Unit Tests for US1

- [X] T007 [US1] Write unit tests for `getManagerDashboard` in `app/tests/unit/manager/service.test.ts` (mock prisma via vi.hoisted; cover: subordinates with mixed trained status, empty subordinates, pending approvals)

### Implementation for US1

- [X] T008 [P] [US1] Create `app/src/lib/manager/service.ts` — implement `getManagerDashboard(managerId: string, year?: number): Promise<ManagerDashboard>` with two Prisma queries (subordinates + trainingRecords; pendingApprovals)
- [X] T009 [US1] Create `app/src/app/api/manager/dashboard/route.ts` — GET handler: read session, verify MANAGER role, call `getManagerDashboard`, return JSON (depends on T008)
- [X] T010 [US1] Create `app/src/app/(manager)/dashboard/page.tsx` — RSC: call service directly, render subordinate table (trained/untrained badge), compliance rate, pending approvals list (depends on T008)

**Checkpoint**: Manager dashboard fully functional — verify with quickstart Step 2.

---

## Phase 4: User Story 2 — 知識庫 (Priority: P2)

**Goal**: HR can CRUD knowledge base resources per course; employees see them read-only.

**Independent Test**: HR login → course detail page → add LINK + TEXT resource → employee login → same course → both resources visible.

### Unit Tests for US2

- [X] T011 [US2] Write unit tests for knowledge-base service in `app/tests/unit/knowledge-base/service.test.ts` (cover: getCourseResources, addResource, updateResource, deleteResource; mock prisma via vi.hoisted)

### Implementation for US2

- [X] T012 [P] [US2] Create `app/src/lib/knowledge-base/validations.ts` — Zod schemas: `createResourceSchema` (`title`, `type: ResourceType`, `content`, `order?`), `updateResourceSchema` (all optional)
- [X] T013 [P] [US2] Create `app/src/lib/knowledge-base/service.ts` — implement `getCourseResources(courseId)`, `addResource(courseId, data)`, `updateResource(resourceId, data)`, `deleteResource(resourceId)` (depends on T001–T004 for Prisma types)
- [X] T014 [US2] Create `app/src/app/api/hr/courses/[id]/resources/route.ts` — GET (list resources) + POST (add resource, validate with createResourceSchema, return 201) — HR auth only (depends on T012, T013)
- [X] T015 [US2] Create `app/src/app/api/hr/courses/[id]/resources/[resourceId]/route.ts` — PATCH (update) + DELETE (delete, return `{ success: true }`) — HR auth only (depends on T012, T013)
- [X] T016 [US2] Create `app/src/app/api/courses/[id]/resources/route.ts` — GET (employee readonly, any authenticated user) (depends on T013)
- [X] T017 [US2] Update `app/src/app/(hr)/courses/[id]/page.tsx` — add KnowledgeBase management section: list resources, add/edit/delete UI using HR API routes (depends on T014, T015)
- [X] T018 [US2] Update `app/src/app/(employee)/enrollments/[id]/page.tsx` — add KnowledgeBase readonly section: fetch from `/api/courses/[id]/resources`, render LINK as `<a target="_blank">`, TEXT as plain paragraph (depends on T016)

**Checkpoint**: HR can manage resources, employees can view — verify with quickstart Steps 3 & 4.

---

## Phase 5: User Story 3 — Email SMTP 守衛 (Priority: P3)

**Goal**: When `SMTP_HOST` is not set, `attemptSend` silently skips and records `SKIPPED` status instead of throwing.

**Independent Test**: Ensure `.env` has no `SMTP_HOST` → trigger any notification → `NotificationLog.status` = `SKIPPED`, business action succeeded.

### Unit Tests for US3

- [ ] T019 [US3] Add test cases to existing notification-service tests (or create `app/tests/unit/enrollments/notification-service.test.ts`) — cover: SMTP_HOST unset → status SKIPPED, SMTP_HOST set → proceeds to send

### Implementation for US3

- [X] T020 [US3] Modify `app/src/lib/enrollments/notification-service.ts` — add SMTP_HOST guard at top of `attemptSend`: if `!process.env.SMTP_HOST` → update log status to `'SKIPPED'`, set `lastAttemptAt: new Date()`, return (depends on T001–T004 for SKIPPED enum value)

**Checkpoint**: SMTP guard works — verify with quickstart Steps 5 & 6.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T021 [P] Verify all unit tests pass: `cd app && npx vitest run` — fix any failures from schema changes
- [X] T022 [P] Add `/api/manager/dashboard` to middleware matcher pattern in `app/src/middleware.ts`
- [ ] T023 Run quickstart validation Steps 1–5 manually and confirm all scenarios pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately — T001→T002→T003→T004 (sequential, same file then migration)
- **Phase 2 (Foundational)**: After Phase 1 — T005, T006 can be parallel
- **Phase 3 (US1)**: After Phase 2 — T007→T008→T009, T010 (T009 and T010 can be parallel after T008)
- **Phase 4 (US2)**: After Phase 1 (needs Prisma types) — T012, T013 can be parallel; T014-T018 depend on T012+T013
- **Phase 5 (US3)**: After Phase 1 (needs SKIPPED enum) — T019, T020 can be parallel
- **Phase 6 (Polish)**: After all stories complete

### User Story Dependencies

- **US1**: Depends on Phase 2 (manager auth); no dependency on US2 or US3
- **US2**: Depends on Phase 1 (schema migration for KnowledgeBaseResource)
- **US3**: Depends on Phase 1 (schema migration for SKIPPED enum)
- US2 and US3 can be worked on in parallel after Phase 1

### Parallel Opportunities

```
After Phase 1 completes:
  → [P] T005 middleware manager route
  → [P] T006 manager layout nav

After Phase 2 completes:
  → US1: T007 → T008 → [T009 in parallel with T010]

After Phase 1 completes (independent of Phase 2):
  → US2: [T012 in parallel with T013] → [T014, T015, T016 in parallel] → [T017, T018 in parallel]
  → US3: [T019 in parallel with T020]
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (schema migration)
2. Complete Phase 2 (middleware)
3. Complete Phase 3 (US1 — manager dashboard)
4. **STOP & VALIDATE** quickstart Step 2

### Full Incremental Delivery

1. Phase 1 → Phase 2 → Phase 3 (US1): Manager dashboard working
2. Phase 4 (US2): Knowledge base added, both stories working
3. Phase 5 (US3): SMTP guard added, all 3 stories working
4. Phase 6: Polish and final validation

---

## Notes

- T001–T004 must be sequential (same file edits then migration run)
- T017 modifies an existing HR course page — read the file first before editing
- T018 modifies an existing employee enrollment page — read the file first before editing
- SMTP guard (T020) is a 5-line addition to an existing file — minimal risk
- All Prisma type references (e.g., `ResourceType`) only available after T004 (migrate dev)
- `vi.hoisted` pattern required for all Vitest mocks (see existing tests in `app/tests/unit/reports/`)

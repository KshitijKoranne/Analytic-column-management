# Graph Report - .  (2026-06-16)

## Corpus Check
- Corpus is ~9,607 words - fits in a single context window. You may not need a graph.

## Summary
- 252 nodes · 502 edges · 18 communities (15 shown, 3 thin omitted)
- Extraction: 93% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth And Audit Actions|Auth And Audit Actions]]
- [[_COMMUNITY_App Pages And Shell|App Pages And Shell]]
- [[_COMMUNITY_Deployment And Product Setup|Deployment And Product Setup]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Demo Data And Types|Demo Data And Types]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Workflow Server Actions|Workflow Server Actions]]
- [[_COMMUNITY_Development Tooling|Development Tooling]]
- [[_COMMUNITY_Column Workflow Rules|Column Workflow Rules]]
- [[_COMMUNITY_Vercel Configuration|Vercel Configuration]]
- [[_COMMUNITY_Auth Session Types|Auth Session Types]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Next Configuration|Next Configuration]]
- [[_COMMUNITY_Auth Route Handler|Auth Route Handler]]

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 21 edges
2. `hasDatabase()` - 19 edges
3. `compilerOptions` - 16 edges
4. `getModuleRecords()` - 14 edges
5. `value()` - 10 edges
6. `currentUser()` - 10 edges
7. `scripts` - 10 edges
8. `AppShell()` - 9 edges
9. `getColumns()` - 9 edges
10. `createRoleAction()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `getDb()`  [EXTRACTED]
  scripts/seed.ts → lib/db.ts
- `AuditPage()` --calls--> `getAuditEvents()`  [EXTRACTED]
  app/(app)/audit/page.tsx → lib/data.ts
- `MastersPage()` --calls--> `getModuleRecords()`  [EXTRACTED]
  app/(app)/masters/page.tsx → lib/data.ts
- `ReviewsPage()` --calls--> `getReviewItems()`  [EXTRACTED]
  app/(app)/reviews/page.tsx → lib/data.ts
- `SettingsPage()` --calls--> `getRoleSettings()`  [EXTRACTED]
  app/(app)/settings/page.tsx → lib/data.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **hyperedge:local-setup-flow** —  [0.96]
- **hyperedge:production-env-vars** —  [0.99]
- **hyperedge:production-login-readiness** —  [0.96]
- **hyperedge:product-module-set** —  [0.95]
- **hyperedge:application-stack** —  [0.97]

## Communities (18 total, 3 thin omitted)

### Community 0 - "Auth And Audit Actions"
Cohesion: 0.07
Nodes (43): insertAttachment(), loginAction(), Tx, writeAudit(), { handlers, auth, signIn, signOut }, accounts, activityStatusEnum, approvalTasks (+35 more)

### Community 1 - "App Pages And Shell"
Cohesion: 0.12
Nodes (27): logoutAction(), AuditPage(), ActivityScreen(), AppShell(), navItems, StatusBadge(), DestructionPage(), IssuancePage() (+19 more)

### Community 2 - "Deployment And Product Setup"
Cohesion: 0.07
Nodes (31): Production Login, Controlled Column Lifecycle Management, AUTH_SECRET, AUTH_TRUST_HOST=true, DATABASE_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, Database Migration (+23 more)

### Community 3 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (26): dependencies, @auth/drizzle-adapter, bcryptjs, clsx, drizzle-orm, lucide-react, nanoid, @neondatabase/serverless (+18 more)

### Community 4 - "Demo Data And Types"
Cohesion: 0.17
Nodes (18): PermissionOption, RoleSetting, SelectOption, activityRecords, attachments, auditEvents, columnMasters, columnUnits (+10 more)

### Community 5 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 6 - "Workflow Server Actions"
Cohesion: 0.33
Nodes (15): approveTaskAction(), createDestructionAction(), createIssuanceAction(), createMasterAction(), createPerformanceAction(), createReceiptAction(), createRoleAction(), currentUser() (+7 more)

### Community 7 - "Development Tooling"
Cohesion: 0.18
Nodes (11): devDependencies, drizzle-kit, eslint, eslint-config-next, tsx, @types/bcryptjs, @types/node, @types/react (+3 more)

### Community 8 - "Column Workflow Rules"
Cohesion: 0.39
Nodes (6): ColumnStatus, canIssueColumn(), canRecordPerformance(), canRequestDestruction(), defaultWorkflows, WorkflowStep

### Community 9 - "Vercel Configuration"
Cohesion: 0.40
Nodes (4): buildCommand, devCommand, framework, installCommand

### Community 10 - "Auth Session Types"
Cohesion: 0.50
Nodes (3): JWT, Session, User

## Knowledge Gaps
- **81 isolated node(s):** `Tx`, `metadata`, `{ handlers, auth, signIn, signOut }`, `navItems`, `activityStatusEnum` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `Workflow Server Actions` to `Auth And Audit Actions`, `App Pages And Shell`, `Demo Data And Types`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Development Tooling` to `Runtime Dependencies`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `Tx`, `metadata`, `{ handlers, auth, signIn, signOut }` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth And Audit Actions` be split into smaller, more focused modules?**
  _Cohesion score 0.06533575317604355 - nodes in this community are weakly interconnected._
- **Should `App Pages And Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.11875843454790823 - nodes in this community are weakly interconnected._
- **Should `Deployment And Product Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.07096774193548387 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
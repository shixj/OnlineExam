## Context

The repository is currently a greenfield OpenSpec project with a single source question bank document and no existing application code. The target product is a WeChat mini program with an admin backend and backend APIs that can import standardized Excel question banks, authenticate users, record practice behavior, generate user-specific wrong-question sets, and support iPad usage in both portrait and landscape orientations.

The solution spans multiple modules: admin import and publishing workflows, server-side validation and persistence, practice session orchestration, and a responsive mini program UI. The project also has a content normalization constraint: question banks are expected to be manually converted from Word documents into a standard Excel template before import, so the platform only needs to process structured text rather than inline images.

Stakeholders:
- Admin operators maintaining question banks and user accounts
- End users practicing questions in the mini program
- Future implementers who need a stable domain model and API surface before coding

## Goals / Non-Goals

**Goals:**
- Define a versioned Excel-based question bank import and publishing workflow for admins.
- Define a verified login and access model for mini program users and admin users.
- Define data and workflow rules for practice sessions, per-question answer persistence, resume behavior, and history.
- Define wrong-question generation and wrong-question-only practice behavior per user.
- Define responsive mini program expectations for phone and iPad screen classes, including orientation changes.
- Keep the first implementation narrow enough to deliver an MVP without speculative features.

**Non-Goals:**
- Direct parsing of `.docx` files or extraction of inline images from Word documents.
- Rich media question rendering, essay questions, or multi-select question types.
- Complex role-based access control beyond admin and normal user.
- Analytics dashboards, ranking systems, or deep learning recommendations.
- In-place question editing in the first release after import.

## Decisions

### Decision: Use Excel as the only admin import format
- Rationale: Excel gives a stable row-based structure for question type, category, stem, options, and answer while remaining easy for admins to edit offline.
- Alternatives considered:
  - Direct `.docx` import: rejected because source formatting is noisy and would introduce parsing ambiguity early.
  - Free-form `.txt` or Markdown import: rejected because ongoing operations would still require brittle text parsing.
  - JSON upload: useful internally, but less friendly for non-technical operators.

### Decision: Separate import, validation, and publish into explicit states
- Rationale: Importing must not automatically expose content to users. The system will treat question banks as versioned artifacts that progress from upload/validation to import to publish.
- Alternatives considered:
  - Immediate publish on successful import: rejected because it removes the admin review checkpoint.
  - Mutable in-place updates to one bank record: rejected because it makes history and record traceability harder.

### Decision: Model practice as resumable sessions with per-question answer records
- Rationale: The product must support interruption and preserve the latest answered question and result. Saving each answer independently is simpler and safer than saving only a final submission blob.
- Alternatives considered:
  - Save progress only when users manually submit: rejected because it risks data loss when the mini program is interrupted.
  - Save a whole answer sheet snapshot every time: rejected because it complicates reconciliation and wastes storage.

### Decision: Maintain wrong-question entries as user-specific state with mastery flags
- Rationale: Wrong-question practice depends on the user's personal history, and preserving mastered history is more useful than deleting entries when a question is later answered correctly.
- Alternatives considered:
  - Delete wrong-question entries immediately after one correct retry: rejected because it loses learning history and auditability.
  - Maintain only session-local wrong answers: rejected because it does not support long-term wrong-question review.

### Decision: Build one responsive mini program experience for phone and iPad
- Rationale: iPad support is a product requirement, but a separate tablet app would create unnecessary maintenance cost. Core pages will use responsive layout rules and orientation-safe state handling.
- Alternatives considered:
  - Phone-only layout stretched on iPad: rejected because it wastes space and often breaks readability.
  - Separate iPad-specific code path: rejected for MVP due to cost and duplicated behavior.

### Decision: Keep the initial role model simple
- Rationale: The MVP only requires admins who manage content and users who practice. A narrow permission model reduces backend and UI complexity.
- Alternatives considered:
  - Fine-grained roles for operator, reviewer, and publisher: deferred until there is a real governance need.

### Decision: Use versioned question banks as the anchor for history
- Rationale: Practice history and wrong-question entries must remain attributable to the exact published question bank version seen by the user at the time of practice.
- Alternatives considered:
  - Rebind sessions to the latest bank version automatically: rejected because it can corrupt historical correctness context.

## Risks / Trade-offs

- [Excel data quality depends on manual preparation] -> Enforce a strict template, blocking validation, row-level error reporting, and import preview before publish.
- [Per-question persistence increases write volume] -> Keep answer payloads small, update only required aggregates on session rows, and defer expensive analytics.
- [Wrong-question rules can become confusing if “mastered” semantics are unclear] -> Standardize one MVP rule: wrong answers create or update an entry; later correct answers mark it mastered instead of deleting it.
- [Responsive design can regress on iPad if only phone simulators are used] -> Add explicit iPad acceptance criteria and verify both portrait and landscape for core pages.
- [Versioned question banks increase data volume over time] -> Prefer append-only versions for safety and plan future archival or cleanup rules if needed.

## Migration Plan

1. Create the backend schema for users, question banks, questions, import jobs, practice sessions, answer records, and wrong-question entries.
2. Implement Excel template download, upload, validation, preview, and import without exposing content to end users.
3. Add publish and disable operations for question bank versions.
4. Implement admin and user authentication flows and user management basics.
5. Implement mini program practice flows with real-time answer persistence and resume support.
6. Implement wrong-question listing and wrong-question-only practice.
7. Verify core mini program pages on phone and iPad layouts before rollout.

Rollback strategy:
- Disable a newly published bank version and keep previous published versions intact.
- Because sessions bind to a specific bank version, disabling future access does not corrupt existing history.

## Open Questions

- The exact verification method for mini program users is still flexible: account/password, mobile verification code, or WeChat identity binding.
- Whether the first release needs category-specific practice, or only full-bank and wrong-question modes.
- Whether admins need CSV or Excel export for practice records in the first release.

## 1. Project foundation

- [x] 1.1 Establish the backend, admin, and mini program application structure for the MVP implementation
- [x] 1.2 Define the initial database schema for users, question banks, questions, import jobs, practice sessions, answer records, and wrong-question entries
- [x] 1.3 Add shared enums and constants for question types, bank statuses, user statuses, session modes, and session statuses

## 2. Authentication and user management

- [x] 2.1 Implement admin authentication and protected admin routes
- [x] 2.2 Implement mini program user authentication for verified active users
- [x] 2.3 Build admin user management for creating, enabling, disabling, and listing user accounts

## 3. Question bank import and publishing

- [x] 3.1 Implement Excel template definition and template download support
- [x] 3.2 Implement Excel upload, sheet parsing, and row-level validation against the standard question template
- [x] 3.3 Build import preview and error reporting for failed validation rows
- [x] 3.4 Persist validated question bank versions, questions, and import job records
- [x] 3.5 Implement admin publish and disable actions for question bank versions
- [x] 3.6 Build admin question bank list and detail views with question, category, and status summaries

## 4. Practice session and history workflows

- [x] 4.1 Implement APIs to list published question banks and return bank summary information to authenticated users
- [x] 4.2 Implement normal practice session creation and unfinished-session resume logic
- [x] 4.3 Implement per-question answer submission, correctness evaluation, and immediate answer record persistence
- [x] 4.4 Update session aggregates and latest-progress fields after each submitted answer
- [x] 4.5 Implement session completion, result summary, and user/admin history views

## 5. Wrong-question workflows

- [x] 5.1 Implement wrong-question entry creation and update rules based on incorrect answers
- [x] 5.2 Implement mastered-state updates when a previously wrong question is answered correctly
- [x] 5.3 Implement unresolved wrong-question listing for users
- [x] 5.4 Implement wrong-question-only practice session creation and empty-state handling

## 6. Mini program and iPad adaptation

- [x] 6.1 Build mini program pages for login, home, question bank detail, practice, result, wrong-question list, and history
- [x] 6.2 Apply responsive layout rules for phone and iPad screen sizes across all core mini program pages
- [x] 6.3 Ensure portrait and landscape orientation changes preserve current page state and practice progress
- [ ] 6.4 Verify touch targets, text readability, and layout stability on both phone-sized and iPad-sized viewports

## 7. Verification and rollout readiness

- [x] 7.1 Add automated and manual validation coverage for Excel import rules and publishing workflow
- [x] 7.2 Add automated and manual validation coverage for authentication, session resume, and wrong-question behavior
- [x] 7.3 Run end-to-end verification for admin import-to-publish flow and mini program practice-to-history flow
- [ ] 7.4 Run phone and iPad acceptance testing for portrait and landscape usage before implementation sign-off

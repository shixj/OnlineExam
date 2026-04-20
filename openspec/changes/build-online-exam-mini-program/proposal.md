## Why

The project needs a structured way to turn curated single-choice and true/false question banks into a usable online practice product instead of relying on manual document review. We need to define the product now so implementation can cover question bank import, validated user access, practice history, wrong-question review, resume support, and iPad-ready mini program behavior from the start.

## What Changes

- Add an admin workflow to import standardized Excel question banks, validate template correctness, preview parsed questions, and publish versioned banks.
- Add authenticated user access for the mini program so only verified users can enter and practice published question banks.
- Add practice sessions that save each answer in real time, record total time and latest answered question, and support resuming unfinished work.
- Add personal wrong-question generation and wrong-question-only practice based on a user's answer history.
- Add query and management capabilities for admins to inspect users, question banks, import jobs, and practice records.
- Add responsive mini program requirements so core pages work well on phones and iPads in both portrait and landscape orientations.

## Capabilities

### New Capabilities
- `question-bank-management`: Import, validate, version, publish, and browse Excel-based question banks in the admin system.
- `user-auth-and-access`: Authenticate mini program users and restrict practice access to verified accounts.
- `practice-and-progress-tracking`: Deliver practice sessions, save per-question answers, preserve unfinished progress, and expose history.
- `wrong-question-workflow`: Build a per-user wrong-question set and allow users to practice only unresolved wrong questions.
- `ipad-adaptive-mini-program`: Define responsive behavior for mini program pages on phone and iPad screen sizes and orientations.

### Modified Capabilities
- None.

## Impact

- Affected systems: admin console, backend APIs, database schema, mini program client, and OpenSpec capability specs.
- New data domains: question bank versions, imported questions, import jobs, user sessions, answer records, and wrong-question entries.
- New integrations/dependencies: Excel file parsing and template validation in the backend.

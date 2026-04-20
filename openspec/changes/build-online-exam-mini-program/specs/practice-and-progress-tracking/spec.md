## ADDED Requirements

### Requirement: Users can start and resume practice sessions
The system SHALL create a practice session for a user and SHALL allow the user to resume an unfinished session for the same question bank and practice mode.

#### Scenario: Start a new normal practice session
- **WHEN** an authenticated user selects a published question bank and starts normal practice with no unfinished session in that bank and mode
- **THEN** the system creates a new in-progress session and returns the first question with session metadata

#### Scenario: Resume an unfinished session
- **WHEN** an authenticated user re-enters a question bank and mode that already has an unfinished session
- **THEN** the system returns the existing in-progress session and the current unanswered position instead of creating a duplicate session

### Requirement: Each submitted answer is persisted immediately
The system SHALL save every submitted answer as an answer record and SHALL update the session's latest progress, latest answered question, and latest answer result immediately.

#### Scenario: Submit one answer during practice
- **WHEN** a user submits an answer for the current question in an active practice session
- **THEN** the system stores the answer record, evaluates correctness, updates session counters, and returns correctness feedback plus the next question state

#### Scenario: User leaves after answering a question
- **WHEN** a user exits or interrupts the mini program after one or more answers have been submitted
- **THEN** the system retains the saved answer records and latest session progress for later resume

### Requirement: Users can view completed results and practice history
The system SHALL provide completed session summaries and a historical list of prior practice sessions to the user and admins.

#### Scenario: Complete a session
- **WHEN** a user finishes all questions in a practice session or explicitly submits the session
- **THEN** the system marks the session completed and shows total questions, correct count, wrong count, and time-related summary data

#### Scenario: View historical sessions
- **WHEN** a user or admin opens the practice history view
- **THEN** the system shows prior session entries with bank version, mode, status, counts, and timestamps

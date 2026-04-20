## ADDED Requirements

### Requirement: Wrong answers create or update personal wrong-question entries
The system SHALL maintain a per-user wrong-question collection based on answer history and SHALL update it whenever a user answers incorrectly.

#### Scenario: First wrong answer for a question
- **WHEN** a user answers a question incorrectly for the first time
- **THEN** the system creates a wrong-question entry for that user, question bank version context, and question

#### Scenario: Repeat wrong answer for an existing wrong-question entry
- **WHEN** a user answers incorrectly for a question that already exists in the user's wrong-question collection
- **THEN** the system increments the wrong count and updates the latest wrong-answer timestamp

### Requirement: Correct re-answering can mark a wrong question as mastered
The system SHALL support a mastered state for wrong-question entries so the platform can retain history without presenting resolved items by default.

#### Scenario: Wrong question answered correctly later
- **WHEN** a user answers a previously wrong question correctly in a later session
- **THEN** the system marks that wrong-question entry as mastered instead of deleting the record

#### Scenario: Unresolved wrong questions remain active
- **WHEN** a user continues to answer a wrong-question entry incorrectly
- **THEN** the system keeps the entry unresolved for future wrong-question practice

### Requirement: Users can practice unresolved wrong questions only
The system SHALL allow a user to start a wrong-question-only practice session using that user's unresolved wrong-question entries.

#### Scenario: Start wrong-question-only practice
- **WHEN** a user chooses wrong-question practice and has unresolved wrong-question entries for the selected bank
- **THEN** the system creates a wrong-question-only session using those unresolved questions as the practice set

#### Scenario: No unresolved wrong questions remain
- **WHEN** a user chooses wrong-question practice and has no unresolved wrong-question entries for the selected bank
- **THEN** the system informs the user that there are no pending wrong questions to practice

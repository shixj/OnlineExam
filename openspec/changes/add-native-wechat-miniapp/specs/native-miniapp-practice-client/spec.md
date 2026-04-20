## ADDED Requirements

### Requirement: The native miniapp client SHALL support the core practice journey
The system SHALL provide native miniapp pages for login, question bank list, bank detail, practice, wrong-question review, history, and result presentation using the existing backend APIs.

#### Scenario: Browse and start practice from the native miniapp
- **WHEN** an authenticated user opens the native miniapp and selects a published question bank
- **THEN** the miniapp shows bank details and allows the user to start a supported practice flow using the existing practice APIs

#### Scenario: View wrong questions and history in the native miniapp
- **WHEN** an authenticated user opens the wrong-question or history page in the native miniapp
- **THEN** the system displays the corresponding records using the existing backend responses in native page layouts

### Requirement: The native miniapp client SHALL preserve compatibility with existing practice APIs
The system SHALL consume the current login, bank, practice, wrong-question, and history endpoints without requiring a breaking backend API replacement.

#### Scenario: Reuse existing backend contract
- **WHEN** the native miniapp sends requests for login or practice workflows
- **THEN** the system uses the existing backend routes and adapts the response data on the client side instead of requiring a separate backend implementation

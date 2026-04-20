## ADDED Requirements

### Requirement: Admin can import question banks from a standard Excel template
The system SHALL accept question bank uploads only in the approved Excel template format and SHALL validate every row before allowing import.

#### Scenario: Successful template validation
- **WHEN** an admin uploads a `.xlsx` file that contains the required `questions` sheet, required columns, and valid row values
- **THEN** the system displays validation success, previewable parsed questions, and a confirmation action to import the bank

#### Scenario: Row-level validation failure
- **WHEN** an admin uploads a file with invalid row data such as a missing stem, invalid question type, or invalid answer option
- **THEN** the system rejects import confirmation and shows row-level error details that identify the failing row and reason

### Requirement: Question banks are versioned and published explicitly
The system SHALL store imported question banks as versioned records and SHALL require an explicit publish action before users can access a bank version.

#### Scenario: Publish imported bank version
- **WHEN** an admin imports a validated question bank version and chooses to publish it
- **THEN** the system marks that version as published and makes it available to mini program users

#### Scenario: Disable published bank version
- **WHEN** an admin disables a previously published question bank version
- **THEN** the system prevents new practice sessions from using that version while preserving historical practice records linked to it

### Requirement: Admin can inspect imported banks and import jobs
The system SHALL provide admin views for question bank metadata, category counts, question counts, and import job outcomes.

#### Scenario: View question bank details
- **WHEN** an admin opens a question bank detail page
- **THEN** the system shows the bank name, version, status, total question count, per-type counts, per-category counts, and question preview data

#### Scenario: Review failed import job
- **WHEN** an admin opens an import job that completed with validation errors
- **THEN** the system shows import totals and error details sufficient to correct the source Excel file

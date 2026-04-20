## ADDED Requirements

### Requirement: Admin access requires successful authentication
The system SHALL require authenticated admin login before allowing access to question bank management, user management, or practice record views.

#### Scenario: Admin login succeeds
- **WHEN** an admin submits valid credentials on the admin login page
- **THEN** the system grants access to the admin console and associated management functions

#### Scenario: Admin login fails
- **WHEN** an admin submits invalid credentials
- **THEN** the system denies access and returns an authentication error without exposing protected management data

### Requirement: Mini program users must be verified and active to practice
The system SHALL allow only verified active users to log in to the mini program and start practice sessions.

#### Scenario: Verified user enters mini program
- **WHEN** a verified active user completes the supported login flow successfully
- **THEN** the system creates an authenticated mini program session and allows access to published question banks

#### Scenario: Disabled or unverified user is blocked
- **WHEN** a user account is disabled or fails the required verification check
- **THEN** the system denies practice access and informs the user that access is unavailable

### Requirement: Admin can manage mini program user availability
The system SHALL allow admins to create, enable, disable, and inspect user accounts used for mini program access.

#### Scenario: Admin disables a user
- **WHEN** an admin changes a user account status from enabled to disabled
- **THEN** the system prevents that user from starting new authenticated mini program sessions

#### Scenario: Published content is hidden from anonymous access
- **WHEN** a requester is not authenticated as an active mini program user
- **THEN** the system does not expose the published question bank list or practice APIs

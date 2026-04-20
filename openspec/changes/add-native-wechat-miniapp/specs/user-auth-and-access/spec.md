## MODIFIED Requirements

### Requirement: Mini program users must be verified and active to practice
The system SHALL allow only verified active users to log in to the practice clients and start practice sessions. Supported clients for this requirement SHALL include the existing H5 practice client and the new native WeChat Mini Program client.

#### Scenario: Verified user enters a supported practice client
- **WHEN** a verified active user completes the supported login flow successfully in either the H5 practice client or the native WeChat Mini Program client
- **THEN** the system creates an authenticated practice session and allows access to published question banks

#### Scenario: Disabled or unverified user is blocked
- **WHEN** a user account is disabled or fails the required verification check in either supported practice client
- **THEN** the system denies practice access and informs the user that access is unavailable

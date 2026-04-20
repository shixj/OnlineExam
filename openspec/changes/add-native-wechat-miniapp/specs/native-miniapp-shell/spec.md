## ADDED Requirements

### Requirement: The system SHALL provide a standalone native WeChat Mini Program client shell
The system SHALL include a dedicated native WeChat Mini Program project that is independent from the existing H5 client and can be opened directly in WeChat DevTools.

#### Scenario: Open miniapp project in WeChat DevTools
- **WHEN** a developer opens the `apps/miniapp` directory in WeChat DevTools
- **THEN** the project contains valid app configuration, registered pages, and startup files required for native mini program debugging

### Requirement: The native miniapp client SHALL provide reusable request and auth utilities
The system SHALL provide reusable utilities for API base URL configuration, authenticated requests, and local token persistence in the native miniapp client.

#### Scenario: Restore authenticated state
- **WHEN** the miniapp launches and a previously stored token exists
- **THEN** the system restores the token into client state and allows protected page requests to reuse it

#### Scenario: Unauthenticated request handling
- **WHEN** a protected request returns an authentication failure
- **THEN** the miniapp clears invalid local auth state and redirects the user back to the login page

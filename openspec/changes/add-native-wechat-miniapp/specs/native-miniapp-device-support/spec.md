## ADDED Requirements

### Requirement: The native miniapp client SHALL remain usable on phone and iPad form factors
The system SHALL render the core native miniapp pages with layouts, spacing, and touch targets that remain usable on common phone-sized and iPad-sized viewports.

#### Scenario: Open core pages on phone
- **WHEN** a user opens the login, bank list, bank detail, practice, or history pages on a phone-sized device
- **THEN** the miniapp presents a readable phone-first layout without clipped controls or overlapping content

#### Scenario: Open core pages on iPad
- **WHEN** a user opens the same native miniapp pages on an iPad-sized device
- **THEN** the miniapp keeps controls tappable and text readable while using the larger viewport safely

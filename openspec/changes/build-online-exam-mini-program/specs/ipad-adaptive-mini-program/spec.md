## ADDED Requirements

### Requirement: Core mini program pages adapt to phone and iPad layouts
The system SHALL render the login, home, question bank detail, practice, wrong-question, history, and result pages in layouts that remain usable on both phone-sized and iPad-sized screens.

#### Scenario: Phone-sized viewport
- **WHEN** a user opens a core mini program page on a phone-sized viewport
- **THEN** the system presents a readable single-column or phone-optimized layout without clipped controls or overlapping content

#### Scenario: iPad-sized viewport
- **WHEN** a user opens a core mini program page on an iPad-sized viewport
- **THEN** the system presents a tablet-optimized layout that uses the available width without merely stretching the phone layout

### Requirement: Orientation changes must preserve usability and progress state
The system SHALL preserve the current interaction state of core mini program pages when the device orientation changes between portrait and landscape.

#### Scenario: Rotate during practice
- **WHEN** a user rotates an iPad or phone while viewing a practice session
- **THEN** the system keeps the current question context and any already selected answer state visible after the layout updates

#### Scenario: Rotate while browsing lists
- **WHEN** a user rotates the device on the home, wrong-question, or history page
- **THEN** the system reflows the page without content truncation, overlap, or loss of the current list context

# Changelog

All notable changes to `VidMind` (YouTube to Gemini Analyzer) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.1] - 2026-09-10

### Fixed
- Sanitized local absolute machine paths in documentation and setup guides to portable relative paths.
- Added comprehensive  for private agent and environment files.

## [1.3.1] - 2026-09-10

### Fixed
- Sanitized local absolute machine paths in documentation and setup guides to portable relative paths.
- Added comprehensive `.gitignore` for private agent and environment files.

## [1.3.0] - 2026-04-18

### Added
- Dynamic Gemini model selector scraping available models live from the Google AI Studio interface.

## [1.2.0] - 2026-04-13

### Added
- Inline `Q+` prompt queueing button next to Run button in AI Studio.
- `Shift+Enter` keyboard shortcut to append prompt to execution queue.
- Dismiss button (`×`) on hover for floating queue badge.

### Changed
- Refactored DOM injection to an adaptive selector engine for resilience against AI Studio UI redesigns.
- Replaced queue button styling with native Google AI Studio SVG icon tokens.

## [1.0.0] - 2026-03-02

### Added
- Initial release of VidMind Chrome Extension.
- One-click YouTube video analysis forwarding into Google AI Studio.
- Automatic URL pasting, prompt insertion, and model invocation.
- Configurable prompt templates, local history tracking, and analytics dashboard.

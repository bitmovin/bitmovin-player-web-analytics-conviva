# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [3.0.0]

### Added
- `initializeSession` to external start session
- `endSession` to external end session
- `updateContentMetadata` to update content metadata after initializing `ConvivaAnalytics`
- Support for Player v8 events

### Changed
- Update to Bitmovin Player v8 API
- Switch to Webpack
- Improve typings

### Removed
- `viewerId`, `applicationName` and `customTags` from `ConvivaAnalyticsConfiguration`. Use `updateContentMetadata` instead

## [2.0.0] (2018-12-12)

### Added
- Tracking of `autoplay` and `preload` config attributes
- Live stream support

### Changed
- Updated Conviva-SDK to 2.146.0.36444
- Bind `PlayerStateManager`'s lifecycle to the lifecycle of the `Client`

### Removed
- Seek event tracking

## [95c526]

Support for Conviva-SDK version below 2.146.0.36444

[95c526]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/commit/95c526a7306cef98061f8f65e3dec3023df501af

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

### Added

- `updateRequiredContentMetadata` and `updateCustomContentMetadata` methods
  - Allows Conviva-managed metadata such as `streamType` to be configured separately from custom metadata
  - Allows custom metadata keys such as `streamType` to override internally populated custom tags without affecting Conviva's required `streamType`

## [6.1.5] - 2026-02-25

### Fixed

- `streamType` override not correctly respected

## [6.1.3] - 2025-11-06

### Fixed

- Support for streamType override in `updateContentMetadata`

## [6.1.2] - 2024-12-24

### Fixed

- Delayed buffering reporting on CSAI events
- Reporting of ad break ended for SSAI ads

## [6.1.1] - 2024-12-19

### Fixed

- Mid-roll ads erroneously reported as post-rolls when mid-roll's schedule time is greater than the duration of the ad

## [6.1.0] - 2024-12-11

### Changed

- Update `bitmovin-player` dependency to `^8.193.0`
  - This is the most recent player version that added the `PlayerEvent.RestoringContent` event

## [6.0.0] - 2024-12-05

### Changed

- Update `bitmovin-player` dependency to `~8.158.1`
  - Necessary due to dependency on newly introduced `PlayerEvent.RestoringContent` event

### Fixed

- Overreported VST after playing CSAI pre-rolls

## [5.4.1] - 2024-11-27

### Fixed

- Ad-related delays not contributing to rebuffering metrics
- Underreported VST after playing CSAI pre-rolls

## [5.4.0] - 2024-08-27

### Added

- Possibility to start session tracking without a `Player` instance
  - `const convivaAnalytics = new ConvivaAnalytics(undefined, customerKey)` initializer without a `Player`
  - `convivaAnalytics.attachPlayer(player)` to attach the `Player` at a later point in the session life-cycle

## [5.3.0] - 2024-08-14

### Changed

- Track initial audio track and subtitles only after the first `Play` event

## [5.2.0] - 2024-07-08

### Added

- Server side ad tracking
  - It is exposed via `ConvivaAnalytics.ssai`
  - An example can be found in `examples/index.html`

## [5.1.0] - 2024-06-13

### Added

- Basic client ad tracking using `Conviva.AdAnalytics`

### Changed

- Update `bitmovin-player` dependency to `^8.165.0`

## [5.0.0] - 2024-05-21

### Added

- Send player info metadata (framework and framework version)
- `additionalStandardTags` to `Metadata` of `updateContentMetadata` for [Conviva pre-defined video and content metadata](https://pulse.conviva.com/learning-center/content/sensor_developer_center/sensor_integration/javascript/js_quick_integration.htm)

### Changed

- Updated Conviva types to the latest version and fixed some type issues

### Removed

- `framework` and `frameworkVersion` custom metadata fields (custom tags)
- `CustomContentMetadata`, use `Metadata['custom']` instead

## [4.2.0] - 2023-08-24

### Added

- Support for Conviva-SDK version 4.7.0
- Tracking for Audio language
- Tracking for Subtitle Language
- Tracking for Closed Caption Language

### Removed

- Support for Conviva-SDK version 4.6.1

## [4.1.0] - 2022-10-24

### Added

- Support for Conviva-SDK version 4.5.7

### Removed

- Support for Conviva-SDK version 4.0.15

### Fixed

- Consecutive playback of multiple sources not tracked correctly

## [4.0.3] - 2021-04-30

### Added

- `bitmovin-player@^8.31.0` as peer dependency.
- Possibility to set detailed Conviva Device Metadata via `ConvivaAnalyticsConfiguration.deviceMetadata`
- Possibility to override values for internally set custom metdata keys `streamType`, `playerType` and `vrContentType`

### Deprecated

- `ConvivaAnalyticsConfiguration.deviceCategory` field in favour of `ConvivaAnalyticsConfiguration.deviceMetadata.category` field

## [4.0.2] - 2021-02-24

### Fixed

- Metadata was cleared after playback finished.

## [4.0.1] - 2021-02-01

### Fixed

- Uncaught TypeError (`Cannot read property 'release' of null`) when attempting to release the Conviva instance.

## [4.0.0] - 2021-01-15

### Added

- Support for Conviva-SDK 4.0.15.

### Removed

- Support for Conviva-SDK 2.151.0.36981.

## [3.0.6] - 2020-04-16

### Fixed

- Prefer `window.setInterval()` in `Html5Timer.ts` instead of the NodeJS definition.

## [3.0.5] - 2020-03-30

### Fixed

- Updated `webpack-dev-server` to the latest version, to resolve console errors when running locally via `npm run start`.

## [3.0.4] - 2020-03-05

### Fixed

- Send playing event after an ad break has finished.

## [3.0.3] - 2020-02-05

### Added

- Added a configuration option to set the Conviva Device Category.

## [3.0.2] - 2019-10-23

### Added

- `endSession` will now prevent a new session from being initialized via internal event handling.

## [3.0.1] - 2019-05-16

### Added

- Support for Conviva-SDK 2.151.0.36981.

## [3.0.0] - 2019-03-15

### Added

- `initializeSession` to external start session.
- `endSession` to external end session.
- `updateContentMetadata` to update content metadata after initializing.`ConvivaAnalytics`
- Support for Player v8 events.

### Changed

- Update to Bitmovin Player v8 API.
- Switch to Webpack.
- Improve typings.

### Removed

- `viewerId`, `applicationName` and `customTags` from `ConvivaAnalyticsConfiguration`. Use `updateContentMetadata` instead.

## [2.1.0] - 2019-01-17

### Added

- `integrationVersion` as custom `contentMetadata` attribute
- Method to track custom deficiency events

## 2.0.0 - 2018-12-13

### Added

- Tracking of `autoplay` and `preload` config attributes.
- Live stream support.

### Changed

- Updated Conviva-SDK to 2.146.0.36444.
- Bind `PlayerStateManager`'s lifecycle to the lifecycle of the `Client`.

### Removed

- Seek event tracking

[Unreleased]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v6.1.5...HEAD
[6.1.5]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v6.1.3...v6.1.5
[6.1.3]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v6.1.2...v6.1.3
[6.1.2]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v6.1.1...v6.1.2
[6.1.1]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v6.1.0...v6.1.1
[6.1.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v6.0.0...v6.1.0
[6.0.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v5.4.1...v6.0.0
[5.4.1]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v5.4.0...v5.4.1
[5.4.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v5.3.0...v5.4.0
[5.3.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v5.2.0...v5.3.0
[5.2.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v5.1.0...v5.2.0
[5.1.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v5.0.0...v5.1.0
[5.0.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v4.2.0...v5.0.0
[4.2.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v4.1.0...v4.2.0
[4.1.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v4.0.3...v4.1.0
[4.0.3]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v4.0.2...v4.0.3
[4.0.2]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v4.0.1...v4.0.2
[4.0.1]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v3.0.6...v4.0.0
[3.0.6]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v3.0.5...v3.0.6
[3.0.5]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v3.0.4...v3.0.5
[3.0.4]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v3.0.3...v3.0.4
[3.0.3]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v3.0.2...v3.0.3
[3.0.2]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/bitmovin/bitmovin-player-analytics-conviva/compare/v2.0.0...v2.1.0

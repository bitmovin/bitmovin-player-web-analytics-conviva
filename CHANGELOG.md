# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

### Changed
- Updated Conviva types to the latest version and fixed some type issues

### Deprecated
- Removed `framework` and `frameworkVersion` custom metadata fields (custom tags)

## 4.2.0 - 2023-08-24
### Added
- Support for Conviva-SDK version 4.7.0
- Tracking for Audio language
- Tracking for Subtitle Language
- Tracking for Closed Caption Language

### Removed
- Support for Conviva-SDK version 4.6.1

## v4.1.0 - 2022-10-24

### Added
- Support for Conviva-SDK version 4.5.7

### Fixed
- Consecutive playback of multiple sources not tracked correctly

### Removed
- Support for Conviva-SDK version 4.0.15

## 4.0.3 - 2021-04-30

### Added
- `bitmovin-player@^8.31.0` as peer dependency.
- Possibility to set detailed Conviva Device Metadata via `ConvivaAnalyticsConfiguration.deviceMetadata`
- Possibility to override values for internally set custom metdata keys `streamType`, `playerType` and `vrContentType`

### Deprecated
- `ConvivaAnalyticsConfiguration.deviceCategory` field in favour of `ConvivaAnalyticsConfiguration.deviceMetadata.category` field

## 4.0.2 - 2021-02-24

### Fixed
- Metadata was cleared after playback finished.

## 4.0.1 - 2021-02-01

### Fixed
- Uncaught TypeError (`Cannot read property 'release' of null`) when attempting to release the Conviva instance.

## 4.0.0 - 2021-01-15

### Added
- Support for Conviva-SDK 4.0.15.

### Removed
- Support for Conviva-SDK 2.151.0.36981.

## 3.0.6 - 2020-04-16

### Fixed
- Prefer `window.setInterval()` in `Html5Timer.ts` instead of the NodeJS definition.

## 3.0.5 - 2020-03-30

### Fixed
- Updated `webpack-dev-server` to the latest version, to resolve console errors when running locally via `npm run start`.

## 3.0.4 - 2020-03-05

### Fixed
- Send playing event after an ad break has finished.

## 3.0.3 - 2020-02-05

### Added
- Added a configuration option to set the Conviva Device Category. 

## 3.0.2 - 2019-10-23

### Added
- `endSession` will now prevent a new session from being initialized via internal event handling.

## 3.0.1 - 2019-05-16

### Added
- Support for Conviva-SDK 2.151.0.36981.

## 3.0.0 - 2019-03-15

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

## 2.1.0 - 2019-01-17

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

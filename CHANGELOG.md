# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [develop]

## Changed
- Update to Bitmovin Player v8
- Switch to Webpack and yarn
- Improve typings

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

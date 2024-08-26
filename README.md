# Bitmovin Player Conviva Analytics Integration
This is an open-source project to enable the use of a third-party component (Conviva) with the Bitmovin Player Web SDK.

## Maintenance and Update
This project is not part of a regular maintenance or update schedule and is updated once yearly to conform with the latest product versions. For additional update requests, please take a look at the guidance further below.

## Contributions to this project
As an open-source project, we are pleased to accept any and all changes, updates and fixes from the community wishing to use this project. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for more details on how to contribute.

## Reporting player bugs
If you come across a bug related to the player, please raise this through your support ticketing system.

## Need more help?
Should you want some help updating this project (update, modify, fix or otherwise) and cant contribute for any reason, please raise your request to your bitmovin account team, who can discuss your request.

## Support and SLA Disclaimer
As an open-source project and not a core product offering, any request, issue or query related to this project is excluded from any SLA and Support terms that a customer might have with either Bitmovin or another third-party service provider or Company contributing to this project. Any and all updates are purely at the contributor's discretion.

Thank you for your contributions!

## Compatibility
**This version of the Conviva Analytics Integration works only with Player Version >= 8.31.x.
The recommended and tested version of the Conviva SDK is 4.5.7. See [CHANGELOG.md](CHANGELOG.md) for details.

## Getting Started
### Installation
#### Using NPM
Install the npm package:
```
npm i @bitmovin/player-integration-conviva --save-dev
```

#### Using custom build
Build the JS file by running `npm run build`

### Developing
1. Clone Git repository
2. Install node.js
3. Install required npm packages: [`npm install`](https://www.npmjs.com/)
4. Run tasks:
  * `npm run lint` to lint TypeScript files as well as CHANGELOG.md
  * `npm run build` to build project into `dist` directory
  * `npm run start` to open test page in browser, build and reload changed files automatically
  * `npm run format` to run prettier and auto-format all code files
  * `npm run test` to run tests

## Usage
1. Include `conviva-core-sdk.min.js` as **first** of all scripts in your HTML document

1. Create an instance of `ConvivaAnalytics` **before** calling `player.load(...)` and pass in your Conviva `CUSTOMER_KEY` and optional configuration properties:

    1. Using NPM import:
        1. Import ConvivaAnalytics:
            ```typescript
            import { ConvivaAnalytics } from '@bitmovin/player-integration-conviva';
            ```

        1. Usage
            ```typescript
            const playerConfig = {
              key: 'YOUR-PLAYER-KEY',
              // ...
            };

            const player = new Player(document.getElementById('player'), playerConfig);
            const conviva = new ConvivaAnalytics(player, 'CUSTOMER_KEY', {
              debugLoggingEnabled: true, // optional
              gatewayUrl: 'https://youraccount-test.testonly.conviva.com', // optional, TOUCHSTONE_SERVICE_URL for testing
              deviceCategory: Conviva.Client.DeviceCategory.WEB, // optional, deprecated (Use deviceMetadata.category) (default: WEB)
              deviceMetadata: { // optional (default: let Conviva backend infer these fields from User Agent sring)
                category: Conviva.Client.DeviceCategory.WEB, // optional (default: WEB)
                brand: 'Device brand', // optional
                manufacturer: 'Device Manufacturer', // optional
                model: 'Device Model', // optional
                type: Conviva.Client.DeviceType.DESKTOP, // optional
                version: 'Device version', // optional
                osName: 'Operating system name', // optional
                osVersion: 'Operating system version' // optional
              }
            });
            
            var sourceConfig = {
              // ...
            };
                        
            player.load(sourceConfig).then(function() {
              console.log('player loaded');
            }, function(reason) {
              console.error('player setup failed', reason);
            });
            ```
    
    2. Using custom Build:
        1. Include `bitmovinplayer-analytics-conviva.js` **after** `conviva-core-sdk.min.js` in your HTML document

        2. Usage
            ```js
            var playerConfig = {
              key: 'YOUR-PLAYER-KEY',
              // ...
            };
        
            var container = document.getElementById('player');
            var player = new bitmovin.player.Player(container, playerConfig);
            
            // A ConvivaAnalytics instance is always tied to one player instance
            var conviva = new bitmovin.player.analytics.ConvivaAnalytics(player, 'CUSTOMER_KEY', {
              debugLoggingEnabled: true, // optional
              gatewayUrl: 'https://youraccount-test.testonly.conviva.com', // optional, TOUCHSTONE_SERVICE_URL for testing
              deviceCategory: Conviva.Client.DeviceCategory.WEB // optional, (default: WEB)
            });
            
            var sourceConfig = {
              // ...
            };
            
            player.load(sourceConfig).then(function() {
              console.log('player loaded');
            }, function(reason) {
              console.error('player setup failed', reason);
            });
            ```

2. Release the instance by calling `conviva.release()` before destroying the player by calling `player.destroy()`
 
### Advanced Usage
#### VPF tracking
If you would like to track custom VPF (Video Playback Failures) events when no actual player error happens (e.g. 
the server closes the connection and return `net::ERR_EMPTY_RESPONSE` or after a certain time of stalling)
you can use following API to track those deficiencies.

```js
conviva.reportPlaybackDeficiency('Some Error Message', Conviva.Client.ErrorSeverity.FATAL);
```
_See [ConvivaAnalytics.ts](./src/ts/ConvivaAnalytics.ts) for parameter details._

Conviva suggests an timeout of about ~10 seconds and before reporting an error to conviva and providing feedback the user.

#### Content Metadata handling
If you want to override some content metadata attributes you can do so by adding the following:

```js
let metadataOverrides = {
  applicationName: 'App Name',
  viewerId: 'uniqueViewerId',
  custom: {
    customTag: 'customValue',
  },
  // Find the list here https://pulse.conviva.com/learning-center/content/sensor_developer_center/sensor_integration/javascript/js_quick_integration.htm
  // under "Constants for Pre-defined Video and Content Metadata"
  additionalStandardTags: {
    'c3.cm.channel': 'Test Channel',
    'c3.cm.brand': 'Test Brand',
  },
  encodedFrameRate: 24,
  // … 
};

// …
// Initialize ConvivaAnalytics
// …

conviva.updateContentMetadata(metadataOverrides);
```

Those values will be cleaned up after the session is closed.

_See [ConvivaAnalytics.ts](./src/ts/ConvivaAnalytics.ts) for details about more attributes._

#### Consecutive playback
If you want to use the same player instance for multiple playback, just load a new source with `player.load(…)`.
The integration will close the active session.
 
```js
player.load({…});
```

#### External VST tracking

If your app needs additional setup steps which should be included in VST tracking, such as DRM token generation, before the `Player` instance can be initialized, 
the `ConvivaAnalytics` can be initialized without a `Player` instance. Once the `Player` instance is created it can be attached.

1. Create the `ConvivaAnalytics` instance with your `customerKey` and configuration.

```typescript
const convivaAnalytics = new ConvivaAnalytics(undefined, customerKey);
```

2. Conviva requires that the `assetName` is set at session initialization. Therefore ensure that you provide using the metadata overrides **before** initializing the tracking session.

```typescript
convivaAnalytics.updateContentMetadata({
  assetName: 'Your Asset Name',
});

// Initialize tracking session
convivaAnalytics.initializeSession()
```

3. Once your `Player` instance is ready attach it to the `ConvivaAnalytics` instance.

```typescript
// ... Additional setup steps

const player = new bitmovin.player.Player(document.getElementById('player'), getPlayerConfig());
convivaAnalytics.attachPlayer(player);
``` 

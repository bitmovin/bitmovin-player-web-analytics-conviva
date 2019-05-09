# Bitmovin Player Conviva Analytics Integration
## Compatibility
**This version of the Conviva Analytics Integration works only with Player Version >= 8.2.x.
The recommended version of the Conviva SDK is 2.146.0.36444.** See [CHANGELOG](CHANGELOG.md) for details.

## Getting Started
### Installation
#### Using NPM
Install the npm package:
```
npm i @bitmovin/player-integration-conviva --save-dev
```

#### Use custom build
Build the file script by running `npm run build`

### Developing
1. Clone Git repository
2. Install node.js
3. Install required npm packages: [`npm install`](https://www.npmjs.com/)
4. Run tasks:
  * `npm run lint` to lint TypeScript files
  * `npm run build` to build project into `dist` directory
  * `npm run start` to open test page in browser, build and reload changed files automatically

## Usage
1. Include `conviva-core-sdk.min.js` **first of all** in your HTML document

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
    
    1. Using custom Build:
        1. Include `bitmovinplayer-analytics-conviva.js` **after** `conviva-core-sdk.min.js` in your HTML document

        1. Usage
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

1. Release the instance by calling `conviva.release()` before destroying the player by calling `player.destroy()`
 
### Advanced Usage
#### Chromecast support
_If you are not familiar with how to add chromecast support we suggest to look at our [public sample](https://github.com/bitmovin/bitmovin-player-web-samples/tree/master/castReceiver) first._

If you would like to add the conviva integration to your chromecast you can have a look at our [custom receiver app example](./example/chromecast/receiverApp.html) with conviva integration.

As the player does not notify listeners on the receiver app itself if the session will be stopped you need to add a listener to the `onShutdown` and end the session manually.

In order to do so you need to add following lines:

```js
cast.receiver.CastReceiverManager.getInstance().onShutdown = () => {
  convivaAnalytics.endSession();
}
```

If you are using the content metadata overriding feature you will have to add the following line within the `CastMetadataListener` callback:

```js
convivaAnalytics.handleCastMetadataEvent(metadata);
```

This will ensure that all your content metadata attributes are also present in the session of the receiver app.
It will also enable you to use `updateContentMetadata` on the sender and it will be propagated to the receiver app.


#### VPF tracking
If you would like to track custom VPF (Video Playback Failures) events when no actual player error happens (e.g. 
the server closes the connection and return `net::ERR_EMPTY_RESPONSE` or after a certain time of stalling)
you can use following API to track those deficiencies.

```js
conviva.reportPlaybackDeficiency('Some Error Message', Conviva.Client.ErrorSeverity.FATAL);
```
_See [ConvivaAnalytics.ts](./src/ts/ConvivaAnalytics.ts) for parameter details._

Conviva suggests an timeout of about ~10 seconds and before reporting an error to conviva and providing feedback the user.

#### Ad Insights (AdBreak & AdExperience)
Conviva provides multiple ways to track details about ad playback.  
Set the `adTrackingMode` in the [ConvivaAnalyticsConfiguration](./src/ts/ConvivaAnalytics.ts) to select the ad tracking mode.

```js
let convivaConfiguration = {
  …
  adTrackingMode: 'AdBreaks',
  …
}
```

_See [ConvivaAnalytics.ts](./src/ts/ConvivaAnalytics.ts) for more details about the different modes._
 
#### Content Metadata handling
If you want to override some content metadata attributes you can do so by adding the following:

```js
let metadataOverrides = {
  applicationName: 'App Name',
  viewerId: 'uniqueViewerId',
  custom: {
    customTag: 'customValue',
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

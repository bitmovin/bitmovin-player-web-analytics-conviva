# Bitmovin Player Conviva Analytics Integration

## Compatibility
**This version of the Conviva Analytics Integration works only with Player Version 8.x.
The recommended version of the Conviva SDK is 2.146.0.36444.** See [CHANGELOG](CHANGELOG.md) for details.

## Getting Started

1. Clone Git repository
2. Install node.js
3. Install required npm packages: [`npm install`](https://www.npmjs.com/)
4. Run tasks:
  * `npm run lint` to lint TypeScript files
  * `npm run build` to build project into `dist` directory
  * `npm run start` to open test page in browser, build and reload changed files automatically

## Usage

1. Build the script by running `npm run build`

2. Include `bitmovinplayer-analytics-conviva.js` **after** `conviva-core-sdk.min.js` in your HTML document

3. Create an instance of `ConvivaAnalytics` **before** calling `player.load(...)` and pass in your Conviva `CUSTOMER_KEY` and optional configuration properties:
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
      applicationName: 'Bitmovin Player Conviva Analytics Integration Test Page', // optional
      viewerId: 'uniqueViewerId', // optional
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

4. Add optional properties to the player's source configuration object to improve analytics data:
    ```js
    {
      title: 'Art of Motion',
      dash: '//bitmovin-a.akamaihd.net/content/MI201109210084_1/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd',

      // Conviva Analytics properties
      viewerId: 'uniqueViewerIdThatOverridesTheConvivaAnalyticsConfig',
      contentId: 'uniqueContentId',
    }
    ```

5. Release the instance by calling `conviva.release()` before destroying the player by calling `player.destroy()`
 
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

# Bitmovin Player Conviva Analytics Integration

## Compatibility
**This version of the Conviva Analytics Integration works only with Player Version 8.x.
The recommended version of the Conviva SDK is 2.146.0.36444.** See [CHANGELOG](CHANGELOG.md) for details.

## Limitations
This Conviva integration currently does not track pre-roll ads. The analytics session is created after pre-roll ads, before the main content is started. This is implemented according to Conviva's guidelines but is still considered a limitation as the `Exit Before Video Start` metrics cannot be measured. All other metrics are working as expected.

## Getting Started

1. Clone Git repository
2. Install node.js
3. Install required npm packages: [`yarn`](https://yarnpkg.com/)
4. Run tasks:
  * `yarn build` to build project into `dist` directory
  * `yarn start` to open test page in browser, build and reload changed files automatically
  * `yarn lint` to lint TypeScript files

## Usage

1. Build the script by running `yarn build`

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

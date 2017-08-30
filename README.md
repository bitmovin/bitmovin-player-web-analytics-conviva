# Bitmovin Player Conviva Analytics Integration

## Limitations
This Conviva integration currently does not track pre-roll ads. The analytics session is created after pre-roll ads, before the main content is started. This is implemented according to Conviva's guidelines but is still considered a limitation as the `Exit Before Video Start` metrics cannot be measured. All other metrics are working as expected.

## Getting Started

 0. Clone Git repository
 1. Install node.js
 2. Install Gulp: `npm install --global gulp-cli`
 3. Install required npm packages: `npm install`
 4. Run Gulp tasks (`gulp --tasks`)
  * `gulp` to build project into `dist` directory
  * `gulp watch` to develop and rebuild changed files automatically
  * `gulp serve` to open test page in browser, build and reload changed files automatically
    * see `conviva\README.md`
  * `gulp lint` to lint TypeScript and SASS files
  * `gulp build-prod` to build project with minified files into `dist` directory
  
To just take a look at the project, also run `gulp serve`.

## Usage

 1. Build the script by running `gulp build-prod`
 2. Include `bitmovinplayer-analytics-conviva.min.js` **after** `conviva-core-sdk.min.js` in your HTML document
 3. Create an instance of `ConvivaAnalytics` **before** calling `player.setup(...)` and pass in your Conviva `CUSTOMER_KEY` and optional configuration properties:
    ```js
    var playerConfig = {
      key: 'YOUR-PLAYER-KEY',
      source: {
        ...
      },
      ...
    };

    var player = bitmovin.player('player');
    
    // A ConvivaAnalytics instance is always tied to one player instance
    var conviva = new bitmovin.player.analytics.ConvivaAnalytics(player, 'CUSTOMER_KEY', {
      debugLoggingEnabled: true, // optional
      gatewayUrl: 'https://youraccount-test.testonly.conviva.com', // optional, TOUCHSTONE_SERVICE_URL for testing
      applicationName: 'Bitmovin Player Conviva Analytics Integration Test Page', // optional
      viewerId: 'uniqueViewerId', // optional
    });
    
    player.setup(playerConfig).then(function() {
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
 
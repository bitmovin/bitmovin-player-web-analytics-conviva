var container = document.getElementById('player');
var player = new bitmovin.player.Player(container, getPlayerConfig());

var conviva = new bitmovin.player.analytics.ConvivaAnalytics(player, 'CUSTOMER_KEY', {
  debugLoggingEnabled: true,
  gatewayUrl: 'https://youraccount-test.testonly.conviva.com', // TOUCHSTONE_SERVICE_URL for testing
  applicationName: 'Bitmovin Player Conviva Analytics Integration Test Page',
  viewerId: 'uniqueViewerId',
  customTags: {
    appVersion: '1.0',
    contentId: 'someContentId',
    playerVendor: 'bitmovin',
    playerVersion: player.version
  },
});

player.load(getPlayerSource()).then(function() {
  scheduleAds().then(function() {
    console.log('Ads scheduled successfully');
  }).catch(function(reason) {
    console.error('Error scheduling ads');
    console.error(reason);
  });

  console.log('Successfully created Bitmovin Player instance');
}, function(reason) {
  console.error('Error while creating Bitmovin Player instance');
  console.error(reason);
});

function getPlayerConfig() {
  return {
    key: 'YOUR-PLAYER-KEY',
    playback: {},
    style: {},
    cast: {
      enable: true
    },
    logs: {
      level: 'debug'
    },
    events: {},
    advertising: {}
  };
}

function getPlayerSource() {
  return {
    title: 'Art of Motion',
    description: 'What is this event... Parcour?',
    dash: '//bitmovin-a.akamaihd.net/content/MI201109210084_1/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd',
    hls: '//bitmovin-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
    progressive: '//bitmovin-a.akamaihd.net/content/MI201109210084_1/MI201109210084_mpeg-4_hd_high_1080p25_10mbits.mp4',
    poster: '//bitmovin-a.akamaihd.net/content/art-of-motion_drm/art-of-motion_poster.jpg',
    viewerId: 'uniqueViewerIdThatOverridesTheConvivaAnalyticsConfig', // Conviva viewerId
    contentId: 'uniqueContentId', // Conviva contentId (will be prefixed to the title)
  };
}

function scheduleAds() {
  return Promise.all([
    player.ads.schedule({
      tag: {
        url: 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/32573358/skippable_ad_unit&impl=s&gdfp_req=1&env=vp&output=xml_vast2&unviewed_position_start=1&url=http%3A%2F%2Freleasetest.dash-player.com%2Fads%2F&description_url=[description_url]&correlator=[random]',
        type: 'ima'
      },
      id: 'ad-pre-skippable',
      position: 'pre'
    }),
    player.ads.schedule({
      tag: {
        url: 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/32573358/skippable_ad_unit&impl=s&gdfp_req=1&env=vp&output=xml_vast2&unviewed_position_start=1&url=http%3A%2F%2Freleasetest.dash-player.com%2Fads%2F&description_url=[description_url]&correlator=[random]',
        type: 'ima'
      },
      id: 'ad-30-skippable',
      position: '30%'
    }),
    player.ads.schedule({
      tag: {
        url: 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/32573358/2nd_test_ad_unit&ciu_szs=300x100&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&url=[referrer_url]&description_url=[description_url]&correlator=[random]',
        type: 'ima'
      },
      id: 'ad-post-skippable',
      position: 'post'
    })
  ]);
}

export enum PlayerEvent {
  /**
   * Is fired when the player has enough data to start playback
   *
   * The semantic of the Event changed in player version 8. Before v8 it was used to signal the end of the setup
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Ready constant.
   *
   * @event
   * @since v8.0
   */
  Ready = 'ready',
  /**
   * Is fired when the player enters the play state.
   * The passed event is of type {@link PlaybackEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Play constant.
   *
   * @event
   * @since v4.0
   */
  Play = 'play',
  /**
   * Is fired when the player actually has started playback.
   * The passed event is of type {@link PlaybackEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Playing constant.
   *
   * @event
   * @instance
   * @since v7.3
   */
  Playing = 'playing',
  /**
   * Is fired when the player enters the pause state.
   * The passed event is of type {@link PlaybackEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Paused constant.
   *
   * @event
   * @since v7.0
   */
  Paused = 'paused',
  /**
   * Is fired periodically during seeking. Only applies to VoD streams, please refer to {@link TimeShift} for live.
   * The passed event is of type {@link SeekEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Seek constant.
   *
   * @event
   * @since v4.0
   */
  Seek = 'seek',
  /**
   * Is fired when seeking has been finished and data is available to continue playback. Only applies to VoD streams,
   * please refer to {@link TimeShifted} for live.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Seeked constant.
   *
   * @event
   * @since v4.0
   */
  Seeked = 'seeked',
  /**
   * Is fired periodically during time shifting. Only applies to live streams, please refer to {@link Seek} for VoD.
   * The passed event is of type {@link TimeShiftEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.TimeShift constant.
   *
   * @event
   * @since v5.0
   */
  TimeShift = 'timeshift',
  /**
   * Is fired when time shifting has been finished and data is available to continue playback. Only applies to live
   * streams, please refer to {@link Seeked} for VoD.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.TimeShifted constant.
   *
   * @event
   * @since v5.0
   */
  TimeShifted = 'timeshifted',
  /**
   * Is fired when the volume is changed.
   * The passed event is of type {@link VolumeChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.VolumeChanged constant.
   *
   * @event
   * @since v7.0
   */
  VolumeChanged = 'volumechanged',
  /**
   * Is fired when the player is muted.
   * The passed event is of type {@link UserInteractionEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Muted constant.
   *
   * @event
   * @since v7.0
   */
  Muted = 'muted',
  /**
   * Is fired when the player is unmuted.
   * The passed event is of type {@link UserInteractionEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Unmuted constant.
   *
   * @event
   * @since v7.0
   */
  Unmuted = 'unmuted',
  /**
   * Is fired when the player size is updated.
   * The passed event is of type {@link PlayerResizedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.PlayerResized constant.
   *
   * @event
   * @since v8.0
   */
  PlayerResized = 'playerresized',
  /**
   * Is fired when the playback of the current video has finished.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.PlaybackFinished constant.
   *
   * @event
   * @since v4.0
   */
  PlaybackFinished = 'playbackfinished',
  /**
   * Is fired when an error during setup, e.g. neither HTML5/JS nor Flash can be used, or playback is encountered.
   * The passed event is of type {@link ErrorEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Error constant.
   *
   * @event
   * @since v4.0
   */
  Error = 'error',
  /**
   * Is fired when something happens which is not as serious as an error but could potentially affect playback or other
   * functionalities.
   * The passed event is of type {@link WarningEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Warning constant.
   *
   * @event
   * @since v5.1
   */
  Warning = 'warning',
  /**
   * Is fired when the player begins to stall and to buffer due to an empty buffer.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.StallStarted constant.
   *
   * @event
   * @since v7.0
   */
  StallStarted = 'stallstarted',
  /**
   * Is fired when the player ends stalling due to enough data in the buffer.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.StallEnded constant.
   *
   * @event
   * @since v7.0
   */
  StallEnded = 'stallended',
  /**
   * Is fired when the audio track is changed.
   * The passed event is of type {@link AudioChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AudioChanged constant.
   *
   * @event
   * @since v7.0
   */
  AudioChanged = 'audiochanged',
  /**
   * Is fired when a new audio track is added.
   * The passed event is of type {@link AudioTrackEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AudioAdded constant.
   *
   * @event
   * @since v7.1.4 / v7.2.0
   */
  AudioAdded = 'audioadded',
  /**
   * Is fired when an existing audio track is removed.
   * The passed event is of type {@link AudioTrackEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AudioRemoved constant.
   *
   * @event
   * @since v7.1.4 / v7.2.0
   */
  AudioRemoved = 'audioremoved',
  /**
   * Is fired when changing the video quality is triggered by using setVideoQuality.
   * The passed event is of type {@link VideoQualityChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.VideoQualityChanged constant.
   *
   * @event
   * @since v7.3.1
   */
  VideoQualityChanged = 'videoqualitychanged',
  /**
   * Is fired when changing the audio quality is triggered by using setAudioQuality.
   * The passed event is of type {@link AudioQualityChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AudioQualityChanged constant.
   *
   * @event
   * @since v7.3.1
   */
  AudioQualityChanged = 'audioqualitychanged',
  /**
   * Is fired when changing the downloaded video quality is triggered, either by using setVideoQuality or due to
   * automatic dynamic adaptation.
   * The passed event is of type {@link VideoDownloadQualityChangeEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.VideoDownloadQualityChange constant.
   *
   * @event
   * @since v4.0
   */
  VideoDownloadQualityChange = 'videodownloadqualitychange',
  /**
   * Is fired when changing the downloaded audio quality is triggered, either by using setAudioQuality or due to
   * automatic dynamic adaptation.
   * The passed event is of type {@link AudioDownloadQualityChangeEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AudioDownloadQualityChange constant.
   *
   * @event
   * @since v4.0
   */
  AudioDownloadQualityChange = 'audiodownloadqualitychange',
  /**
   * Is fired when the downloaded video quality has been changed successfully. It is (not necessarily directly)
   * preceded by an VideoDownloadQualityChange event.
   * The passed event is of type {@link VideoDownloadQualityChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.VideoDownloadQualityChanged constant.
   *
   * @event
   * @since v7.0
   */
  VideoDownloadQualityChanged = 'videodownloadqualitychanged',
  /**
   * Is fired when the downloaded audio quality has been changed successfully. It is (not necessarily directly)
   * preceded by an AudioDownloadQualityChange event.
   * The passed event is of type {@link AudioDownloadQualityChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AudioDownloadQualityChanged constant.
   *
   * @event
   * @since v7.0
   */
  AudioDownloadQualityChanged = 'audiodownloadqualitychanged',
  /**
   * Is fired when the displayed video quality changed.
   * The passed event is of type {@link VideoPlaybackQualityChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.VideoPlaybackQualityChanged constant.
   *
   *
   * @event
   * @since v7.0
   */
  VideoPlaybackQualityChanged = 'videoplaybackqualitychanged',
  /**
   * Is fired when the played audio quality changed.
   * The passed event is of type {@link AudioPlaybackQualityChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AudioPlaybackQualityChanged constant.
   *
   * @event
   * @since v7.0
   */
  AudioPlaybackQualityChanged = 'audioplaybackqualitychanged',
  /**
   * Is fired when the current playback time has changed.
   * The passed event is of type {@link PlaybackEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.TimeChanged constant.
   *
   * @event
   * @since v4.0
   */
  TimeChanged = 'timechanged',
  /**
   * Is fired when a subtitle is parsed from a stream, manifest or subtitle file.
   * The passed event is of type {@link SubtitleCueParsedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.CueParsed constant.
   *
   * @event
   * @since v7.6
   */
  CueParsed = 'cueparsed',
  /**
   * Is fired when a subtitle entry transitions into the active status.
   * The passed event is of type {@link SubtitleCueEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.CueEnter constant.
   *
   * @event
   * @since v4.0
   */
  CueEnter = 'cueenter',
  /**
   * Is fired when either the start time or the end time of a cue change.
   * The passed event is of type {@link SubtitleCueEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.CueUpdate constant.
   *
   * @event
   * @since v7.1
   */
  CueUpdate = 'cueupdate',
  /**
   * Is fired when an active subtitle entry transitions into the inactive status.
   * The passed event is of type {@link SubtitleCueEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.CueExit constant.
   *
   * @event
   * @since v4.0
   */
  CueExit = 'cueexit',
  /**
   * Is fired when a segment is played back.
   * The passed event is of type {@link SegmentPlaybackEvent}.
   *
   * For HLS streams being played in the `native` player technology, the {@link TweaksConfig.native_hls_parsing}
   * option needs to be enabled to receive this event.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.SegmentPlayback constant.
   *
   * @event
   * @since v6.1
   */
  SegmentPlayback = 'segmentplayback',
  /**
   * Is fired when metadata (i.e. ID3 tags in HLS and EMSG in DASH) are encountered.
   * The passed event is of type {@link MetadataEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Metadata constant.
   *
   * @event
   * @since v4.0
   */
  Metadata = 'metadata',
  /**
   * Is fired when metadata (i.e. ID3 tags in HLS and EMSG in DASH) is parsed.
   * The passed event is of type {@link MetadataParsedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.MetadataParsed constant.
   *
   * @event
   * @since v7.6
   */
  MetadataParsed = 'metadataparsed',
  /**
   * Is fired before a new video segment is downloaded.
   * The passed event is of type {@link VideoAdaptationEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.VideoAdaptation constant.
   *
   * @event
   * @since v4.0
   */
  VideoAdaptation = 'videoadaptation',
  /**
   * Is fired before a new audio segment is downloaded.
   * The passed event is of type {@link AudioAdaptationEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AudioAdaptation constant.
   *
   * @event
   * @since v4.0
   */
  AudioAdaptation = 'audioadaptation',
  /**
   * Is fired immediately after a download finishes successfully, or if all retries of a download failed.
   * The passed event is of type {@link DownloadFinishedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.DownloadFinished constant.
   *
   * @event
   * @since v4.0
   */
  DownloadFinished = 'downloadfinished',
  /**
   * Is fired when a segment download has been finished, whether successful or not.
   * The passed event is of type {@link SegmentRequestFinishedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.SegmentRequestFinished constant.
   *
   * @event
   * @since v6.0
   */
  SegmentRequestFinished = 'segmentrequestfinished',
  /**
   * Is fired when the ad manifest has been successfully loaded.
   * The passed event is of type {@link AdManifestLoadedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AdManifestLoaded constant.
   *
   * @event
   * @since v4.0
   */
  AdManifestLoaded = 'admanifestloaded',
  /**
   * Is fired when the playback of an ad has been started.
   * The passed event is of type {@link AdEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AdStarted constant.
   *
   * @event
   * @since v4.1
   */
  AdStarted = 'adstarted',
  /**
   * Is fired when an overlay ad has been started.
   * The passed event is of type {@link AdEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEVENT.OverlayAdStarted constant.
   *
   * @event
   * @since v8.0
   */
  OverlayAdStarted = 'overlayadstarted',
  /**
   * Is fired when the playback of an ad has progressed over a quartile boundary.
   * The passed event is of type {@link AdQuartileEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AdQuartile constant.
   *
   * @event
   * @since v7.4.6
   */
  AdQuartile = 'adquartile',
  /**
   * Is fired when an ad has been skipped.
   * The passed event is of type {@link AdEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AdSkipped constant.
   *
   * @event
   * @since v4.1
   */
  AdSkipped = 'adskipped',
  /**
   * Is fired when the user clicks on the ad.
   * The passed event is of type {@link AdClickedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AdClicked constant.
   *
   * @event
   * @since v4.3
   */
  AdClicked = 'adclicked',
  /**
   * Is fired when VPAID ad changes its linearity.
   * The passed event is of type {@link AdLinearityChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AdLinearityChanged constant.
   *
   * @event
   * @since v6.0
   */
  AdLinearityChanged = 'adlinearitychanged',
  /**
   * Is fired when the playback of an ad break has started. Several {@link AdStarted} and
   * {@link AdFinished} events can follow before the ad break closes with an
   * {@link AdBreakFinished} event.
   * The passed event is of type {@link AdBreakEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AdBreakStarted constant.
   *
   * @event
   * @since v7.5.4
   */
  AdBreakStarted = 'adbreakstarted',

  /**
   * Is fired when the playback of an ad break has ended and the main content has been restored. Is preceded by a
   * @see {@link AdBreakStarted} event.
   * The passed event is of type {@link AdBreakEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AdBreakFinished constant.
   *
   * @event
   * @since v7.5.4
   */
  AdBreakFinished = 'adbreakfinished',

  /**
   * Is fired when the playback of an break has finished and the player is about to start restoring the main content.
   * Is succeeded by a {@link AdBreakFinished} event once the main content has been restored.
   *
   * @event
   * @since v8.193.0
   */
  RestoringContent = 'restoringcontent',
  /**
   * Is fired when the playback of an ad has been finished.
   * The passed event is of type {@link AdEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AdFinished constant.
   *
   * @event
   * @since v4.1
   */
  AdFinished = 'adfinished',
  /**
   * Is fired when ad playback fails.
   * The passed event is of type {@link ErrorEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.AdError constant.
   *
   * @event
   * @since v6.0
   */
  AdError = 'aderror',
  /**
   * This event is fired when the VR viewing direction changes. The minimal interval between two consecutive event
   * callbacks is specified through {@link PlayerVRAPI.setViewingDirectionChangeEventInterval}.
   * The passed event is of type {@link VRViewingDirectionChangeEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.VRViewingDirectionChange constant.
   *
   * @event
   * @since v7.2
   */
  VRViewingDirectionChange = 'vrviewingdirectionchange',
  /**
   * This event is fired when the VR viewing direction did not change more than the specified threshold in the last
   * interval, after the {@link VRViewingDirectionChange} event was triggered. The threshold can be set through
   * {@link PlayerVRAPI.setViewingDirectionChangeThreshold}.
   * The passed event is of type {@link VRViewingDirectionChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.VRViewingDirectionChanged constant.
   *
   * @event
   * @since v7.2
   */
  VRViewingDirectionChanged = 'vrviewingdirectionchanged',
  /**
   * Is fired when the stereo mode during playback of VR content changes.
   * The passed event is of type {@link VRStereoChangedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.VRStereoChanged constant.
   *
   * @event
   * @since v6.0
   */
  VRStereoChanged = 'vrstereochanged',
  /**
   * Is fired when casting to another device, such as a ChromeCast, is available.
   * The passed event is of type {@link CastAvailableEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.CastAvailable constant.
   *
   * @event
   * @since v4.0
   */
  CastAvailable = 'castavailable',
  /**
   * Is fired when the casting is stopped.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.CastStopped constant.
   *
   * @event
   * @since v7.0
   */
  CastStopped = 'caststopped',
  /**
   * Is fired when the casting has been initiated, but the user still needs to choose which device should be used.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.CastStart constant.
   *
   * @event
   * @since v4.0
   */
  CastStart = 'caststart',
  /**
   * Is fired when the Cast app is either launched successfully or an active Cast session is resumed successfully.
   * The passed event is of type {@link CastStartedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.CastStarted constant.
   *
   * @event
   * @since v7.0
   */
  CastStarted = 'caststarted',
  /**
   * Is fired when the user has chosen a cast device and the player is waiting for the device to get ready for
   * playback.
   * The passed event is of type {@link CastWaitingForDeviceEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.CastWaitingForDevice constant.
   *
   * @event
   * @since v4.0
   */
  CastWaitingForDevice = 'castwaitingfordevice',
  /**
   * Is fired when a new source is loaded. This does not mean that loading of the new manifest has been finished.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.SourceLoaded constant.
   *
   * @event
   * @since v4.2
   */
  SourceLoaded = 'sourceloaded',
  /**
   * Is fired when the current source has been unloaded.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.SourceUnloaded constant.
   *
   * @event
   * @since v4.2
   */
  SourceUnloaded = 'sourceunloaded',
  /**
   * Is fired when a period switch starts.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.PeriodSwitch constant.
   *
   * @event
   * @since v6.2
   */
  PeriodSwitch = 'periodswitch',
  /**
   * Is fired when a period switch was performed.
   * The passed event is of type {@link PeriodSwitchedEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.PeriodSwitched constant.
   *
   * @event
   * @since v4.0
   */
  PeriodSwitched = 'periodswitched',
  /**
   * Is fired if the player is paused or in buffering state and the timeShift offset has exceeded the available
   * timeShift window.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.DVRWindowExceeded constant.
   *
   * @event
   * @since v4.0
   */
  DVRWindowExceeded = 'dvrwindowexceeded',
  /**
   * Is fired when a new subtitles/captions track is added, for example using the addSubtitle API call or when
   * in-stream closed captions are encountered.
   * The passed event is of type {@link SubtitleEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.SubtitleAdded constant.
   *
   * @event
   * @since v4.0
   */
  SubtitleAdded = 'subtitleadded',
  /**
   * Is fired when an external subtitle file has been removed so it is possible to update the controls accordingly.
   * The passed event is of type {@link SubtitleEvent}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.SubtitleRemoved constant.
   *
   * @event
   * @since v4.0
   */
  SubtitleRemoved = 'subtitleremoved',
  /**
   * Is fired when the airplay playback target picker is shown.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * @event
   * @since v7.1
   */
  ShowAirplayTargetPicker = 'showairplaytargetpicker',
  /**
   * Is fired when the airplay playback target turned available.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * @event
   * @since v7.1
   */
  AirplayAvailable = 'airplayavailable',
  /**
   * Is fired when a media element starts or stops AirPlay playback.
   * The passed event is of type {@link AirplayChangedEvent}.
   *
   * @event
   * @since v7.8.4
   */
  AirplayChanged = 'airplaychanged',
  /**
   * Is fired when the player instance is destroyed.
   * The passed event is of type {@link PlayerEventBase}.
   *
   * Also accessible via the bitmovin.player.PlayerEvent.Destroy constant.
   *
   * @event
   * @since v7.2
   */
  Destroy = 'destroy',
  /**
   * Is fired when the playback speed is changed.
   * The passed event is of type {@link PlaybackSpeedChangedEvent}.
   *
   * @event
   * @since v7.8
   */
  PlaybackSpeedChanged = 'playbackspeedchanged',
  /**
   * Is fired when the player's {@link ViewMode} is changed, e.g. with a call to {@link PlayerAPI.setViewMode}.
   * The passed event is of type {@link ViewModeChangedEvent}.
   *
   * @event
   * @since v8.0
   */
  ViewModeChanged = 'viewmodechanged',
  /**
   * Is fired when a module exposes a public API and the API is ready to be used and available at
   * `playerInstance.{namespace}`, e.g. `player.vr` for the VR module.
   * The passed event is of type {@link ModuleReadyEvent}.
   *
   * @event
   * @since v8.0
   */
  ModuleReady = 'moduleready',
  /**
   * Is fired when a subtitle is being enabled.
   * The passed event is of type {@link SubtitleEvent}.
   *
   * @event
   * @since v8.0
   */
  SubtitleEnable = 'subtitleenable',
  /**
   * Is fired when a subtitle got enabled.
   * The passed event is of type {@link SubtitleEvent}.
   *
   * @event
   * @since v8.0
   */
  SubtitleEnabled = 'subtitleenabled',
  /**
   * Is fired when a subtitle is being disabled.
   * The passed event is of type {@link SubtitleEvent}.
   *
   * @event
   * @since v8.0
   */
  SubtitleDisable = 'subtitledisable',
  /**
   * Is fired when a subtitle got disabled.
   * The passed event is of type {@link SubtitleEvent}.
   *
   * @event
   * @since v8.0
   */
  SubtitleDisabled = 'subtitledisabled',
  /**
   * Is fired when one ore more video representations have been added to the stream.
   * The passed event is of type {@link VideoQualityEvent}.
   *
   * @event
   * @since v8.2
   */
  VideoQualityAdded = 'videoqualityadded',
  /**
   * Is fired when one ore more video representations have been removed from the stream.
   * The passed event is of type {@link VideoQualityEvent}.
   *
   * @event
   * @since v8.2
   */
  VideoQualityRemoved = 'videoqualityremoved',
  /**
   * Is fired when one ore more audio representations have been added to the stream.
   * The passed event is of type {@link AudioQualityEvent}.
   *
   * @event
   * @since v8.2
   */
  AudioQualityAdded = 'audioqualityadded',
  /**
   * Is fired when one ore more audio representations have been removed from the stream.
   * The passed event is of type {@link AudioQualityEvent}.
   *
   * @event
   * @since v8.2
   */
  AudioQualityRemoved = 'audioqualityremoved',
}

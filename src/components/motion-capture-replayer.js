/* global THREE, AFRAME  */
AFRAME.registerComponent('motion-capture-replayer', {
  schema: {
    enabled: {default: true},
    recorderEl: {type: 'selector'},
    loop: {default: false},
    src: {default: ''},
    spectatorCamera: {default: false}
  },

  init: function () {
    this.currentPoseTime = 0;
    this.currentEventTime = 0;
    this.currentPoseIndex = 0;
    this.currentEventIndex = 0;
    this.onStrokeStarted = this.onStrokeStarted.bind(this);
    this.onStrokeEnded = this.onStrokeEnded.bind(this);
    this.playComponent = this.playComponent.bind(this);
    this.el.addEventListener('pause', this.playComponent);
    this.discardedFrames = 0;
    this.playingEvents = [];
    this.playingPoses = [];
  },

  remove: function () {
    this.el.removeEventListener('pause', this.playComponent);
    this.stopReplaying();
    this.el.pause();
    this.el.play();
  },

  update: function (oldData) {
    var data = this.data;
    this.updateRecorder(data.recorderEl, oldData.recorderEl);
    if (!this.el.isPlaying) { this.playComponent(); }
    if (oldData.src === data.src) { return; }
    if (data.src) { this.updateSrc(data.src); }
  },

  updateRecorder: function (newRecorderEl, oldRecorderEl) {
    if (oldRecorderEl && oldRecorderEl !== newRecorderEl) {
      oldRecorderEl.removeEventListener('strokestarted', this.onStrokeStarted);
      oldRecorderEl.removeEventListener('strokeended', this.onStrokeEnded);
    }
    if (!newRecorderEl || oldRecorderEl === newRecorderEl) { return; }
    newRecorderEl.addEventListener('strokestarted', this.onStrokeStarted);
    newRecorderEl.addEventListener('strokeended', this.onStrokeEnded);
  },

  updateSrc: function (src) {
    this.el.sceneEl.systems['motion-capture-recorder'].loadRecordingFromUrl(src, false, this.startReplaying.bind(this));
  },

  onStrokeStarted: function(evt) {
    this.reset();
  },

  onStrokeEnded: function(evt) {
    this.startReplayingPoses(evt.detail.poses);
  },

  play: function () {
    if (this.playingStroke) { this.playStroke(this.playingStroke); }
  },

  playComponent: function () {
    this.el.isPlaying = true;
    this.play();
  },

  startReplaying: function (data) {
    this.ignoredFrames = 0;
    this.storeInitialPose();
    this.isReplaying = true;
    this.startReplayingPoses(data.poses);
    this.startReplayingEvents(data.events);
    if (data.gamepad) {
      this.el.sceneEl.systems['motion-capture-replayer'].gamepads.push(data.gamepad);
      this.el.emit('gamepadconnected');
    }
    this.el.emit('replayingstarted');
  },

  stopReplaying: function () {
    this.isReplaying = false;
    this.restoreInitialPose();
    this.el.emit('replayingstopped');
  },

  storeInitialPose: function () {
    var el = this.el;
    this.initialPose = {
      position: el.getAttribute('position'),
      rotation: el.getAttribute('rotation')
    };
  },

  restoreInitialPose: function () {
    var el = this.el;
    if (!this.initialPose) { return; }
    el.setAttribute('position', this.initialPose.position);
    el.setAttribute('rotation', this.initialPose.rotation);
  },

  startReplayingPoses: function (poses) {
    this.isReplaying = true;
    this.currentPoseIndex = 0;
    if (poses.length === 0) { return; }
    this.playingPoses = poses;
    this.currentPoseTime = poses[0].timestamp;
  },

  startReplayingEvents: function (events) {
    var firstEvent;
    this.isReplaying = true;
    this.currentEventIndex = 0;
    if (events.length === 0) { return; }
    firstEvent = events[0];
    this.playingEvents = events;
    this.currentEventTime = firstEvent.timestamp;
    this.el.emit(firstEvent.name, firstEvent);
  },

  // Reset player
  reset: function () {
    this.playingPoses = null;
    this.currentTime = undefined;
    this.currentPoseIndex = undefined;
  },

  /**
   * Called on tick.
   */
  playRecording: function (delta) {
    var currentPose;
    var currentEvent
    var playingPoses = this.playingPoses;
    var playingEvents = this.playingEvents;
    currentPose = playingPoses && playingPoses[this.currentPoseIndex]
    currentEvent = playingEvents && playingEvents[this.currentEventIndex];
    this.currentPoseTime += delta;
    this.currentEventTime += delta;
    // determine next pose
    while ((currentPose && this.currentPoseTime >= currentPose.timestamp) ||
           (currentEvent && this.currentPoseTime >= currentEvent.timestamp)) {
      // pose
      if (currentPose && this.currentPoseTime >= currentPose.timestamp) {
        if (this.currentPoseIndex === playingPoses.length - 1) {
          if (this.data.loop) {
            this.currentPoseIndex = 0;
            this.currentPoseTime = playingPoses[0].timestamp;
          } else {
            this.stopReplaying();
          }
        }
        applyPose(this.el, currentPose);
        this.currentPoseIndex += 1;
        currentPose = playingPoses[this.currentPoseIndex];
      }
      // event
      if (currentEvent && this.currentPoseTime >= currentEvent.timestamp) {
        if (this.currentEventIndex === playingEvents.length && this.data.loop) {
          this.currentEventIndex = 0;
          this.currentEventTime = playingEvents[0].timestamp;
        }
        this.el.emit(currentEvent.name, currentEvent.detail);
        this.currentEventIndex += 1;
        currentEvent = this.playingEvents[this.currentEventIndex];
      }
    }
  },

  tick:  function (time, delta) {
    // Ignore the first couple of frames that come from window.RAF on Firefox.
    if (this.ignoredFrames !== 2 && !window.debug) {
      this.ignoredFrames++;
      return;
    }

    if (!this.isReplaying) { return; }
    this.playRecording(delta);
  }
});

function applyPose (el, pose) {
  el.setAttribute('position', pose.position);
  el.setAttribute('rotation', pose.rotation);
};

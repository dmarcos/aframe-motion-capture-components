/* global AFRAME, THREE */
var log = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:info');

AFRAME.registerComponent('motion-capture-replayer', {
  schema: {
    enabled: {default: true},
    recorderEl: {type: 'selector'},
    loop: {default: true},
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
    this.discardedFrames = 0;
    this.replayingEvents = [];
    this.replayingPoses = [];
  },

  update: function (oldData) {
    var data = this.data;
    this.updateRecorder(data.recorderEl, oldData.recorderEl);
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
    var system = this.el.sceneEl.systems['motion-capture-recorder'];
    system.loadRecordingFromUrl(src, false, this.startReplaying.bind(this));
  },

  onStrokeStarted: function(evt) {
    this.reset();
  },

  onStrokeEnded: function(evt) {
    this.startReplaying({
      poses: evt.detail.poses,
      events: []
    });
  },

  play: function () {
    if (this.replayingStroke) { this.startReplaying(this.replayingStroke); }
  },

  startReplaying: function (data) {
    this.ignoredFrames = 0;
    this.storeInitialPose();
    this.startReplayingPoses(data.poses);
    this.startReplayingEvents(data.events);
  },

  stopReplaying: function () {
    this.isReplaying = false;
    this.restoreInitialPose();
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
    if (!poses.length) { return; }
    this.isReplaying = true;
    this.currentPoseIndex = 0;
    this.replayingPoses = poses;
    this.currentPoseTime = poses[0].timestamp;
  },

  startReplayingEvents: function (events) {
    var firstEvent;
    if (!events.length) { return; }
    this.isReplaying = true;
    this.currentEventIndex = 0;
    this.replayingEvents = events;
    firstEvent = events[0];
    if (!firstEvent) { return; }
    this.currentEventTime = firstEvent.timestamp;
    this.el.emit(firstEvent.name, firstEvent.detail);
  },

  // Reset player
  reset: function () {
    this.replayingPoses = null;
    this.currentTime = undefined;
    this.currentPoseIndex = undefined;
  },

  /**
   * Called on tick.
   */
  playRecording: function (delta) {
    var currentPose;
    var currentEvent
    var replayingPoses = this.replayingPoses;
    var replayingEvents = this.replayingEvents;
    currentPose = replayingPoses && replayingPoses[this.currentPoseIndex]
    currentEvent = replayingEvents && replayingEvents[this.currentEventIndex];
    this.currentPoseTime += delta;
    this.currentEventTime += delta;

    // Poses.
    while (currentPose && this.currentPoseTime >= currentPose.timestamp) {
      applyPose(this.el, currentPose);
      this.currentPoseIndex += 1;
      currentPose = replayingPoses[this.currentPoseIndex];
    }

    // Events.
    while (currentEvent && this.currentEventTime >= currentEvent.timestamp) {
      this.el.emit(currentEvent.name, currentEvent.detail);
      this.currentEventIndex += 1;
      currentEvent = this.replayingEvents[this.currentEventIndex];
    }

    // End of recording reached.
    if (this.currentPoseIndex >= replayingPoses.length) {
      // With loop. Restore pose, reset state, restart.
      if (this.data.loop) {
        log('End of recording reached. Looping replay.');
        this.restart();
        return;
      }

      // Without loop. Stop replaying, restore pose, reset state.
      log('End of recording reached.', this.el);
      this.stopReplaying();
      this.restart();
    }
  },

  restart: function () {
    this.currentPoseIndex = 0;
    this.currentPoseTime = this.replayingPoses[0].timestamp;
    this.currentEventIndex = 0;
    this.currentEventTime = this.replayingEvents[0] ? this.replayingEvents[0].timestamp : 0;
  },

  tick:  function (time, delta) {
    var deltaTime;

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

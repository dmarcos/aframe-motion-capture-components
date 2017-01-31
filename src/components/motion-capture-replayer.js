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
    this.playingEvents = [];
    this.playingPoses = [];
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
    this.el.sceneEl.systems['motion-capture-recorder'].loadRecordingFromUrl(src, false, this.startReplaying.bind(this));
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
    if (this.playingStroke) { this.startReplaying(this.playingStroke); }
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
    this.isReplaying = true;
    this.currentPoseIndex = 0;
    this.playingPoses = poses;
    this.currentPoseTime = poses[0].timestamp;
  },

  startReplayingEvents: function (events) {
    var firstEvent;
    this.isReplaying = true;
    this.currentEventIndex = 0;
    this.playingEvents = events;
    firstEvent = events[0];
    if (!firstEvent) { return; }
    this.currentEventTime = firstEvent.timestamp;
    this.el.emit(firstEvent.name, firstEvent.detail);
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

    // Poses.
    while (currentPose && this.currentPoseTime >= currentPose.timestamp) {
      applyPose(this.el, currentPose);
      this.currentPoseIndex += 1;
      currentPose = playingPoses[this.currentPoseIndex];
    }

    // Events.
    while (currentEvent && this.currentEventTime >= currentEvent.timestamp) {
      this.el.emit(currentEvent.name, currentEvent.detail);
      this.currentEventIndex += 1;
      currentEvent = this.playingEvents[this.currentEventIndex];
    }

    // End of recording reached with loop. Restore pose, reset state, restart.
    if (this.data.loop && this.currentPoseIndex >= playingPoses.length) {
      log('End of recording reached. Looping replay.');
      this.restart();
    }

    // End of recording reached without loop. Stop replaying, restore pose, reset state.
    if (!this.data.loop && this.currentPoseIndex >= playingPoses.length) {
      log('End of recording reached.', this.el);
      this.stopReplaying();
      this.restart();
    }
  },

  restart: function () {
    this.currentPoseIndex = 0;
    this.currentPoseTime = this.playingPoses[0].timestamp;
    this.currentEventIndex = 0;
    this.currentEventTime = this.playingEvents[0] ? this.playingEvents[0].timestamp : 0;
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

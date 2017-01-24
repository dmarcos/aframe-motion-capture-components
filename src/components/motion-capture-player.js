/* global THREE AFRAME  */
AFRAME.registerComponent('motion-capture-player', {
  schema: {
    enabled: {default: true},
    recorderEl: {type: 'selector'},
    loop: {default: true},
    src: {default: ''}
  },

  init: function () {
    this.onStrokeStarted = this.onStrokeStarted.bind(this);
    this.onStrokeEnded = this.onStrokeEnded.bind(this);
    this.discardedFrames = 0;
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
    this.el.sceneEl.systems['motion-capture-recorder'].loadRecordingFromUrl(src, false, this.startPlaying.bind(this));
  },

  onStrokeStarted: function(evt) {
    this.reset();
  },

  onStrokeEnded: function(evt) {
    this.startPlaying({
      poses: evt.detail.poses,
      events: []
    });
  },

  play: function () {
    if (this.playingStroke) { this.startPlaying(this.playingStroke); }
  },

  startPlaying: function (data) {
    this.isPlaying = true;
    this.ignoredFrames = 0;
    this.storeInitialPose();
    this.startPlayingPoses(data.poses);
    this.startPlayingEvents(data.events);
  },

  stopPlaying: function () {
    this.isPlaying = false;
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

  startPlayingPoses: function (poses) {
    this.currentPoseIndex = 0;
    this.playingPoses = poses;
    this.currentPoseTime = poses[0].timestamp;
  },

  startPlayingEvents: function (events) {
    var firstEvent;
    this.currentEventIndex = 0;
    this.playingEvents = events;
    firstEvent = events[0];
    if (!firstEvent) { return; }
    this.currentEventTime = firstEvent.timestamp;
    this.el.emit(firstEvent.name, {id: firstEvent.id, state: firstEvent.state});
  },

  // Reset player
  reset: function () {
    this.playingPoses = null;
    this.currentTime = undefined;
    this.currentPoseIndex = undefined;
  },

  applyPose:  function (pose) {
    var el = this.el;
    el.setAttribute('position', pose.position);
    el.setAttribute('rotation', pose.rotation);
  },

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
    while (currentPose && this.currentPoseTime >= currentPose.timestamp) {
      // pose
      if (currentPose && this.currentPoseTime >= currentPose.timestamp) {
        if (this.currentPoseIndex === playingPoses.length - 1 && this.data.loop) {
          this.restart();
        }
        this.applyPose(currentPose);
        this.currentPoseIndex += 1;
        currentPose = playingPoses[this.currentPoseIndex];
      }

      // event
      if (currentEvent && this.currentPoseTime >= currentEvent.timestamp) {
        this.el.emit(currentEvent.name, {id: currentEvent.detail.id});
        this.currentEventIndex += 1;
        currentEvent = this.playingEvents[this.currentEventIndex];
      }
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
    if (this.ignoredFrames !== 2) {
      this.ignoredFrames++;
      return;
    }
    if (this.isPlaying) { this.playRecording(delta); }
  }
});
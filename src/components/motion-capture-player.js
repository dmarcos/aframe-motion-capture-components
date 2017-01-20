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
    this.startPlayingPoses(evt.detail.poses);
  },

  play: function () {
    if (this.playingStroke) { this.playStroke(this.playingStroke); }
  },

  startPlaying: function (data) {
    this.isPlaying = true;
    this.startPlayingPoses(data.poses);
    this.startPlayingEvents(data.events);
  },

  startPlayingPoses: function (poses) {
    this.currentPoseIndex = 0;
    if (poses.length === 0) { return; }
    this.playingPoses = poses;
    this.currentPoseTime = poses[0].timestamp;
  },

  startPlayingEvents: function (events) {
    var firstEvent;
    this.currentEventIndex = 0;
    if (events.length === 0) { return; }
    firstEvent = events[0];
    this.playingEvents = events;
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
    while ((currentPose && this.currentPoseTime >= currentPose.timestamp) ||
           (currentEvent && this.currentPoseTime >= currentEvent.timestamp)) {
      // pose
      if (currentPose && this.currentPoseTime >= currentPose.timestamp) {
        if (this.currentPoseIndex === playingPoses.length && this.data.loop) {
          this.currentPoseIndex = 0;
          this.currentPoseTime = playingPoses[0].timestamp;
        }
        this.applyPose(currentPose);
        this.currentPoseIndex += 1;
        currentPose = playingPoses[this.currentPoseIndex];
      }
      // event
      if (currentEvent && this.currentPoseTime >= currentEvent.timestamp) {
        if (this.currentEventIndex === playingEvents.length && this.data.loop) {
          this.currentEventIndex = 0;
          this.currentEventTime = playingEvents[0].timestamp;
        }
        this.el.emit(currentEvent.name, {id: currentEvent.detail.id});
        this.currentEventIndex += 1;
        currentEvent = this.playingEvents[this.currentEventIndex];
      }
    }
  },

  tick:  function (time, delta) {
    if (this.isPlaying) { this.playRecording(delta); }
  }
});
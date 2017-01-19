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
    var self = this;
    this.el.sceneEl.systems['motion-capture-recorder'].loadRecordingFromUrl(src, false, loaded);
    function loaded (data) {
      self.startPlayPoses(data.poses);
      self.startPlayEvents(data.events);
    }
  },

  onStrokeStarted: function(evt) {
    this.reset();
  },

  onStrokeEnded: function(evt) {
    this.startPlayPoses(evt.detail.poses);
  },

  play: function () {
    if (this.playingStroke) { this.playStroke(this.playingStroke); }
  },

  startPlayPoses: function (poses) {
    if (poses.length === 0) { return; }
    this.playingPoses = poses;
    this.currentPoseTime = poses[0].timestamp;
    this.currentPoseIndex = 0;
  },

  startPlayEvents: function (events) {
    var firstEvent;
    if (events.length === 0) { return; }
    firstEvent = events[0];
    this.playingEvents = events;
    this.currentEventTime = firstEvent.timestamp;
    this.currentEventIndex = 0;
    this.el.emit(firstEvent.name, {id: firstEvent.id, state: firstEvent.state});
  },

  // Reset player
  reset: function () {
    this.playingPoses = null;
    this.currentTime = undefined;
    this.currentPoseIndex = undefined;
  },

  applyPose: (function(pose) {
    var euler = new THREE.Euler();
    return function (pose) {
      var el = this.el;
      euler.setFromQuaternion(pose.rotation);
      el.setAttribute('position', pose.position);
      el.setAttribute('rotation', euler);
    }
  })(),

  playPoses: function (delta) {
    var currentPose;
    var playingPoses = this.playingPoses;
    if (!playingPoses || this.currentPoseIndex === playingPoses.length) { return; }
    currentPose = playingPoses[this.currentPoseIndex]
    this.applyPose(currentPose);
    this.currentPoseTime += delta;
    // determine next pose
    if (this.currentPoseTime >= currentPose.timestamp) {
      this.currentPoseIndex += 1;
      if (this.currentPoseIndex === playingPoses.length && this.data.loop) {
        this.currentPoseIndex = 0;
        this.currentPoseTime = playingPoses[0].timestamp;
      }
    }
  },

  playEvents: function (delta) {
    var currentEvent;
    var playingEvents = this.playingEvents;
    if (!playingEvents || this.currentEventIndex === playingEvents.length) { return; }
    currentEvent = this.playingEvents[this.currentEventIndex];
    this.currentEventTime += delta;
    // determine next event
    if (this.currentEventTime >= currentEvent.timestamp) {
      this.currentEventIndex += 1;
      if (this.currentEventIndex === playingEvents.length && this.data.loop) {
        this.currentEventIndex = 0;
        this.currentEventTime = playingEvents[0].timestamp;
      }
      currentEvent = this.playingEvents[this.currentEventIndex];
      this.el.emit(currentEvent.name, {id: currentEvent.id, state: currentEvent.state});
    }
  },

  tick:  function (time, delta) {
    this.playPoses(delta);
    this.playEvents(delta);
  }
});
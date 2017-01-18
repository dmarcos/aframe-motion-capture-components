/* global THREE AFRAME  */
AFRAME.registerComponent('motion-capture-player', {
  schema: {
    enabled: {default: true},
    recorderEl: {type: 'selector'},
    src: {default: '/assets/motion-capture-test.json'}
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
    this.el.sceneEl.systems['motion-capture-recorder'].loadStrokeFromUrl(src, false, loaded);
    function loaded (stroke) {
      self.playStroke(stroke);
    }
  },

  onStrokeStarted: function(evt) {
    this.reset();
  },

  onStrokeEnded: function(evt) {
    this.playStroke(evt.detail.stroke);
  },

  play: function () {
    if (this.playingStroke) { this.playStroke(this.playingStroke); }
  },

  playStroke: function (stroke) {
    this.playingStroke = stroke;
    this.currentTime = stroke.timestamp;
    this.currentPoseIndex = 0;
  },

  // Reset player
  reset: function () {
    this.playingStroke = null;
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

  tick: (function () {
    var position = new THREE.Vector3();
    var rotation = new THREE.Quaternion();
    var scale = new THREE.Vector3();

    return function (time, delta) {
      var currentTime;
      var currentPose;
      var playingStroke = this.playingStroke;
      if (!playingStroke) { return; }
      if (!this.currentTime) {
        this.currentTime = playingStroke[0].timestamp;
      } else {
        this.currentTime += delta;
      }
      if (this.currentTime >= this.playingStroke[this.currentPoseIndex].timestamp) {
        this.currentPoseIndex += 1;
        if (this.currentPoseIndex === playingStroke.length) {
          this.currentPoseIndex = 0;
          this.currentTime = playingStroke[0].timestamp;
        }
      }
      this.applyPose(playingStroke[this.currentPoseIndex]);
    };
  })(),
});
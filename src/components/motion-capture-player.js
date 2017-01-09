/* global THREE AFRAME  */
AFRAME.registerComponent('motion-capture-player', {
  schema: {
    enabled: {default: true},
    recorderEl: {type: 'selector'}
  },

  init: function () {
    this.onStrokeStarted = this.onStrokeStarted.bind(this);
    this.onStrokeEnded = this.onStrokeEnded.bind(this);
  },

  update: function (oldData) {
    var recorderEl = this.data.recorderEl;
    var oldRecorderEl = oldData.recorderEl;
    if (oldRecorderEl && oldRecorderEl !== recorderEl) {
      oldData.recorderEl.removeEventListener('strokestarted', this.onStrokeStarted);
      oldData.recorderEl.removeEventListener('strokeended', this.onStrokeEnded);
    }
    if (oldRecorderEl === recorderEl) { return; }
    recorderEl.addEventListener('strokestarted', this.onStrokeStarted);
    recorderEl.addEventListener('strokeended', this.onStrokeEnded);
  },

  onStrokeStarted: function(evt) {
    this.playingStroke = null;
    // Reset player
    this.currentTime = undefined;
    this.currentPoseIndex = undefined;
  },

  onStrokeEnded: function(evt) {
    this.playingStroke = evt.detail.stroke;
    this.currentTime = this.playingStroke[0].timestamp;
    this.currentPoseIndex = 0;
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
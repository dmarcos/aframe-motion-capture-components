/* global THREE AFRAME  */
AFRAME.registerComponent('avatar-recorder', {
  schema: {
    autoStart: {default: false}
  },

  init: function () {
    var self = this;
    this.trackedControllersEls = {};
    this.onKeyDown = this.onKeyDown.bind(this);
    this.tick = AFRAME.utils.throttle(this.throttledTick, 100, this);
    this.el.addEventListener('camera-ready', function (evt) {
      self.cameraEl = evt.detail.cameraEl;
      self.cameraEl.setAttribute('motion-capture-recorder', {autoStart: true, visibleStroke: false});
    });
  },

  throttledTick: function() {
    var self = this;
    var trackedControllersEls = document.querySelectorAll('[tracked-controls]');
    trackedControllersEls.forEach(function (trackedControllerEl) {
      if (!trackedControllerEl.id) {
        console.warn('Player Recorder: Found tracked controllers with no id. It will not be recorded');
        return;
      }
      if (self.trackedControllersEls[trackedControllerEl.id]) { return; }
      trackedControllerEl.setAttribute('motion-capture-recorder', {autoStart: true, visibleStroke: false});
      self.trackedControllersEls[trackedControllerEl.id] = trackedControllerEl;
      if (this.isRecording) { trackedControllerEl.components['motion-capture-recorder'].startRecording(); }
    });
  },

  play: function () {
    window.addEventListener('keydown', this.onKeyDown);
  },

  pause: function () {
    window.removeEventListener('keydown', this.onKeyDown);
  },

  /**
   * <ctrl> + <alt> + <shift> + r = toggle recording
   */
  onKeyDown: function (evt) {
    var shortcutPressed = evt.keyCode === 82 && evt.ctrlKey && evt.altKey && evt.shiftKey;
    if (!shortcutPressed) { return; }
    this.toggleRecording();
  },

  toggleRecording: function () {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  },

  startRecording: function () {
    var trackedControllersEls = this.trackedControllersEls;
    var keys = Object.keys(trackedControllersEls);
    if (this.isRecording) { return; }
    this.isRecording = true;
    this.cameraEl.components['motion-capture-recorder'].startRecording();
    keys.forEach(function (id) {
      trackedControllersEls[id].components['motion-capture-recorder'].startRecording();
    });
  },

  stopRecording: function () {
    var trackedControllersEls = this.trackedControllersEls;
    var keys = Object.keys(trackedControllersEls);
    if (!this.isRecording) { return; }
    this.isRecording = false;
    this.cameraEl.components['motion-capture-recorder'].stopRecording();
    keys.forEach(function (id) {
      trackedControllersEls[id].components['motion-capture-recorder'].stopRecording();
    });
    this.saveRecording();
  },

  getJSONData: function () {
    var data = {};
    var trackedControllersEls = this.trackedControllersEls;
    var keys = Object.keys(trackedControllersEls);
    if (this.isRecording) { false; }
    this.isRecording = false;
    data.camera = this.cameraEl.components['motion-capture-recorder'].getJSONData();
    keys.forEach(function (id) {
      data[id] = trackedControllersEls[id].components['motion-capture-recorder'].getJSONData();
    });
    return data;
  },

  saveRecording: function (binary) {
    var jsonData = JSON.stringify(this.getJSONData());
    var type = binary ? 'application/octet-binary' : 'application/json';
    var blob = new Blob([jsonData], {type: type});
    var url = URL.createObjectURL(blob);
    var fileName = 'player-recording-' + document.title + '-' + Date.now() + '.json';
    var aEl = document.createElement('a');
    aEl.href = url;
    aEl.setAttribute('download', fileName);
    aEl.innerHTML = 'downloading...';
    aEl.style.display = 'none';
    document.body.appendChild(aEl);
    setTimeout(function () {
      aEl.click();
      document.body.removeChild(aEl);
    }, 1);
  },
});
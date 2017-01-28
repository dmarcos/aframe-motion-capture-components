/* global THREE AFRAME  */
AFRAME.registerComponent('avatar-recorder', {
  schema: {
    autoRecording: {default: false},
    autoPlay: {default: false},
    localStorage: {default: false},
    binaryFormat: {default: false}
  },

  init: function () {
    var self = this;
    this.trackedControllerEls = {};
    this.onKeyDown = this.onKeyDown.bind(this);
    this.tick = AFRAME.utils.throttle(this.throttledTick, 100, this);
    this.el.addEventListener('camera-set-active', function (evt) {
      self.cameraEl = evt.detail.cameraEl;
      self.cameraEl.setAttribute('motion-capture-recorder', {autoStart: true, visibleStroke: false});
    });
  },

  playRecording: function () {
    var data;
    var el = this.el;
    if (!this.data.autoPlay) { return; }
    data = JSON.parse(localStorage.getItem('avatar-recording')) || this.recordingData;
    if (!data) { return; }
    el.setAttribute('avatar-replayer', {loop: true});
    el.components['avatar-replayer'].startPlaying(data);
  },

  stopPlayRecording: function () {
    var avatarPlayer = this.el.components['avatar-replayer'];
    if (!avatarPlayer) { return; }
    avatarPlayer.stopPlaying();
  },

  /**
   * Poll for tracked contorllers.
   */
  throttledTick: function () {
    var self = this;
    var trackedControllerEls = this.el.querySelectorAll('[tracked-controls]');
    trackedControllerEls.forEach(function (trackedControllerEl) {
      if (!trackedControllerEl.id) {
        console.warn('Player Recorder: Found tracked controllers with no id. It will not be recorded');
        return;
      }
      if (self.trackedControllerEls[trackedControllerEl.id]) { return; }
      trackedControllerEl.setAttribute('motion-capture-recorder', {autoStart: true, visibleStroke: false});
      self.trackedControllerEls[trackedControllerEl.id] = trackedControllerEl;
      if (this.isRecording) { trackedControllerEl.components['motion-capture-recorder'].startRecording(); }
    });
  },

  play: function () {
    this.playRecording();
    window.addEventListener('keydown', this.onKeyDown);
  },

  pause: function () {
    window.removeEventListener('keydown', this.onKeyDown);
  },

  /**
   * space = toggle recording, p = stop playing, c = clear local storage
   */
  onKeyDown: function (evt) {
    var key = evt.keyCode;
    if (key !== 32 && key !== 80 && key !== 67) { return; }
    switch (key) {
      case 32: {
        this.toggleRecording();
        break;
      }

      case 80: {
        this.togglePlaying();
        break;
      }

      case 67: {
        localStorage.removeItem('avatar-recording');
        break;
      }
    }
  },

  togglePlaying: function () {
    var avatarPlayer = this.el.components['avatar-replayer'];
    if (avatarPlayer.isPlaying) {
      this.stopPlayRecording();
    } else {
      this.playRecording();
    }
  },

  toggleRecording: function () {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  },

  startRecording: function () {
    var trackedControllerEls = this.trackedControllerEls;
    var keys = Object.keys(trackedControllerEls);
    if (this.isRecording) { return; }
    this.stopPlayRecording();
    this.isRecording = true;
    this.cameraEl.components['motion-capture-recorder'].startRecording();
    keys.forEach(function (id) {
      trackedControllerEls[id].components['motion-capture-recorder'].startRecording();
    });
  },

  stopRecording: function () {
    var trackedControllerEls = this.trackedControllerEls;
    var keys = Object.keys(trackedControllerEls);
    if (!this.isRecording) { return; }
    this.isRecording = false;
    this.cameraEl.components['motion-capture-recorder'].stopRecording();
    keys.forEach(function (id) {
      trackedControllerEls[id].components['motion-capture-recorder'].stopRecording();
    });
    this.saveRecording();
    if (this.data.autoPlay) { this.playRecording(); }
  },

  getJSONData: function () {
    var data = {};
    var trackedControllerEls = this.trackedControllerEls;
    var keys = Object.keys(trackedControllerEls);
    if (this.isRecording) { return; }
    this.isRecording = false;
    data.camera = this.cameraEl.components['motion-capture-recorder'].getJSONData();
    keys.forEach(function (id) {
      data[id] = trackedControllerEls[id].components['motion-capture-recorder'].getJSONData();
    });
    this.recordingData = data;
    return data;
  },

  saveRecording: function () {
    var data = this.getJSONData()
    if (this.data.localStorage) {
      this.saveToLocalStorage(data);
    } else {
      this.saveRecordingFile(data);
    }
  },

  saveToLocalStorage: function (data) {
    localStorage.setItem('avatar-recording', JSON.stringify(data));
  },

  saveRecordingFile: function (data) {
    var jsonData = JSON.stringify(data);
    var type = this.data.binaryFormat ? 'application/octet-binary' : 'application/json';
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
  }
});

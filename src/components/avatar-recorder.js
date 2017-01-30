/* global THREE, AFRAME  */
var log = AFRAME.utils.debug('aframe-motion-capture:avatar-recorder:info');
var warn = AFRAME.utils.debug('aframe-motion-capture:avatar-recorder:warn');

var LOCALSTORAGE_KEY = 'avatar-recording';

AFRAME.registerComponent('avatar-recorder', {
  schema: {
    autoRecord: {default: false},
    autoPlay: {default: true},
    localStorage: {default: true},
    loop: {default: true},
    binaryFormat: {default: false}
  },

  init: function () {
    var self = this;
    var el = this.el;
    this.trackedControllerEls = {};
    this.onKeyDown = this.onKeyDown.bind(this);
    this.tick = AFRAME.utils.throttle(this.throttledTick, 100, this);

    // Grab camera.
    if (el.camera && el.camera.el) {
      prepareCamera(el.camera.el);
    } else {
      el.addEventListener('camera-set-active', function (evt) {
        prepareCamera(evt.detail.cameraEl);
      });
    }

    function prepareCamera (cameraEl) {
      self.cameraEl = cameraEl;
      self.cameraEl.setAttribute('motion-capture-recorder', {
        autoRecord: false,
        visibleStroke: false
      });
    }
  },

  replayRecording: function () {
    var data = this.data;
    var el = this.el;
    var replayData;

    data = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY)) || this.recordingData;
    if (!data) { return; }

    log('Replaying recording.');
    el.setAttribute('avatar-replayer', {loop: data.loop});
    el.components['avatar-replayer'].startReplaying(data);
  },

  stopReplaying: function () {
    var avatarPlayer = this.el.components['avatar-replayer'];
    if (!avatarPlayer) { return; }
    log('Stopped replaying.');
    avatarPlayer.stopReplaying();
  },

  /**
   * Poll for tracked controllers.
   */
  throttledTick: function () {
    var self = this;
    var trackedControllerEls = this.el.querySelectorAll('[tracked-controls]');
    trackedControllerEls.forEach(function (trackedControllerEl) {
      if (!trackedControllerEl.id) {
        warn('Found tracked controllers with no id. It will not be recorded');
        return;
      }
      if (self.trackedControllerEls[trackedControllerEl.id]) { return; }
      trackedControllerEl.setAttribute('motion-capture-recorder', {
        autoRecord: false,
        visibleStroke: false
      });
      self.trackedControllerEls[trackedControllerEl.id] = trackedControllerEl;
      if (this.isRecording) {
        trackedControllerEl.components['motion-capture-recorder'].startRecording();
      }
    });
  },

  play: function () {
    var self = this;
    var sceneEl = this.el;

    if (this.data.autoPlay) {
      // Add timeout to let the scene load a bit before replaying.
      setTimeout(function () {
        self.replayRecording();
      }, 500);
    }
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
        this.toggleReplaying();
        break;
      }

      case 67: {
        log('Recording cleared from localStorage.');
        this.recordingData = null;
        localStorage.removeItem(LOCALSTORAGE_KEY);
        break;
      }
    }
  },

  toggleReplaying: function () {
    var avatarPlayer = this.el.components['avatar-replayer'];
    if (!avatarPlayer) {
      this.el.setAttribute('avatar-replayer', '');
      avatarPlayer = this.el.components['avatar-replayer'];
    }

    if (avatarPlayer.isReplaying) {
      this.stopReplaying();
    } else {
      this.replayRecording();
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
    log('Starting recording!');
    this.stopReplaying();
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
    log('Stopped recording.');
    this.isRecording = false;
    this.cameraEl.components['motion-capture-recorder'].stopRecording();
    keys.forEach(function (id) {
      trackedControllerEls[id].components['motion-capture-recorder'].stopRecording();
    });
    this.saveRecording();
    if (this.data.autoPlay) { this.replayRecording(); }
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
      log('Recording saved to localStorage.');
      this.saveToLocalStorage(data);
    } else {
      log('Recording saved to file.');
      this.saveRecordingFile(data);
    }
  },

  saveToLocalStorage: function (data) {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
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

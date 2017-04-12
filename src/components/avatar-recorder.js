/* global THREE, AFRAME  */
var log = AFRAME.utils.debug('aframe-motion-capture:avatar-recorder:info');
var warn = AFRAME.utils.debug('aframe-motion-capture:avatar-recorder:warn');

var LOCALSTORAGE_KEY = 'avatar-recording';

/**
 * @member {object} recordingData - Where all the recording data is stored in memory.
 */
AFRAME.registerComponent('avatar-recorder', {
  schema: {
    autoRecord: {default: false},
    autoPlay: {default: true},
    spectatorPlay: {default: false},
    spectatorPosition: {default: '0 1.6 0', type: 'vec3'},
    localStorage: {default: true},
    saveFile: {default: true},
    loop: {default: true}
  },

  init: function () {
    this.trackedControllerEls = {};
    this.onKeyDown = this.onKeyDown.bind(this);
    this.tick = AFRAME.utils.throttle(this.throttledTick, 100, this);
  },

  replayRecording: function () {
    var data = this.data;
    var el = this.el;

    var recordingData = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY)) || this.recordingData;
    if (!recordingData) { return; }
    log('Replaying recording.');
    el.setAttribute('avatar-replayer', {
      loop: data.loop,
      spectatorMode: data.spectatorPlay,
      spectatorPosition: data.spectatorPosition
    });
    el.components['avatar-replayer'].startReplaying(recordingData);
  },

  stopReplaying: function () {
    var avatarPlayer = this.el.components['avatar-replayer'];
    if (!avatarPlayer) { return; }
    log('Stopped replaying.');
    avatarPlayer.stopReplaying();
    this.el.setAttribute('avatar-replayer', 'spectatorMode', false);
  },

  /**
   * Poll for tracked controllers.
   */
  throttledTick: function () {
    var self = this;
    var trackedControllerEls = this.el.querySelectorAll('[tracked-controls]');
    this.trackedControllerEls = {};
    trackedControllerEls.forEach(function (trackedControllerEl) {
      if (!trackedControllerEl.id) {
        warn('Found tracked controllers with no id. It will not be recorded');
        return;
      }
      trackedControllerEl.setAttribute('motion-capture-recorder', {
        autoRecord: false,
        visibleStroke: false
      });
      self.trackedControllerEls[trackedControllerEl.id] = trackedControllerEl;
      if (self.isRecording) {
        trackedControllerEl.components['motion-capture-recorder'].startRecording();
      }
    });
  },

  play: function () {
    var self = this;

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
   * Keyboard shortcuts.
   */
  onKeyDown: function (evt) {
    var key = evt.keyCode;
    var KEYS = {space: 32, c: 67, p: 80, u: 85};

    switch (key) {
      // <space>: Toggle recording.
      case KEYS.space: {
        this.toggleRecording();
        break;
      }

      // p: Toggle recording.
      case KEYS.p: {
        this.toggleReplaying();
        break;
      }

      // c: Clear localStorage.
      case KEYS.c: {
        log('Recording cleared from localStorage.');
        this.recordingData = null;
        localStorage.removeItem(LOCALSTORAGE_KEY);
        break;
      }

      // u: Upload recording.
      case KEYS.u: {
        this.uploadRecording();
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

  setupCamera: function () {
    var el = this.el;
    var self = this;
    var setup;
    // Grab camera.
    if (el.camera && el.camera.el) {
      prepareCamera(el.camera.el);
      return;
    }
    el.addEventListener('camera-set-active', setup)
    setup = function (evt) { prepareCamera(evt.detail.cameraEl); };

    function prepareCamera (cameraEl) {
      if (self.cameraEl) { self.cameraEl.removeAttribute('motion-capture-recorder'); }
      self.cameraEl = cameraEl;
      self.cameraEl.setAttribute('motion-capture-recorder', {
        autoRecord: false,
        visibleStroke: false
      });
      el.removeEventListener('camera-set-active', setup);
    }
  },

  startRecording: function () {
    var trackedControllerEls = this.trackedControllerEls;
    var keys;
    if (this.isRecording) { return; }
    keys = Object.keys(trackedControllerEls);
    log('Starting recording!');
    this.stopReplaying();
    this.setupCamera();
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
    }
    if (this.data.saveFile) {
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
    var fileName = 'recording-' + document.title.toLowerCase().replace(/ /g, '-') + '.json';
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

  /**
   * Upload recording to file.io.
   */
  uploadRecording: function () {
    var request;

    if (!this.recordingData) {
      log('Cannot upload without a recording in memory.');
      return;
    }

    log('Uploading recording to myjson.com.');
    request = new XMLHttpRequest();
    request.open('POST', window.location.protocol + '//api.myjson.com/bins', true);
    request.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    request.onload = function () {
      var aEl;
      var url = JSON.parse(this.responseText).uri;
      log('Recording uploaded to', url);
      aEl = document.createElement('a');
      aEl.innerHTML = url;
      aEl.setAttribute('href', url);
      aEl.style.position = 'fixed';
      aEl.style.display = 'block';
      aEl.style.zIndex = 99999;
      aEl.style.background = '#111';
      aEl.style.color = '#FAFAFA';
      aEl.style.padding = '15px';
      aEl.style.left = 0;
      aEl.style.top = 0;
      document.body.appendChild(aEl);
    }
    request.send(JSON.stringify(this.recordingData));
  }
});

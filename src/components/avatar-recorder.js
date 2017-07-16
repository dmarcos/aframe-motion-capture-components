/* global THREE, AFRAME  */
var constants = require('../constants');
var log = AFRAME.utils.debug('aframe-motion-capture:avatar-recorder:info');
var warn = AFRAME.utils.debug('aframe-motion-capture:avatar-recorder:warn');

/**
 * @member {object} recordingData - Where all the recording data is stored in memory.
 */
AFRAME.registerComponent('avatar-recorder', {
  schema: {
    autoRecord: {default: false},
    autoPlay: {default: true},
    autoSaveFile: {default: true},
    spectatorPlay: {default: false},
    spectatorPosition: {default: '0 1.6 0', type: 'vec3'},
    localStorage: {default: true},
    recordingName: {default: constants.DEFAULT_RECORDING_NAME},
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
    var recordingData;
    var recordings;

    recordings = JSON.parse(localStorage.getItem(constants.LOCALSTORAGE_RECORDINGS));
    if (recordings && recordings[data.recordingName]) {
      recordingData = recordings[data.recordingName];
    } else {
      recordingData = this.recordingData;
    }

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
    var avatarReplayer = this.el.components['avatar-replayer'];
    if (!avatarReplayer || !avatarReplayer.isReplaying) { return; }
    log('Stopped replaying.');
    avatarReplayer.stopReplaying();
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
        this.clearRecordings();
        break;
      }

      // u: Upload recording.
      case KEYS.u: {
        this.uploadRecording();
        break;
      }
    }
  },

  clearRecordings: function () {
    log('Recordings cleared from localStorage.');
    this.recordingData = null;
    localStorage.removeItem(constants.LOCALSTORAGE_RECORDINGS);
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

  setupCamera: function (doneCb) {
    var el = this.el;
    var self = this;

    // Grab camera.
    if (el.camera && el.camera.el) {
      prepareCamera(el.camera.el);
      return;
    }

    el.addEventListener('camera-set-active', setup)

    function setup (evt) {
      prepareCamera(evt.detail.cameraEl);
    };

    function prepareCamera (cameraEl) {
      if (self.cameraEl) {
        self.cameraEl.removeAttribute('motion-capture-recorder');
      }
      self.cameraEl = cameraEl;
      cameraEl.setAttribute('motion-capture-recorder', {
        autoRecord: false,
        visibleStroke: false
      });
      el.removeEventListener('camera-set-active', setup);
      doneCb(cameraEl)
    }
  },

  startRecording: function () {
    var trackedControllerEls = this.trackedControllerEls;
    var keys;
    var self = this;

    if (this.isRecording) { return; }

    keys = Object.keys(trackedControllerEls);
    log('Starting recording!');
    this.stopReplaying();
    this.setupCamera(function cameraSetUp () {
      self.isRecording = true;
      self.cameraEl.components['motion-capture-recorder'].startRecording();
      keys.forEach(function startRecordingControllers (id) {
        trackedControllerEls[id].components['motion-capture-recorder'].startRecording();
      });
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
    var recordingData = this.getJSONData()
    if (this.data.localStorage) {
      log('Recording saved to localStorage.');
      this.saveToLocalStorage(recordingData);
    }
    if (this.data.autoSaveFile) {
      log('Recording saved to file.');
      this.saveRecordingFile(recordingData);
    }
  },

  saveToLocalStorage: function (recordingData) {
    var data = this.data;
    var recordings;
    recordings = JSON.parse(localStorage.getItem(constants.LOCALSTORAGE_RECORDINGS)) || {};
    recordings[data.recordingName] = recordingData;
    localStorage.setItem(constants.LOCALSTORAGE_RECORDINGS, JSON.stringify(recordings));
  },

  /**
   * Download recording.
   *
   * @param dataOrName - Recording data or name of recording to fetch from localStorage.
   */
  saveRecordingFile: function (dataOrName) {
    var aEl;
    var blob;
    var fileName;
    var jsonData;
    var url;

    // Get data.
    if (typeof dataOrName === 'object') {
      jsonData = JSON.stringify(dataOrName);
    } else {
      jsonData = localStorage.getItem(constants.LOCALSTORAGE_RECORDINGS)[dataOrName];
    }

    // Compose data blob.
    blob = new Blob([jsonData], {
      type: this.data.binaryFormat ? 'application/octet-binary' : 'application/json'
    });
    url = URL.createObjectURL(blob);

    // Create filename.
    fileName = 'recording-' + document.title.toLowerCase().replace(/ /g, '-') + '.json';

    // Create download link.
    aEl = document.createElement('a');
    aEl.href = url;
    aEl.setAttribute('download', fileName);
    aEl.innerHTML = 'Downloading...';
    aEl.style.display = 'none';

    // Click download link.
    document.body.appendChild(aEl);
    setTimeout(function () {
      aEl.click();
      document.body.removeChild(aEl);
    });
  },

  /**
   * Upload recording to myjson.com.
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

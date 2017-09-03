/* global THREE, AFRAME  */
var constants = require('../constants');
var log = AFRAME.utils.debug('aframe-motion-capture:avatar-recorder:info');
var warn = AFRAME.utils.debug('aframe-motion-capture:avatar-recorder:warn');

/**
 * Wrapper around individual motion-capture-recorder components for recording camera and
 * controllers together.
 */
AFRAME.registerComponent('avatar-recorder', {
  schema: {
    autoPlay: {default: false},
    autoRecord: {default: false},
    cameraOverride: {type: 'selector'},
    localStorage: {default: true},
    recordingName: {default: constants.DEFAULT_RECORDING_NAME},
    loop: {default: true}
  },

  init: function () {
    this.cameraEl = null;
    this.isRecording = false;
    this.trackedControllerEls = {};
    this.recordingData = null;

    this.onKeyDown = AFRAME.utils.bind(this.onKeyDown, this);
    this.tick = AFRAME.utils.throttle(this.throttledTick, 100, this);
  },

  /**
   * Poll for tracked controllers.
   */
  throttledTick: function () {
    var self = this;
    var trackedControllerEls = this.el.querySelectorAll('[tracked-controls]');
    this.trackedControllerEls = {};
    trackedControllerEls.forEach(function setupController (trackedControllerEl) {
      if (!trackedControllerEl.id) {
        warn('Found a tracked controller entity without an ID. ' +
             'Provide an ID or this controller will not be recorded');
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
    var KEYS = {space: 32};
    switch (key) {
      // <space>: Toggle recording.
      case KEYS.space: {
        this.toggleRecording();
        break;
      }
    }
  },

  /**
   * Start or stop recording.
   */
  toggleRecording: function () {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  },

  /**
   * Set motion capture recorder on the camera once the camera is ready.
   */
  setupCamera: function (doneCb) {
    var el = this.el;
    var self = this;

    if (this.data.cameraOverride) {
      prepareCamera(this.data.cameraOverride);
      return;
    }

    // Grab camera.
    if (el.camera && el.camera.el) {
      prepareCamera(el.camera.el);
      return;
    }

    el.addEventListener('camera-set-active', function setup (evt) {
      prepareCamera(evt.detail.cameraEl);
      el.removeEventListener('camera-set-active', setup);
    });

    function prepareCamera (cameraEl) {
      if (self.cameraEl) {
        self.cameraEl.removeAttribute('motion-capture-recorder');
      }
      self.cameraEl = cameraEl;
      cameraEl.setAttribute('motion-capture-recorder', {
        autoRecord: false,
        visibleStroke: false
      });
      doneCb(cameraEl)
    }
  },

  /**
   * Start recording camera and tracked controls.
   */
  startRecording: function () {
    var trackedControllerEls = this.trackedControllerEls;
    var self = this;

    if (this.isRecording) { return; }

    log('Starting recording!');

    if (this.el.components['avatar-replayer']) {
      this.el.components['avatar-replayer'].stopReplaying();
    }

    // Get camera.
    this.setupCamera(function cameraSetUp () {
      self.isRecording = true;
      // Record camera.
      self.cameraEl.components['motion-capture-recorder'].startRecording();
      // Record tracked controls.
      Object.keys(trackedControllerEls).forEach(function startRecordingController (id) {
        trackedControllerEls[id].components['motion-capture-recorder'].startRecording();
      });
    });
  },

  /**
   * Tell camera and tracked controls motion-capture-recorder components to stop recording.
   * Store recording and replay if autoPlay is on.
   */
  stopRecording: function () {
    var trackedControllerEls = this.trackedControllerEls;

    if (!this.isRecording) { return; }

    log('Stopped recording.');
    this.isRecording = false;
    this.cameraEl.components['motion-capture-recorder'].stopRecording();
    Object.keys(trackedControllerEls).forEach(function (id) {
      trackedControllerEls[id].components['motion-capture-recorder'].stopRecording();
    });
    this.recordingData = this.getJSONData();
    this.storeRecording(this.recordingData);

    if (this.data.autoPlay) {
      this.replayRecording();
    }
  },

  /**
   * Gather the JSON data from the camera and tracked controls motion-capture-recorder
   * components. Combine them together, keyed by the (active) `camera` and by the
   * tracked controller IDs.
   */
  getJSONData: function () {
    var data = {};
    var trackedControllerEls = this.trackedControllerEls;

    if (this.isRecording) { return; }

    // Camera.
    data.camera = this.cameraEl.components['motion-capture-recorder'].getJSONData();

    // Tracked controls.
    Object.keys(trackedControllerEls).forEach(function getControllerData (id) {
      data[id] = trackedControllerEls[id].components['motion-capture-recorder'].getJSONData();
    });

    return data;
  },

  /**
   * Store recording in IndexedDB using recordingdb system.
   */
  storeRecording: function (recordingData) {
    var data = this.data;
    if (!data.localStorage) { return; }
    log('Recording stored in localStorage.');
    this.el.systems.recordingdb.addRecording(data.recordingName, recordingData);
  }
});

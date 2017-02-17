/* global THREE, AFRAME  */
var error = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:error');
var log = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:info');
var warn = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:warn');

AFRAME.registerComponent('avatar-replayer', {
  schema: {
    src: {default: ''},
    loop: {default: false},
    spectatorMode: {default: false},
    spectatorPosition: {default: '0 1.6 2', type: 'vec3'}
  },

  init: function () {
    var sceneEl = this.el;
    this.storeInitialCamera = this.storeInitialCamera.bind(this);
    this.initSpectatorCamera();
    // Prepare camera.
    if (sceneEl.camera) {
      this.storeInitialCamera();
    } else {
      this.el.addEventListener('camera-set-active', this.storeInitialCamera);
    }
    this.el.addEventListener('replayingstopped', this.restoreCamera.bind(this));
    this.onKeyDown = this.onKeyDown.bind(this);
  },

  remove: function () {
    this.stopReplaying();
  },

  restoreCamera: function() {
    this.currentCameraEl.setAttribute('camera', 'active', true);
  },

  storeInitialCamera: function () {
    this.currentCameraEl = this.el.camera.el;
    this.currentCameraEl.removeAttribute('data-aframe-default-camera');
    this.el.appendChild(this.spectatorCameraEl);
    this.el.removeEventListener('camera-set-active', this.storeInitialCamera);
  },

  play: function () {
    window.addEventListener('keydown', this.onKeyDown);
  },

  pause: function () {
    window.removeEventListener('keydown', this.onKeyDown);
  },

  /**
   * tab = toggle spectator camera
   */
  onKeyDown: function (evt) {
    var key = evt.keyCode;
    if (key !== 9) { return; }
    switch (key) {
      case 9: {
        this.toggleSpectatorCamera();
        break;
      }
    }
  },

  toggleSpectatorCamera: function () {
    this.el.setAttribute('avatar-replayer', 'spectatorMode', !this.data.spectatorMode);
  },

  update: function (oldData) {
    var data = this.data;
    if (!data.src || oldData.src === data.src) { return; }
    this.updateSrc(data.src);
  },

  initSpectatorCamera: function () {
    var spectatorCameraEl = this.spectatorCameraEl = document.createElement('a-entity');
    spectatorCameraEl.id = 'spectatorCamera';
    spectatorCameraEl.setAttribute('camera', '');
    spectatorCameraEl.setAttribute('look-controls', '');
    spectatorCameraEl.setAttribute('wasd-controls', '');
  },

  updateSrc: function (src) {
    this.loadRecordingFromUrl(src, false, this.startReplaying.bind(this));
  },

  /**
   * Set player on camera and controllers (marked by ID).
   *
   * @params {object} data - {
   *   camera: {poses: [], events: []},
   *   [c1ID]: {poses: [], events: []},
   *   [c2ID]: {poses: [], events: []}
   * }
   */
  startReplaying: function (replayData) {
    var data = this.data;
    var self = this;
    var puppetEl = this.puppetEl;
    var sceneEl = this.el;
    this.recordingReplayData = replayData;
    this.isReplaying = true;
    if (!this.el.camera) {
      this.el.addEventListener('camera-set-active', function () {
        self.startReplaying(replayData);
      });
      return;
    }
    if (puppetEl) { puppetEl.removeAttribute('motion-capture-replayer'); }
    Object.keys(replayData).forEach(function setPlayer (key) {
      var puppetEl;

      if (key === 'camera') {
        // Grab camera.
        log('Setting motion-capture-replayer on camera.');
        puppetEl = self.puppetEl = self.data.spectatorMode ? self.currentCameraEl : sceneEl.camera.el;
      } else {
        // Grab other entities.
        puppetEl = sceneEl.querySelector('#' + key);
        if (!puppetEl) {
          error('No element found with ID ' + key + '.');
          return;
        }
      }

      log('Setting motion-capture-replayer on ' + key + '.');
      puppetEl.setAttribute('motion-capture-replayer', {loop: data.loop});
      puppetEl.components['motion-capture-replayer'].startReplaying(replayData[key]);
    });
    this.configureCamera();
  },

  configureCamera: function () {
    var data = this.data;
    var currentCameraEl = this.currentCameraEl;
    var spectatorCameraEl = this.spectatorCameraEl;
    if (!spectatorCameraEl.hasLoaded) {
      spectatorCameraEl.addEventListener('loaded', this.configureCamera.bind(this));
      return;
    }
    if (data.spectatorMode) {
      spectatorCameraEl.setAttribute('position', data.spectatorPosition);
      spectatorCameraEl.setAttribute('camera', 'active', true);
    } else {
      currentCameraEl.setAttribute('camera', 'active', true);
    }
    this.configureHeadGeometry();
  },

  configureHeadGeometry: function() {
    var currentCameraEl = this.currentCameraEl;
    if (currentCameraEl.getObject3D('mesh')) { return; }
    if (!this.data.spectatorMode) { return; }
    currentCameraEl.setAttribute('geometry', {primitive: 'box', height: 0.3, width: 0.3, depth: 0.2});
    currentCameraEl.setAttribute('material', {color: 'pink'});
  },

  stopReplaying: function () {
    var keys;
    var self = this;
    if (!this.isReplaying || !this.recordingReplayData) { return; }
    this.isReplaying = false;
    keys = Object.keys(this.recordingReplayData);
    keys.forEach(function (key) {
      if (key === 'camera') {
        self.puppetEl.removeComponent('motion-capture-replayer');
      } else {
        el = document.querySelector('#' + key);
        if (!el) { warn('No element with id ' + key); }
        el.removeComponent('motion-capture-replayer');
      }
    });
  },

  loadRecordingFromUrl: function (url, binary, callback) {
    var loader = new THREE.FileLoader(this.manager);
    var self = this;
    var data;
    loader.crossOrigin = 'anonymous';
    if (binary === true) { loader.setResponseType('arraybuffer'); }
    loader.load(url, function (buffer) {
      if (binary === true) {
        data = self.loadStrokeBinary(buffer);
      } else {
        data = JSON.parse(buffer);
      }
      if (callback) { callback(data); }
    });
  }
});

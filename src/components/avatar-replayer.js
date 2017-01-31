/* global THREE, AFRAME  */
var error = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:error');
var log = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:info');
var warn = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:warn');

AFRAME.registerComponent('avatar-replayer', {
  schema: {
    src: {default: ''},
    loop: {default: true},
    spectatorMode: {default: false}
  },

  init: function () {
    var sceneEl = this.el;
    var self = this;

    // Prepare camera.
    if (sceneEl.camera) {
      this.currentCameraEl = sceneEl.camera.el;
    } else {
      this.el.addEventListener('camera-set-active', function () {
        self.currentCameraEl = sceneEl.camera.el;
      });
    }

    this.onKeyDown = this.onKeyDown.bind(this);
  },

  play: function () {
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
    if ( key !== 81) { return; }
    switch (key) {
      case 81: {
        this.toggleSpectatorCamera();
        break;
      }
    }
  },

  toggleSpectatorCamera: function () {
    var spectatorMode = !this.el.getAttribute('avatar-player').spectatorMode;
    this.el.setAttribute('avatar-player', 'spectatorMode', spectatorMode);
  },

  update: function (oldData) {
    var data = this.data;
    this.updateSpectatorCamera();
    if (!data.src || oldData.src === data.src) { return; }
    this.updateSrc(data.src);
  },

  updateSpectatorCamera: function () {
    var spectatorMode = this.data.spectatorMode;
    var spectatorCameraEl = this.spectatorCameraEl;
    if (!this.el.camera) { return; }
    if (spectatorMode && spectatorCameraEl && spectatorCameraEl.getAttribute('camera').active) { return; }
    if (spectatorMode && !spectatorCameraEl) {
      this.initSpectatorCamera();
      return;
    }
    if (spectatorMode) {
      spectatorCameraEl.setAttribute('camera', 'active', true);
    } else {
      this.currentCameraEl.setAttribute('camera', 'active', true);
    }
  },

  initSpectatorCamera: function () {
    var spectatorCameraEl;
    var currentCameraEl = this.currentCameraEl = this.el.camera.el;
    var currentCameraPosition = currentCameraEl.getAttribute('position');
    if (this.spectatorCameraEl || !this.data.spectatorMode) { return; }
    spectatorCameraEl = this.spectatorCameraEl = document.createElement('a-entity');
    spectatorCameraEl.id = 'spectatorCamera';
    spectatorCameraEl.setAttribute('camera', '');
    spectatorCameraEl.setAttribute('position', {
      x: currentCameraPosition.x,
      y: currentCameraPosition.y,
      z: currentCameraPosition.z + 1
    });
    spectatorCameraEl.setAttribute('look-controls', '');
    spectatorCameraEl.setAttribute('wasd-controls', '');
    currentCameraEl.setAttribute('geometry', {primitive: 'box', height: 0.3, width: 0.3, depth: 0.2});
    currentCameraEl.setAttribute('material', {color: 'pink'});
    currentCameraEl.removeAttribute('data-aframe-default-camera');
    currentCameraEl.addEventListener('pause', function () { currentCameraEl.play(); });
    this.el.appendChild(spectatorCameraEl);
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
    var puppetEl;
    var sceneEl = this.el;

    this.recordingreplayData = replayData;
    this.isReplaying = true;
    if (!this.el.camera) {
      this.el.addEventListener('camera-set-active', function () {
        self.startReplaying(replayData);
      });
      return;
    }

    Object.keys(replayData).forEach(function setPlayer (key) {
      var puppetEl;

      if (key === 'camera') {
        // Grab camera.
        log('Setting motion-capture-replayer on camera.');
        puppetEl = sceneEl.camera.el;
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

    this.initSpectatorCamera();
  },

  stopReplaying: function () {
    var keys;
    var self = this;
    if (!this.isReplaying || !this.recordingData) { return; }
    this.isReplaying = false;
    keys = Object.keys(this.recordingData);
    keys.forEach(function (key) {
      if (key === 'camera') {
        self.el.camera.el.components['motion-capture-replayer'].stopReplaying();
      } else {
        el = document.querySelector('#' + key);
        if (!el) { warn('No element with id ' + key); }
        el.components['motion-capture-replayer'].stopReplaying();
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

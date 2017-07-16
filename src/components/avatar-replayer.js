/* global THREE, AFRAME  */
var constants = require('../constants');
var error = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:error');
var log = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:info');
var warn = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:warn');

AFRAME.registerComponent('avatar-replayer', {
  schema: {
    autoPlay: {default: true},
    cameraOverride: {type: 'selector'},
    loop: {default: false},
    recordingName: {default: constants.DEFAULT_RECORDING_NAME},
    spectatorMode: {default: false},
    spectatorPosition: {default: {x: 0, y: 1.6, z: 2}, type: 'vec3'},
    src: {default: ''}
  },

  init: function () {
    var sceneEl = this.el;
    this.setupCameras = this.setupCameras.bind(this);
    // Prepare camera.
    if (sceneEl.camera) {
      this.setupCameras();
    } else {
      this.el.addEventListener('camera-set-active', this.setupCameras);
    }
    this.el.addEventListener('replayingstopped', this.restoreCamera.bind(this));
    this.onKeyDown = this.onKeyDown.bind(this);
  },

  update: function (oldData) {
    var data = this.data;
    if (oldData.src === data.src) { return; }
    if (data.autoPlay) {
      this.replayRecordingFromSource(oldData);
    }
  },

  play: function () {
    window.addEventListener('keydown', this.onKeyDown);
  },

  pause: function () {
    window.removeEventListener('keydown', this.onKeyDown);
  },

  remove: function () {
    this.stopReplaying();
    this.cameraEl.removeObject3D('replayerMesh');
  },

  restoreCamera: function() {
    if (this.data.spectatorMode) {
      this.cameraEl.setAttribute('camera', 'active', true);
    }
  },

  setupCameras: function () {
    var data = this.data;
    var sceneEl = this.el;
    if (data.cameraOverride) {
      this.cameraEl = data.cameraOverride;
    } else {
      this.cameraEl = sceneEl.camera.el;
      this.cameraEl.removeAttribute('data-aframe-default-camera');
    }
    this.el.removeEventListener('camera-set-active', this.setupCameras);
    this.initSpectatorCamera();
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

  /**
   * Create and activate spectator camera if in spectator mode.
   */
  initSpectatorCamera: function () {
    var data = this.data;
    var sceneEl = this.el;
    var spectatorCameraEl;
    var spectatorCameraRigEl;

    if (!this.data.spectatorMode || this.el.querySelector('#spectatorCameraRig')) { return; }

    spectatorCameraEl = this.spectatorCameraEl =
      sceneEl.querySelector('#spectatorCamera') || document.createElement('a-entity');
    spectatorCameraRigEl = this.spectatorCameraRigEl =
      sceneEl.querySelector('#spectatorCameraRig') || document.createElement('a-entity');

    spectatorCameraEl.id = 'spectatorCamera';
    spectatorCameraRigEl.id = 'spectatorCameraRig';
    spectatorCameraEl.setAttribute('camera', '');
    spectatorCameraEl.setAttribute('look-controls', '');
    spectatorCameraEl.setAttribute('wasd-controls', '');
    spectatorCameraRigEl.appendChild(spectatorCameraEl);
    sceneEl.appendChild(spectatorCameraRigEl);
  },

  /**
   * Check for recording sources and play.
   */
  replayRecordingFromSource: function (oldSrc) {
    var data = this.data;
    var localStorageData;
    var queryParamSrc;
    var src;

    // Allow override to display replayer from query param.
    if (new URLSearchParams(window.location.search).get('avatar-replayer-disabled') !== null) {
      return;
    }

    // From localStorage if recordingName specified and data exists.
    if (data.recordingName) {
      localStorageData = JSON.parse(localStorage.getItem(constants.LOCALSTORAGE_RECORDINGS)) || {};
      localStorageData = localStorageData[data.recordingName];
      if (localStorageData) {
        log('Replaying from localStorage.');
        this.startReplaying(localStorageData);
        return;
      }
    }

    // From external file.
    queryParamSrc = this.getSrcFromSearchParam();
    src = data.src || queryParamSrc;
    if (!src || oldSrc === data.src) { return; }
    if (data.src) {
      log('Replaying from component `src`', src);
    } else if (queryParamSrc) {
      log('Replaying from query parameter `avatar-recording`', src);
    }
    this.loadRecordingFromUrl(src, false, this.startReplaying.bind(this));
  },

  /**
   * Defined for test stubbing.
   */
  getSrcFromSearchParam: function () {
    return new URLSearchParams(window.location.search).get('avatar-recording');
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
    var sceneEl = this.el;

    if (this.isReplaying) { return; }

    // Wait for camera.
    if (!this.el.camera) {
      this.el.addEventListener('camera-set-active', function () {
        self.startReplaying(replayData);
      });
      return;
    }

    this.replayData = replayData;
    this.isReplaying = true;

    this.cameraEl.removeAttribute('motion-capture-replayer');

    Object.keys(replayData).forEach(function setPlayer (key) {
      var puppetEl;

      if (key === 'camera') {
        // Grab camera.
        log('Setting motion-capture-replayer on camera.');
        puppetEl = self.cameraEl;
      } else {
        // Grab other entities.
        log('Setting motion-capture-replayer on ' + key + '.');
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

    this.activateSpectatorCamera();
  },

  /**
   * Set the proper camera for replay.
   */
  activateSpectatorCamera: function () {
    var data = this.data;
    var cameraEl = this.cameraEl;
    var spectatorCameraEl = this.spectatorCameraEl;

    if (!data.spectatorMode) { return; }

    if (!spectatorCameraEl.hasLoaded) {
      spectatorCameraEl.addEventListener('loaded', this.activateSpectatorCamera.bind(this));

      return;
    }

    // Position and activate spectator camera.
    this.spectatorCameraRigEl.setAttribute('position', data.spectatorPosition);
    spectatorCameraEl.setAttribute('camera', 'active', true);
    this.configureHeadGeometry();
  },

  /**
   * Create head geometry for spectator mode.
   */
  configureHeadGeometry: function () {
    var cameraEl = this.cameraEl;
    var headMesh;
    var leftEyeMesh;
    var rightEyeMesh;
    var leftEyeBallMesh;
    var rightEyeBallMesh;

    if (cameraEl.getObject3D('mesh')) { return; }

    headMesh = new THREE.Mesh();
    headMesh.geometry = new THREE.BoxBufferGeometry(0.3, 0.3, 0.2);
    headMesh.material = new THREE.MeshStandardMaterial({color: 'pink'});

    leftEyeMesh = new THREE.Mesh();
    leftEyeMesh.geometry = new THREE.SphereBufferGeometry(0.05);
    leftEyeMesh.material = new THREE.MeshBasicMaterial({color: 'white'});
    leftEyeMesh.position.x -= 0.1;
    leftEyeMesh.position.y += 0.1;
    leftEyeMesh.position.z -= 0.1;
    leftEyeBallMesh = new THREE.Mesh();
    leftEyeBallMesh.geometry = new THREE.SphereBufferGeometry(0.025);
    leftEyeBallMesh.material = new THREE.MeshBasicMaterial({color: 'black'});
    leftEyeBallMesh.position.z -= 0.04;
    leftEyeMesh.add(leftEyeBallMesh);
    headMesh.add(leftEyeMesh);

    rightEyeMesh = new THREE.Mesh();
    rightEyeMesh.geometry = new THREE.SphereBufferGeometry(0.05);
    rightEyeMesh.material = new THREE.MeshBasicMaterial({color: 'white'});
    rightEyeMesh.position.x += 0.1;
    rightEyeMesh.position.y += 0.1;
    rightEyeMesh.position.z -= 0.1;
    rightEyeBallMesh = new THREE.Mesh();
    rightEyeBallMesh.geometry = new THREE.SphereBufferGeometry(0.025);
    rightEyeBallMesh.material = new THREE.MeshBasicMaterial({color: 'black'});
    rightEyeBallMesh.position.z -= 0.04;
    rightEyeMesh.add(rightEyeBallMesh);
    headMesh.add(rightEyeMesh);

    cameraEl.setObject3D('replayerMesh', headMesh);
  },

  stopReplaying: function () {
    var self = this;

    if (!this.isReplaying || !this.replayData) { return; }

    this.isReplaying = false;
    Object.keys(this.replayData).forEach(function removeReplayers (key) {
      if (key === 'camera') {
        self.cameraEl.removeComponent('motion-capture-replayer');
      } else {
        el = document.querySelector('#' + key);
        if (!el) {
          warn('No element with id ' + key);
          return;
        }
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

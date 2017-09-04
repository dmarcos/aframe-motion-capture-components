/* global THREE, AFRAME  */
var constants = require('../constants');

var bind = AFRAME.utils.bind;
var error = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:error');
var log = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:info');
var warn = AFRAME.utils.debug('aframe-motion-capture:avatar-replayer:warn');

var fileLoader = new THREE.FileLoader();

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

    // Bind methods.
    this.onKeyDown = bind(this.onKeyDown, this);

    // Prepare camera.
    this.setupCamera = bind(this.setupCamera, this);
    if (sceneEl.camera) {
      this.setupCamera();
    } else {
      sceneEl.addEventListener('camera-set-active', this.setupCamera);
    }

    if (this.data.autoPlay) {
      this.replayRecordingFromSource();
    }
  },

  update: function (oldData) {
    var data = this.data;
    var spectatorModeUrlParam;

    spectatorModeUrlParam =
      window.location.search.indexOf('spectatormode') !== -1 ||
      window.location.search.indexOf('spectatorMode') !== -1;

    // Handle toggling spectator mode. Don't run on initialization. Want to activate after
    // the player camera is initialized.
    if (oldData.spectatorMode !== data.spectatorMode ||
        spectatorModeUrlParam) {
      if (data.spectatorMode || spectatorModeUrlParam) {
        this.activateSpectatorCamera();
      } else if (oldData.spectatorMode === true) {
        this.deactivateSpectatorCamera();
      }
    }

    // Handle `src` changing.
    if (data.src && oldData.src !== data.src && data.autoPlay) {
      this.replayRecordingFromSource();
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

  /**
   * Grab a handle to the "original" camera.
   * Initialize spectator camera and dummy geometry for original camera.
   */
  setupCamera: function () {
    var data = this.data;
    var sceneEl = this.el;

    if (data.cameraOverride) {
      // Specify which camera is the original camera (e.g., used by Inspector).
      this.cameraEl = data.cameraOverride;
    } else {
      // Default camera.
      this.cameraEl = sceneEl.camera.el;
      // Make sure A-Frame doesn't automatically remove this camera.
      this.cameraEl.removeAttribute('data-aframe-default-camera');
    }
    this.cameraEl.setAttribute('data-aframe-avatar-replayer-camera', '');

    sceneEl.removeEventListener('camera-set-active', this.setupCamera);

    this.configureHeadGeometry();

    // Create spectator camera for either if we are in spectator mode or toggling to it.
    this.initSpectatorCamera();
  },

  /**
   * q: Toggle spectator camera.
   */
  onKeyDown: function (evt) {
    switch (evt.keyCode) {
      // q.
      case 81: {
        this.el.setAttribute('avatar-replayer', 'spectatorMode', !this.data.spectatorMode);
        break;
      }
    }
  },

  /**
   * Activate spectator camera, show replayer mesh.
   */
  activateSpectatorCamera: function () {
    var spectatorCameraEl = this.spectatorCameraEl;

    if (!spectatorCameraEl) {
      this.el.addEventListener('spectatorcameracreated',
                               bind(this.activateSpectatorCamera, this));
      return;
    }

    if (!spectatorCameraEl.hasLoaded) {
      spectatorCameraEl.addEventListener('loaded', bind(this.activateSpectatorCamera, this));
      return;
    }

    log('Activating spectator camera');
    spectatorCameraEl.setAttribute('camera', 'active', true);
    this.cameraEl.getObject3D('replayerMesh').visible = true;
  },

  /**
   * Deactivate spectator camera (by setting original camera active), hide replayer mesh.
   */
  deactivateSpectatorCamera: function () {
    log('Deactivating spectator camera');
    this.cameraEl.setAttribute('camera', 'active', true);
    this.cameraEl.getObject3D('replayerMesh').visible = false;
  },

  /**
   * Create and activate spectator camera if in spectator mode.
   */
  initSpectatorCamera: function () {
    var data = this.data;
    var sceneEl = this.el;
    var spectatorCameraEl;
    var spectatorCameraRigEl;

    // Developer-defined spectator rig.
    if (this.el.querySelector('#spectatorCameraRig')) {
      this.spectatorCameraEl = sceneEl.querySelector('#spectatorCameraRig');
      return;
    }

    // Create spectator camera rig.
    spectatorCameraRigEl = sceneEl.querySelector('#spectatorCameraRig') ||
                           document.createElement('a-entity');
    spectatorCameraRigEl.id = 'spectatorCameraRig';
    spectatorCameraRigEl.setAttribute('position', data.spectatorPosition);
    this.spectatorCameraRigEl = spectatorCameraRigEl;

    // Create spectator camera.
    spectatorCameraEl = sceneEl.querySelector('#spectatorCamera') ||
                        document.createElement('a-entity');
    spectatorCameraEl.id = 'spectatorCamera';
    spectatorCameraEl.setAttribute('camera', {active: data.spectatorMode, userHeight: 0});
    spectatorCameraEl.setAttribute('look-controls', '');
    spectatorCameraEl.setAttribute('wasd-controls', {fly: true});
    this.spectatorCameraEl = spectatorCameraEl;

    // Append rig.
    spectatorCameraRigEl.appendChild(spectatorCameraEl);
    sceneEl.appendChild(spectatorCameraRigEl);
    sceneEl.emit('spectatorcameracreated');
  },

  /**
   * Check for recording sources and play.
   */
  replayRecordingFromSource: function () {
    var data = this.data;
    var recordingdb = this.el.systems.recordingdb;;
    var recordingNames;
    var src;
    var self = this;

    // Allow override to display replayer from query param.
    if (new URLSearchParams(window.location.search).get('avatar-replayer-disabled') !== null) {
      return;
    }

    recordingdb.getRecordingNames().then(function (recordingNames) {
      // See if recording defined in query parameter.
      var queryParamSrc = self.getSrcFromSearchParam();

      // 1. Try `avatar-recorder` query parameter as recording name from IndexedDB.
      if (recordingNames.indexOf(queryParamSrc) !== -1) {
        log('Replaying `' + queryParamSrc + '` from IndexedDB.');
        recordingdb.getRecording(queryParamSrc).then(bind(self.startReplaying, self));
        return;
      }

      // 2. Use `avatar-recorder` query parameter or `data.src` as URL.
      src = queryParamSrc || self.data.src;
      if (src) {
        if (self.data.src) {
          log('Replaying from component `src`', src);
        } else if (queryParamSrc) {
          log('Replaying from query parameter `recording`', src);
        }
        self.loadRecordingFromUrl(src, false, bind(self.startReplaying, self));
        return;
      }

      // 3. Use `data.recordingName` as recording name from IndexedDB.
      if (recordingNames.indexOf(self.data.recordingName) !== -1) {
        log('Replaying `' + self.data.recordingName + '` from IndexedDB.');
        recordingdb.getRecording(self.data.recordingName).then(bind(self.startReplaying, self));
      }
    });
  },

  /**
   * Defined for test stubbing.
   */
  getSrcFromSearchParam: function () {
    var search = new URLSearchParams(window.location.search);
    return search.get('recording') || search.get('avatar-recording');
  },

  /**
   * Set player on camera and controllers (marked by ID).
   *
   * @params {object} replayData - {
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
      this.el.addEventListener('camera-set-active', function waitForCamera () {
        self.startReplaying(replayData);
        self.el.removeEventListener('camera-set-active', waitForCamera);
      });
      return;
    }

    this.replayData = replayData;
    this.isReplaying = true;

    this.cameraEl.removeAttribute('motion-capture-replayer');

    Object.keys(replayData).forEach(function setReplayer (key) {
      var replayingEl;

      if (key === 'camera') {
        // Grab camera.
        replayingEl = self.cameraEl;
      } else {
        // Grab other entities.
        replayingEl = sceneEl.querySelector('#' + key);
        if (!replayingEl) {
          error('No element found with ID ' + key + '.');
          return;
        }
      }

      log('Setting motion-capture-replayer on ' + key + '.');
      replayingEl.setAttribute('motion-capture-replayer', {loop: data.loop});
      replayingEl.components['motion-capture-replayer'].startReplaying(replayData[key]);
    });
  },

  /**
   * Create head geometry for spectator mode.
   * Always created in case we want to toggle, but only visible during spectator mode.
   */
  configureHeadGeometry: function () {
    var cameraEl = this.cameraEl;
    var headMesh;
    var leftEyeMesh;
    var rightEyeMesh;
    var leftEyeBallMesh;
    var rightEyeBallMesh;

    if (cameraEl.getObject3D('mesh') || cameraEl.getObject3D('replayerMesh')) { return; }

    // Head.
    headMesh = new THREE.Mesh();
    headMesh.geometry = new THREE.BoxBufferGeometry(0.3, 0.3, 0.2);
    headMesh.material = new THREE.MeshStandardMaterial({color: 'pink'});
    headMesh.visible = this.data.spectatorMode;

    // Left eye.
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

    // Right eye.
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

  /**
   * Remove motion-capture-replayer components.
   */
  stopReplaying: function () {
    var self = this;

    if (!this.isReplaying || !this.replayData) { return; }

    this.isReplaying = false;
    Object.keys(this.replayData).forEach(function removeReplayer (key) {
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

  /**
   * XHR for data.
   */
  loadRecordingFromUrl: function (url, binary, callback) {
    var data;
    var self = this;
    fileLoader.crossOrigin = 'anonymous';
    if (binary === true) {
      fileLoader.setResponseType('arraybuffer');
    }
    fileLoader.load(url, function (buffer) {
      if (binary === true) {
        data = self.loadStrokeBinary(buffer);
      } else {
        data = JSON.parse(buffer);
      }
      if (callback) { callback(data); }
    });
  }
});

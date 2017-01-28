/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before AFRAME was available.');
	}

	// Components
	__webpack_require__(1);
	__webpack_require__(2);
	__webpack_require__(3);
	__webpack_require__(4);
	__webpack_require__(5);

	// Systems
	__webpack_require__(6);


/***/ },
/* 1 */
/***/ function(module, exports) {

	/* global AFRAME, THREE */

	var EVENTS = {
	  axismove: {id: 0, props: ['id', 'axis']},
	  buttonchanged: {id: 1, props: ['id', 'state']},
	  buttondown: {id: 2, props: ['id', 'state']},
	  buttonup: {id: 3, props: ['id', 'state']},
	  touchstart: {id: 4, props: ['id', 'state']},
	  touchend: {id: 5, props: ['id', 'state']}
	};

	var EVENTS_DECODE = {
	  0: 'axismove',
	  1: 'buttonchanged',
	  2: 'buttondown',
	  3: 'touchstart',
	  4: 'touchend'
	};

	AFRAME.registerComponent('motion-capture-recorder', {
	  schema: {
	    enabled: {default: true},
	    hand: {default: 'right'},
	    visibleStroke: {default: true},
	    persistStroke: {default: false},
	    autoStart: {default: false}
	  },

	  init: function () {
	    this.drawing = false;
	    this.recordedEvents = [];
	    this.recordedPoses = [];
	    this.addEventListeners();
	  },

	  addEventListeners: function () {
	    var el = this.el;
	    this.recordEvent = this.recordEvent.bind(this);
	    el.addEventListener('axismove', this.recordEvent);
	    el.addEventListener('buttonchanged', this.onTriggerChanged.bind(this));
	    el.addEventListener('buttonchanged', this.recordEvent);
	    el.addEventListener('buttonup', this.recordEvent);
	    el.addEventListener('buttondown', this.recordEvent);
	    el.addEventListener('touchstart', this.recordEvent);
	    el.addEventListener('touchend', this.recordEvent);
	  },

	  recordEvent: function (evt) {
	    var detail;
	    if (!this.isRecording) { return; }

	    detail = {};
	    EVENTS[evt.type].props.forEach(function buildDetail (propName) {
	      detail[propName] = evt.detail[propName];
	    });

	    this.recordedEvents.push({
	      name: evt.type,
	      detail: detail,
	      timestamp: this.lastTimestamp
	    });
	  },

	  onTriggerChanged: function (evt) {
	    var data = this.data;
	    var value;
	    if (!data.enabled || data.autoStart) { return; }
	    // Not Trigger
	    if (evt.detail.id !== 1) { return; }
	    value = evt.detail.state.value;
	    if (value <= 0.1) {
	      if (this.isRecording) { this.stopRecording(); }
	      return;
	    }
	    if (!this.isRecording) { this.startRecording(); }
	  },

	  getJSONData: function () {
	    if (!this.recordedPoses) { return; }
	    return {
	      poses: this.system.getStrokeJSON(this.recordedPoses),
	      events: this.recordedEvents
	    };
	  },

	  saveCapture: function (binary) {
	    var jsonData = JSON.stringify(this.getJSONData());
	    var type = binary ? 'application/octet-binary' : 'application/json';
	    var blob = new Blob([jsonData], {type: type});
	    var url = URL.createObjectURL(blob);
	    var fileName = 'motion-capture-' + document.title + '-' + Date.now() + '.json';
	    var aEl = document.createElement('a');
	    aEl.setAttribute('class', 'motion-capture-download');
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

	  update: function () {
	    var el = this.el;
	    var data = this.data;
	    if (this.data.autoStart) {
	      this.startRecording();
	    } else {
	      el.setAttribute('vive-controls', {hand: data.hand});
	      el.setAttribute('oculus-touch-controls', {hand: data.hand});
	      el.setAttribute('stroke', {hand: data.hand});
	    }
	  },

	  tick: (function () {
	    var position = new THREE.Vector3();
	    var rotation = new THREE.Quaternion();
	    var scale = new THREE.Vector3();

	    return function (time, delta) {
	      var newPoint;
	      var pointerPosition;
	      this.lastTimestamp = time;
	      if (!this.data.enabled || !this.isRecording) { return; }
	      newPoint = {
	        position: this.el.getAttribute('position'),
	        rotation: this.el.getAttribute('rotation'),
	        timestamp: time
	      };
	      this.recordedPoses.push(newPoint);
	      if (!this.data.visibleStroke) { return; }
	      this.el.object3D.updateMatrixWorld();
	      this.el.object3D.matrixWorld.decompose(position, rotation, scale);
	      pointerPosition = this.getPointerPosition(position, rotation);
	      this.el.components.stroke.drawPoint(position, rotation, time, pointerPosition);
	    };
	  })(),

	  getPointerPosition: (function () {
	    var pointerPosition = new THREE.Vector3();
	    var offset = new THREE.Vector3(0, 0.7, 1);
	    return function getPointerPosition (position, orientation) {
	      var pointer = offset
	        .clone()
	        .applyQuaternion(orientation)
	        .normalize()
	        .multiplyScalar(-0.03);
	      pointerPosition.copy(position).add(pointer);
	      return pointerPosition;
	    };
	  })(),

	  startRecording: function () {
	    var el = this.el;
	    if (this.isRecording) { return; }
	    if (el.components.stroke) { el.components.stroke.reset(); }
	    this.isRecording = true;
	    this.recordedPoses = [];
	    this.recordedEvents = [];
	    el.emit('strokestarted', {entity: el, poses: this.recordedPoses});
	  },

	  stopRecording: function () {
	    var el = this.el;
	    if (!this.isRecording) { return; }
	    el.emit('strokeended', {poses: this.recordedPoses});
	    this.isRecording = false;
	    if (!this.data.visibleStroke || this.data.persistStroke) { return; }
	    el.components.stroke.reset();
	  }
	});


/***/ },
/* 2 */
/***/ function(module, exports) {

	/* global AFRAME, THREE */
	AFRAME.registerComponent('motion-capture-replayer', {
	  schema: {
	    enabled: {default: true},
	    recorderEl: {type: 'selector'},
	    loop: {default: true},
	    src: {default: ''}
	  },

	  init: function () {
	    this.currentPoseTime = 0;
	    this.currentEventTime = 0;
	    this.currentPoseIndex = 0;
	    this.currentEventIndex = 0;
	    this.onStrokeStarted = this.onStrokeStarted.bind(this);
	    this.onStrokeEnded = this.onStrokeEnded.bind(this);
	    this.discardedFrames = 0;
	    this.playingEvents = [];
	    this.playingPoses = [];
	  },

	  update: function (oldData) {
	    var data = this.data;
	    this.updateRecorder(data.recorderEl, oldData.recorderEl);
	    if (oldData.src === data.src) { return; }
	    if (data.src) { this.updateSrc(data.src); }
	  },

	  updateRecorder: function (newRecorderEl, oldRecorderEl) {
	    if (oldRecorderEl && oldRecorderEl !== newRecorderEl) {
	      oldRecorderEl.removeEventListener('strokestarted', this.onStrokeStarted);
	      oldRecorderEl.removeEventListener('strokeended', this.onStrokeEnded);
	    }
	    if (!newRecorderEl || oldRecorderEl === newRecorderEl) { return; }
	    newRecorderEl.addEventListener('strokestarted', this.onStrokeStarted);
	    newRecorderEl.addEventListener('strokeended', this.onStrokeEnded);
	  },

	  updateSrc: function (src) {
	    this.el.sceneEl.systems['motion-capture-recorder'].loadRecordingFromUrl(src, false, this.startPlaying.bind(this));
	  },

	  onStrokeStarted: function(evt) {
	    this.reset();
	  },

	  onStrokeEnded: function(evt) {
	    this.startPlaying({
	      poses: evt.detail.poses,
	      events: []
	    });
	  },

	  play: function () {
	    if (this.playingStroke) { this.startPlaying(this.playingStroke); }
	  },

	  startPlaying: function (data) {
	    this.ignoredFrames = 0;
	    this.storeInitialPose();
	    this.startPlayingPoses(data.poses);
	    this.startPlayingEvents(data.events);
	  },

	  stopPlaying: function () {
	    this.isPlaying = false;
	    this.restoreInitialPose();
	  },

	  storeInitialPose: function () {
	    var el = this.el;
	    this.initialPose = {
	      position: el.getAttribute('position'),
	      rotation: el.getAttribute('rotation')
	    };
	  },

	  restoreInitialPose: function () {
	    var el = this.el;
	    if (!this.initialPose) { return; }
	    el.setAttribute('position', this.initialPose.position);
	    el.setAttribute('rotation', this.initialPose.rotation);
	  },

	  startPlayingPoses: function (poses) {
	    this.isPlaying = true;
	    this.currentPoseIndex = 0;
	    this.playingPoses = poses;
	    this.currentPoseTime = poses[0].timestamp;
	  },

	  startPlayingEvents: function (events) {
	    var firstEvent;
	    this.isPlaying = true;
	    this.currentEventIndex = 0;
	    this.playingEvents = events;
	    firstEvent = events[0];
	    if (!firstEvent) { return; }
	    this.currentEventTime = firstEvent.timestamp;
	    this.el.emit(firstEvent.name, firstEvent.detail);
	  },

	  // Reset player
	  reset: function () {
	    this.playingPoses = null;
	    this.currentTime = undefined;
	    this.currentPoseIndex = undefined;
	  },

	  playRecording: function (delta) {
	    var currentPose;
	    var currentEvent
	    var playingPoses = this.playingPoses;
	    var playingEvents = this.playingEvents;
	    currentPose = playingPoses && playingPoses[this.currentPoseIndex]
	    currentEvent = playingEvents && playingEvents[this.currentEventIndex];
	    this.currentPoseTime += delta;
	    this.currentEventTime += delta;

	    // Poses.
	    while (currentPose && this.currentPoseTime >= currentPose.timestamp) {
	      if (this.data.loop && this.currentPoseIndex === playingPoses.length - 1) {
	        this.restart();
	      }
	      applyPose(this.el, currentPose);
	      this.currentPoseIndex += 1;
	      currentPose = playingPoses[this.currentPoseIndex];
	    }

	    // Events.
	    while (currentEvent && this.currentEventTime >= currentEvent.timestamp) {
	      this.el.emit(currentEvent.name, currentEvent.detail);
	      this.currentEventIndex += 1;
	      currentEvent = this.playingEvents[this.currentEventIndex];
	    }
	  },

	  restart: function () {
	    this.currentPoseIndex = 0;
	    this.currentPoseTime = this.playingPoses[0].timestamp;
	    this.currentEventIndex = 0;
	    this.currentEventTime = this.playingEvents[0] ? this.playingEvents[0].timestamp : 0;
	  },

	  tick:  function (time, delta) {
	    var deltaTime;

	    // Ignore the first couple of frames that come from window.RAF on Firefox.
	    if (this.ignoredFrames !== 2 && !window.debug) {
	      this.ignoredFrames++;
	      return;
	    }

	    if (!this.isPlaying) { return; }
	    this.playRecording(delta);
	  }
	});

	function applyPose (el, pose) {
	  el.setAttribute('position', pose.position);
	  el.setAttribute('rotation', pose.rotation);
	};


/***/ },
/* 3 */
/***/ function(module, exports) {

	/* global THREE AFRAME  */
	var log = AFRAME.utils.debug('aframe-motion-capture:info');
	var warn = AFRAME.utils.debug('aframe-motion-capture:warn');

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
	      self.cameraEl.setAttribute('motion-capture-recorder', {
	        autoStart: true,
	        visibleStroke: false
	      });
	    });
	  },

	  playRecording: function () {
	    var data;
	    var el = this.el;
	    if (!this.data.autoPlay) { return; }
	    log('Replaying recording.');
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
	   * Poll for tracked controllers.
	   */
	  throttledTick: function () {
	    var self = this;
	    var trackedControllerEls = this.el.querySelectorAll('[tracked-controls]');
	    trackedControllerEls.forEach(function (trackedControllerEl) {
	      if (!trackedControllerEl.id) {
	        warn('Player Recorder: Found tracked controllers with no id. It will not be recorded');
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
	        this.toggleReplaying();
	        break;
	      }

	      case 67: {
	        log('Recording cleared from localStorage.');
	        localStorage.removeItem('avatar-recording');
	        break;
	      }
	    }
	  },

	  toggleReplaying: function () {
	    var avatarPlayer = this.el.components['avatar-replayer'];
	    if (avatarPlayer.isPlaying) {
	      log('Stopped replaying.');
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
	    log('Starting recording!');
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
	    log('Stopped recording.');
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
	      log('Recording saved to localStorage.');
	      this.saveToLocalStorage(data);
	    } else {
	      log('Recording saved to file.');
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


/***/ },
/* 4 */
/***/ function(module, exports) {

	/* global THREE AFRAME  */
	AFRAME.registerComponent('avatar-replayer', {
	  schema: {
	    src: {default: ''},
	    loop: {default: false}
	  },

	  update: function (oldData) {
	    var data = this.data;
	    if (!data.src || oldData.src === data.src) { return; }
	    this.updateSrc(data.src);
	  },

	  updateSrc: function (src) {
	    this.loadRecordingFromUrl(src, false, this.startPlaying.bind(this));
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
	  startPlaying: function (data) {
	    var self = this;
	    var puppetEl;
	    var sceneEl = this.el;

	    this.recordingData = data;
	    this.isPlaying = true;
	    if (!this.el.camera) {
	      this.el.addEventListener('camera-set-active', function () {
	        self.startPlaying(data);
	      });
	      return;
	    }

	    Object.keys(data).forEach(function setPlayer (key) {
	      if (key === 'camera') {
	        sceneEl.camera.el.setAttribute('motion-capture-replayer', {loop: false});
	        sceneEl.camera.el.components['motion-capture-replayer'].startPlaying(data.camera);
	        return;
	      }

	      puppetEl = sceneEl.querySelector('#' + key);
	      if (!puppetEl) { console.warn('Avatar Player: No element with id ' + key); }
	      puppetEl.setAttribute('motion-capture-replayer', {loop: false});
	      puppetEl.components['motion-capture-replayer'].startPlaying(data[key]);
	    });
	  },

	  stopPlaying: function () {
	    var keys;
	    var self = this;
	    if (!this.isPlaying || !this.recordingData) { return; }
	    this.isPlaying = false;
	    keys = Object.keys(this.recordingData);
	    keys.forEach(function (key) {
	      if (key === 'camera') {
	        self.el.camera.el.components['motion-capture-replayer'].stopPlaying();
	      } else {
	        el = document.querySelector('#' + key);
	        if (!el) { console.warn('Avatar Player: No element with id ' + key); }
	        el.components['motion-capture-replayer'].stopPlaying();
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


/***/ },
/* 5 */
/***/ function(module, exports) {

	/* global THREE AFRAME  */
	AFRAME.registerComponent('stroke', {
	  schema: {
	    enabled: {default: true},
	    color: {default: '#ef2d5e', type: 'color'}
	  },

	  init: function () {
	    var maxPoints = this.maxPoints = 3000;
	    var strokeEl;
	    this.idx = 0;
	    this.numPoints = 0;

	    // Buffers
	    this.vertices = new Float32Array(maxPoints*3*3);
	    this.normals = new Float32Array(maxPoints*3*3);
	    this.uvs = new Float32Array(maxPoints*2*2);

	    // Geometries
	    this.geometry = new THREE.BufferGeometry();
	    this.geometry.setDrawRange(0, 0);
	    this.geometry.addAttribute('position', new THREE.BufferAttribute(this.vertices, 3).setDynamic(true));
	    this.geometry.addAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setDynamic(true));
	    this.geometry.addAttribute('normal', new THREE.BufferAttribute(this.normals, 3).setDynamic(true));

	    this.material = new THREE.MeshStandardMaterial({
	      color: this.data.color,
	      roughness: 0.75,
	      metalness: 0.25,
	      side: THREE.DoubleSide
	    });

	    var mesh = new THREE.Mesh(this.geometry, this.material);
	    mesh.drawMode = THREE.TriangleStripDrawMode;
	    mesh.frustumCulled = false;

	    // Injects stroke entity
	    strokeEl = document.createElement('a-entity');
	    strokeEl.setObject3D('stroke', mesh);
	    this.el.sceneEl.appendChild(strokeEl);
	  },

	  update: function() {
	    this.material.color.set(this.data.color);
	  },

	  drawPoint: (function () {
	    var direction = new THREE.Vector3();
	    var positionA = new THREE.Vector3();
	    var positionB = new THREE.Vector3();
	    var directionA = new THREE.Vector3();
	    var directionB = new THREE.Vector3();
	    return function (position, orientation, timestamp, pointerPosition) {
	      var uv = 0;
	      var numPoints = this.numPoints;
	      var brushSize = 0.01;
	      if (numPoints === this.maxPoints) { return; }
	      for (i = 0; i < numPoints; i++) {
	        this.uvs[uv++] = i / (numPoints - 1);
	        this.uvs[uv++] = 0;

	        this.uvs[uv++] = i / (numPoints - 1);
	        this.uvs[uv++] = 1;
	      }

	      direction.set(1, 0, 0);
	      direction.applyQuaternion(orientation);
	      direction.normalize();

	      positionA.copy(pointerPosition);
	      positionB.copy(pointerPosition);
	      positionA.add(direction.clone().multiplyScalar(brushSize / 2));
	      positionB.add(direction.clone().multiplyScalar(-brushSize / 2));

	      this.vertices[this.idx++] = positionA.x;
	      this.vertices[this.idx++] = positionA.y;
	      this.vertices[this.idx++] = positionA.z;

	      this.vertices[this.idx++] = positionB.x;
	      this.vertices[this.idx++] = positionB.y;
	      this.vertices[this.idx++] = positionB.z;

	      this.computeVertexNormals();
	      this.geometry.attributes.normal.needsUpdate = true;
	      this.geometry.attributes.position.needsUpdate = true;
	      this.geometry.attributes.uv.needsUpdate = true;

	      this.geometry.setDrawRange(0, numPoints * 2);
	      this.numPoints += 1;
	      return true;
	    }
	  })(),

	  reset: function () {
	    var idx = 0;
	    var vertices = this.vertices;
	    for (i = 0; i < this.numPoints; i++) {
	      vertices[idx++] = 0;
	      vertices[idx++] = 0;
	      vertices[idx++] = 0;

	      vertices[idx++] = 0;
	      vertices[idx++] = 0;
	      vertices[idx++] = 0;
	    }
	    this.geometry.setDrawRange(0, 0);
	    this.idx = 0;
	    this.numPoints = 0;
	  },

	  computeVertexNormals: function () {
	    var pA = new THREE.Vector3();
	    var pB = new THREE.Vector3();
	    var pC = new THREE.Vector3();
	    var cb = new THREE.Vector3();
	    var ab = new THREE.Vector3();

	    for (var i = 0, il = this.idx; i < il; i++) {
	      this.normals[ i ] = 0;
	    }

	    var pair = true;
	    for (i = 0, il = this.idx; i < il; i += 3) {
	      if (pair) {
	        pA.fromArray(this.vertices, i);
	        pB.fromArray(this.vertices, i + 3);
	        pC.fromArray(this.vertices, i + 6);
	      } else {
	        pA.fromArray(this.vertices, i + 3);
	        pB.fromArray(this.vertices, i);
	        pC.fromArray(this.vertices, i + 6);
	      }
	      pair = !pair;

	      cb.subVectors(pC, pB);
	      ab.subVectors(pA, pB);
	      cb.cross(ab);
	      cb.normalize();

	      this.normals[i] += cb.x;
	      this.normals[i + 1] += cb.y;
	      this.normals[i + 2] += cb.z;

	      this.normals[i + 3] += cb.x;
	      this.normals[i + 4] += cb.y;
	      this.normals[i + 5] += cb.z;

	      this.normals[i + 6] += cb.x;
	      this.normals[i + 7] += cb.y;
	      this.normals[i + 8] += cb.z;
	    }

	    /*
	    first and last vertice (0 and 8) belongs just to one triangle
	    second and penultimate (1 and 7) belongs to two triangles
	    the rest of the vertices belongs to three triangles

	      1_____3_____5_____7
	      /\    /\    /\    /\
	     /  \  /  \  /  \  /  \
	    /____\/____\/____\/____\
	    0    2     4     6     8
	    */

	    // Vertices that are shared across three triangles
	    for (i = 2 * 3, il = this.idx - 2 * 3; i < il; i++) {
	      this.normals[ i ] = this.normals[ i ] / 3;
	    }

	    // Second and penultimate triangle, that shares just two triangles
	    this.normals[ 3 ] = this.normals[ 3 ] / 2;
	    this.normals[ 3 + 1 ] = this.normals[ 3 + 1 ] / 2;
	    this.normals[ 3 + 2 ] = this.normals[ 3 * 1 + 2 ] / 2;

	    this.normals[ this.idx - 2 * 3 ] = this.normals[ this.idx - 2 * 3 ] / 2;
	    this.normals[ this.idx - 2 * 3 + 1 ] = this.normals[ this.idx - 2 * 3 + 1 ] / 2;
	    this.normals[ this.idx - 2 * 3 + 2 ] = this.normals[ this.idx - 2 * 3 + 2 ] / 2;

	    this.geometry.normalizeNormals();
	  }
	});


/***/ },
/* 6 */
/***/ function(module, exports) {

	AFRAME.registerSystem('motion-capture-recorder', {
	  init: function () {
	    this.strokes = [];
	  },

	  undo: function () {
	    var stroke = this.strokes.pop();
	    if (stroke) {
	      var entity = stroke.entity;
	      entity.emit('stroke-removed', {entity: entity});
	      entity.parentNode.removeChild(entity);
	    }
	  },

	  clear: function () {
	    // Remove all the stroke entities
	    for (var i = 0; i < this.strokes.length; i++) {
	      var entity = this.strokes[i].entity;
	      entity.parentNode.removeChild(entity);
	    }
	    this.strokes = [];
	  },

	  generateRandomStrokes: function (numStrokes) {
	    function randNeg () { return 2 * Math.random() - 1; }

	    for (var l = 0; l < numStrokes; l++) {
	      var numPoints = parseInt(Math.random() * 500);

	      var stroke = [];

	      var position = new THREE.Vector3(randNeg(), randNeg(), randNeg());
	      var aux = new THREE.Vector3();
	      var orientation = new THREE.Quaternion();

	      var pressure = 0.2;
	      for (var i = 0; i < numPoints; i++) {
	        aux.set(randNeg(), randNeg(), randNeg());
	        aux.multiplyScalar(randNeg() / 20);
	        orientation.setFromUnitVectors(position.clone().normalize(), aux.clone().normalize());
	        position = position.add(aux);
	        var timestamp = 0;

	        var pointerPosition = this.getPointerPosition(position, orientation);
	        stroke.addPoint(position, orientation, pointerPosition, pressure, timestamp);
	      }
	    }
	  },

	  saveStroke: function (stroke) {
	    this.strokes.push(stroke);
	  },

	  getPointerPosition: (function () {
	    var pointerPosition = new THREE.Vector3();
	    var offset = new THREE.Vector3(0, 0.7, 1);
	    return function getPointerPosition (position, orientation) {
	      var pointer = offset
	        .clone()
	        .applyQuaternion(orientation)
	        .normalize()
	        .multiplyScalar(-0.03);
	      pointerPosition.copy(position).add(pointer);
	      return pointerPosition;
	    };
	  })(),

	  getJSON: function () {
	    // Strokes
	    var json = {
	      version: VERSION,
	      strokes: [],
	      author: ''
	    };
	    for (i = 0; i < this.strokes.length; i++) {
	      json.strokes.push(this.strokes[i].getJSON(this));
	    }
	    return json;
	  },

	  getStrokeJSON: function (stroke) {
	    var point;
	    var points = [];
	    for (var i = 0; i < stroke.length; i++) {
	      point = stroke[i];
	      points.push({
	        position: point.position,
	        rotation: point.rotation,
	        timestamp: point.timestamp
	      });
	    }
	    return points;
	  },

	  getBinary: function () {
	    var dataViews = [];
	    var MAGIC = 'apainter';
	    var strokes = this.strokes = [];

	    // MAGIC(8) + version (2) + usedBrushesNum(2) + usedBrushesStrings(*)
	    var bufferSize = MAGIC.length;
	    var binaryManager = new BinaryManager(new ArrayBuffer(bufferSize));

	    // Header magic and version
	    binaryManager.writeString(MAGIC);
	    binaryManager.writeUint16(VERSION);

	    // Number of strokes
	    binaryManager.writeUint32(this.strokes.length);
	    dataViews.push(binaryManager.getDataView());

	    // Strokes
	    for (var i = 0; i < strokes.length; i++) {
	      dataViews.push(this.getStrokeBinary(strokes[i]));
	    }
	    return dataViews;
	  },

	  getStrokeBinary: function (stroke) {
	    // NumPoints   = 4
	    // ----------- = 4
	    // [Point] = vector3 + quat + timestamp = (3+4+1)*4 = 32

	    var bufferSize = 4 + (36 * stroke.length);
	    var binaryManager = new BinaryManager(new ArrayBuffer(bufferSize));

	    // Number of points
	    binaryManager.writeUint32(stroke.length);

	    // Points
	    for (var i = 0; i < stroke.length; i++) {
	      var point = stroke[i];
	      binaryManager.writeFloat32Array(point.position.toArray());
	      binaryManager.writeFloat32Array(point.orientation.toArray());
	      binaryManager.writeUint32(point.timestamp);
	    }
	    return binaryManager.getDataView();
	  },

	  loadJSON: function (data) {
	    var strokeData;
	    if (data.version !== VERSION) {
	      console.error('Invalid version: ', version, '(Expected: ' + VERSION + ')');
	    }
	    for (var i = 0; i < data.strokes.length; i++) {
	      strokeData = data.strokes[i];
	      this.loadStrokeJSON(data.strokes[i]);
	    }
	  },

	  loadBinary: function (buffer) {
	    var binaryManager = new BinaryManager(buffer);
	    var magic = binaryManager.readString();
	    if (magic !== 'apainter') {
	      console.error('Invalid `magic` header');
	      return;
	    }

	    var version = binaryManager.readUint16();
	    if (version !== VERSION) {
	      console.error('Invalid version: ', version, '(Expected: ' + VERSION + ')');
	    }

	    var numStrokes = binaryManager.readUint32();
	    for (var l = 0; l < numStrokes; l++) {
	      var numPoints = binaryManager.readUint32();
	      var stroke = [];
	      for (var i = 0; i < numPoints; i++) {
	        var position = binaryManager.readVector3();
	        var orientation = binaryManager.readQuaternion();
	        var timestamp = binaryManager.readUint32();
	        stroke.push({
	          position: position,
	          rotation: rotation,
	          timestamp: time
	        });
	      }
	    }
	  },

	  loadRecordingFromUrl: function (url, binary, callback) {
	    var loader = new THREE.XHRLoader(this.manager);
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
	  },

	  loadFromUrl: function (url, binary) {
	    var loader = new THREE.XHRLoader(this.manager);
	    var self = this;
	    loader.crossOrigin = 'anonymous';
	    if (binary === true) { loader.setResponseType('arraybuffer'); }
	    loader.load(url, function (buffer) {
	      if (binary === true) {
	        self.loadBinary(buffer);
	      } else {
	        self.loadJSON(JSON.parse(buffer));
	      }
	    });
	  }
	});


/***/ }
/******/ ]);
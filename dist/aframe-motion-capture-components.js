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
	__webpack_require__(7);


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
	  3: 'buttonup',
	  4: 'touchstart',
	  5: 'touchend'
	};

	AFRAME.registerComponent('motion-capture-recorder', {
	  schema: {
	    autoRecord: {default: false},
	    enabled: {default: true},
	    hand: {default: 'right'},
	    recordingControls: {default: false},
	    persistStroke: {default: false},
	    visibleStroke: {default: true}
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
	    if (!data.enabled || data.autoRecord) { return; }
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
	    var data;
	    var trackedControlsComponent = this.el.components['tracked-controls'];
	    var controller = trackedControlsComponent && trackedControlsComponent.controller;
	    if (!this.recordedPoses) { return; }
	    data = {
	      poses: this.system.getStrokeJSON(this.recordedPoses),
	      events: this.recordedEvents
	    };
	    if (controller) {
	      data.gamepad = {
	        id: controller.id,
	        hand: controller.hand,
	        index: controller.index
	      };
	    }
	    return data;
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
	    if (this.data.autoRecord) {
	      this.startRecording();
	    } else {
	      // Don't try to record camera with controllers.
	      if (el.components.camera) { return; }

	      if (data.recordingControls) {
	        el.setAttribute('vive-controls', {hand: data.hand});
	        el.setAttribute('oculus-touch-controls', {hand: data.hand});
	      }
	      el.setAttribute('stroke', '');
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

	/* global THREE, AFRAME  */
	AFRAME.registerComponent('motion-capture-replayer', {
	  schema: {
	    enabled: {default: true},
	    recorderEl: {type: 'selector'},
	    loop: {default: false},
	    src: {default: ''},
	    spectatorCamera: {default: false}
	  },

	  init: function () {
	    this.currentPoseTime = 0;
	    this.currentEventTime = 0;
	    this.currentPoseIndex = 0;
	    this.currentEventIndex = 0;
	    this.onStrokeStarted = this.onStrokeStarted.bind(this);
	    this.onStrokeEnded = this.onStrokeEnded.bind(this);
	    this.playComponent = this.playComponent.bind(this);
	    this.el.addEventListener('pause', this.playComponent);
	    this.discardedFrames = 0;
	    this.playingEvents = [];
	    this.playingPoses = [];
	  },

	  remove: function () {
	    this.el.removeEventListener('pause', this.playComponent);
	    this.stopReplaying();
	    this.el.pause();
	    this.el.play();
	  },

	  update: function (oldData) {
	    var data = this.data;
	    this.updateRecorder(data.recorderEl, oldData.recorderEl);
	    if (!this.el.isPlaying) { this.playComponent(); }
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
	    this.el.sceneEl.systems['motion-capture-recorder'].loadRecordingFromUrl(src, false, this.startReplaying.bind(this));
	  },

	  onStrokeStarted: function(evt) {
	    this.reset();
	  },

	  onStrokeEnded: function(evt) {
	    this.startReplayingPoses(evt.detail.poses);
	  },

	  play: function () {
	    if (this.playingStroke) { this.playStroke(this.playingStroke); }
	  },

	  playComponent: function () {
	    this.el.isPlaying = true;
	    this.play();
	  },

	  startReplaying: function (data) {
	    this.ignoredFrames = 0;
	    this.storeInitialPose();
	    this.isReplaying = true;
	    this.startReplayingPoses(data.poses);
	    this.startReplayingEvents(data.events);
	    if (data.gamepad) {
	      this.el.sceneEl.systems['motion-capture-replayer'].gamepads.push(data.gamepad);
	      this.el.emit('gamepadconnected');
	    }
	    this.el.emit('replayingstarted');
	  },

	  stopReplaying: function () {
	    this.isReplaying = false;
	    this.restoreInitialPose();
	    this.el.emit('replayingstopped');
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

	  startReplayingPoses: function (poses) {
	    this.isReplaying = true;
	    this.currentPoseIndex = 0;
	    if (poses.length === 0) { return; }
	    this.playingPoses = poses;
	    this.currentPoseTime = poses[0].timestamp;
	  },

	  startReplayingEvents: function (events) {
	    var firstEvent;
	    this.isReplaying = true;
	    this.currentEventIndex = 0;
	    if (events.length === 0) { return; }
	    firstEvent = events[0];
	    this.playingEvents = events;
	    this.currentEventTime = firstEvent.timestamp;
	    this.el.emit(firstEvent.name, firstEvent);
	  },

	  // Reset player
	  reset: function () {
	    this.playingPoses = null;
	    this.currentTime = undefined;
	    this.currentPoseIndex = undefined;
	  },

	  /**
	   * Called on tick.
	   */
	  playRecording: function (delta) {
	    var currentPose;
	    var currentEvent
	    var playingPoses = this.playingPoses;
	    var playingEvents = this.playingEvents;
	    currentPose = playingPoses && playingPoses[this.currentPoseIndex]
	    currentEvent = playingEvents && playingEvents[this.currentEventIndex];
	    this.currentPoseTime += delta;
	    this.currentEventTime += delta;
	    // determine next pose
	    while ((currentPose && this.currentPoseTime >= currentPose.timestamp) ||
	           (currentEvent && this.currentPoseTime >= currentEvent.timestamp)) {
	      // pose
	      if (currentPose && this.currentPoseTime >= currentPose.timestamp) {
	        if (this.currentPoseIndex === playingPoses.length - 1) {
	          if (this.data.loop) {
	            this.currentPoseIndex = 0;
	            this.currentPoseTime = playingPoses[0].timestamp;
	          } else {
	            this.stopReplaying();
	          }
	        }
	        applyPose(this.el, currentPose);
	        this.currentPoseIndex += 1;
	        currentPose = playingPoses[this.currentPoseIndex];
	      }
	      // event
	      if (currentEvent && this.currentPoseTime >= currentEvent.timestamp) {
	        if (this.currentEventIndex === playingEvents.length && this.data.loop) {
	          this.currentEventIndex = 0;
	          this.currentEventTime = playingEvents[0].timestamp;
	        }
	        this.el.emit(currentEvent.name, currentEvent.detail);
	        this.currentEventIndex += 1;
	        currentEvent = this.playingEvents[this.currentEventIndex];
	      }
	    }
	  },

	  tick:  function (time, delta) {
	    // Ignore the first couple of frames that come from window.RAF on Firefox.
	    if (this.ignoredFrames !== 2 && !window.debug) {
	      this.ignoredFrames++;
	      return;
	    }

	    if (!this.isReplaying) { return; }
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

	/* global THREE, AFRAME  */
	var log = AFRAME.utils.debug('aframe-motion-capture:avatar-recorder:info');
	var warn = AFRAME.utils.debug('aframe-motion-capture:avatar-recorder:warn');

	var LOCALSTORAGE_KEY = 'avatar-recording';

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

	  remove: function () {
	    this.stopReplaying();
	  },

	  restoreCamera: function() {
	    this.currentCameraEl.setAttribute('camera', 'active', true);
	  },

	  setupCameras: function () {
	    this.currentCameraEl = this.el.camera.el;
	    this.currentCameraEl.removeAttribute('data-aframe-default-camera');
	    this.el.removeEventListener('camera-set-active', this.setupCameras);
	    this.initSpectatorCamera();
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
	    var spectatorCameraEl = this.spectatorCameraEl =
	      this.el.querySelector('#spectatorCamera') || document.createElement('a-entity');
	    var spectatorCameraRigEl = this.spectatorCameraRigEl =
	      this.el.querySelector('#spectatorCameraRig') || document.createElement('a-entity');
	    if (this.el.querySelector('#spectatorCameraRig')
	        || !this.data.spectatorMode) { return; }
	    spectatorCameraEl.id = 'spectatorCamera';
	    spectatorCameraRigEl.id = 'spectatorCameraRig';
	    spectatorCameraEl.setAttribute('camera', '');
	    spectatorCameraEl.setAttribute('look-controls', '');
	    spectatorCameraEl.setAttribute('wasd-controls', '');
	    spectatorCameraRigEl.appendChild(spectatorCameraEl);
	    this.el.appendChild(this.spectatorCameraRigEl);
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
	      this.spectatorCameraRigEl.setAttribute('position', data.spectatorPosition);
	      spectatorCameraEl.setAttribute('camera', 'active', true);
	    } else {
	      debugger
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


/***/ },
/* 7 */
/***/ function(module, exports) {

	AFRAME.registerSystem('motion-capture-replayer', {
	  init: function () {
	    var sceneEl = this.sceneEl;
	    var trackedControlsSystem = sceneEl.systems['tracked-controls'];
	    var trackedControlsTick = AFRAME.components['tracked-controls'].Component.prototype.tick;
	    this.gamepads = [];
	    this.updateControllerListOriginal = trackedControlsSystem.updateControllerList.bind(trackedControlsSystem);
	    sceneEl.systems['tracked-controls'].updateControllerList = this.updateControllerList.bind(this);
	    AFRAME.components['tracked-controls'].Component.prototype.tick = this.trackedControlsTickWrapper;
	    AFRAME.components['tracked-controls'].Component.prototype.trackedControlsTick = trackedControlsTick;
	  },

	  trackedControlsTickWrapper: function (time, delta) {
	    if (this.el.components['motion-capture-replayer']) { return; }
	    this.trackedControlsTick(time, delta);
	  },

	  updateControllerList: function () {
	    var sceneEl = this.sceneEl;
	    var i;
	    var trackedControlsSystem = sceneEl.systems['tracked-controls'];
	    this.updateControllerListOriginal();
	    this.gamepads.forEach(function (gamepad) {
	      if (trackedControlsSystem.controllers[gamepad.index]) { return; }
	      trackedControlsSystem.controllers[gamepad.index] = gamepad;
	    });
	    for (i = 0; i < trackedControlsSystem.controllers.length; ++i) {
	      if (!trackedControlsSystem.controllers[i]) {
	        trackedControlsSystem.controllers[i] = {id: '___', index: -1, hand: 'finger'};
	      }
	    }
	  }
	});

/***/ }
/******/ ]);
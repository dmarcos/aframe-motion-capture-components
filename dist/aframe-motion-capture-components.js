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
/***/ (function(module, exports, __webpack_require__) {

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before AFRAME was available.');
	}

	// Components
	__webpack_require__(1);
	__webpack_require__(2);
	__webpack_require__(3);
	__webpack_require__(5);
	__webpack_require__(6);

	// Systems
	__webpack_require__(7);


/***/ }),
/* 1 */
/***/ (function(module, exports) {

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

	    // Filter out `target`, not serializable.
	    if ('detail' in evt && 'state' in evt.detail && typeof evt.detail.state === 'object' &&
	        'target' in evt.detail.state) {
	      delete evt.detail.state.target;
	    }

	    detail = {};
	    EVENTS[evt.type].props.forEach(function buildDetail (propName) {
	      // Convert GamepadButton to normal JS object.
	      if (propName === 'state') {
	        var stateProp;
	        detail.state = {};
	        for (stateProp in evt.detail.state) {
	          detail.state[stateProp] = evt.detail.state[stateProp];
	        }
	        return;
	      }
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
	    if (evt.detail.id !== 1 || !this.data.recordingControls) { return; }
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
	      poses: this.getStrokeJSON(this.recordedPoses),
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


/***/ }),
/* 2 */
/***/ (function(module, exports) {

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

	  /**
	   * @param events {Array} - Array of events with timestamp, name, and detail.
	   */
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
	    // Determine next pose.
	    // Comparing currentPoseTime to currentEvent.timestamp is not a typo.
	    while ((currentPose && this.currentPoseTime >= currentPose.timestamp) ||
	           (currentEvent && this.currentPoseTime >= currentEvent.timestamp)) {
	      // Pose.
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
	      // Event.
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


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	/* global THREE, AFRAME  */
	var constants = __webpack_require__(4);
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


/***/ }),
/* 4 */
/***/ (function(module, exports) {

	module.exports.LOCALSTORAGE_RECORDINGS = 'avatarRecordings';
	module.exports.DEFAULT_RECORDING_NAME = 'default';


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	/* global THREE, AFRAME  */
	var constants = __webpack_require__(4);
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

	    if ('spectatorMode' in oldData && oldData.spectatorMode !== data.spectatorMode) {
	      if (data.spectatorMode) {
	        this.activateSpectatorCamera();
	      } else {
	        this.deactivateSpectatorCamera();
	      }
	    }

	    if (oldData.src !== data.src && data.autoPlay) {
	      this.replayRecordingFromSource(oldData);
	      this.activateSpectatorCamera();
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
	    this.configureHeadGeometry();
	  },

	  /**
	   * tab = toggle spectator camera
	   */
	  onKeyDown: function (evt) {
	    var key = evt.keyCode;
	    switch (key) {
	      // q.
	      case 81: {
	        this.el.setAttribute('avatar-replayer', 'spectatorMode', !this.data.spectatorMode);
	        break;
	      }
	    }
	  },

	  activateSpectatorCamera: function () {
	    var spectatorCameraEl = this.spectatorCameraEl;

	    if (!spectatorCameraEl) {
	      this.el.sceneEl.addEventListener('camera-set-active',
	                                       this.activateSpectatorCamera.bind(this));
	      return;
	    }

	    if (!spectatorCameraEl.hasLoaded) {
	      spectatorCameraEl.addEventListener('loaded', this.activateSpectatorCamera.bind(this));
	      return;
	    }

	    log('Activating spectator camera');
	    spectatorCameraEl.setAttribute('camera', 'active', true);
	    this.cameraEl.getObject3D('replayerMesh').visible = true;
	  },

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

	    if (this.el.querySelector('#spectatorCameraRig')) {
	      this.spectatorCameraEl = this.el.querySelector('#spectatorCameraRig');
	      return;
	    }

	    spectatorCameraEl = this.spectatorCameraEl =
	      sceneEl.querySelector('#spectatorCamera') || document.createElement('a-entity');
	    spectatorCameraRigEl = this.spectatorCameraRigEl =
	      sceneEl.querySelector('#spectatorCameraRig') || document.createElement('a-entity');
	    spectatorCameraRigEl.setAttribute('position', data.spectatorPosition);

	    spectatorCameraEl.id = 'spectatorCamera';
	    spectatorCameraRigEl.id = 'spectatorCameraRig';
	    spectatorCameraEl.setAttribute('camera', {active: data.spectatorMode, userHeight: 0});
	    spectatorCameraEl.setAttribute('look-controls', '');
	    spectatorCameraEl.setAttribute('wasd-controls', {fly: true});
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

	    queryParamSrc = this.getSrcFromSearchParam();

	    // 1. Try `avatar-recorder` query parameter as recording name from localStorage.
	    localStorageData = JSON.parse(localStorage.getItem(constants.LOCALSTORAGE_RECORDINGS)) || {};
	    // Try to search `avatar-recorder` query parameter argument in localStorage.
	    if (localStorageData[queryParamSrc]) {
	      log('Replaying `' + queryParamSrc + '` from localStorage.');
	      this.startReplaying(localStorageData[queryParamSrc]);
	      return;
	    }

	    // 2. Use `avatar-recorder` query parameter or `data.src` as URL
	    // From external file.
	    src = queryParamSrc || data.src;
	    if (src) {
	      if (data.src) {
	        log('Replaying from component `src`', src);
	      } else if (queryParamSrc) {
	        log('Replaying from query parameter `avatar-recording`', src);
	      }
	      this.loadRecordingFromUrl(src, false, this.startReplaying.bind(this));
	      return;
	    }

	    // 3. Use `data.recordingName` as recording name from localStorage.
	    if (localStorageData[data.recordingName]) {
	      log('Replaying `' + data.recordingName + '` from localStorage.');
	      this.startReplaying(localStorageData[data.recordingName]);
	    }
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

	    if (cameraEl.getObject3D('mesh')) { return; }

	    headMesh = new THREE.Mesh();
	    headMesh.geometry = new THREE.BoxBufferGeometry(0.3, 0.3, 0.2);
	    headMesh.material = new THREE.MeshStandardMaterial({color: 'pink'});
	    headMesh.visible = this.data.spectatorMode;

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


/***/ }),
/* 6 */
/***/ (function(module, exports) {

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


/***/ }),
/* 7 */
/***/ (function(module, exports) {

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

/***/ })
/******/ ]);
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

	// Systems
	__webpack_require__(3);


/***/ },
/* 1 */
/***/ function(module, exports) {

	/* global THREE AFRAME  */
	AFRAME.registerComponent('motion-capture-recorder', {
	  schema: {
	    enabled: {default: true},
	    hand: {default: 'right'}
	  },

	  init: function () {
	    var self = this
	    var el = this.el;
	    this.onTriggerChanged = this.onTriggerChanged.bind(this);
	    this.drawing = false;
	    el.addEventListener('buttonchanged', this.onTriggerChanged.bind(this));
	  },

	  init: function (color, brushSize) {
	    this.idx = 0;
	    this.geometry = new THREE.BufferGeometry();
	    this.vertices = new Float32Array(this.options.maxPoints * 3 * 3);
	    this.normals = new Float32Array(this.options.maxPoints * 3 * 3);
	    this.uvs = new Float32Array(this.options.maxPoints * 2 * 2);

	    this.geometry.setDrawRange(0, 0);
	    this.geometry.addAttribute('position', new THREE.BufferAttribute(this.vertices, 3).setDynamic(true));
	    this.geometry.addAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setDynamic(true));
	    this.geometry.addAttribute('normal', new THREE.BufferAttribute(this.normals, 3).setDynamic(true));

	    var mesh = new THREE.Mesh(this.geometry, this.getMaterial());
	    mesh.drawMode = THREE.TriangleStripDrawMode;

	    mesh.frustumCulled = false;
	    mesh.vertices = this.vertices;

	    this.object3D.add(mesh);
	  },

	  getMaterial: function () {
	    var map = this.materialOptions.map;
	    var type = this.materialOptions.type;

	    var defaultOptions = {};
	    var defaultTextureOptions = {};
	    if (map) {
	      defaultTextureOptions = {
	        map: map,
	        transparent: true,
	        alphaTest: 0.5
	      };
	    }

	    if (type === 'shaded') {
	      defaultOptions = {
	        color: this.data.color,
	        roughness: 0.75,
	        metalness: 0.25,
	        side: THREE.DoubleSide
	      };
	    } else {
	      defaultOptions = {
	        color: this.data.color,
	        side: THREE.DoubleSide
	      };
	    }

	    var options = Object.assign(defaultOptions, defaultTextureOptions, this.materialOptions);
	    delete options.type;

	    if (type === 'shaded') {
	      return new THREE.MeshStandardMaterial(options);
	    } else {
	      return new THREE.MeshBasicMaterial(options);
	    }
	  },

	  onTriggerChanged: function (evt) {
	    var value;
	    if (!this.data.enabled) { return; }
	    // Not Trigger
	    if (evt.detail.id !== 1) { return; }
	    value = evt.detail.state.value;
	    if (value <= 0.1) {
	      if (this.currentStroke) {
	        this.el.emit('strokeended', {stroke: this.currentStroke});
	      }
	      this.currentStroke = null;
	      return;
	    }
	    if (!this.currentStroke) {
	      this.startNewStroke();
	      this.el.emit('strokestarted');
	    }
	  },

	  update: function () {
	    var el = this.el;
	    var data = this.data;
	    el.setAttribute('vive-controls', {hand: data.hand});
	    el.setAttribute('oculus-touch-controls', {hand: data.hand});
	  },

	  tick: (function () {
	    var position = new THREE.Vector3();
	    var rotation = new THREE.Quaternion();
	    var scale = new THREE.Vector3();

	    return function (time, delta) {
	      var newPoint;
	      var pointerPosition;
	      if (this.currentStroke && this.data.enabled) {
	        this.el.object3D.matrixWorld.decompose(position, rotation, scale);
	        newPoint = {
	          position: position.clone(),
	          rotation: rotation.clone(),
	          timestamp: time
	        };
	        this.currentStroke.push(newPoint);
	        pointerPosition = getPointerPosition(newPoint.position, newPoint.position);
	        this.el.compoents.stroke.drawPoint(newPoint.position, newPoint.rotation, newPoint.timestamp, pointerPosition);
	      }
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

	  startNewStroke: function () {
	    this.currentStroke = this.system.addNewStroke();
	    this.el.emit('stroke-started', {entity: this.el, stroke: this.currentStroke});
	  }
	});

/***/ },
/* 2 */
/***/ function(module, exports) {

	/* global THREE AFRAME  */
	AFRAME.registerComponent('motion-capture-player', {
	  schema: {
	    enabled: {default: true},
	    recorderEl: {type: 'selector'}
	  },

	  init: function () {
	    this.onStrokeStarted = this.onStrokeStarted.bind(this);
	    this.onStrokeEnded = this.onStrokeEnded.bind(this);
	  },

	  update: function (oldData) {
	    var recorderEl = this.data.recorderEl;
	    var oldRecorderEl = oldData.recorderEl;
	    if (oldRecorderEl && oldRecorderEl !== recorderEl) {
	      oldData.recorderEl.removeEventListener('strokestarted', this.onStrokeStarted);
	      oldData.recorderEl.removeEventListener('strokeended', this.onStrokeEnded);
	    }
	    if (oldRecorderEl === recorderEl) { return; }
	    recorderEl.addEventListener('strokestarted', this.onStrokeStarted);
	    recorderEl.addEventListener('strokeended', this.onStrokeEnded);
	  },

	  onStrokeStarted: function(evt) {
	    this.playingStroke = null;
	    // Reset player
	    this.currentTime = undefined;
	    this.currentPoseIndex = undefined;
	  },

	  onStrokeEnded: function(evt) {
	    this.playingStroke = evt.detail.stroke;
	    this.currentTime = this.playingStroke[0].timestamp;
	    this.currentPoseIndex = 0;
	  },

	  applyPose: (function(pose) {
	    var euler = new THREE.Euler();
	    return function (pose) {
	      var el = this.el;
	      euler.setFromQuaternion(pose.rotation);
	      el.setAttribute('position', pose.position);
	      el.setAttribute('rotation', euler);
	    }
	  })(),

	  tick: (function () {
	    var position = new THREE.Vector3();
	    var rotation = new THREE.Quaternion();
	    var scale = new THREE.Vector3();

	    return function (time, delta) {
	      var currentTime;
	      var currentPose;
	      var playingStroke = this.playingStroke;
	      if (!playingStroke) { return; }
	      if (!this.currentTime) {
	        this.currentTime = playingStroke[0].timestamp;
	      } else {
	        this.currentTime += delta;
	      }
	      if (this.currentTime >= this.playingStroke[this.currentPoseIndex].timestamp) {
	        this.currentPoseIndex += 1;
	        if (this.currentPoseIndex === playingStroke.length) {
	          this.currentPoseIndex = 0;
	          this.currentTime = playingStroke[0].timestamp;
	        }
	      }
	      this.applyPose(playingStroke[this.currentPoseIndex]);
	    };
	  })(),
	});

/***/ },
/* 3 */
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

	      var stroke = this.addNewStroke();

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

	  addNewStroke: function () {
	    var stroke = [];
	    this.strokes.push(stroke);
	    return stroke;
	  },

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

	  loadJSON: function (data) {
	    if (data.version !== VERSION) {
	      console.error('Invalid version: ', version, '(Expected: ' + VERSION + ')');
	    }

	    for (var i = 0; i < data.strokes.length; i++) {
	      var strokeData = data.strokes[i];

	      var stroke = this.addNewStroke();

	      for (var j = 0; j < strokeData.points.length; j++) {
	        var point = strokeData.points[j];

	        var position = new THREE.Vector3().fromArray(point.position);
	        var orientation = new THREE.Quaternion().fromArray(point.orientation);
	        var timestamp = point.timestamp;
	        stroke.push({
	          position: position,
	          rotation: rotation,
	          timestamp: timestamp
	        });
	      }
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
	      var stroke = this.addNewStroke();
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

	  loadFromUrl: function (url, binary) {
	    var loader = new THREE.XHRLoader(this.manager);
	    loader.crossOrigin = 'anonymous';
	    if (binary === true) {
	      loader.setResponseType('arraybuffer');
	    }

	    var self = this;

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
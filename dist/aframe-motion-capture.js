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
/***/ function(module, exports) {

	if (typeof AFRAME === 'undefined') {
	  throw new Error('Component attempted to register before AFRAME was available.');
	}

	/* global THREE AFRAME  */
	AFRAME.registerComponent('motion-capture-controls', {
	  schema: {
	    capture: { default: true }
	  },

	  init: function () {
	    var self = this;

	    this.active = false;
	    this.currentStroke = null;
	    this.strokeEntities = [];
	    this.drawing = false;


	    this.el.addEventListener('buttonchanged', function (evt) {
	      if (!self.data.enabled) { return; }
	      // Trigger
	      if (evt.detail.id === 1) {
	        var value = evt.detail.state.value;
	        self.sizeModifier = value;
	        if (value > 0.1) {
	          if (!self.active) {
	            self.startNewStroke();
	            self.active = true;
	          }
	        } else {
	          if (self.active) {
	            self.previousEntity = self.currentEntity;
	            self.currentStroke = null;
	          }
	          self.active = false;
	        }
	      }
	    });
	  },

	  tick: (function () {
	    var position = new THREE.Vector3();
	    var rotation = new THREE.Quaternion();
	    var scale = new THREE.Vector3();

	    return function tick (time, delta) {
	      if (this.currentStroke && this.active) {
	        this.obj.matrixWorld.decompose(position, rotation, scale);
	        var pointerPosition = this.system.getPointerPosition(position, rotation);
	        this.currentStroke.addPoint(position, rotation, pointerPosition, this.sizeModifier, time);
	      }
	    };
	  })(),

	  startNewStroke: function () {
	    this.currentStroke = this.system.addNewStroke(this.data.brush, this.color, this.data.size);
	    this.el.emit('stroke-started', {entity: this.el, stroke: this.currentStroke});
	  }
	});

/***/ }
/******/ ]);
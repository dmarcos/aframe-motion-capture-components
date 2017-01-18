/* global THREE AFRAME  */
AFRAME.registerComponent('motion-capture-recorder', {
  schema: {
    enabled: {default: true},
    hand: {default: 'right'},
    visibleStroke: {default: true},
    persistStroke: {default: true}
  },

  init: function () {
    var self = this
    var el = this.el;
    this.onTriggerChanged = this.onTriggerChanged.bind(this);
    this.drawing = false;
    el.addEventListener('buttonchanged', this.onTriggerChanged.bind(this));
  },

  onTriggerChanged: function (evt) {
    var value;
    if (!this.data.enabled) { return; }
    // Not Trigger
    if (evt.detail.id !== 1) { return; }
    value = evt.detail.state.value;
    if (value <= 0.1) {
      if (this.recordingStroke) { this.finishStroke(); }
      return;
    }
    if (!this.recordingStroke) { this.startNewStroke(); }
  },

  getStrokeJSON: function () {
    if (!this.currentStroke) { return; }
    return this.system.getStrokeJSON(this.currentStroke);
  },

  saveCapture: function () {
    var jsonStroke = this.getStrokeJSON();
    var blob = new Blob([jsonStroke], {type: "application/json"});
    var url = URL.createObjectURL(blob);
    var fileName = 'motion-capture-' + document.title + '-' + Date.now() + '.json';
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
  },

  update: function () {
    var el = this.el;
    var data = this.data;
    el.setAttribute('vive-controls', {hand: data.hand});
    el.setAttribute('oculus-touch-controls', {hand: data.hand});
    el.setAttribute('stroke', {hand: data.hand});
  },

  tick: (function () {
    var position = new THREE.Vector3();
    var rotation = new THREE.Quaternion();
    var scale = new THREE.Vector3();

    return function (time, delta) {
      var newPoint;
      var pointerPosition;
      if (!this.data.enabled || !this.recordingStroke) { return; }
      this.el.object3D.matrixWorld.decompose(position, rotation, scale);
      newPoint = {
        position: position.clone(),
        rotation: rotation.clone(),
        timestamp: time
      };
      this.currentStroke.push(newPoint);
      pointerPosition = this.getPointerPosition(position, rotation);
      if (!this.data.visibleStroke) { return; }
      this.el.components.stroke.drawPoint(newPoint.position, newPoint.rotation, newPoint.timestamp, pointerPosition);
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
    var el = this.el;
    el.components.stroke.reset();
    this.recordingStroke = true;
    this.currentStroke = this.system.addNewStroke();
    el.emit('strokestarted', {entity: el, stroke: this.currentStroke});
  },

  finishStroke: function () {
    var el = this.el;
    el.emit('strokeended', {stroke: this.currentStroke});
    this.recordingStroke = false;
    if (this.data.persistStroke) { return; }
    el.components.stroke.reset();
  }
});
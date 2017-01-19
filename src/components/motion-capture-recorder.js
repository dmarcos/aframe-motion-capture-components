/* global THREE AFRAME  */
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
    this.addEventListeners();
  },

  addEventListeners: function () {
    var el = this.el;
    this.recordEvent = this.recordEvent.bind(this);
    el.addEventListener('buttonchanged', this.onTriggerChanged.bind(this));
    el.addEventListener('buttonchanged', this.recordEvent);
    el.addEventListener('buttonup', this.recordEvent);
    el.addEventListener('buttondown', this.recordEvent);
    el.addEventListener('touchstart', this.recordEvent);
    el.addEventListener('touchend', this.recordEvent);
  },

  recordEvent: function(evt) {
    var detail;
    if (!this.recording) { return; }
    detail = {
      id: evt.detail.id,
      state: evt.detail.state
    };
    this.recordedEvents.push({
      name: evt.type,
      detail: detail,
      timestamp: this.lastTimestamp
    });
  },

  onTriggerChanged: function (evt) {
    var value;
    if (!this.data.enabled) { return; }
    // Not Trigger
    if (evt.detail.id !== 1) { return; }
    value = evt.detail.state.value;
    if (value <= 0.1) {
      if (this.recording) { this.finishStroke(); }
      return;
    }
    if (!this.recording) { this.startNewStroke(); }
  },

  getJSONData: function () {
    if (!this.recordedPoses) { return; }
    return JSON.stringify({
      poses: this.system.getStrokeJSON(this.recordedPoses),
      events: this.recordedEvents
    });
  },

  saveCapture: function (binary) {
    var jsonData = this.getJSONData();
    var type = binary ? 'application/octet-binary' : 'application/json';
    var blob = new Blob([jsonData], {type: type});
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
      this.lastTimestamp = time;
      if (!this.data.enabled || !this.recording) { return; }
      this.el.object3D.matrixWorld.decompose(position, rotation, scale);
      newPoint = {
        position: position.clone(),
        rotation: rotation.clone(),
        timestamp: time
      };
      this.recordedPoses.push(newPoint);
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
    this.recording = true;
    this.recordedPoses = [];
    this.recordedEvents = [];
    el.emit('strokestarted', {entity: el, poses: this.recordedPoses});
  },

  finishStroke: function () {
    var el = this.el;
    el.emit('strokeended', {poses: this.recordedPoses});
    this.recording = false;
    if (this.data.persistStroke) { return; }
    el.components.stroke.reset();
  }
});
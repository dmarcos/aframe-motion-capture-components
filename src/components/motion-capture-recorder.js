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
    if (!this.isRecording) { return; }
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
      console.log('autostart');
      //this.startRecording();
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
      pointerPosition = this.getPointerPosition(position, rotation);
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
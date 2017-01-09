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
      if (this.currentStroke && this.data.enabled) {
        this.el.object3D.matrixWorld.decompose(position, rotation, scale);
        this.currentStroke.push({
          position: position.clone(),
          rotation: rotation.clone(),
          timestamp: time
        });
      }
    };
  })(),

  startNewStroke: function () {
    this.currentStroke = this.system.addNewStroke();
    this.el.emit('stroke-started', {entity: this.el, stroke: this.currentStroke});
  }
});
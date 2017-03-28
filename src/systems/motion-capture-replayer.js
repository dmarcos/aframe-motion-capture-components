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
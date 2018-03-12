AFRAME.registerSystem('motion-capture-replayer', {
  init: function () {
    var sceneEl = this.sceneEl;
    var trackedControlsComponent;
    var trackedControlsSystem;
    var trackedControlsTick;

    trackedControlsSystem = sceneEl.systems['tracked-controls'];
    trackedControlsTick = AFRAME.components['tracked-controls'].Component.prototype.tick;

    // Gamepad data stored in recording and added here by `motion-capture-replayer` component.
    this.gamepads = [];

    // Wrap `updateControllerList`.

    this.updateControllerListOriginal = trackedControlsSystem.updateControllerList.bind(
      trackedControlsSystem);
    trackedControlsSystem.throttledUpdateControllerList = AFRAME.utils
      .throttle(this.updateControllerList, 500, this);

    // Wrap `tracked-controls` tick.
    trackedControlsComponent = AFRAME.components['tracked-controls'].Component.prototype;
    trackedControlsComponent.tick = this.trackedControlsTickWrapper;
    trackedControlsComponent.trackedControlsTick = trackedControlsTick;
  },

  remove: function () {
    // restore modified objects
    var trackedControlsComponent = AFRAME.components['tracked-controls'].Component.prototype;
    var trackedControlsSystem = this.sceneEl.systems['tracked-controls'];
    trackedControlsComponent.tick = trackedControlsComponent.trackedControlsTick;
    delete trackedControlsComponent.trackedControlsTick;
    trackedControlsSystem.throttledUpdateControllerList = this.updateControllerListOriginal;
  },

  trackedControlsTickWrapper: function (time, delta) {
    if (this.el.components['motion-capture-replayer']) { return; }
    this.trackedControlsTick(time, delta);
  },

  /**
   * Wrap `updateControllerList` to stub in the gamepads and emit `controllersupdated`.
   */
  updateControllerList: function () {
    var i;
    var sceneEl = this.sceneEl;
    var trackedControlsSystem = sceneEl.systems['tracked-controls'];
    var realGamepads = navigator.getGamepads && navigator.getGamepads();

    this.updateControllerListOriginal(realGamepads);

    this.gamepads.forEach(function (gamepad) {
      if (trackedControlsSystem.controllers[gamepad.index]) { return; }
      trackedControlsSystem.controllers[gamepad.index] = gamepad;
    });

    for (i = 0; i < trackedControlsSystem.controllers.length; i++) {
      if (trackedControlsSystem.controllers[i]) { continue; }
      trackedControlsSystem.controllers[i] = {id: '___', index: -1, hand: 'finger'};
    }

    sceneEl.emit('controllersupdated', undefined, false);
  }
});

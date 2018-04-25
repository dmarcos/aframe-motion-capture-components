/* global assert, setup, suite, test */
require('aframe');
require('../src/index.js');
const helpers = require('./helpers');

suite('avatar-recorder', function () {
  var component;
  var sceneEl;

  setup(function (done) {
    sceneEl = document.createElement('a-scene');
    sceneEl.addEventListener('componentinitialized', evt => {
      if (evt.detail.name !== 'avatar-recorder') { return; }
      if (sceneEl.systems.recordingdb.hasLoaded) {
        component = sceneEl.components['avatar-recorder'];
        waitForCamera();
      } else {
        sceneEl.addEventListener('recordingdbinitialized', function () {
          component = sceneEl.components['avatar-recorder'];
          waitForCamera();
        });
      }
    });

    function waitForCamera () {
      if (sceneEl.camera) {
        done();
        return;
      }
      sceneEl.addEventListener('camera-set-active', function () {
        done();
      });
    }

    sceneEl.setAttribute('avatar-recorder', '');
    document.body.appendChild(sceneEl);
  });

  teardown(function () {
    // https://github.com/aframevr/aframe/pull/2302
    window.removeEventListener('keydown', component.onKeyDown);
  });

  test('gets the camera element', function () {
    component.startRecording();
    assert.equal(component.cameraEl, sceneEl.camera.el);
  });

  test('sets motion-capture-recorder on camera', function () {
    sceneEl.addEventListener('camera-set-active', () => {
      component.startRecording();
      assert.ok(sceneEl.camera.el.getAttribute('motion-capture-recorder'));
      done();
    });
  });

  test('sets motion-capture-recorder on tracked controllers', function (done) {
    var controllers;

    // Create controllers.
    const c1 = document.createElement('a-entity');
    c1.setAttribute('id', 'c1');
    c1.setAttribute('tracked-controls', '');
    const c2 = document.createElement('a-entity');
    c2.setAttribute('id', 'c2');
    c2.setAttribute('tracked-controls', '');

    component.throttledTick();
    controllers = component.trackedControllerEls;
    assert.notOk('c1' in controllers, 'Controller 1 not appended yet');
    assert.notOk('c2' in controllers, 'Controller 2 not appended yet');

    sceneEl.appendChild(c1);
    sceneEl.appendChild(c2);
    setTimeout(() => {
      component.throttledTick();
      controllers = component.trackedControllerEls;
      assert.ok('c1' in controllers, 'Controller 1 detected');
      assert.ok('c2' in controllers, 'Controller 2 detected');
      done();
    });
  });

  test('adds recording to IndexedDB', function (done) {
    sceneEl.setAttribute('avatar-recorder', 'recordingName', 'foo');
    component.startRecording();
    component.recordingData = {camera: {poses: [{timestamp: 0}], events: []}};
    component.isRecording = true;
    component.stopRecording();
    sceneEl.systems.recordingdb.getRecording('foo').then(data => {
      assert.shallowDeepEqual(data, component.recordingData);
      done();
    });
  });
});

suite('avatar-replayer', function () {
  var component;
  var sceneEl;

  setup(function (done) {
    sceneEl = document.createElement('a-scene');
    sceneEl.addEventListener('componentinitialized', evt => {
      if (evt.detail.name !== 'avatar-replayer') { return; }
      component = sceneEl.components['avatar-replayer'];
      done();
    });
    sceneEl.setAttribute('avatar-replayer', '');
    document.body.appendChild(sceneEl);
  });

  test('sets motion-capture-replayer on camera and controllers', (done) => {
    const c1 = document.createElement('a-entity');
    c1.setAttribute('id', 'c1');
    c1.setAttribute('tracked-controls', '');
    sceneEl.appendChild(c1);
    const c2 = document.createElement('a-entity');
    c2.setAttribute('id', 'c2');
    c2.setAttribute('tracked-controls', '');
    sceneEl.appendChild(c2);

    sceneEl.addEventListener('camera-set-active', () => {
      sceneEl.components['avatar-replayer'].startReplaying({
        camera: {poses: [{timestamp: 0}], events: []},
        c1: {poses: [{timestamp: 0}], events: []},
        c2: {poses: [{timestamp: 0}], events: []}
      });
      assert.ok(sceneEl.camera.el.getAttribute('motion-capture-replayer'));
      assert.ok(c1.getAttribute('motion-capture-replayer'));
      assert.ok(c2.getAttribute('motion-capture-replayer'));
      done();
    });
  });

  test('calls startReplaying on motion-capture-replayer', function (done) {
    const c1 = document.createElement('a-entity');
    c1.setAttribute('id', 'c1');
    c1.setAttribute('tracked-controls', '');
    c1.setAttribute('motion-capture-replayer', '');
    const c1StartPlayingSpy = this.sinon.spy(c1.components['motion-capture-replayer'],
                                             'startReplaying');
    sceneEl.appendChild(c1);

    sceneEl.addEventListener('camera-set-active', () => {
      component.startReplaying({
        camera: {poses: [{timestamp: 0}], events: []},
        c1: {poses: [{timestamp: 0}], events: []},
      });
      assert.ok(c1StartPlayingSpy.called);
      done();
    });
  });
});

suite('motion-capture-recorder', function () {
  var component;
  var el;

  setup(function (done) {
    el = helpers.entityFactory();
    el.addEventListener('componentinitialized', evt => {
      if (evt.detail.name !== 'motion-capture-recorder') { return; }
      component = el.components['motion-capture-recorder'];
      done();
    });
    el.setAttribute('motion-capture-recorder', '');
  });

  suite('tick', function () {
    test('records poses', function () {
      assert.equal(component.recordedPoses.length, 0);
      el.setAttribute('position', '1 1 1');
      el.setAttribute('rotation', '90 90 90');

      component.isRecording = true;
      component.tick(100);

      el.setAttribute('position', '2 2 2');
      el.setAttribute('rotation', '0 0 0');
      component.tick(200);

      assert.equal(component.recordedPoses.length, 2);
      assert.shallowDeepEqual(component.recordedPoses[0].position, {x: 1, y: 1, z: 1});
      assert.shallowDeepEqual(component.recordedPoses[0].rotation, {x: 90, y: 90, z: 90});
      assert.equal(component.recordedPoses[0].timestamp, 100);
      assert.shallowDeepEqual(component.recordedPoses[1].position, {x: 2, y: 2, z: 2});
      assert.shallowDeepEqual(component.recordedPoses[1].rotation, {x: 0, y: 0, z: 0});
      assert.equal(component.recordedPoses[1].timestamp, 200);
    });

    test('does not record pose if not recording', function () {
      assert.equal(component.recordedPoses.length, 0);
      component.isRecording = false;
      component.tick(100);
      assert.equal(component.recordedPoses.length, 0);
    });
  });

  suite('recordEvent', function () {
    test('records axismove', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('axismove', {id: 'foo', axis: {x: 1, y: 1}, changed: [true, true]});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'axismove');
        assert.shallowDeepEqual(component.recordedEvents[0].detail, {
          id: 'foo', axis: {x: 1, y: 1}, changed: [true, true]
        });
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });

    test('records buttonchanged', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('buttonchanged', {id: 'foo', state: {pressed: true}});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'buttonchanged');
        assert.shallowDeepEqual(component.recordedEvents[0].detail,
                                {id: 'foo', state: {pressed: true}});
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });

    test('records buttonup', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('buttonup', {id: 'foo', state: {pressed: true}});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'buttonup');
        assert.shallowDeepEqual(component.recordedEvents[0].detail,
                                {id: 'foo', state: {pressed: true}});
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });

    test('records buttondown', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('buttondown', {id: 'foo', state: {pressed: true}});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'buttondown');
        assert.shallowDeepEqual(component.recordedEvents[0].detail,
                                {id: 'foo', state: {pressed: true}});
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });

    test('records touchstart', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('touchstart', {id: 'foo', state: {pressed: true}});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'touchstart');
        assert.shallowDeepEqual(component.recordedEvents[0].detail,
                                {id: 'foo', state: {pressed: true}});
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });

    test('records touchend', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('touchend', {id: 'foo', state: {pressed: true}});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'touchend');
        assert.shallowDeepEqual(component.recordedEvents[0].detail,
                                {id: 'foo', state: {pressed: true}});
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });
  });

  suite('startRecording', function () {
    test('starts recording', function () {
      assert.notOk(component.isRecording);
      component.startRecording();
      assert.ok(component.isRecording);
    });
  });

  suite('stopRecording', function () {
    test('stops recording', function () {
      component.isRecording = true;
      component.stopRecording();
      assert.notOk(component.isRecording);
    });
  });
});

suite('motion-capture-replayer', function () {
  var component;
  var el;

  setup(function (done) {
    el = helpers.entityFactory();
    el.addEventListener('componentinitialized', evt => {
      if (evt.detail.name !== 'motion-capture-replayer') { return; }
      component = el.components['motion-capture-replayer'];
      done();
    });
    el.setAttribute('motion-capture-replayer', 'loop: false');
  });

  test('plays poses', function () {
    var rotTemp

    assert.shallowDeepEqual(el.getAttribute('position'), {x: 0, y: 0, z: 0});
    assert.shallowDeepEqual(el.getAttribute('rotation'), {x: 0, y: 0, z: 0});

    component.startReplayingPoses([
      {timestamp: 100, position: '1 1 1', rotation: '90 90 90'},
      {timestamp: 200, position: '2 2 2', rotation: '60 60 60'},
      {timestamp: 250, position: '3 3 3', rotation: '30 30 30'}
    ]);

    component.tick(150, 50);
    assert.shallowDeepEqual(el.getAttribute('position'), {x: 1, y: 1, z: 1});
    assert.shallowDeepEqual(el.getAttribute('rotation'), {x: 90, y: 90, z: 90});

    component.tick(200, 50);
    assert.shallowDeepEqual(el.getAttribute('position'), {x: 2, y: 2, z: 2});
    rotTemp = el.getAttribute('rotation');
    rotTemp.x = Math.round(rotTemp.x);
    rotTemp.y = Math.round(rotTemp.y);
    rotTemp.z = Math.round(rotTemp.z);
    assert.shallowDeepEqual(rotTemp, {x: 60, y: 60, z: 60});

    component.tick(300, 100);
    assert.shallowDeepEqual(el.getAttribute('position'), {x: 3, y: 3, z: 3});
    rotTemp = el.getAttribute('rotation');
    rotTemp.x = Math.round(rotTemp.x);
    rotTemp.y = Math.round(rotTemp.y);
    rotTemp.z = Math.round(rotTemp.z);
    assert.shallowDeepEqual(rotTemp, {x: 30, y: 30, z: 30});
  });

  test('plays events', function (done) {
    el.addEventListener('buttondown', function (evt) {
      assert.equal(evt.detail.id, 'foo');
      assert.ok(evt.detail.state);
      setTimeout(() => {
        component.tick(200, 100);
      });
    });

    el.addEventListener('axismove', function (evt) {
      assert.equal(evt.detail.id, 'bar');
      assert.equal(evt.detail.axis.x, 1);
      assert.equal(evt.detail.axis.y, 1);
      setTimeout(() => {
        component.tick(250, 50);
      });
    });

    el.addEventListener('touchend', function (evt) {
      assert.equal(evt.detail.id, 'baz');
      assert.ok(evt.detail.state);
      done();
    });

    component.startReplayingEvents([
      {timestamp: 100, name: 'buttondown', detail: {id: 'foo', state: {pressed: true}}},
      {timestamp: 200, name: 'axismove', detail: {id: 'bar', axis: {x: 1, y: 1}}},
      {timestamp: 250, name: 'touchend', detail: {id: 'baz', state: {pressed: true}}}
    ]);
    component.tick(150, 50);
  });
});

suite('motion-capture-replayer system', function () {
  var el;

  setup(function (done) {
    el = helpers.entityFactory();
    el.addEventListener('componentinitialized', evt => {
      if (evt.detail.name !== 'motion-capture-replayer') { return; }
      component = el.components['motion-capture-replayer'];
      setTimeout(() => { done(); }, 50);
    });
    el.setAttribute('motion-capture-replayer', 'loop: false');
  });

  test('injects tracked-controls', function (done) {
    assert.equal(el.sceneEl.systems['tracked-controls'].controllers.length, 0);

    el.sceneEl.addEventListener('controllersupdated', () => {
      assert.equal(el.sceneEl.systems['motion-capture-replayer'].gamepads.length, 1);
      assert.equal(el.sceneEl.systems['tracked-controls'].controllers.length, 1);
      assert.equal(el.sceneEl.systems['tracked-controls'].controllers[0].id,
                   'OpenVR Controller');
      done();
    });

    el.components['motion-capture-replayer'].startReplaying({
      gamepad: {id: 'OpenVR Controller', index: 1, hand: 'left'},
      poses: [{timestamp: 100, position: '1 1 1', rotation: '90 90 90'}],
      events: []
    });
  });
});

/* global assert, setup, suite, test */
require('aframe');
require('../src/index.js');
const helpers = require('./helpers');

const recordKeyEvent = new Event('keydown');
recordKeyEvent.keyCode = 32;

const clearKeyEvent = new Event('keydown');
clearKeyEvent.keyCode = 67;

var LOCALSTORAGE_KEY = 'avatar-recording';

suite('avatar-recorder', function () {
  var component;
  var sceneEl;

  setup(function (done) {
    sceneEl = document.createElement('a-scene');
    sceneEl.addEventListener('componentinitialized', evt => {
      if (evt.detail.name !== 'avatar-recorder') { return; }
      component = sceneEl.components['avatar-recorder'];
      done();
    });
    sceneEl.setAttribute('avatar-recorder', '');
    document.body.appendChild(sceneEl);
  });

  teardown(function () {
    // https://github.com/aframevr/aframe/pull/2302
    window.removeEventListener('keydown', component.onKeyDown);
    localStorage.clear();
  });

  test('gets the camera element', function (done) {
    sceneEl.addEventListener('camera-set-active', evt => {
      setTimeout(() => {
        assert.equal(component.cameraEl, sceneEl.camera.el);
        done();
      });
    });
  });

  test('sets motion-capture-recorder on camera', function (done) {
    sceneEl.addEventListener('camera-set-active', evt => {
      setTimeout(() => {
        assert.ok(sceneEl.camera.el.getAttribute('motion-capture-recorder'));
        done();
      });
    });
  });

  test('sets motion-capture-recorder on tracked controllers', function (done) {
    const controllers = component.trackedControllerEls;
    const c1 = document.createElement('a-entity');
    c1.setAttribute('id', 'c1');
    c1.setAttribute('tracked-controls', '');

    const c2 = document.createElement('a-entity');
    c2.setAttribute('id', 'c2');
    c2.setAttribute('tracked-controls', '');

    sceneEl.components['avatar-recorder'].throttledTick();
    assert.notOk('c1' in controllers);
    assert.notOk('c2' in controllers);

    sceneEl.appendChild(c1);
    setTimeout(() => {
      sceneEl.components['avatar-recorder'].throttledTick();
      assert.ok('c1' in controllers);
      assert.notOk('c2' in controllers);

      sceneEl.appendChild(c2);
      setTimeout(() => {
        sceneEl.components['avatar-recorder'].throttledTick();
        assert.ok('c1' in controllers);
        assert.ok('c2' in controllers);
        done();
      });
    });
  });

  test('shortcut toggles recording', function (done) {
    const recordSpy = this.sinon.spy(component, 'startRecording');
    const stopSpy = this.sinon.spy(component, 'stopRecording');

    sceneEl.setAttribute('avatar-recorder', 'autoPlay', false);

    sceneEl.addEventListener('camera-set-active', () => {
      setTimeout(() => {
        window.dispatchEvent(recordKeyEvent);
        setTimeout(() => {
          assert.equal(recordSpy.callCount, 1);
          assert.equal(stopSpy.callCount, 0);
          window.dispatchEvent(recordKeyEvent);
          setTimeout(() => {
            assert.equal(recordSpy.callCount, 1);
            assert.equal(stopSpy.callCount, 1);
            done();
          }, 10);
        }, 10);
      }, 10);
    });
  });

  test('stores recording in localStorage', function (done) {
    sceneEl.addEventListener('camera-set-active', evt => {
      sceneEl.setAttribute('avatar-recorder', 'autoPlay', false);
      sceneEl.setAttribute('avatar-recorder', 'localStorage', true);
      component.recordingData = {camera: {poses: [{timestamp: 0}], events: []}};
      component.isRecording = true;
      component.stopRecording();
      assert.shallowDeepEqual(JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY)),
                              component.recordingData);
      done();
    });
  });

  test('does not store recording in localStorage if not set', function (done) {
    sceneEl.addEventListener('camera-set-active', evt => {
      sceneEl.setAttribute('avatar-recorder', 'autoPlay', false);
      sceneEl.setAttribute('avatar-recorder', 'localStorage', false);
      component.recordingData = {camera: {poses: [{timestamp: 0}], events: []}};
      component.isRecording = true;
      component.stopRecording();
      assert.notOk(localStorage.getItem(LOCALSTORAGE_KEY));
      done();
    });
  });

  test('clears localStorage and recording on shortcut', function (done) {
    sceneEl.addEventListener('camera-set-active', evt => {
      sceneEl.setAttribute('avatar-recorder', 'autoPlay', false);
      sceneEl.setAttribute('avatar-recorder', 'localStorage', true);
      component.recordingData = {camera: {poses: [{timestamp: 0}], events: []}};
      component.isRecording = true;
      component.stopRecording();

      assert.ok(localStorage.getItem(LOCALSTORAGE_KEY));
      assert.ok(component.recordingData);

      window.dispatchEvent(clearKeyEvent);
      setTimeout(() => {
        assert.notOk(localStorage.getItem(LOCALSTORAGE_KEY));
        assert.notOk(component.recordingData);
        done();
      });
    });
  });
});

suite('avatar-recorder (replay from localStorage)', function () {
  var sceneEl;

  setup(function (done) {
    sceneEl = document.createElement('a-scene');
    sceneEl.addEventListener('loaded', () => {
      done();
    });
    document.body.appendChild(sceneEl);
  });

  teardown(function () {
    // https://github.com/aframevr/aframe/pull/2302
    window.removeEventListener('keydown', sceneEl.components['avatar-recorder'].onKeyDown);
    localStorage.clear();
  });

  test('autoPlays from localStorage', function (done) {
    sceneEl.addEventListener('camera-set-active', () => {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({
        camera: {poses: [{timestamp: 0}], events: []},
      }));
      setTimeout(() => {
        sceneEl.setAttribute('avatar-recorder', 'autoPlay: true');
        setTimeout(() => {
          assert.ok(sceneEl.components['avatar-replayer'], 'Replayer is set');
          assert.ok(sceneEl.components['avatar-replayer'].isReplaying);
          done();
        });
      });
    });
  });

  test('autoPlays from localStorage with replayer set', function (done) {
    sceneEl.setAttribute('avatar-replayer', 'autoPlay: true');
    const startReplayingSpy = this.sinon.spy(sceneEl.components['avatar-replayer'],
                                             'startReplaying');

    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({
      camera: {poses: [{timestamp: 0}], events: []},
    }));

    sceneEl.setAttribute('avatar-recorder', 'autoPlay: true');
    setTimeout(() => {
      assert.ok(startReplayingSpy.called);
      assert.ok(startReplayingSpy.getCalls()[0].args[0].camera.poses);
      done();
    });
  });

  test('does not autoPlay if nothing in localStorage', function (done) {
    sceneEl.setAttribute('avatar-recorder', 'autoPlay: true');
    setTimeout(() => {
      assert.notOk(sceneEl.components['avatar-replayer']);
      done();
    });
  });

  test('does not autoPlay if autoPlay not set', function (done) {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({
      camera: {poses: [{timestamp: 0}], events: []},
    }));
    sceneEl.setAttribute('avatar-recorder', 'autoPlay: false');
    setTimeout(() => {
      assert.notOk(sceneEl.components['avatar-replayer']);
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
    test('records pose', function () {
      assert.equal(component.recordedPoses.length, 0);
      el.setAttribute('position', '1 1 1');
      el.setAttribute('rotation', '90 90 90');

      component.isRecording = true;
      component.tick(100);

      assert.equal(component.recordedPoses.length, 1);
      assert.shallowDeepEqual(component.recordedPoses[0].position, {x: 1, y: 1, z: 1});
      assert.shallowDeepEqual(component.recordedPoses[0].rotation, {x: 90, y: 90, z: 90});
      assert.equal(component.recordedPoses[0].timestamp, 100);
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
      el.emit('axismove', {id: 'foo', axis: {x: 1, y: 1}});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'axismove');
        assert.shallowDeepEqual(component.recordedEvents[0].detail, {
          id: 'foo', axis: {x: 1, y: 1}
        });
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });

    test('records buttonchanged', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('buttonchanged', {id: 'foo', state: true});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'buttonchanged');
        assert.shallowDeepEqual(component.recordedEvents[0].detail, {id: 'foo', state: true});
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });

    test('records buttonup', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('buttonup', {id: 'foo', state: true});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'buttonup');
        assert.shallowDeepEqual(component.recordedEvents[0].detail, {id: 'foo', state: true});
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });

    test('records buttondown', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('buttondown', {id: 'foo', state: true});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'buttondown');
        assert.shallowDeepEqual(component.recordedEvents[0].detail, {id: 'foo', state: true});
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });

    test('records touchstart', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('touchstart', {id: 'foo', state: true});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'touchstart');
        assert.shallowDeepEqual(component.recordedEvents[0].detail, {id: 'foo', state: true});
        assert.equal(component.recordedEvents[0].timestamp, 100);
        done();
      });
    });

    test('records touchend', function (done) {
      assert.equal(component.recordedEvents.length, 0);
      component.tick(100);
      component.isRecording = true;
      el.emit('touchend', {id: 'foo', state: true});
      setTimeout(() => {
        assert.equal(component.recordedEvents.length, 1);
        assert.equal(component.recordedEvents[0].name, 'touchend');
        assert.shallowDeepEqual(component.recordedEvents[0].detail, {id: 'foo', state: true});
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

  suite('saveCapture', function () {
    test('appends download link', function (done) {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type !== 'childList') { return; }
          const downloadLink = document.querySelector('.motion-capture-download');
          assert.ok(downloadLink);
          assert.ok(downloadLink.hasAttribute('download'));
          assert.ok(downloadLink.hasAttribute('href'));
          observer.disconnect();
          done();
        });
      });
      observer.observe(document.body, {childList: true});

      component.saveCapture();
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
    assert.shallowDeepEqual(el.getAttribute('rotation'), {x: 60, y: 60, z: 60});

    component.tick(300, 100);
    assert.shallowDeepEqual(el.getAttribute('position'), {x: 3, y: 3, z: 3});
    assert.shallowDeepEqual(el.getAttribute('rotation'), {x: 30, y: 30, z: 30});
  });

  test('plays events', function (done) {
    el.addEventListener('buttondown', function (evt) {
      assert.equal(evt.detail.id, 'foo');
      assert.ok(evt.detail.state);
      setTimeout(() => {
        component.tick(200, 50);
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
      {timestamp: 100, name: 'buttondown', detail: {id: 'foo', state: true}},
      {timestamp: 200, name: 'axismove', detail: {id: 'bar', axis: {x: 1, y: 1}}},
      {timestamp: 250, name: 'touchend', detail: {id: 'baz', state: true}}
    ]);
    component.tick(150, 50);
  });
});

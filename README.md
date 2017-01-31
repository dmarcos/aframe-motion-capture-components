## aframe-motion-capture

[A-Frame](https://aframe.io) motion capture components to record pose and
events on entities (i.e., camera and tracked controllers) to JSON. Then replay
the pose and events later without even needing VR. Can be used for WebVR
development ergonomics or any other applications of motion capture.

### Usage

#### Avatar Recording

An "avatar" is the representation of a user. Use the `avatar-recorder` to
record headset and tracked controller poses as well as controller events (i.e.,
button presses and touches).

1. Set the `avatar-recorder` component on the `<a-scene>` element.
2. Make sure your controllers have `id`s.
3. Hit `<space>` to start recording.
4. Record movements and controller events.
5. Hit `<space>>` again to stop recording.
6. The recording will play from `localStorage`. Hit `<ctrl> + <shift> + s` to save the
   recording to a file.

Hit `c` on the keyboard to clear the recording from `localStorage`.

```html
<a-scene avatar-recorder>
  <a-entity id="controller1" hand-controls"></a-entity>
  <a-entity id="controller2" hand-controls"></a-entity>
</a-scene>
```

#### Avatar Replaying

The `avatar-recorder` will automatically set the `avatar-replayer` component.
Though we can specify the `avatar-replayer` explicitly if we want to configure
it or if we don't need recording (i.e., production):

```html
<a-scene avatar-replayer="src: recording.json; loop: true">
  <a-entity id="controller1" hand-controls"></a-entity>
  <a-entity id="controller2" hand-controls"></a-entity>
</a-scene>
```

##### From localStorage

By default, the `avatar-recorder` will save the recording into `localStorage`
which the `avatar-replayer` will replay from by default.

Hit `p` to toggle playback.

##### From File

We can specify the path to a recording file via the `avatar-recording` **query
parameter** in the URL:

```html
https://foo.bar?avatar-recording=path/to/recording.json
https://foo.bar?avatar-recording=path/to/anotherRecording.json
```

Or we can specify the path to a recording file via the `src` property:

```html
<a-scene avatar-replayer="src: recording.json">
  <a-entity id="controller1" hand-controls"></a-entity>
  <a-entity id="controller2" hand-controls"></a-entity>
</a-scene>
```

### API

#### Keyboard Shortcuts

| Key          | Description                                   |
|--------------|-----------------------------------------------|
| space        | Toggle recording.                             |
| c            | Clear recording from localStorage and memory. |
| p            | Toggle replaying.                             |
| ctrl/shift/s | Save recording to file.                       |

#### avatar-recorder

| Property      | Description | Default Value |
| --------      | ----------- | ------------- |
| autoPlay      |             | true          |
| autoPlayDelay |             | 500           |
| autoRecord    |             | false         |
| binaryFormat  |             | false         |
| localStorage  |             | true          |

#### avatar-replayer

| Property      | Description | Default Value |
| --------      | ----------- | ------------- |
| autoPlay      |             | true          |
| loop          |             | true          |
| src           |             | ''            |
| spectatorMode |             | false         |

#### motion-capture-replayer

| Property        | Description | Default Value |
| --------        | ----------- | ------------- |
| enabled         |             | true          |
| loop            |             | true          |
| recorderEl      | Selector.   | null          |
| src             |             | ''            |
| spectatorCamera |             | false         |

#### motion-capture-recorder

| Property      | Description | Default Value |
| --------      | ----------- | ------------- |
| autoStart     |             | false         |
| enabled       |             | true          |
| hand          |             | 'right'       |
| persistStroke |             | false         |
| visibleStroke |             | true          |

#### stroke

Trace of the path of an entity.

| Property | Description | Default Value |
| -------- | ----------- | ------------- |
| color    |             | #EF2D5E       |
| enabled  |             | true          |

### Installation

#### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>Motion Capture</title>
  <script src="https://aframe.io/releases/0.4.0/aframe.min.js"></script>
  <script src="https://unpkg.com/aframe-motion-capture/dist/aframe-motion-capture.min.js"></script>
</head>

<body>
  <a-scene avatar-recorder avatar-replayer></a-scene>
</body>
```

<!--
Or with [angle](https://npmjs.com/package/angle/), you can install the proper
version of the component straight into your HTML file, respective to your
version of A-Frame:

```sh
angle install aframe-motion-capture
```
-->

#### npm

Install via npm:

```bash
npm install aframe-motion-capture
```

Then require and use.

```js
require('aframe');
require('aframe-motion-capture');
```

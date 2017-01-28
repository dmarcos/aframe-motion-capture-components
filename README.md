## aframe-motion-capture

[A-Frame](https://aframe.io) motion capture components to record pose and
events on entities (i.e., camera and tracked controllers) to JSON. Then replay
the pose and events later without even needing VR. Can be used for WebVR
development ergonomics or any other applications of motion capture.

### Usage

#### WebVR Recording

Set the `avatar-recorder` on the scene. Make sure your controllers have `id`s.
Then hit `<space>` to toggle recording. A JSON will automatically be downloaded
once the recording finishes.

```html
<a-scene avatar-recorder>
  <a-entity id="controller1" hand-controls"></a-entity>
  <a-entity id="controller2" hand-controls"></a-entity>
</a-scene>
```

#### WebVR Replaying

Specify the path to a captured WebVR recording JSON file. Hit `p` to toggle
playback.

```html
<a-scene avatar-replayer="src: recording.json">
  <a-entity id="controller1" hand-controls"></a-entity>
  <a-entity id="controller2" hand-controls"></a-entity>
</a-scene>
```

### API

#### avatar-recorder

| Property      | Description | Default Value |
| --------      | ----------- | ------------- |
| autoRecording |             | false         |
| autoPlay      |             | false         |
| binaryFormat  |             | false         |
| localStorage  |             | false         |

#### avatar-replayer

| Property | Description | Default Value |
| -------- | ----------- | ------------- |
| src      |             | ''            |
| loop     |             | false         |

#### motion-capture-replayer

| Property   | Description | Default Value |
| --------   | ----------- | ------------- |
| enabled    |             | true          |
| loop       |             | true          |
| recorderEl | Selector.   | null          |
| src        |             | ''            |

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

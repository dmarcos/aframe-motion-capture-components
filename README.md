## aframe-motion-capture-components

[A-Frame](https://aframe.io) motion capture components set record pose and
events from entities (i.e., camera and tracked controllers) that can be replayed or persisted to JSON or stored in localstorage. The motion capture components allow to emulate the presence of a VR headset and controllers. We can build test automation for VR experiences. One can replay the recorded user behavior and assert the state of the entities at the end. This can happen with no user intervention at all. We can also record user interactions and develop on the go where there's no VR hardware available. One can iterate over the visual aspect or behavior of the experience using the recorded user input

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

Specify the path to a captured WebVR recording JSON file.

```html
<a-scene avatar-replayer="src: recording.json">
  <a-entity id="controller1" hand-controls"></a-entity>
  <a-entity id="controller2" hand-controls"></a-entity>
</a-scene>
```

### Components API

#### avatar-recorder

| Property          | Description                                             | Default Value |
| ----------------- | ------------------------------------------------------- | ------------- |
| autoPlay          | A recorded sesion plays on page load.                   | true          |
| autoRecord        | Recording starts on page load.                          | false         |
| localStorage      | The recording is persisted on local storage.            | false         |
| loop              | The recording replays in a loop.                        | false         |
| saveFile          | The user is prompted to save a JSON of the recording.   | false         |
| spectatorMode     | Replay in 3rd person mode.                              | false         |
| spectatorPosition | Initial position of the 3rd person camera.              | 0 0 0         |

### Keyboard Shortcuts

| Key   | Description                                   |
|-------|---------------------------------------------- |
| space | Toggle recording.                             |
| c     | Clear recording from localStorage and memory. |

#### avatar-replayer

| Property          | Description                                | Default Value |
| ----------------- | ------------------------------------------ | ------------- |
| loop              | The recording replays in a loop.           | false         |
| src               | The recording data can be hosted in a URL. | ''            |
| spectatorMode     | Replay in 3rd person mode.                 | false         |
| spectatorPosition | Initial position of the 3rd person camera  | 0 0 0         |

#### motion-capture-replayer

| Property   | Description                                          | Default Value |
| --------   | ---------------------------------------------------- | ------------- |
| enabled    |                                                      | true          |
| loop       | The animation replays in a loop.                     | false         |
| recorderEl | An entity that it's the source of the recording.     | null          |
| src        | The recording data can be hosted in a URL.           | ''            |

#### motion-capture-recorder

| Property          | Description                                           | Default Value |
| --------          | ----------------------------------------------------- | ------------- |
| autorRecord       | The component start recording at page load.           | false         |
| enabled           |                                                       | true          |
| hand              | The controller that will trigger recording.           | 'right'       |
| recordingControls | Recording is activated by the controller trigger      | false         |
| persistStroke     | The recorded stroke is persisted as reference.        | false         |
| visibleStroke     | The recorded stroke is renderered for visual feedback.| true          |

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

Or with [angle](https://npmjs.com/package/angle/), you can install the proper
version of the component straight into your HTML file, respective to your
version of A-Frame:

```sh
angle install aframe-motion-capture
```

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

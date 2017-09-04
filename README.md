## aframe-motion-capture-components

[A-Frame](https://aframe.io) motion capture components record pose and events
from entities (e.g., camera and tracked controllers) that can be stored in JSON
or localStorage and then later replayed.

The motion capture components allow us to emulate the presence of a VR headset
and controllers. We can build test automation tools for VR experiences. We can
replay the recorded user behavior and assert the state of the entities at the
end. This can happen with no user intervention at all.

We can also record user interactions and develop on the go where there's no VR
hardware available. We can iterate over the visual aspect or behavior of the
experience using the recorded user input. [Read more about the motion capture
components](https://blog.mozvr.com/a-saturday-night/) and [its use cases as
development tools](https://aframe.io/blog/motion-capture/).

The A-Frame Inspector uses these components to power the Motion Capture
Development Tools UI.

[TRY THE DEMOS](http://swimminglessonsformodernlife.com/aframe-motion-capture-components/)

![](https://cloud.githubusercontent.com/assets/674727/24481580/0ac87ace-14a0-11e7-8281-c032c90f0529.gif)

## Usage

The motion capture components is most easily used by opening the A-Frame
Inspector (`<ctrl> + <alt> + i`), and hitting `m` to open the Motion Capture
Development Tools UI.

### Avatar Recording

An avatar is the representation of a user. Use the `avatar-recorder` to record
headset and tracked controller poses as well as controller events (i.e., button
presses and touches).

1. Set the `avatar-recorder` component on the `<a-scene>` element.
2. Make sure your controllers have `id`s.
3. Hit `<space>` to start recording.
4. Record movements and controller events.
5. Hit `<space>` again to stop recording.
6. You'll have an option to save the JSON file or upload it by pressing `u` on the keyboard.
7. The recording will play from `localStorage`.

```html
<a-scene avatar-recorder>
  <a-entity id="controller1" hand-controls></a-entity>
  <a-entity id="controller2" hand-controls></a-entity>
</a-scene>
```

Hit `c` on the keyboard to clear all recordings from `localStorage`.

### Avatar Replaying

The `avatar-recorder` will automatically set the `avatar-replayer` component.
Though we can specify the `avatar-replayer` explicitly if we want to configure
it or if we don't need recording (i.e., production).

`avatar-replayer` can be manually disabled from the URL query parameter
`avatar-replayer-disabled` (e.g.,
`http://localhost:8000/?avatar-replayer-disabled`). `spectator-mode` can be
enabled using the URL query parameter `specatatorMode`.

##### From localStorage

By default, the `avatar-recorder` will save the recording into `localStorage`
which the `avatar-replayer` will replay from by default. Recordings are stored
in `localStorage.getItem('avatarRecordings')` and are keyed `recordingName`
(defaults to `default`).

Hit `p` to toggle playback.

##### From File

We can specify the path to a recording file via the `avatar-recording` **query
parameter** in the URL:

```html
https://foo.bar?avatar-recording=path/to/recording.json
https://foo.bar?avatar-recording=path/to/anotherRecording.json
```

Or we can specify the path to a recording file in the HTML via the `src` property:

```html
<a-scene avatar-replayer="src: recording.json">
  <a-entity id="controller1" hand-controls"></a-entity>
  <a-entity id="controller2" hand-controls"></a-entity>
</a-scene>
```

## API

### avatar-recorder

| Property          | Description                                                                | Default Value |
| ----------------- | -------------------------------------------------------                    | ------------- |
| autoPlay          | Whether to play recording on page load.                                    | true          |
| autoRecord        | Whether to start recording on page load.                                   | false         |
| autoSaveFile      | Whether to prompt to save a JSON of the recording to file system.          | true          |
| localStorage      | Whether to persist recordings in localStorage keyed as `avatarRecordings`. | false         |
| loop              | Whether to replay recording in a loop.                                     | false         |
| recordingName     | Name of recording to store in `localStorage.getItem('avatarRecordings')`.  | default       |
| spectatorMode     | Whether to replay recording in third person mode.                          | false         |
| spectatorPosition | Initial position of the spectator camera.                                  | 0 0 0         |

#### Methods

| Method                        | Description                                                                                          |
| -----------------             | -------------------------------------------------------                                              |
| saveRecordingFile (recording) | Save recording to file. `recording` can either be raw data or recording name stored in localStorage. |
| startRecording ()             | Start recording                                                                                      |
| stopRecording ()              | Stop recording.                                                                                      |

#### Keyboard Shortcuts

| Key     | Description                                      |
| ------- | ----------------------------------------------   |
| space   | Toggle recording.                                |
| q       | Toggle spectator mode camera.                    |
| c       | Clear recording from localStorage and memory.    |
| u       | Upload recording to file host and get short URL. |

### avatar-replayer

For spectator mode, `avatar-replayer` will create a head geometry to make the
camera visible, represented as a pink box with eyes. This set as
`cameraEl.getObject3D('replayerMesh')` but is not visible by default.

| Property          | Description                                       | Default Value |
| ----------------- | ------------------------------------------        | ------------- |
| autoPlay          | Whether to play recording on page load.           | true          |
| loop              | Whether to replay recording in a loop.            | false         |
| recordingName     | Specify to replay recording from localStorage.    | default       |
| spectatorMode     | Whether to replay recording in third person mode. | false         |
| spectatorPosition | Initial position of the spectator camera.         | 0 0 0         |
| src               | Path or URL to recording data.                    | ''            |

#### Methods

| Method                         | Description                                                                               |
| -----------------              | -------------------------------------------------------                                   |
| replayRecordingFromSource ()   | Replay recording from either `recordingName` for localStorage or `src` for external file. |
| startReplaying (recordingData) | Start replaying given passed recording data (object).                                     |
| stopReplaying ()               | Stop replaying.                                                                           |

### motion-capture-replayer

| Property   | Description                                          | Default Value |
| --------   | ---------------------------------------------------- | ------------- |
| enabled    |                                                      | true          |
| loop       | The animation replays in a loop.                     | false         |
| recorderEl | An entity that it's the source of the recording.     | null          |
| src        | The recording data can be hosted in a URL.           | ''            |

### motion-capture-recorder

| Property          | Description                                           | Default Value |
| --------          | ----------------------------------------------------- | ------------- |
| autoRecord       | The component start recording at page load.           | false         |
| enabled           |                                                       | true          |
| hand              | The controller that will trigger recording.           | 'right'       |
| recordingControls | Recording is activated by the controller trigger      | false         |
| persistStroke     | The recorded stroke is persisted as reference.        | false         |
| visibleStroke     | The recorded stroke is renderered for visual feedback.| true          |

## Installation

### Browser

Install and use by directly including the [browser files](dist):

```html
<head>
  <title>Motion Capture</title>
  <script src="https://aframe.io/releases/0.6.0/aframe.min.js"></script>
  <script src="https://unpkg.com/aframe-motion-capture-components/dist/aframe-motion-capture-components.min.js"></script>
</head>
<body>
  <a-scene avatar-recorder avatar-replayer>
    <a-entity id="leftHand" hand-controls="left"></a-entity>
    <a-entity id="rightHand" hand-controls="right"></a-entity>
  </a-scene>
</body>
```

Or with [angle](https://npmjs.com/package/angle/), you can install the proper
version of the component straight into your HTML file, respective to your
version of A-Frame:

```sh
npm install -g angle && angle install aframe-motion-capture-components
```

### npm

Install via npm:

```bash
npm install aframe-motion-capture-components
```

Then require and use.

```js
require('aframe');
require('aframe-motion-capture-components');
```

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
components](https://blog.mozvr.com/a-saturday-night/) and [its use
cases](https://aframe.io/blog/motion-capture/).

[TRY THE DEMOS](http://swimminglessonsformodernlife.com/aframe-motion-capture-components/)

![](https://cloud.githubusercontent.com/assets/674727/24481580/0ac87ace-14a0-11e7-8281-c032c90f0529.gif)

## Usage

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
  <a-entity id="controller1" hand-controls"></a-entity>
  <a-entity id="controller2" hand-controls"></a-entity>
</a-scene>
```

Hit `c` on the keyboard to clear the recording from `localStorage`.

### Avatar Replaying

The `avatar-recorder` will automatically set the `avatar-replayer` component.
Though we can specify the `avatar-replayer` explicitly if we want to configure
it or if we don't need recording (i.e., production).

`avatar-replayer` can be manually disabled from the URL query parameter
`avatar-replayer-disabled` (e.g.,
`http://localhost:8000/?avatar-replayer-disabled`).

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

Or we can specify the path to a recording file in the HTML via the `src` property:

```html
<a-scene avatar-replayer="src: recording.json">
  <a-entity id="controller1" hand-controls"></a-entity>
  <a-entity id="controller2" hand-controls"></a-entity>
</a-scene>
```

## Component APIs

### avatar-recorder

| Property          | Description                                             | Default Value |
| ----------------- | ------------------------------------------------------- | ------------- |
| autoPlay          | A recorded sesion plays on page load.                   | true          |
| autoRecord        | Recording starts on page load.                          | false         |
| localStorage      | The recording is persisted on local storage.            | false         |
| loop              | The recording replays in a loop.                        | false         |
| saveFile          | The user is prompted to save a JSON of the recording.   | false         |
| spectatorMode     | Replay in 3rd person mode.                              | false         |
| spectatorPosition | Initial position of the 3rd person camera.              | 0 0 0         |

#### Keyboard Shortcuts

| Key     | Description                                      |
| ------- | ----------------------------------------------   |
| space   | Toggle recording.                                |
| c       | Clear recording from localStorage and memory.    |
| u       | Upload recording to file host and get short URL. |

### avatar-replayer

| Property          | Description                                | Default Value |
| ----------------- | ------------------------------------------ | ------------- |
| loop              | The recording replays in a loop.           | false         |
| src               | The recording data can be hosted in a URL. | ''            |
| spectatorMode     | Replay in 3rd person mode.                 | false         |
| spectatorPosition | Initial position of the 3rd person camera  | 0 0 0         |

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
| autorRecord       | The component start recording at page load.           | false         |
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
  <script src="https://aframe.io/releases/0.5.0/aframe.min.js"></script>
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

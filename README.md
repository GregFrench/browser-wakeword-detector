# Browser Wake Word Detector

A browser app that demonstrates wake word detection using the Web Speech API by listening for "open the door" and "close the door", then updating the page state when it hears either phrase.

## Run

Serve the folder over localhost:

```sh
python3 -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

Press **Start listening**, allow microphone access, and say `open the door`.
After the door opens, say `close the door` to close it again.

## Deploy to GitHub Pages

This app can be hosted directly from the repository root.

1. Open `https://github.com/GregFrench/browser-wakeword-detector/settings/pages`.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Select branch `main` and folder `/ (root)`.
4. Click **Save**.

The site will publish at:

```text
https://gregfrench.github.io/browser-wakeword-detector/
```

## Browser support

The app uses the browser Web Speech Recognition API. It works best in Chrome or
Edge. Browsers that do not expose `SpeechRecognition` or
`webkitSpeechRecognition` will show an unsupported message.

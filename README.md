# Browser Wake Word Detector

A browser app that demonstrates wake word detection using the Web Speech API by listening for the phrase "open the door" and updating the page state when it hears it.

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

## Browser support

The app uses the browser Web Speech Recognition API. It works best in Chrome or
Edge. Browsers that do not expose `SpeechRecognition` or
`webkitSpeechRecognition` will show an unsupported message.

const WAKE_PHRASE = "open the door";
const MAX_BUFFER_WORDS = 18;

const startButton = document.querySelector("#startButton");
const resetButton = document.querySelector("#resetButton");
const supportMessage = document.querySelector("#supportMessage");
const transcript = document.querySelector("#transcript");
const activationLog = document.querySelector("#activationLog");
const doorCard = document.querySelector("#doorCard");
const activationState = document.querySelector("#activationState");
const activationDetail = document.querySelector("#activationDetail");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let isListening = false;
let shouldRestart = false;
let recentWords = [];
let activationCount = 0;
let lastActivationAt = 0;

function normalizeSpeech(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseWasHeard(value) {
  const normalized = normalizeSpeech(value);
  return new RegExp(`\\b${WAKE_PHRASE}\\b`).test(normalized);
}

function pushRecentWords(value) {
  const words = normalizeSpeech(value).split(" ").filter(Boolean);
  recentWords = [...recentWords, ...words].slice(-MAX_BUFFER_WORDS);
}

function setButtonState() {
  startButton.innerHTML = isListening
    ? '<span aria-hidden="true">&#9632;</span> Stop listening'
    : '<span aria-hidden="true">&#9654;</span> Start listening';
  startButton.setAttribute("aria-pressed", String(isListening));
}

function setDetectorState(state, detail) {
  activationState.textContent = state;
  activationDetail.textContent = detail;
}

function setSupportMessage(message, tone = "warning") {
  supportMessage.textContent = message;
  supportMessage.dataset.tone = tone;
}

function renderActivationLog(timeLabel) {
  if (activationCount === 1) {
    activationLog.textContent = "";
  }

  const item = document.createElement("li");
  item.textContent = `Activation ${activationCount} at ${timeLabel}`;
  activationLog.prepend(item);
}

function activateDoor() {
  const activatedAt = Date.now();

  if (activatedAt - lastActivationAt < 2500) {
    return;
  }

  lastActivationAt = activatedAt;
  activationCount += 1;
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  doorCard.classList.add("is-activated");
  setDetectorState("Activated", `"${WAKE_PHRASE}" heard at ${timeLabel}.`);
  renderActivationLog(timeLabel);
}

function resetActivation() {
  activationCount = 0;
  lastActivationAt = 0;
  recentWords = [];
  doorCard.classList.remove("is-activated");
  activationLog.innerHTML = "<li>No activations yet.</li>";
  transcript.textContent = isListening
    ? "Listening for speech..."
    : "No speech captured yet.";
  setDetectorState(
    isListening ? "Listening" : "Standby",
    isListening
      ? `Say "${WAKE_PHRASE}" to activate.`
      : "Waiting for microphone access.",
  );
}

function handleResult(event) {
  let interimText = "";
  let finalText = "";

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const text = result[0].transcript;

    if (result.isFinal) {
      finalText += `${text} `;
    } else {
      interimText += `${text} `;
    }
  }

  if (finalText) {
    pushRecentWords(finalText);
  }

  const combinedText = [recentWords.join(" "), interimText].join(" ").trim();

  if (combinedText) {
    transcript.textContent = combinedText;
  }

  if (phraseWasHeard(combinedText)) {
    activateDoor();
    recentWords = [];
  }
}

function startListening() {
  if (!recognition || isListening) {
    return;
  }

  shouldRestart = true;
  recognition.start();
}

function stopListening() {
  if (!recognition || !isListening) {
    return;
  }

  shouldRestart = false;
  recognition.stop();
}

function configureRecognition() {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.addEventListener("start", () => {
    isListening = true;
    doorCard.classList.add("is-listening");
    setButtonState();
    setSupportMessage("Microphone is active.", "ok");
    setDetectorState("Listening", `Say "${WAKE_PHRASE}" to activate.`);
    transcript.textContent = "Listening for speech...";
  });

  recognition.addEventListener("result", handleResult);

  recognition.addEventListener("error", (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      shouldRestart = false;
      setSupportMessage("Microphone permission was blocked.", "warning");
      setDetectorState("Blocked", "Allow microphone access, then start again.");
      return;
    }

    if (event.error === "no-speech") {
      setSupportMessage("No speech detected yet. Keep the page open and try again.");
      return;
    }

    setSupportMessage(`Speech recognition error: ${event.error}.`);
  });

  recognition.addEventListener("end", () => {
    isListening = false;
    doorCard.classList.remove("is-listening");
    setButtonState();

    if (shouldRestart) {
      try {
        recognition.start();
      } catch (error) {
        shouldRestart = false;
        setSupportMessage("Listening paused. Press Start to resume.");
        setDetectorState("Paused", "Speech recognition needs to be restarted.");
      }
      return;
    }

    if (!doorCard.classList.contains("is-activated")) {
      setDetectorState("Standby", "Listening is stopped.");
    }
    setSupportMessage("Listening stopped.", "ok");
  });
}

function initialize() {
  resetButton.addEventListener("click", resetActivation);

  if (!SpeechRecognition) {
    startButton.disabled = true;
    resetButton.disabled = true;
    setSupportMessage(
      "This browser does not support the Web Speech API. Try Chrome or Edge.",
    );
    setDetectorState("Unsupported", "Speech recognition is unavailable here.");
    return;
  }

  configureRecognition();
  setButtonState();
  setSupportMessage("Ready. Press Start and allow microphone access.", "ok");

  startButton.addEventListener("click", () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  });
}

initialize();

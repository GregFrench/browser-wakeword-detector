const COMMANDS = [
  { action: "open", phrase: "open the door", state: "Door open" },
  { action: "close", phrase: "close the door", state: "Door closed" },
];
const MAX_BUFFER_WORDS = 18;
const COMMAND_HELP = COMMANDS.map(({ phrase }) => `"${phrase}"`).join(" or ");

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
let commandCount = 0;
let lastCommandAt = 0;
let lastCommandAction = "";

function normalizeSpeech(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function heardCommand(value) {
  const normalized = normalizeSpeech(value);
  let match;

  for (const command of COMMANDS) {
    const phrasePattern = new RegExp(`\\b${escapeRegExp(command.phrase)}\\b`, "g");
    let phraseMatch;

    while ((phraseMatch = phrasePattern.exec(normalized)) !== null) {
      if (!match || phraseMatch.index > match.phraseIndex) {
        match = { ...command, phraseIndex: phraseMatch.index };
      }
    }
  }

  return match;
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

function renderCommandLog(command, timeLabel) {
  if (commandCount === 1) {
    activationLog.textContent = "";
  }

  const item = document.createElement("li");
  item.textContent = `${command.state} at ${timeLabel}`;
  activationLog.prepend(item);
}

function runDoorCommand(command) {
  const commandAt = Date.now();

  if (
    command.action === lastCommandAction &&
    commandAt - lastCommandAt < 2500
  ) {
    return;
  }

  lastCommandAt = commandAt;
  lastCommandAction = command.action;
  commandCount += 1;
  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  doorCard.classList.toggle("is-activated", command.action === "open");
  setDetectorState(command.state, `"${command.phrase}" heard at ${timeLabel}.`);
  renderCommandLog(command, timeLabel);
}

function resetDoor() {
  commandCount = 0;
  lastCommandAt = 0;
  lastCommandAction = "";
  recentWords = [];
  doorCard.classList.remove("is-activated");
  activationLog.innerHTML = "<li>No door commands yet.</li>";
  transcript.textContent = isListening
    ? "Listening for speech..."
    : "No speech captured yet.";
  setDetectorState(
    isListening ? "Listening" : "Standby",
    isListening ? `Say ${COMMAND_HELP}.` : "Waiting for microphone access.",
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

  const command = heardCommand(combinedText);

  if (command) {
    runDoorCommand(command);
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
    setDetectorState("Listening", `Say ${COMMAND_HELP}.`);
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
  resetButton.addEventListener("click", resetDoor);

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

if (new URLSearchParams(window.location.search).has("test")) {
  window.__doorDetectorTest = {
    heardCommand,
    runDoorCommand,
    resetDoor,
  };
}

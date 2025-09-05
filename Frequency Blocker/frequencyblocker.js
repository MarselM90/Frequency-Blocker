(() => {
  const blockedFreqs = [87.8, 96.2, 98.0, 99.2, 104.1, 104.5, 107.1];
  const EPSILON = 0.0001;
  const STEP = 0.1; 
  const PROTECT_RANGE = 0.09; 
  let messageTimeout;

  const state = {
    lastAllowedFreq: null,
  };

  window.isAdmin = false;
  const checkAdminMode = () => {
    const bodyText = document.body.textContent || document.body.innerText;
    window.isAdmin =
      bodyText.includes("You are logged in as an administrator.") ||
      bodyText.includes("You are logged in as an adminstrator.") ||
      bodyText.includes("You are logged in and can control the receiver.");
  };

  const createMessageBox = () => {
    let box = document.getElementById("blocked-message-box");
    if (box) return box;

    box = document.createElement("div");
    Object.assign(box.style, {
      position: "fixed",
      left: "50%",
      top: "20%",
      transform: "translateX(-50%)",
      padding: "12px 24px",
      backgroundColor: "rgba(255, 69, 58, 0.9)",
      color: "white",
      borderRadius: "8px",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      fontWeight: "bold",
      boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
      zIndex: 9999,
      opacity: 0,
      transition: "opacity 0.5s ease-in-out",
      textAlign: "center",
      pointerEvents: "none",
    });

    document.body.appendChild(box);
    return box;
  };

  const showMessage = (text) => {
    if (window.isAdmin) return;
    const box = createMessageBox();
    box.textContent = text;

    box.style.transition = "opacity 0.5s ease-in-out";
    box.style.opacity = 0;
    clearTimeout(messageTimeout);

    requestAnimationFrame(() => {
      box.style.opacity = 1;
    });

    messageTimeout = setTimeout(() => {
      box.style.opacity = 0;
    }, 1500);
  };

  const blockedMessage = (freq) =>
    `Frequency ${freq.toFixed(3)} MHz is blocked and cannot be accessed.`;

  const checkBlocked = (freq) => {
    if (window.isAdmin) return false;
    return blockedFreqs.some((bf) => Math.abs(bf - freq) <= PROTECT_RANGE + EPSILON);
  };

  const sendTune = (freqMHz) => {
    if (typeof socket !== "undefined" && socket.readyState === WebSocket.OPEN) {
      socket.send("T" + Math.round(freqMHz * 1000));
    }
  };

  const findNextAllowedFreq = (startFreq, direction) => {
    let freq = startFreq;
    while (checkBlocked(freq)) {
      freq = direction === "up" ? freq + STEP : freq - STEP;
    }
    return freq;
  };

  const tuneToFrequency = (freqMHz, direction = "up") => {
    if (checkBlocked(freqMHz)) {
      showMessage(blockedMessage(freqMHz));
      const nextFreq = findNextAllowedFreq(freqMHz, direction);
      state.lastAllowedFreq = nextFreq;
      return sendTune(nextFreq);
    }
    state.lastAllowedFreq = freqMHz;
    sendTune(freqMHz);
  };

  const handleTuneAttempt = (direction, event) => {
    const currentFreq = parseFloat(dataFrequencyElement.textContent);
    if (!isNaN(currentFreq)) {
      const newFreq = direction === "up" ? currentFreq + STEP : currentFreq - STEP;
      tuneToFrequency(newFreq, direction);
    }
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    checkAdminMode();

    if (typeof socket === "undefined" || socket === null) return;

    window.dataFrequencyElement = document.getElementById("data-frequency");
    const tuneUpButton = document.getElementById("freq-up");
    const tuneDownButton = document.getElementById("freq-down");
    const freqContainer = document.getElementById("freq-container");

    if (!dataFrequencyElement || !tuneUpButton || !tuneDownButton || !freqContainer) return;

    state.lastAllowedFreq = parseFloat(dataFrequencyElement.textContent);

    tuneUpButton.addEventListener("click", () => handleTuneAttempt("up"));
    tuneDownButton.addEventListener("click", () => handleTuneAttempt("down"));

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowUp")
          handleTuneAttempt("up", event);
        else if (event.key === "ArrowLeft" || event.key === "ArrowDown")
          handleTuneAttempt("down", event);
      },
      true
    );

    freqContainer.addEventListener(
      "wheel",
      (event) => handleTuneAttempt(event.deltaY < 0 ? "up" : "down", event),
      true
    );

    const freqObserver = new MutationObserver(() => {
      const currentFreq = parseFloat(dataFrequencyElement.textContent);
      if (!isNaN(currentFreq)) {
        if (checkBlocked(currentFreq)) {
          showMessage(blockedMessage(currentFreq));
          const nextFreq = findNextAllowedFreq(
            currentFreq,
            state.lastAllowedFreq !== null && currentFreq > state.lastAllowedFreq
              ? "up"
              : "down"
          );
          sendTune(nextFreq);
        } else {
          state.lastAllowedFreq = currentFreq;
        }
      }
    });
    freqObserver.observe(dataFrequencyElement, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  });
})();

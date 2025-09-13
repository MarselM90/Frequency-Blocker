(() => {
    const blockedFreqs = [87.8, 96.2, 98.0, 99.2, 100.0, 104.1, 104.5, 107.1, 95.5, 96.4, 94.6, 103.6, 93.4, 93.7, 100.1, 90.1, 95.9];
    const EPSILON = 0.0001;
    const STEP = 0.1;
    const PROTECT_RANGE = 0.09;
    let messageTimeout;
    const state = {
        lastAllowedFreq: null,
        lastDirection: "up",
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
        box.id = "blocked-message-box";
        Object.assign(box.style, {
            position: "fixed",
            left: "50%",
            top: "10%",
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
        let box = createMessageBox();
        box.textContent = text;
        clearTimeout(messageTimeout);
        box.style.opacity = 0;
        requestAnimationFrame(() => {
            box.style.opacity = 1;
        });
        messageTimeout = setTimeout(() => {
            box.style.opacity = 0;
            const removeHandler = () => {
                if (box.style.opacity === "0") {
                    box.remove();
                    box.removeEventListener("transitionend", removeHandler);
                }
            };
            box.addEventListener("transitionend", removeHandler);
        }, 2000);
    };

    const blockedMessage = (freq) => `Frequency ${freq.toFixed(3)} MHz is blocked and cannot be accessed.`;

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
        state.lastDirection = direction;
        if (!isNaN(currentFreq)) {
            const newFreq = direction === "up" ? currentFreq + STEP : currentFreq - STEP;
            tuneToFrequency(newFreq, direction);
        }
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    const observeDirectInput = () => {
        const freqObserver = new MutationObserver(() => {
            const currentFreq = parseFloat(dataFrequencyElement.textContent);
            if (isNaN(currentFreq)) return;

            if (checkBlocked(currentFreq)) {
                showMessage(blockedMessage(currentFreq));
                let direction = state.lastDirection || "up";
                const nextFreq = findNextAllowedFreq(currentFreq, direction);
                state.lastAllowedFreq = nextFreq;
                sendTune(nextFreq);
            } else {
                state.lastAllowedFreq = currentFreq;
            }
        });

        freqObserver.observe(dataFrequencyElement, { childList: true, characterData: true, subtree: true });
    };

    const createBlockedBanner = () => {
        const banner = document.createElement("div");
        banner.id = "blocked-banner";
        banner.textContent = "Permanently blocked frequencies: " + blockedFreqs.join(", ");
        Object.assign(banner.style, {
            position: "fixed",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            padding: "6px 12px",
            fontFamily: "Arial, sans-serif",
            fontSize: "14px",
            fontWeight: "bold",
            color: "white",
            backgroundColor: "transparent",
            borderRadius: "6px",
            zIndex: 1,
            cursor: window.isAdmin ? "grab" : "default",
            pointerEvents: window.isAdmin ? "auto" : "none",
        });
        if (window.innerWidth <= 768) banner.style.display = "none";
        document.body.appendChild(banner);
        const savedPos = localStorage.getItem("blockedBannerPos");
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            banner.style.top = pos.top;
            banner.style.left = pos.left;
            banner.style.transform = pos.transform;
        }
        if (window.isAdmin) makeDraggable(banner);
    };

    const makeDraggable = (element) => {
        let offsetX = 0, offsetY = 0, startX = 0, startY = 0;
        const onMouseDown = (e) => {
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        };
        const onMouseMove = (e) => {
            e.preventDefault();
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            const rect = element.getBoundingClientRect();
            let newLeft = rect.left + offsetX;
            let newTop = rect.top + offsetY;
            const minLeft = 10;
            const maxLeft = window.innerWidth - rect.width - 10;
            const minTop = 10;
            const maxTop = window.innerHeight - rect.height - 10;
            newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
            newTop = Math.max(minTop, Math.min(maxTop, newTop));
            element.style.left = newLeft + "px";
            element.style.top = newTop + "px";
            element.style.transform = "translate(0,0)";
            startX = e.clientX;
            startY = e.clientY;
        };
        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            localStorage.setItem(
                "blockedBannerPos",
                JSON.stringify({ top: element.style.top, left: element.style.left, transform: element.style.transform })
            );
        };
        element.addEventListener("mousedown", onMouseDown);
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
                if (event.key === "ArrowRight" || event.key === "ArrowUp") handleTuneAttempt("up", event);
                else if (event.key === "ArrowLeft" || event.key === "ArrowDown") handleTuneAttempt("down", event);
            },
            true
        );

        freqContainer.addEventListener(
            "wheel",
            (event) => handleTuneAttempt(event.deltaY < 0 ? "up" : "down", event),
            true
        );

        observeDirectInput();
        createBlockedBanner();
    });
})();

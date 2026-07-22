// Initialize Dark Mode theme from localStorage
(function() {
    if (localStorage.getItem("dark_theme") === "true") {
        document.body.classList.add("dark-theme");
    }
})();

let sessionTimerInterval = null;
let secondsElapsed = 0;
let currentSession = null;
let userSessionInfo = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Sync User info
    userSessionInfo = JSON.parse(localStorage.getItem('user'));
    if (!userSessionInfo) {
        alert("You must be logged in to access the call room.");
        window.location.href = "login.html";
        return;
    }

    // 2. Parse Query Params
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = parseInt(urlParams.get('id'));

    if (!sessionId) {
        alert("No valid session ID provided.");
        window.location.href = "my-sessions.html";
        return;
    }

    // 3. Load Session from localStorage
    const sessionsList = JSON.parse(localStorage.getItem("session_requests")) || [];
    currentSession = sessionsList.find(s => s.id === sessionId);

    if (!currentSession) {
        alert("Session record not found.");
        window.location.href = "my-sessions.html";
        return;
    }

    // 4. Render Header metadata and panel rows
    setupSessionRoomDetails();

    // 5. Initialize Jitsi Meet Iframe Call
    initJitsiCall(sessionId);

    // 6. Launch Timer clock
    startRoomTimer();
});

// Populate headers
function setupSessionRoomDetails() {
    const isOutgoing = currentSession.type === "outgoing";
    const partnerNameVal = currentSession.name;
    const skillNameVal = currentSession.skill;

    document.getElementById("partnerAvatar").src = currentSession.avatar;
    document.getElementById("partnerName").textContent = partnerNameVal;
    document.getElementById("skillName").textContent = `Topic: ${skillNameVal}`;

    const userName = `${userSessionInfo.firstName} ${userSessionInfo.lastName}`;
    const learnerName = isOutgoing ? userName : partnerNameVal;
    const teacherName = isOutgoing ? partnerNameVal : userName;

    document.getElementById("learnerName").textContent = learnerName;
    document.getElementById("teacherName").textContent = teacherName;
}

// Instantiate Jitsi Meet iframe inside call pane
function initJitsiCall(sessionId) {
    // Create unique room name string
    const sanitizedRoom = `BarterLearn_Room_${sessionId}_${currentSession.name.replace(/\s+/g, '_')}`;
    const domain = "meet.jit.si";

    const options = {
        roomName: sanitizedRoom,
        width: "100%",
        height: "100%",
        parentNode: document.querySelector('#meetContainer'),
        userInfo: {
            displayName: `${userSessionInfo.firstName} ${userSessionInfo.lastName}`
        },
        configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            disableDeepLinking: true // prevents opening store apps on desktop/mobiles
        },
        interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'closedcaptions', 'desktop', 'embedmeeting', 'fullscreen',
                'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone'
            ]
        }
    };

    // Remove spinner on iframe load trigger
    setTimeout(() => {
        document.getElementById("connectingState").style.display = "none";
    }, 1500);

    const api = new JitsiMeetExternalAPI(domain, options);
}

// Timer counting seconds
function startRoomTimer() {
    const timerDisplay = document.getElementById("sessionTimer");
    secondsElapsed = 0;

    sessionTimerInterval = setInterval(() => {
        secondsElapsed++;
        const minutes = Math.floor(secondsElapsed / 60);
        const seconds = secondsElapsed % 60;

        const formattedMin = minutes < 10 ? `0${minutes}` : minutes;
        const formattedSec = seconds < 10 ? `0${seconds}` : seconds;

        timerDisplay.textContent = `${formattedMin}:${formattedSec}`;
    }, 1000);
}

// Chat functions
function sendRoomMessage(e) {
    e.preventDefault();
    const input = document.getElementById("roomChatInput");
    const text = input.value.trim();
    if (!text) return;

    appendBubble("me", text);
    input.value = "";

    // Partner mock auto responses
    setTimeout(() => {
        const replies = [
            "Makes perfect sense, let's proceed.",
            "Could you explain this step once more?",
            "Yes, I see the auto layout frame now!",
            "Thank you for sharing your screen."
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        appendBubble("them", randomReply);
    }, 3000);
}

function appendBubble(sender, text) {
    const feed = document.getElementById("roomChatFeed");
    const bubble = document.createElement("div");
    bubble.className = `room-msg-bubble ${sender}`;
    bubble.textContent = text;
    feed.appendChild(bubble);
    feed.scrollTop = feed.scrollHeight;
}

// Back to sessions exit logic
function backToSessions() {
    if (confirm("Exit call room? The call will remain active in the background.")) {
        clearInterval(sessionTimerInterval);
        window.location.href = "my-sessions.html";
    }
}

// End Session and Save Database Time Credits
async function confirmEndSession() {
    if (!confirm("Are you sure you want to end this barter session? Time credits will be updated inside SQLite.")) {
        return;
    }

    clearInterval(sessionTimerInterval);

    // Determine type:
    // If outgoing request -> You are Learner (sessionType = 'learn')
    // If incoming request -> You are Teacher (sessionType = 'teach')
    const sessionType = currentSession.type === "outgoing" ? "learn" : "teach";

    try {
        const response = await fetch('/api/profile/complete-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': userSessionInfo.id
            },
            body: JSON.stringify({
                sessionType: sessionType,
                partnerName: currentSession.name,
                skillName: currentSession.skill
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Update local storage session list item state to completed
            const sessionsList = JSON.parse(localStorage.getItem("session_requests")) || [];
            const index = sessionsList.findIndex(s => s.id === currentSession.id);
            if (index !== -1) {
                sessionsList[index].status = "completed";
                localStorage.setItem("session_requests", JSON.stringify(sessionsList));
            }

            // Display credit alerts
            const creditText = sessionType === "teach" ? "+1 Time Credit awarded!" : "-1 Time Credit deducted.";
            alert(`Session ended successfully!\n\nDatabase result: ${creditText}\nNew balance: ${data.creditsEarned} Credits.\n\nNow redirecting to review your barter partner...`);

            // Redirect to reviews
            window.location.href = "reviews.html";
        } else {
            alert(data.message || "Error updating session credits on backend.");
            window.location.href = "my-sessions.html";
        }
    } catch (error) {
        console.error("End Session transaction error:", error);
        alert("Failed to reach server. Session progress saved locally. Redirecting to reviews...");
        window.location.href = "reviews.html";
    }
}

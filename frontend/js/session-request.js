// Initialize Dark Mode theme from localStorage
(function() {
    if (localStorage.getItem("dark_theme") === "true") {
        document.body.classList.add("dark-theme");
    }
})();

// Default Session Requests if localStorage is empty
const defaultRequests = [];

let activeTab = "incoming";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Sync User Header info
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('headerUserName').textContent = user.firstName;
        document.getElementById('headerUserRole').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        document.getElementById('headerUserAvatar').textContent = (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
    }

    // 2. Initialize requests from LocalStorage & upgrade if necessary
    let existingReqs = localStorage.getItem("session_requests");
    if (!existingReqs || (JSON.parse(existingReqs).length > 0 && JSON.parse(existingReqs)[0].id === 201)) {
        localStorage.setItem("session_requests", JSON.stringify([]));
    }

    // 3. Render requests
    renderRequests();
});

// Tab navigation handler
function selectTab(e, tabName) {
    const tabs = document.querySelectorAll('.session-tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    e.currentTarget.classList.add('active');

    activeTab = tabName;
    renderRequests();
}

// Render Request cards
function renderRequests() {
    const listContainer = document.getElementById("sessionsList");
    const requests = JSON.parse(localStorage.getItem("session_requests")) || [];

    // Update Counts
    const incomingCount = requests.filter(r => r.type === "incoming" && r.status === "pending").length;
    const outgoingCount = requests.filter(r => r.type === "outgoing" && r.status === "pending").length;
    const scheduledCount = requests.filter(r => r.status === "accepted").length;

    document.getElementById("incomingCount").textContent = incomingCount;
    document.getElementById("outgoingCount").textContent = outgoingCount;
    document.getElementById("scheduledCount").textContent = scheduledCount;

    listContainer.innerHTML = "";

    // Filter by active tab
    let filtered = [];
    if (activeTab === "incoming") {
        filtered = requests.filter(r => r.type === "incoming" && r.status === "pending");
    } else if (activeTab === "outgoing") {
        filtered = requests.filter(r => r.type === "outgoing" && r.status === "pending");
    } else if (activeTab === "scheduled") {
        filtered = requests.filter(r => r.status === "accepted");
    }

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 4rem; color: var(--text-light); background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius)">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
                <h3>No sessions found in this category.</h3>
                <p style="font-size: 0.85rem; margin-top: 0.2rem;">Requests you interact with will display here.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(req => {
        const card = document.createElement("div");
        card.className = "session-card";

        // Date Display
        const dateObj = new Date(req.date);
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString('en-US', options);

        // Header Skill Label wording
        const roleLabel = req.type === "incoming" ? "Wants to learn" : "You requested to learn";

        // Action Buttons / Status layout
        let actionMarkup = "";
        if (activeTab === "incoming") {
            actionMarkup = `
                <button class="btn-action-accept" onclick="updateStatus(${req.id}, 'accepted')">Accept</button>
                <button class="btn-action-reject" onclick="updateStatus(${req.id}, 'rejected')">Decline</button>
            `;
        } else if (activeTab === "outgoing") {
            actionMarkup = `<span class="status-badge pending">Pending</span>`;
        } else if (activeTab === "scheduled") {
            actionMarkup = `
                <button class="btn-action-meeting" onclick="launchMeeting('${req.name}', '${req.skill}')">💻 Launch Call</button>
            `;
        }

        card.innerHTML = `
            <div class="session-left-area">
                <img src="${req.avatar}" alt="${req.name}" class="session-user-img">
                <div class="session-info-details">
                    <h3>${req.name}</h3>
                    <div class="session-skill-label">${roleLabel} <span>${req.skill}</span></div>
                    <div class="session-schedule">
                        <span>🕒</span>
                        <span>${formattedDate} &nbsp;|&nbsp; ${req.time}</span>
                    </div>
                </div>
            </div>
            <div class="session-right-area">
                ${actionMarkup}
            </div>
        `;

        listContainer.appendChild(card);
    });
}

// Update Request Status (Accept / Decline)
function updateStatus(reqId, newStatus) {
    const requests = JSON.parse(localStorage.getItem("session_requests")) || [];
    const index = requests.findIndex(r => r.id === reqId);

    if (index !== -1) {
        requests[index].status = newStatus;
        localStorage.setItem("session_requests", JSON.stringify(requests));

        if (newStatus === "accepted") {
            alert(`Session Scheduled with ${requests[index].name}! Added to Scheduled Sessions.`);
        } else {
            alert(`Session Request from ${requests[index].name} declined.`);
        }

        renderRequests();
    }
}

// Emulate calling meeting
function launchMeeting(partnerName, skill) {
    alert(`Connecting video call interface with ${partnerName} for trading "${skill}"...\nEnsure camera and microphone permissions are enabled!`);
}

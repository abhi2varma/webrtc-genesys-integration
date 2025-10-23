/**
 * Main Application Logic
 * Integrates WebRTC Client and Genesys SIP
 */

// Global state
let socket = null;
let webrtcClient = null;
let genesysClient = null;
let config = null;
let currentUser = null;
let isAudioMuted = false;
let isVideoEnabled = true;
let isCallOnHold = false;
let useGenesysSIP = false; // Toggle between WebRTC P2P and Genesys SIP

// DOM Elements
const elements = {
    // Login section
    loginSection: document.getElementById('loginSection'),
    agentId: document.getElementById('agentId'),
    extension: document.getElementById('extension'),
    sipUsername: document.getElementById('sipUsername'),
    sipPassword: document.getElementById('sipPassword'),
    loginBtn: document.getElementById('loginBtn'),

    // Call section
    callSection: document.getElementById('callSection'),
    displayAgentId: document.getElementById('displayAgentId'),
    displayExtension: document.getElementById('displayExtension'),
    sipStatus: document.getElementById('sipStatus'),
    callState: document.getElementById('callState'),
    
    // Video elements
    localVideo: document.getElementById('localVideo'),
    remoteVideo: document.getElementById('remoteVideo'),
    remoteAudio: document.getElementById('remoteAudio'),
    remoteAudioIndicator: document.getElementById('remoteAudioIndicator'),
    
    // Call controls
    roomId: document.getElementById('roomId'),
    startCallBtn: document.getElementById('startCallBtn'),
    endCallBtn: document.getElementById('endCallBtn'),
    muteBtn: document.getElementById('muteBtn'),
    videoBtn: document.getElementById('videoBtn'),
    holdBtn: document.getElementById('holdBtn'),
    transferBtn: document.getElementById('transferBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    
    // Transfer dialog
    transferDialog: document.getElementById('transferDialog'),
    transferTarget: document.getElementById('transferTarget'),
    confirmTransferBtn: document.getElementById('confirmTransferBtn'),
    cancelTransferBtn: document.getElementById('cancelTransferBtn'),
    
    // Status
    connectionStatus: document.getElementById('connectionStatus'),
    logContainer: document.getElementById('logContainer')
};

/**
 * Initialize application
 */
async function initialize() {
    try {
        addLog('info', 'Initializing application...');

        // Fetch configuration from server
        const response = await fetch('/api/config');
        config = await response.json();
        addLog('success', 'Configuration loaded');

        // Initialize Socket.IO connection
        socket = io({
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        setupSocketListeners();
        setupEventListeners();

        // Initialize WebRTC client
        webrtcClient = new WebRTCClient();
        webrtcClient.onLog = addLog;
        webrtcClient.onStateChange = handleWebRTCStateChange;
        webrtcClient.onRemoteStream = handleRemoteStream;

        // Initialize Genesys client
        genesysClient = new GenesysIntegration();
        genesysClient.onLog = addLog;
        genesysClient.onStateChange = handleGenesysStateChange;
        genesysClient.onIncomingCall = handleIncomingCall;
        genesysClient.onCallConnected = handleCallConnected;
        genesysClient.onCallEnded = handleCallEnded;

        addLog('success', 'Application initialized');
    } catch (error) {
        addLog('error', `Initialization failed: ${error.message}`);
    }
}

/**
 * Setup Socket.IO listeners
 */
function setupSocketListeners() {
    socket.on('connect', () => {
        addLog('success', 'Connected to signaling server');
        updateConnectionStatus(true);
    });

    socket.on('disconnect', () => {
        addLog('warning', 'Disconnected from signaling server');
        updateConnectionStatus(false);
    });

    socket.on('registered', (data) => {
        addLog('success', `Registered with socket ID: ${data.socketId}`);
    });

    socket.on('error', (error) => {
        addLog('error', `Socket error: ${error.message || error}`);
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Login
    elements.loginBtn.addEventListener('click', handleLogin);

    // Call controls
    elements.startCallBtn.addEventListener('click', handleStartCall);
    elements.endCallBtn.addEventListener('click', handleEndCall);
    elements.muteBtn.addEventListener('click', handleMuteToggle);
    elements.videoBtn.addEventListener('click', handleVideoToggle);
    elements.holdBtn.addEventListener('click', handleHoldToggle);
    elements.transferBtn.addEventListener('click', () => {
        elements.transferDialog.classList.remove('hidden');
    });

    // Transfer dialog
    elements.confirmTransferBtn.addEventListener('click', handleTransferConfirm);
    elements.cancelTransferBtn.addEventListener('click', () => {
        elements.transferDialog.classList.add('hidden');
    });

    // Logout
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Enter key handlers
    elements.sipPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    elements.roomId.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleStartCall();
    });
}

/**
 * Handle login
 */
async function handleLogin() {
    const agentId = elements.agentId.value.trim();
    const extension = elements.extension.value.trim();
    const sipUsername = elements.sipUsername.value.trim();
    const sipPassword = elements.sipPassword.value.trim();

    if (!agentId || !extension) {
        addLog('error', 'Please enter Agent ID and Extension');
        return;
    }

    try {
        elements.loginBtn.disabled = true;
        addLog('info', 'Logging in...');

        currentUser = { agentId, extension, sipUsername };

        // Register with signaling server
        socket.emit('register', {
            userId: agentId,
            agentId: agentId,
            extension: extension
        });

        // Initialize WebRTC client
        await webrtcClient.initialize(socket, config);

        // Try to initialize Genesys SIP if credentials provided
        if (sipUsername && sipPassword && config.genesysWebSocketServer) {
            try {
                await genesysClient.initialize(config, {
                    username: sipUsername,
                    password: sipPassword,
                    displayName: agentId
                });
                useGenesysSIP = true;
                addLog('success', 'Genesys SIP initialized');
            } catch (error) {
                addLog('warning', `Genesys SIP initialization failed: ${error.message}`);
                addLog('info', 'Falling back to WebRTC P2P mode');
                useGenesysSIP = false;
            }
        } else {
            addLog('info', 'Using WebRTC P2P mode (no Genesys credentials)');
            useGenesysSIP = false;
        }

        // Update UI
        elements.displayAgentId.textContent = agentId;
        elements.displayExtension.textContent = extension;
        elements.loginSection.classList.add('hidden');
        elements.callSection.classList.remove('hidden');

        addLog('success', 'Login successful');
    } catch (error) {
        addLog('error', `Login failed: ${error.message}`);
        elements.loginBtn.disabled = false;
    }
}

/**
 * Handle start call
 */
async function handleStartCall() {
    const destination = elements.roomId.value.trim();

    if (!destination) {
        addLog('error', 'Please enter a room ID or phone number');
        return;
    }

    try {
        elements.startCallBtn.disabled = true;
        addLog('info', `Starting call to ${destination}...`);

        if (useGenesysSIP && genesysClient.isConnected()) {
            // Use Genesys SIP
            addLog('info', 'Using Genesys SIP for call');
            await genesysClient.makeCall(destination);
            
            // Setup remote audio for SIP call
            setTimeout(() => {
                const stream = genesysClient.getRemoteStream();
                if (stream) {
                    elements.remoteAudio.srcObject = stream;
                    elements.remoteVideo.srcObject = stream;
                }
            }, 2000);
        } else {
            // Use WebRTC P2P
            addLog('info', 'Using WebRTC P2P for call');
            await webrtcClient.startCall(destination);
            
            // Setup local video
            if (webrtcClient.localStream) {
                elements.localVideo.srcObject = webrtcClient.localStream;
            }
        }

        // Update UI
        elements.startCallBtn.classList.add('hidden');
        elements.endCallBtn.classList.remove('hidden');
        elements.muteBtn.disabled = false;
        elements.videoBtn.disabled = false;
        elements.holdBtn.disabled = false;
        elements.transferBtn.disabled = false;
        elements.roomId.disabled = true;

        updateCallState('In Call');
    } catch (error) {
        addLog('error', `Failed to start call: ${error.message}`);
        elements.startCallBtn.disabled = false;
    }
}

/**
 * Handle end call
 */
async function handleEndCall() {
    try {
        addLog('info', 'Ending call...');

        if (useGenesysSIP && genesysClient.isInCall()) {
            await genesysClient.endCall();
        } else {
            webrtcClient.endCall();
        }

        resetCallUI();
        addLog('success', 'Call ended');
    } catch (error) {
        addLog('error', `Failed to end call: ${error.message}`);
    }
}

/**
 * Handle mute toggle
 */
function handleMuteToggle() {
    isAudioMuted = !isAudioMuted;

    if (useGenesysSIP && genesysClient.isInCall()) {
        genesysClient.toggleMute(isAudioMuted);
    } else {
        webrtcClient.toggleAudio(isAudioMuted);
    }

    // Update button
    elements.muteBtn.classList.toggle('active', isAudioMuted);
    elements.muteBtn.innerHTML = isAudioMuted 
        ? '<span>🔇</span> Unmute' 
        : '<span>🎤</span> Mute';

    addLog('info', `Audio ${isAudioMuted ? 'muted' : 'unmuted'}`);
}

/**
 * Handle video toggle
 */
function handleVideoToggle() {
    isVideoEnabled = !isVideoEnabled;

    if (!useGenesysSIP) {
        webrtcClient.toggleVideo(isVideoEnabled);
    }

    // Update button
    elements.videoBtn.classList.toggle('active', !isVideoEnabled);
    elements.videoBtn.innerHTML = isVideoEnabled 
        ? '<span>📹</span> Video Off' 
        : '<span>📹</span> Video On';

    addLog('info', `Video ${isVideoEnabled ? 'enabled' : 'disabled'}`);
}

/**
 * Handle hold toggle
 */
async function handleHoldToggle() {
    isCallOnHold = !isCallOnHold;

    if (useGenesysSIP && genesysClient.isInCall()) {
        const success = await genesysClient.toggleHold(isCallOnHold);
        if (!success) {
            isCallOnHold = !isCallOnHold; // Revert on failure
            return;
        }
    } else {
        // For WebRTC P2P, notify other party
        socket.emit('hold-call', {
            roomId: webrtcClient.roomId,
            held: isCallOnHold
        });
    }

    // Update button
    elements.holdBtn.classList.toggle('active', isCallOnHold);
    elements.holdBtn.innerHTML = isCallOnHold 
        ? '<span>▶️</span> Resume' 
        : '<span>⏸️</span> Hold';

    updateCallState(isCallOnHold ? 'On Hold' : 'In Call');
    addLog('info', `Call ${isCallOnHold ? 'held' : 'resumed'}`);
}

/**
 * Handle transfer confirmation
 */
async function handleTransferConfirm() {
    const target = elements.transferTarget.value.trim();

    if (!target) {
        addLog('error', 'Please enter transfer target');
        return;
    }

    try {
        addLog('info', `Transferring call to ${target}...`);

        if (useGenesysSIP && genesysClient.isInCall()) {
            await genesysClient.transferCall(target);
        } else {
            // For WebRTC P2P, notify server
            socket.emit('transfer-call', {
                roomId: webrtcClient.roomId,
                targetAgent: target,
                callId: webrtcClient.roomId
            });
        }

        elements.transferDialog.classList.add('hidden');
        elements.transferTarget.value = '';
        
        addLog('success', 'Transfer initiated');
        
        // End the current call after transfer
        setTimeout(() => handleEndCall(), 1000);
    } catch (error) {
        addLog('error', `Transfer failed: ${error.message}`);
    }
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        addLog('info', 'Logging out...');

        // End any active calls
        if (webrtcClient && webrtcClient.roomId) {
            webrtcClient.endCall();
        }

        if (genesysClient && genesysClient.isConnected()) {
            await genesysClient.disconnect();
        }

        // Reset UI
        resetCallUI();
        elements.callSection.classList.add('hidden');
        elements.loginSection.classList.remove('hidden');
        elements.agentId.value = '';
        elements.extension.value = '';
        elements.sipUsername.value = '';
        elements.sipPassword.value = '';
        elements.loginBtn.disabled = false;

        currentUser = null;
        useGenesysSIP = false;

        addLog('success', 'Logged out');
    } catch (error) {
        addLog('error', `Logout error: ${error.message}`);
    }
}

/**
 * Reset call UI
 */
function resetCallUI() {
    elements.startCallBtn.classList.remove('hidden');
    elements.endCallBtn.classList.add('hidden');
    elements.startCallBtn.disabled = false;
    elements.muteBtn.disabled = true;
    elements.videoBtn.disabled = true;
    elements.holdBtn.disabled = true;
    elements.transferBtn.disabled = true;
    elements.roomId.disabled = false;
    elements.roomId.value = '';

    // Reset button states
    elements.muteBtn.classList.remove('active');
    elements.muteBtn.innerHTML = '<span>🎤</span> Mute';
    elements.videoBtn.classList.remove('active');
    elements.videoBtn.innerHTML = '<span>📹</span> Video Off';
    elements.holdBtn.classList.remove('active');
    elements.holdBtn.innerHTML = '<span>⏸️</span> Hold';

    // Clear video streams
    elements.localVideo.srcObject = null;
    elements.remoteVideo.srcObject = null;
    elements.remoteAudio.srcObject = null;

    isAudioMuted = false;
    isVideoEnabled = true;
    isCallOnHold = false;

    updateCallState('Idle');
}

/**
 * Handle WebRTC state change
 */
function handleWebRTCStateChange(state) {
    addLog('info', `WebRTC state: ${state}`);
    
    if (state === 'connected') {
        updateCallState('Connected');
    } else if (state === 'failed' || state === 'closed') {
        updateCallState('Disconnected');
    }
}

/**
 * Handle Genesys state change
 */
function handleGenesysStateChange(state) {
    addLog('info', `Genesys state: ${state}`);
    
    if (state === 'registered') {
        elements.sipStatus.textContent = 'Registered';
        elements.sipStatus.style.color = 'var(--success-color)';
    } else if (state === 'unregistered' || state === 'disconnected') {
        elements.sipStatus.textContent = 'Not Connected';
        elements.sipStatus.style.color = 'var(--danger-color)';
    } else if (state === 'connected') {
        elements.sipStatus.textContent = 'Connected';
        elements.sipStatus.style.color = 'var(--success-color)';
    }
}

/**
 * Handle remote stream
 */
function handleRemoteStream(data) {
    if (data.type === 'track' && data.stream) {
        addLog('success', 'Remote stream received');
        elements.remoteVideo.srcObject = data.stream;
        elements.remoteAudio.srcObject = data.stream;
    } else if (data.type === 'audio-muted') {
        if (data.muted) {
            elements.remoteAudioIndicator.classList.remove('hidden');
        } else {
            elements.remoteAudioIndicator.classList.add('hidden');
        }
    }
}

/**
 * Handle incoming call
 */
function handleIncomingCall(callInfo) {
    addLog('info', `Incoming call from ${callInfo.displayName || callInfo.from}`);
    
    const accept = confirm(`Incoming call from ${callInfo.displayName || callInfo.from}. Accept?`);
    
    if (accept) {
        callInfo.accept();
        elements.roomId.value = callInfo.from;
        
        // Update UI
        elements.startCallBtn.classList.add('hidden');
        elements.endCallBtn.classList.remove('hidden');
        elements.muteBtn.disabled = false;
        elements.videoBtn.disabled = false;
        elements.holdBtn.disabled = false;
        elements.transferBtn.disabled = false;
        elements.roomId.disabled = true;
        
        updateCallState('Incoming Call');
    } else {
        callInfo.reject();
    }
}

/**
 * Handle call connected
 */
function handleCallConnected() {
    addLog('success', 'Call connected');
    updateCallState('Connected');
}

/**
 * Handle call ended
 */
function handleCallEnded() {
    addLog('info', 'Call ended by remote party');
    resetCallUI();
}

/**
 * Update connection status indicator
 */
function updateConnectionStatus(connected) {
    if (connected) {
        elements.connectionStatus.classList.add('connected');
        elements.connectionStatus.querySelector('.status-text').textContent = 'Connected';
    } else {
        elements.connectionStatus.classList.remove('connected');
        elements.connectionStatus.querySelector('.status-text').textContent = 'Disconnected';
    }
}

/**
 * Update call state display
 */
function updateCallState(state) {
    elements.callState.textContent = state;
    
    // Color coding
    if (state === 'Connected' || state === 'In Call') {
        elements.callState.style.color = 'var(--success-color)';
    } else if (state === 'On Hold') {
        elements.callState.style.color = 'var(--warning-color)';
    } else if (state === 'Disconnected') {
        elements.callState.style.color = 'var(--danger-color)';
    } else {
        elements.callState.style.color = 'var(--text-primary)';
    }
}

/**
 * Add log entry
 */
function addLog(level, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${level}`;
    logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
    
    elements.logContainer.appendChild(logEntry);
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;

    // Keep only last 100 entries
    while (elements.logContainer.children.length > 100) {
        elements.logContainer.removeChild(elements.logContainer.firstChild);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initialize);

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (webrtcClient && webrtcClient.roomId) {
        webrtcClient.endCall();
    }
    if (genesysClient && genesysClient.isConnected()) {
        genesysClient.disconnect();
    }
});




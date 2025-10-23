/**
 * WebRTC Client Handler
 */

class WebRTCClient {
    constructor() {
        this.socket = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.roomId = null;
        this.isInitiator = false;
        this.config = null;
        this.onStateChange = null;
        this.onRemoteStream = null;
        this.onLog = null;
        this.remoteSocketId = null;
    }

    /**
     * Initialize the WebRTC client
     */
    async initialize(socket, config) {
        this.socket = socket;
        this.config = config;
        
        this.log('info', 'WebRTC client initialized');
        this.setupSocketListeners();
    }

    /**
     * Setup Socket.IO event listeners
     */
    setupSocketListeners() {
        // Handle room users list
        this.socket.on('room-users', (data) => {
            this.log('info', `Room has ${data.users.length} other user(s)`);
            if (data.users.length > 0) {
                this.isInitiator = true;
                this.remoteSocketId = data.users[0].socketId;
            }
        });

        // Handle new user joined
        this.socket.on('user-joined', (data) => {
            this.log('success', `User joined: ${data.userId}`);
            this.remoteSocketId = data.socketId;
            if (!this.isInitiator) {
                this.isInitiator = true;
            }
        });

        // Handle WebRTC offer
        this.socket.on('offer', async (data) => {
            this.log('info', 'Received offer from peer');
            this.remoteSocketId = data.fromSocketId;
            await this.handleOffer(data.offer);
        });

        // Handle WebRTC answer
        this.socket.on('answer', async (data) => {
            this.log('info', 'Received answer from peer');
            await this.handleAnswer(data.answer);
        });

        // Handle ICE candidate
        this.socket.on('ice-candidate', async (data) => {
            this.log('info', 'Received ICE candidate');
            await this.handleIceCandidate(data.candidate);
        });

        // Handle user left
        this.socket.on('user-left', (data) => {
            this.log('warning', 'Remote user left the call');
            this.handleRemoteHangup();
        });

        // Handle call state updates
        this.socket.on('call-state-update', (data) => {
            this.log('info', `Remote call state: ${data.state}`);
        });

        // Handle remote audio muted
        this.socket.on('user-audio-muted', (data) => {
            this.log('info', `Remote user ${data.muted ? 'muted' : 'unmuted'}`);
            if (this.onRemoteStream) {
                this.onRemoteStream({ type: 'audio-muted', muted: data.muted });
            }
        });

        // Handle remote video toggled
        this.socket.on('user-video-toggled', (data) => {
            this.log('info', `Remote user video ${data.enabled ? 'enabled' : 'disabled'}`);
        });

        // Handle call held
        this.socket.on('call-held', (data) => {
            this.log('info', `Call ${data.held ? 'held' : 'resumed'} by remote`);
        });
    }

    /**
     * Get user media (audio/video)
     */
    async getUserMedia(constraints = { audio: true, video: true }) {
        try {
            this.log('info', 'Requesting user media...');
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.log('success', 'Got local media stream');
            return this.localStream;
        } catch (error) {
            this.log('error', `Error getting user media: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create peer connection
     */
    createPeerConnection() {
        const iceServers = [
            { urls: this.config.stunServer }
        ];

        if (this.config.turnServer) {
            iceServers.push({
                urls: this.config.turnServer,
                username: this.config.turnUsername,
                credential: this.config.turnCredential
            });
        }

        const configuration = {
            iceServers: iceServers,
            iceCandidatePoolSize: 10
        };

        this.log('info', 'Creating peer connection');
        this.peerConnection = new RTCPeerConnection(configuration);

        // Add local tracks to peer connection
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
                this.log('info', `Added ${track.kind} track to peer connection`);
            });
        }

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.log('info', 'Sending ICE candidate');
                this.socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    roomId: this.roomId,
                    targetSocketId: this.remoteSocketId
                });
            }
        };

        // Handle connection state change
        this.peerConnection.onconnectionstatechange = () => {
            this.log('info', `Connection state: ${this.peerConnection.connectionState}`);
            if (this.onStateChange) {
                this.onStateChange(this.peerConnection.connectionState);
            }

            if (this.peerConnection.connectionState === 'failed') {
                this.log('error', 'Connection failed, attempting restart');
                this.peerConnection.restartIce();
            }
        };

        // Handle ICE connection state change
        this.peerConnection.oniceconnectionstatechange = () => {
            this.log('info', `ICE connection state: ${this.peerConnection.iceConnectionState}`);
        };

        // Handle remote track
        this.peerConnection.ontrack = (event) => {
            this.log('success', `Received remote ${event.track.kind} track`);
            
            if (!this.remoteStream) {
                this.remoteStream = new MediaStream();
            }
            
            this.remoteStream.addTrack(event.track);
            
            if (this.onRemoteStream) {
                this.onRemoteStream({ type: 'track', stream: this.remoteStream });
            }
        };

        return this.peerConnection;
    }

    /**
     * Start a call
     */
    async startCall(roomId) {
        this.roomId = roomId;
        
        try {
            // Join room
            this.log('info', `Joining room: ${roomId}`);
            this.socket.emit('join-room', {
                roomId: roomId,
                userId: this.socket.id
            });

            // Get user media
            await this.getUserMedia();

            // Create peer connection
            this.createPeerConnection();

            // Wait a bit for room setup, then create offer if initiator
            setTimeout(async () => {
                if (this.isInitiator) {
                    await this.createOffer();
                }
            }, 1000);

            return true;
        } catch (error) {
            this.log('error', `Error starting call: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create and send offer
     */
    async createOffer() {
        try {
            this.log('info', 'Creating offer...');
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            await this.peerConnection.setLocalDescription(offer);
            this.log('success', 'Offer created and set as local description');

            this.socket.emit('offer', {
                offer: offer,
                roomId: this.roomId,
                targetSocketId: this.remoteSocketId
            });
        } catch (error) {
            this.log('error', `Error creating offer: ${error.message}`);
        }
    }

    /**
     * Handle incoming offer
     */
    async handleOffer(offer) {
        try {
            if (!this.peerConnection) {
                await this.getUserMedia();
                this.createPeerConnection();
            }

            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            this.log('success', 'Remote description set from offer');

            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.log('success', 'Answer created and set as local description');

            this.socket.emit('answer', {
                answer: answer,
                roomId: this.roomId,
                targetSocketId: this.remoteSocketId
            });
        } catch (error) {
            this.log('error', `Error handling offer: ${error.message}`);
        }
    }

    /**
     * Handle incoming answer
     */
    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            this.log('success', 'Remote description set from answer');
        } catch (error) {
            this.log('error', `Error handling answer: ${error.message}`);
        }
    }

    /**
     * Handle incoming ICE candidate
     */
    async handleIceCandidate(candidate) {
        try {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                this.log('success', 'ICE candidate added');
            }
        } catch (error) {
            this.log('error', `Error adding ICE candidate: ${error.message}`);
        }
    }

    /**
     * Mute/unmute audio
     */
    toggleAudio(mute) {
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !mute;
            });
            
            this.socket.emit('mute-audio', {
                roomId: this.roomId,
                muted: mute
            });
            
            this.log('info', `Audio ${mute ? 'muted' : 'unmuted'}`);
            return true;
        }
        return false;
    }

    /**
     * Enable/disable video
     */
    toggleVideo(enable) {
        if (this.localStream) {
            this.localStream.getVideoTracks().forEach(track => {
                track.enabled = enable;
            });
            
            this.socket.emit('toggle-video', {
                roomId: this.roomId,
                enabled: enable
            });
            
            this.log('info', `Video ${enable ? 'enabled' : 'disabled'}`);
            return true;
        }
        return false;
    }

    /**
     * Handle remote hangup
     */
    handleRemoteHangup() {
        this.log('warning', 'Remote party ended the call');
        this.endCall();
    }

    /**
     * End call
     */
    endCall() {
        this.log('info', 'Ending call...');

        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        // Leave room
        if (this.roomId) {
            this.socket.emit('leave-room', { roomId: this.roomId });
            this.roomId = null;
        }

        this.remoteStream = null;
        this.isInitiator = false;
        this.remoteSocketId = null;

        if (this.onStateChange) {
            this.onStateChange('closed');
        }

        this.log('success', 'Call ended');
    }

    /**
     * Log message
     */
    log(level, message) {
        if (this.onLog) {
            this.onLog(level, message);
        }
        console.log(`[WebRTC ${level.toUpperCase()}]`, message);
    }
}




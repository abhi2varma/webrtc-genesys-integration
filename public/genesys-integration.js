/**
 * Genesys PureEngage SIP.js Integration
 */

class GenesysIntegration {
    constructor() {
        this.userAgent = null;
        this.session = null;
        this.registered = false;
        this.config = null;
        this.onStateChange = null;
        this.onIncomingCall = null;
        this.onCallConnected = null;
        this.onCallEnded = null;
        this.onLog = null;
        this.remoteStream = null;
    }

    /**
     * Initialize Genesys SIP connection
     */
    async initialize(config, credentials) {
        this.config = config;

        try {
            // Check if SIP.js is available
            if (typeof SIP === 'undefined') {
                throw new Error('SIP.js library not loaded');
            }

            // Only initialize if Genesys WebSocket server is configured
            if (!config.genesysWebSocketServer) {
                this.log('warning', 'Genesys WebSocket server not configured, SIP features disabled');
                return false;
            }

            this.log('info', 'Initializing Genesys SIP connection...');

            const uri = SIP.UserAgent.makeURI(`sip:${credentials.username}@${config.genesysRealm}`);
            
            const transportOptions = {
                server: config.genesysWebSocketServer,
                connectionTimeout: 30,
                keepAliveInterval: 30
            };

            const userAgentOptions = {
                uri: uri,
                transportOptions: transportOptions,
                authorizationUsername: credentials.username,
                authorizationPassword: credentials.password,
                displayName: credentials.displayName || credentials.username,
                sessionDescriptionHandlerFactoryOptions: {
                    constraints: {
                        audio: true,
                        video: true
                    },
                    peerConnectionConfiguration: {
                        iceServers: [
                            { urls: config.stunServer }
                        ]
                    }
                },
                logLevel: 'warn',
                delegate: {
                    onInvite: (invitation) => this.handleIncomingCall(invitation),
                    onConnect: () => {
                        this.log('success', 'SIP transport connected');
                        this.updateState('connected');
                    },
                    onDisconnect: (error) => {
                        this.log('warning', 'SIP transport disconnected');
                        this.updateState('disconnected');
                        if (error) {
                            this.log('error', `Disconnect error: ${error.message}`);
                        }
                    }
                }
            };

            this.userAgent = new SIP.UserAgent(userAgentOptions);

            // Setup user agent event handlers
            this.setupUserAgentHandlers();

            // Start the user agent
            await this.userAgent.start();
            this.log('success', 'SIP User Agent started');

            // Register
            await this.register();

            return true;
        } catch (error) {
            this.log('error', `Failed to initialize Genesys SIP: ${error.message}`);
            throw error;
        }
    }

    /**
     * Setup user agent event handlers
     */
    setupUserAgentHandlers() {
        // Handle registration state changes
        this.userAgent.stateChange.addListener((state) => {
            this.log('info', `User Agent state: ${state}`);
            this.updateState(state);
        });
    }

    /**
     * Register with SIP server
     */
    async register() {
        try {
            this.log('info', 'Registering with SIP server...');
            
            const registerer = new SIP.Registerer(this.userAgent);
            
            registerer.stateChange.addListener((state) => {
                this.log('info', `Registration state: ${state}`);
                if (state === SIP.RegistererState.Registered) {
                    this.registered = true;
                    this.log('success', 'Successfully registered with SIP server');
                    this.updateState('registered');
                } else if (state === SIP.RegistererState.Unregistered) {
                    this.registered = false;
                    this.updateState('unregistered');
                }
            });

            await registerer.register();
            this.registerer = registerer;
            
        } catch (error) {
            this.log('error', `Registration failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Make an outbound call
     */
    async makeCall(destination) {
        try {
            if (!this.registered) {
                throw new Error('Not registered with SIP server');
            }

            this.log('info', `Making call to ${destination}...`);

            const target = SIP.UserAgent.makeURI(`sip:${destination}@${this.config.genesysRealm}`);
            if (!target) {
                throw new Error('Invalid destination');
            }

            const inviter = new SIP.Inviter(this.userAgent, target, {
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        audio: true,
                        video: true
                    }
                }
            });

            this.session = inviter;
            this.setupSessionHandlers(inviter);

            // Send INVITE
            await inviter.invite({
                requestDelegate: {
                    onAccept: (response) => {
                        this.log('success', 'Call accepted');
                        this.updateState('connected');
                        if (this.onCallConnected) {
                            this.onCallConnected();
                        }
                    },
                    onReject: (response) => {
                        this.log('warning', `Call rejected: ${response.message.reasonPhrase}`);
                        this.updateState('rejected');
                    }
                }
            });

            this.log('info', 'Call initiated');
            this.updateState('calling');

            return inviter;
        } catch (error) {
            this.log('error', `Failed to make call: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle incoming call
     */
    handleIncomingCall(invitation) {
        this.log('info', `Incoming call from ${invitation.remoteIdentity.uri.user}`);
        
        this.session = invitation;
        this.setupSessionHandlers(invitation);

        if (this.onIncomingCall) {
            this.onIncomingCall({
                from: invitation.remoteIdentity.uri.user,
                displayName: invitation.remoteIdentity.displayName,
                accept: () => this.acceptCall(invitation),
                reject: () => this.rejectCall(invitation)
            });
        }

        this.updateState('incoming');
    }

    /**
     * Accept incoming call
     */
    async acceptCall(invitation) {
        try {
            this.log('info', 'Accepting call...');

            const options = {
                sessionDescriptionHandlerOptions: {
                    constraints: {
                        audio: true,
                        video: true
                    }
                }
            };

            await invitation.accept(options);
            this.log('success', 'Call accepted');
            this.updateState('connected');

            if (this.onCallConnected) {
                this.onCallConnected();
            }
        } catch (error) {
            this.log('error', `Failed to accept call: ${error.message}`);
        }
    }

    /**
     * Reject incoming call
     */
    async rejectCall(invitation) {
        try {
            this.log('info', 'Rejecting call...');
            await invitation.reject();
            this.log('info', 'Call rejected');
            this.session = null;
        } catch (error) {
            this.log('error', `Failed to reject call: ${error.message}`);
        }
    }

    /**
     * Setup session event handlers
     */
    setupSessionHandlers(session) {
        // Handle session state changes
        session.stateChange.addListener((state) => {
            this.log('info', `Session state: ${state}`);
            this.updateState(state);

            if (state === SIP.SessionState.Terminated) {
                this.log('info', 'Call terminated');
                this.session = null;
                if (this.onCallEnded) {
                    this.onCallEnded();
                }
            }
        });

        // Handle remote media
        const sessionDescriptionHandler = session.sessionDescriptionHandler;
        if (sessionDescriptionHandler) {
            sessionDescriptionHandler.peerConnectionDelegate = {
                ontrack: (event) => {
                    this.log('success', 'Received remote track');
                    this.remoteStream = event.streams[0];
                }
            };
        }
    }

    /**
     * End current call
     */
    async endCall() {
        if (!this.session) {
            this.log('warning', 'No active session to end');
            return;
        }

        try {
            this.log('info', 'Ending call...');

            if (this.session instanceof SIP.Inviter) {
                if (this.session.state === SIP.SessionState.Established) {
                    await this.session.bye();
                } else if (this.session.state === SIP.SessionState.Establishing) {
                    await this.session.cancel();
                }
            } else if (this.session instanceof SIP.Invitation) {
                if (this.session.state === SIP.SessionState.Established) {
                    await this.session.bye();
                } else {
                    await this.session.reject();
                }
            }

            this.session = null;
            this.log('success', 'Call ended');
        } catch (error) {
            this.log('error', `Failed to end call: ${error.message}`);
        }
    }

    /**
     * Hold/unhold call
     */
    async toggleHold(hold) {
        if (!this.session || this.session.state !== SIP.SessionState.Established) {
            this.log('warning', 'No established session to hold');
            return false;
        }

        try {
            if (hold) {
                this.log('info', 'Holding call...');
                await this.session.hold();
                this.log('success', 'Call on hold');
            } else {
                this.log('info', 'Resuming call...');
                await this.session.unhold();
                this.log('success', 'Call resumed');
            }
            return true;
        } catch (error) {
            this.log('error', `Failed to ${hold ? 'hold' : 'unhold'} call: ${error.message}`);
            return false;
        }
    }

    /**
     * Mute/unmute audio
     */
    toggleMute(mute) {
        if (!this.session || this.session.state !== SIP.SessionState.Established) {
            this.log('warning', 'No established session to mute');
            return false;
        }

        try {
            const pc = this.session.sessionDescriptionHandler.peerConnection;
            const localStream = new MediaStream();
            
            pc.getSenders().forEach(sender => {
                if (sender.track && sender.track.kind === 'audio') {
                    sender.track.enabled = !mute;
                }
            });

            this.log('info', `Audio ${mute ? 'muted' : 'unmuted'}`);
            return true;
        } catch (error) {
            this.log('error', `Failed to ${mute ? 'mute' : 'unmute'}: ${error.message}`);
            return false;
        }
    }

    /**
     * Transfer call
     */
    async transferCall(target) {
        if (!this.session || this.session.state !== SIP.SessionState.Established) {
            this.log('warning', 'No established session to transfer');
            return false;
        }

        try {
            this.log('info', `Transferring call to ${target}...`);
            
            const transferTarget = SIP.UserAgent.makeURI(`sip:${target}@${this.config.genesysRealm}`);
            if (!transferTarget) {
                throw new Error('Invalid transfer target');
            }

            // Refer (attended or blind transfer)
            const referrer = new SIP.Referrer(this.session, transferTarget);
            await referrer.refer();

            this.log('success', 'Call transfer initiated');
            return true;
        } catch (error) {
            this.log('error', `Failed to transfer call: ${error.message}`);
            return false;
        }
    }

    /**
     * Send DTMF tones
     */
    sendDTMF(tone) {
        if (!this.session || this.session.state !== SIP.SessionState.Established) {
            this.log('warning', 'No established session to send DTMF');
            return false;
        }

        try {
            const options = {
                requestOptions: {
                    body: {
                        contentDisposition: 'render',
                        contentType: 'application/dtmf-relay',
                        content: `Signal=${tone}\r\nDuration=100`
                    }
                }
            };

            this.session.info(options);
            this.log('info', `Sent DTMF: ${tone}`);
            return true;
        } catch (error) {
            this.log('error', `Failed to send DTMF: ${error.message}`);
            return false;
        }
    }

    /**
     * Get remote stream
     */
    getRemoteStream() {
        if (this.session && this.session.sessionDescriptionHandler) {
            const pc = this.session.sessionDescriptionHandler.peerConnection;
            const remoteStreams = pc.getReceivers()
                .map(receiver => receiver.track)
                .filter(track => track !== null);
            
            if (remoteStreams.length > 0) {
                const stream = new MediaStream();
                remoteStreams.forEach(track => stream.addTrack(track));
                return stream;
            }
        }
        return this.remoteStream;
    }

    /**
     * Unregister and disconnect
     */
    async disconnect() {
        try {
            this.log('info', 'Disconnecting...');

            // End active call
            if (this.session) {
                await this.endCall();
            }

            // Unregister
            if (this.registerer && this.registered) {
                await this.registerer.unregister();
            }

            // Stop user agent
            if (this.userAgent) {
                await this.userAgent.stop();
            }

            this.registered = false;
            this.log('success', 'Disconnected');
        } catch (error) {
            this.log('error', `Disconnect error: ${error.message}`);
        }
    }

    /**
     * Update state
     */
    updateState(state) {
        if (this.onStateChange) {
            this.onStateChange(state);
        }
    }

    /**
     * Log message
     */
    log(level, message) {
        if (this.onLog) {
            this.onLog(level, message);
        }
        console.log(`[Genesys ${level.toUpperCase()}]`, message);
    }

    /**
     * Get connection status
     */
    isConnected() {
        return this.userAgent && this.userAgent.state === SIP.UserAgentState.Started && this.registered;
    }

    /**
     * Get call status
     */
    isInCall() {
        return this.session && this.session.state === SIP.SessionState.Established;
    }
}




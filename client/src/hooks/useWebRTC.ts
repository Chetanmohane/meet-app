import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = (import.meta as any).env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5050' : window.location.origin);

export interface Peer {
  socketId: string;
  userId: string;
  userName: string;
  stream: MediaStream | null;
  micEnabled: boolean;
  videoEnabled: boolean;
  handRaised: boolean;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  messageText: string;
  timestamp: string;
  isLocal: boolean;
}

export interface Reaction {
  id: string;
  senderName: string;
  emoji: string;
  drift: number;
}

export interface Caption {
  senderName: string;
  text: string;
  timestamp: number;
}

const iceConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export default function useWebRTC(
  roomId: string, 
  userId: string, 
  initialUserName: string, 
  initialStream: MediaStream | null, 
  initialMic: boolean, 
  initialVideo: boolean
) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(initialStream);
  const [micEnabled, setMicEnabled] = useState<boolean>(initialMic);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(initialVideo);
  const [screenSharing, setScreenSharing] = useState<boolean>(false);
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Premium states
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [captions, setCaptions] = useState<{ [sid: string]: Caption }>({});
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(initialStream);
  const recognitionRef = useRef<any>(null);

  // Keep local stream ref updated
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Web Audio volume level tracker to detect active speakers
  useEffect(() => {
    const cleanupMap: { [sid: string]: () => void } = {};

    // 1. Check local volume
    if (localStream && micEnabled) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const cleanup = startAudioAnalyser(localStream, (vol) => {
          const localSid = socketRef.current?.id || 'local';
          if (vol > 15) {
            setActiveSpeakers(prev => prev.includes(localSid) ? prev : [...prev, localSid]);
          } else {
            setActiveSpeakers(prev => prev.filter(sid => sid !== localSid));
          }
        });
        if (cleanup) cleanupMap['local'] = cleanup;
      }
    }

    // 2. Check remote peers volume
    peers.forEach(peer => {
      if (peer.stream && peer.micEnabled) {
        const audioTracks = peer.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const cleanup = startAudioAnalyser(peer.stream, (vol) => {
            if (vol > 15) {
              setActiveSpeakers(prev => prev.includes(peer.socketId) ? prev : [...prev, peer.socketId]);
            } else {
              setActiveSpeakers(prev => prev.filter(sid => sid !== peer.socketId));
            }
          });
          if (cleanup) cleanupMap[peer.socketId] = cleanup;
        }
      }
    });

    return () => {
      Object.values(cleanupMap).forEach(cleanup => cleanup());
    };
  }, [localStream, micEnabled, peers]);

  // Audio Analyser helper
  const startAudioAnalyser = (stream: MediaStream, onVolume: (vol: number) => void) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;
      
      const audioContext = new AudioContextClass();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let active = true;
      const checkVolume = () => {
        if (!active) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        onVolume(average);
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
      
      return () => {
        active = false;
        audioContext.close();
      };
    } catch (e) {
      return null;
    }
  };

  // Speech Recognition management
  useEffect(() => {
    if (captionsEnabled) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const text = finalTranscript || interimTranscript;
          if (text.trim() && socketRef.current) {
            const socket = socketRef.current;
            socket.emit('send-caption', {
              roomId,
              text: text.trim(),
              senderName: initialUserName
            });

            // Display locally
            setCaptions(prev => ({
              ...prev,
              [socket.id || 'local']: {
                senderName: 'You',
                text: text.trim(),
                timestamp: Date.now()
              }
            }));
          }
        };

        rec.onerror = (e: any) => {
          console.error('Speech recognition error:', e);
        };

        rec.onend = () => {
          if (captionsEnabled && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {
              console.warn('Speech recognition restart failed:', err);
            }
          }
        };

        recognitionRef.current = rec;
        try {
          rec.start();
        } catch (err) {
          console.error('Failed to start speech recognition:', err);
        }
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      const localSid = socketRef.current?.id || 'local';
      setCaptions(prev => {
        const copy = { ...prev };
        delete copy[localSid];
        return copy;
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [captionsEnabled, initialUserName, roomId]);

  // Clean up stale captions (older than 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCaptions(prev => {
        let changed = false;
        const copy = { ...prev };
        for (const sid in copy) {
          if (now - copy[sid].timestamp > 5000) {
            delete copy[sid];
            changed = true;
          }
        }
        return changed ? copy : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // WebRTC Connection Setup and Socket.io signaling listeners
  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);
    socketRef.current = socket;

    // Helper to create RTCPeerConnection
    const createPC = (peerSocketId: string) => {
      const pc = new RTCPeerConnection(iceConfiguration);

      // Add local stream tracks
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('relay-signal', {
            targetSocketId: peerSocketId,
            signal: { candidate: event.candidate }
          });
        }
      };

      // Handle Remote Tracks
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        setPeers(prev => prev.map(p => {
          if (p.socketId === peerSocketId) {
            return { ...p, stream: remoteStream };
          }
          return p;
        }));
      };

      return pc;
    };

    socket.on('connect', () => {
      console.log('Connected to signaling server with ID:', socket.id);
      
      // Join Room
      socket.emit('join-room', {
        roomId,
        userId,
        userName: initialUserName,
        micEnabled: initialMic,
        videoEnabled: initialVideo
      });
    });

    // 1. Received list of existing users
    socket.on('all-users', async (existingUsers: { socketId: string, userId: string, userName: string, micEnabled?: boolean, videoEnabled?: boolean }[]) => {
      const peerList: Peer[] = [];

      for (const peer of existingUsers) {
        // Create peer record
        peerList.push({
          socketId: peer.socketId,
          userId: peer.userId,
          userName: peer.userName,
          stream: null,
          micEnabled: peer.micEnabled !== undefined ? peer.micEnabled : true,
          videoEnabled: peer.videoEnabled !== undefined ? peer.videoEnabled : true,
          handRaised: false
        });

        // Initialize PeerConnection (we are the initiator for existing users)
        const pc = createPC(peer.socketId);
        peerConnections.current[peer.socketId] = pc;

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('relay-signal', {
            targetSocketId: peer.socketId,
            signal: { sdp: pc.localDescription }
          });
        } catch (e) {
          console.error('Failed to create offer:', e);
        }
      }

      setPeers(peerList);
    });

    // 2. New user joined the room
    socket.on('user-joined', ({ socketId, userId, userName, micEnabled, videoEnabled }) => {
      console.log('User joined:', userName, socketId);
      
      // Add user to state list
      setPeers(prev => {
        if (prev.some(p => p.socketId === socketId)) return prev;
        return [...prev, {
          socketId,
          userId,
          userName,
          stream: null,
          micEnabled: micEnabled !== undefined ? micEnabled : true,
          videoEnabled: videoEnabled !== undefined ? videoEnabled : true,
          handRaised: false
        }];
      });
    });

    // 3. Receive signal SDP Offer/Answer or ICE Candidate
    socket.on('signal', async ({ senderSocketId, signal }) => {
      let pc = peerConnections.current[senderSocketId];
      
      if (!pc) {
        pc = createPC(senderSocketId);
        peerConnections.current[senderSocketId] = pc;
      }

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('relay-signal', {
              targetSocketId: senderSocketId,
              signal: { sdp: pc.localDescription }
            });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    });

    // 4. Chat messages
    socket.on('receive-chat-message', ({ senderId, senderName, messageText, timestamp }) => {
      setChatMessages(prev => [...prev, {
        senderId,
        senderName,
        messageText,
        timestamp,
        isLocal: senderId === socket.id
      }]);

      if (senderId !== socket.id) {
        setUnreadCount(prev => prev + 1);
      }
    });

    // 5. Media Toggles
    socket.on('user-media-toggled', ({ socketId, type, enabled }) => {
      setPeers(prev => prev.map(p => {
        if (p.socketId === socketId) {
          if (type === 'audio') return { ...p, micEnabled: enabled };
          if (type === 'video') return { ...p, videoEnabled: enabled };
        }
        return p;
      }));
    });

    // 6. Hand Raises
    socket.on('user-hand-raised', ({ socketId, raised }) => {
      setPeers(prev => prev.map(p => {
        if (p.socketId === socketId) {
          return { ...p, handRaised: raised };
        }
        return p;
      }));
    });

    // 7. Reactions
    socket.on('user-reacted', ({ senderName, emoji }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const drift = Math.random() * 80 - 40;
      setReactions(prev => [...prev, { id, senderName, emoji, drift }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 4000);
    });

    // 8. Captions
    socket.on('user-captioned', ({ socketId, senderName, text }) => {
      setCaptions(prev => ({
        ...prev,
        [socketId]: {
          senderName,
          text,
          timestamp: Date.now()
        }
      }));
    });

    // 9. User Left / Disconnected
    socket.on('user-left', ({ socketId }) => {
      console.log('User left:', socketId);
      
      // Close peer connection
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }

      // Remove from states
      setPeers(prev => prev.filter(p => p.socketId !== socketId));
      setActiveSpeakers(prev => prev.filter(sid => sid !== socketId));
      setCaptions(prev => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
    });

    return () => {
      socket.disconnect();
      Object.values(peerConnections.current).forEach(pc => pc.close());
      peerConnections.current = {};
      if (initialStream) {
        initialStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [roomId, userId, initialUserName, initialStream]);

  // 1. Toggle local microphone track
  const toggleLocalMic = useCallback(async () => {
    const enabled = !micEnabled;
    
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }

    if (socketRef.current) {
      socketRef.current.emit('toggle-media', {
        roomId,
        type: 'audio',
        enabled
      });
    }
    setMicEnabled(enabled);
  }, [micEnabled, roomId]);

  // 2. Toggle local video camera track
  const toggleLocalVideo = useCallback(async () => {
    const enabled = !videoEnabled;

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }

    if (socketRef.current) {
      socketRef.current.emit('toggle-media', {
        roomId,
        type: 'video',
        enabled
      });
    }
    setVideoEnabled(enabled);
  }, [videoEnabled, roomId]);

  // 3. Toggle Hand Raise
  const toggleHandRaise = useCallback(async () => {
    const nextState = !handRaised;
    if (socketRef.current) {
      socketRef.current.emit('raise-hand', {
        roomId,
        raised: nextState
      });
    }
    setHandRaised(nextState);
  }, [handRaised, roomId]);

  // 4. Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    const nextState = !screenSharing;
    try {
      if (nextState) {
        // Request Screen Capture
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = displayStream.getVideoTracks()[0];
        
        // Swap screen track on all peer connections
        Object.values(peerConnections.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Set screen track on local stream preview
        setLocalStream(displayStream);

        // When screen share track ends (e.g. via browser "Stop Sharing" button)
        screenTrack.onended = () => {
          // Revert back to webcam
          revertScreenShare();
        };
      } else {
        revertScreenShare();
      }
      setScreenSharing(nextState);
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  }, [screenSharing]);

  // Helper to revert screen share track back to webcam
  const revertScreenShare = async () => {
    try {
      // Release screen track
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }

      // Re-capture webcam track
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const videoTrack = cameraStream.getVideoTracks()[0];
      
      // Ensure webcam matches user mute preferences
      videoTrack.enabled = videoEnabled;
      const audioTrack = cameraStream.getAudioTracks()[0];
      audioTrack.enabled = micEnabled;

      // Replace track on all Peer Connections
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      setLocalStream(cameraStream);
    } catch (e) {
      console.error('Failed to revert screen share back to webcam:', e);
    }
  };

  // 5. Send chat message
  const sendChatMessage = useCallback((messageText: string) => {
    if (!messageText.trim() || !socketRef.current) return;
    socketRef.current.emit('send-chat-message', {
      roomId,
      messageText: messageText.trim(),
      senderName: initialUserName
    });
  }, [initialUserName, roomId]);

  // 6. Send emoji reaction
  const sendReaction = useCallback((emoji: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('send-reaction', {
      roomId,
      emoji,
      senderName: initialUserName
    });

    // Display locally
    const id = Math.random().toString(36).substring(2, 9);
    const drift = Math.random() * 80 - 40;
    setReactions(prev => [...prev, { id, senderName: 'You', emoji, drift }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 4000);
  }, [initialUserName, roomId]);

  // 7. Toggle captions on/off
  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled(prev => !prev);
  }, []);

  // 8. Leave meeting manually
  const leaveMeeting = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const localSid = socketRef.current?.id || 'local';

  return {
    peers,
    localStream,
    micEnabled,
    videoEnabled,
    screenSharing,
    handRaised,
    chatMessages,
    unreadCount,
    setUnreadCount,
    toggleLocalMic,
    toggleLocalVideo,
    toggleScreenShare,
    toggleHandRaise,
    sendChatMessage,
    leaveMeeting,
    
    // Premium outputs
    localSid,
    activeSpeakers,
    reactions,
    sendReaction,
    captions,
    captionsEnabled,
    toggleCaptions
  };
}

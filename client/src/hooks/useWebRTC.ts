import { useEffect, useRef, useState, useCallback } from 'react';
import PeerJS, { MediaConnection, DataConnection } from 'peerjs';

export interface Peer {
  socketId: string; // Map PeerJS ID to socketId to avoid UI changes
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

export interface HistoryEntry {
  id: string;
  userName: string;
  action: 'joined' | 'left';
  timestamp: string;
}

export default function useWebRTC(
  roomId: string, 
  userId: string, 
  initialUserName: string, 
  initialStream: MediaStream | null, 
  initialMic: boolean, 
  initialVideo: boolean,
  isCreator: boolean
) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(initialStream);
  const [micEnabled, setMicEnabled] = useState<boolean>(initialMic);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(initialVideo);
  const [screenSharing, setScreenSharing] = useState<boolean>(false);
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Google Meet admittance states
  const [admissionStatus, setAdmissionStatus] = useState<'asking' | 'admitted' | 'denied'>(
    isCreator ? 'admitted' : 'asking'
  );
  
  interface JoinRequest {
    userId: string;
    userName: string;
    peerId: string;
  }
  const [pendingJoinRequests, setPendingJoinRequests] = useState<JoinRequest[]>([]);
  const [admittedPeers, setAdmittedPeers] = useState<string[]>([]);
  
  const admittedPeersRef = useRef<string[]>([]);
  const pendingRequestsMetaRef = useRef<{ [peerId: string]: any }>({});
  const admissionStatusRef = useRef<'asking' | 'admitted' | 'denied'>(isCreator ? 'admitted' : 'asking');

  useEffect(() => {
    admittedPeersRef.current = admittedPeers;
  }, [admittedPeers]);

  useEffect(() => {
    admissionStatusRef.current = admissionStatus;
  }, [admissionStatus]);

  // Premium states
  const [activeSpeakers, setActiveSpeakers] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [captions, setCaptions] = useState<{ [sid: string]: Caption }>({});
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(false);
  const [joinHistory, setJoinHistory] = useState<HistoryEntry[]>([]);

  const peerInstanceRef = useRef<PeerJS | null>(null);
  const localStreamRef = useRef<MediaStream | null>(initialStream);
  const recognitionRef = useRef<any>(null);
  const peersRef = useRef<Peer[]>([]);
  const dataConnectionsRef = useRef<{ [peerId: string]: DataConnection }>({});
  const mediaCallsRef = useRef<{ [peerId: string]: MediaConnection }>({});

  const micEnabledRef = useRef<boolean>(initialMic);
  const videoEnabledRef = useRef<boolean>(initialVideo);

  const admitGuestRef = useRef<(peerId: string) => void>(() => {});
  const denyGuestRef = useRef<(peerId: string) => void>(() => {});

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    micEnabledRef.current = micEnabled;
  }, [micEnabled]);

  useEffect(() => {
    videoEnabledRef.current = videoEnabled;
  }, [videoEnabled]);

  const addHistoryEntry = useCallback((userName: string, action: 'joined' | 'left') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const id = Math.random().toString(36).substring(2, 9);
    setJoinHistory(prev => [...prev, { id, userName, action, timestamp: time }]);
  }, []);

  // Broadcast data helper
  const broadcastData = useCallback((data: any) => {
    Object.values(dataConnectionsRef.current).forEach(conn => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }, []);

  // Web Audio active speaker detection
  useEffect(() => {
    const cleanupMap: { [sid: string]: () => void } = {};

    if (localStream && micEnabled) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const cleanup = startAudioAnalyser(localStream, (vol) => {
          const localSid = peerInstanceRef.current?.id || 'local';
          if (vol > 15) {
            setActiveSpeakers(prev => prev.includes(localSid) ? prev : [...prev, localSid]);
          } else {
            setActiveSpeakers(prev => prev.filter(sid => sid !== localSid));
          }
        });
        if (cleanup) cleanupMap['local'] = cleanup;
      }
    }

    peers.forEach(p => {
      if (p.stream && p.micEnabled) {
        const audioTracks = p.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          const cleanup = startAudioAnalyser(p.stream, (vol) => {
            if (vol > 15) {
              setActiveSpeakers(prev => prev.includes(p.socketId) ? prev : [...prev, p.socketId]);
            } else {
              setActiveSpeakers(prev => prev.filter(sid => sid !== p.socketId));
            }
          });
          if (cleanup) cleanupMap[p.socketId] = cleanup;
        }
      }
    });

    return () => {
      Object.values(cleanupMap).forEach(cleanup => cleanup());
    };
  }, [localStream, micEnabled, peers]);

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
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
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
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            else interimTranscript += event.results[i][0].transcript;
          }
          const text = finalTranscript || interimTranscript;
          if (text.trim() && peerInstanceRef.current) {
            const selfId = peerInstanceRef.current.id;
            broadcastData({
              type: 'caption',
              senderName: initialUserName,
              text: text.trim()
            });
            setCaptions(prev => ({
              ...prev,
              [selfId]: {
                senderName: 'You',
                text: text.trim(),
                timestamp: Date.now()
              }
            }));
          }
        };
        rec.onend = () => {
          if (captionsEnabled && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) {}
          }
        };
        recognitionRef.current = rec;
        try { rec.start(); } catch (e) {}
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      const selfId = peerInstanceRef.current?.id || 'local';
      setCaptions(prev => {
        const copy = { ...prev };
        delete copy[selfId];
        return copy;
      });
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [captionsEnabled, initialUserName, broadcastData]);

  // Clean stale captions
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

  // PeerJS setup
  useEffect(() => {
    let peer: PeerJS | null = null;
    let localPeerId = '';
    const hostId = `${roomId}-host`;

    const initPeer = (isHostRole: boolean) => {
      localPeerId = isHostRole ? hostId : `${roomId}-guest-${userId}-${Math.random().toString(36).substring(2, 6)}`;
      
      peer = new PeerJS(localPeerId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });
      peerInstanceRef.current = peer;

      peer.on('open', (id) => {
        console.log('PeerJS client opened with ID:', id);
        addHistoryEntry(`${initialUserName} (You)`, 'joined');

        if (!isHostRole) {
          // If we are a guest, connect to the host. If host is not online yet, retry periodically!
          const connectToHost = () => {
            if (peer && !peer.destroyed && !dataConnectionsRef.current[hostId]) {
              console.log('Connecting to host:', hostId);
              const conn = peer.connect(hostId, {
                metadata: { userName: initialUserName, userId, micEnabled: micEnabledRef.current, videoEnabled: videoEnabledRef.current }
              });
              (conn as any).isInitiator = true;
              handleDataConnection(conn, isHostRole);

              conn.on('error', (err) => {
                console.log('Host connection error (host offline), retrying in 4s...', err);
                conn.close();
                setTimeout(connectToHost, 4000);
              });
            }
          };
          connectToHost();
        }
      });

      // Handle incoming data connections (e.g. Host receives guest connection, or guest-to-guest)
      peer.on('connection', (conn) => {
        console.log('Incoming data connection from:', conn.peer);
        handleDataConnection(conn, isHostRole);

        // If we are host, broadcast list of active guests to the new guest ONLY if they are already admitted
        if (isHostRole) {
          setTimeout(() => {
            if (admittedPeersRef.current.includes(conn.peer)) {
              const guestList = Object.keys(dataConnectionsRef.current)
                .filter(pid => pid !== conn.peer && admittedPeersRef.current.includes(pid))
                .map(pid => {
                  const p = peersRef.current.find(pr => pr.socketId === pid);
                  return {
                    peerId: pid,
                    userName: p ? p.userName : 'Guest',
                    userId: p ? p.userId : pid,
                    micEnabled: p ? p.micEnabled : true,
                    videoEnabled: p ? p.videoEnabled : true
                  };
                });
              conn.send({
                type: 'guest-list',
                guests: guestList
              });
            }
          }, 800);
        }
      });

      // Handle incoming media calls
      peer.on('call', (call) => {
        console.log('Incoming call from:', call.peer);
        const stream = localStreamRef.current;
        call.answer(stream || undefined);
        handleMediaCall(call);
      });

      peer.on('error', (err) => {
        console.warn('PeerJS error:', err.type, err.message);
        
        if (err.type === 'unavailable-id' && isHostRole) {
          console.log('Host ID taken, connecting as guest...');
          peer?.destroy();
          initPeer(false);
        }
        
        if (err.type === 'peer-unavailable') {
          console.log('Host peer is not online yet. Retrying connection in 4s...');
          if (!isHostRole) {
            setTimeout(() => {
              if (peer && !peer.destroyed && !dataConnectionsRef.current[hostId]) {
                console.log('Retrying connection to host:', hostId);
                const conn = peer.connect(hostId, {
                  metadata: { userName: initialUserName, userId, micEnabled: micEnabledRef.current, videoEnabled: videoEnabledRef.current }
                });
                (conn as any).isInitiator = true;
                handleDataConnection(conn, isHostRole);
              }
            }, 4000);
          }
        }
      });
    };

    const handleDataConnection = (conn: DataConnection, isHostRole: boolean) => {
      dataConnectionsRef.current[conn.peer] = conn;

      conn.on('open', () => {
        // 1. Host side: Check if incoming guest is admitted
        if (isHostRole && !admittedPeersRef.current.includes(conn.peer)) {
          const meta = conn.metadata || {};
          const reqName = meta.userName || 'Guest';
          const reqUserId = meta.userId || conn.peer;
          
          console.log(`Host received connection from unadmitted guest ${reqName} (${conn.peer})`);
          
          setPendingJoinRequests(prev => {
            if (prev.some(r => r.peerId === conn.peer)) return prev;
            return [...prev, {
              peerId: conn.peer,
              userId: reqUserId,
              userName: reqName
            }];
          });
          
          pendingRequestsMetaRef.current[conn.peer] = {
            conn,
            userName: reqName,
            userId: reqUserId,
            micEnabled: meta.micEnabled !== undefined ? meta.micEnabled : true,
            videoEnabled: meta.videoEnabled !== undefined ? meta.videoEnabled : true
          };
          return;
        }

        // 2. Guest side: Check if we are connecting to Host and not admitted yet
        if (!isHostRole && conn.peer === hostId && admissionStatusRef.current !== 'admitted') {
          console.log('Guest connected to host. Waiting for admittance approval...');
          return;
        }

        // Send handshake so peer gets our real user details
        conn.send({
          type: 'handshake',
          userId,
          userName: initialUserName,
          micEnabled: micEnabledRef.current,
          videoEnabled: videoEnabledRef.current
        });

        // Add peer to list (initial placeholder, will be updated by handshake or stream meta)
        const meta = conn.metadata || {};
        const userName = meta.userName || 'Guest';
        
        setPeers(prev => {
          if (prev.some(p => p.socketId === conn.peer)) return prev;
          return [...prev, {
            socketId: conn.peer,
            userId: meta.userId || conn.peer,
            userName,
            stream: null,
            micEnabled: meta.micEnabled !== undefined ? meta.micEnabled : true,
            videoEnabled: meta.videoEnabled !== undefined ? meta.videoEnabled : true,
            handRaised: false
          }];
        });
        addHistoryEntry(userName, 'joined');

        // Call the peer to send our media stream ONLY if we initiated the connection (prevents glare)
        if ((conn as any).isInitiator) {
          const stream = localStreamRef.current;
          if (stream) {
            console.log('Initiating call to:', conn.peer);
            const call = peer!.call(conn.peer, stream, {
              metadata: { userName: initialUserName, userId, micEnabled: micEnabledRef.current, videoEnabled: videoEnabledRef.current }
            });
            handleMediaCall(call);
          }
        }
      });

      conn.on('data', (data: any) => {
        if (data.type === 'admit-response') {
          if (data.allowed) {
            console.log('Admittance granted by host!');
            setAdmissionStatus('admitted');
            
            const hostMeta = conn.metadata || {};
            const hostName = hostMeta.userName || 'Host';
            
            setPeers(prev => {
              if (prev.some(p => p.socketId === conn.peer)) return prev;
              return [...prev, {
                socketId: conn.peer,
                userId: hostMeta.userId || conn.peer,
                userName: hostName,
                stream: null,
                micEnabled: hostMeta.micEnabled !== undefined ? hostMeta.micEnabled : true,
                videoEnabled: hostMeta.videoEnabled !== undefined ? hostMeta.videoEnabled : true,
                handRaised: false
              }];
            });
            addHistoryEntry(hostName, 'joined');

            // Send handshake so peer gets our real user details
            conn.send({
              type: 'handshake',
              userId,
              userName: initialUserName,
              micEnabled: micEnabledRef.current,
              videoEnabled: videoEnabledRef.current
            });

            // Call the Host to send our media stream
            const stream = localStreamRef.current;
            if (stream && peerInstanceRef.current) {
              console.log('Initiating call to Host:', conn.peer);
              const call = peerInstanceRef.current.call(conn.peer, stream, {
                metadata: { userName: initialUserName, userId, micEnabled: micEnabledRef.current, videoEnabled: videoEnabledRef.current }
              });
              handleMediaCall(call);
            }
          } else {
            console.log('Admittance denied by host.');
            setAdmissionStatus('denied');
            conn.close();
          }
        } else if (data.type === 'handshake') {
          console.log('Received handshake from:', conn.peer, data.userName);
          setPeers(prev => {
            const exists = prev.some(p => p.socketId === conn.peer);
            if (exists) {
              return prev.map(p => {
                if (p.socketId === conn.peer) {
                  return {
                    ...p,
                    userId: data.userId,
                    userName: data.userName,
                    micEnabled: data.micEnabled,
                    videoEnabled: data.videoEnabled
                  };
                }
                return p;
              });
            } else {
              return [...prev, {
                socketId: conn.peer,
                userId: data.userId,
                userName: data.userName,
                stream: null,
                micEnabled: data.micEnabled,
                videoEnabled: data.videoEnabled,
                handRaised: false
              }];
            }
          });
        } else if (data.type === 'guest-list') {
          // Guest receives list of other guests from the host
          data.guests.forEach((g: any) => {
            if (g.peerId !== localPeerId && !dataConnectionsRef.current[g.peerId]) {
              const c = peer!.connect(g.peerId, {
                metadata: { userName: initialUserName, userId, micEnabled: micEnabledRef.current, videoEnabled: videoEnabledRef.current }
              });
              (c as any).isInitiator = true;
              handleDataConnection(c, false);
            }
          });
        } else if (data.type === 'chat') {
          setChatMessages(prev => [...prev, {
            senderId: conn.peer,
            senderName: data.senderName,
            messageText: data.text,
            timestamp: data.timestamp,
            isLocal: false
          }]);
          setUnreadCount(prev => prev + 1);
        } else if (data.type === 'media-toggle') {
          setPeers(prev => prev.map(p => {
            if (p.socketId === conn.peer) {
              if (data.mediaType === 'audio') return { ...p, micEnabled: data.enabled };
              if (data.mediaType === 'video') return { ...p, videoEnabled: data.enabled };
            }
            return p;
          }));
        } else if (data.type === 'hand-raise') {
          setPeers(prev => prev.map(p => {
            if (p.socketId === conn.peer) return { ...p, handRaised: data.raised };
            return p;
          }));
        } else if (data.type === 'reaction') {
          const id = Math.random().toString(36).substring(2, 9);
          const drift = Math.random() * 80 - 40;
          setReactions(prev => [...prev, { id, senderName: data.senderName, emoji: data.emoji, drift }]);
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id));
          }, 4000);
        } else if (data.type === 'caption') {
          setCaptions(prev => ({
            ...prev,
            [conn.peer]: {
              senderName: data.senderName,
              text: data.text,
              timestamp: Date.now()
            }
          }));
        }
      });

      conn.on('close', () => {
        handlePeerDisconnect(conn.peer);
      });
      
      conn.on('error', () => {
        handlePeerDisconnect(conn.peer);
      });
    };

    const handleMediaCall = (call: MediaConnection) => {
      mediaCallsRef.current[call.peer] = call;
      call.on('stream', (remoteStream) => {
        console.log('Received remote stream for:', call.peer);
        
        const meta = call.metadata || {};
        const userName = meta.userName || 'Guest';
        
        setPeers(prev => {
          const exists = prev.some(p => p.socketId === call.peer);
          if (exists) {
            return prev.map(p => {
              if (p.socketId === call.peer) return { ...p, stream: remoteStream };
              return p;
            });
          } else {
            console.log('Adding peer from call stream metadata:', call.peer, userName);
            return [...prev, {
              socketId: call.peer,
              userId: meta.userId || call.peer,
              userName,
              stream: remoteStream,
              micEnabled: meta.micEnabled !== undefined ? meta.micEnabled : true,
              videoEnabled: meta.videoEnabled !== undefined ? meta.videoEnabled : true,
              handRaised: false
            }];
          }
        });
      });
      call.on('close', () => {
        handlePeerDisconnect(call.peer);
      });
    };

    const handlePeerDisconnect = (peerId: string) => {
      const p = peersRef.current.find(pr => pr.socketId === peerId);
      if (p) {
        addHistoryEntry(p.userName, 'left');
      }

      setPeers(prev => prev.filter(pr => pr.socketId !== peerId));
      setActiveSpeakers(prev => prev.filter(sid => sid !== peerId));
      setCaptions(prev => {
        const copy = { ...prev };
        delete copy[peerId];
        return copy;
      });

      // Clear from pending join requests
      setPendingJoinRequests(prev => prev.filter(r => r.peerId !== peerId));
      delete pendingRequestsMetaRef.current[peerId];

      if (dataConnectionsRef.current[peerId]) {
        dataConnectionsRef.current[peerId].close();
        delete dataConnectionsRef.current[peerId];
      }
      if (mediaCallsRef.current[peerId]) {
        mediaCallsRef.current[peerId].close();
        delete mediaCallsRef.current[peerId];
      }

      // Also clean up from admittedPeers list
      setAdmittedPeers(prev => prev.filter(pid => pid !== peerId));

      // If the disconnected peer was the host, wait for host to reconnect
      if (peerId === hostId) {
        console.log('Host disconnected! Starting reconnect loop...');
        const retryConnect = () => {
          if (peer && !peer.destroyed && !dataConnectionsRef.current[hostId]) {
            console.log('Retrying connection to host...');
            const conn = peer.connect(hostId, {
              metadata: { userName: initialUserName, userId, micEnabled: micEnabledRef.current, videoEnabled: videoEnabledRef.current }
            });
            (conn as any).isInitiator = true;
            handleDataConnection(conn, false);

            conn.on('error', (e) => {
              console.log('Host offline, retrying in 5s...', e);
              conn.close();
              setTimeout(retryConnect, 5000);
            });
          }
        };
        setTimeout(retryConnect, 5000);
      }
    };

    admitGuestRef.current = (guestPeerId: string) => {
      const meta = pendingRequestsMetaRef.current[guestPeerId];
      if (!meta) return;

      const { conn, userName, userId: reqUserId, micEnabled: gMic, videoEnabled: gVideo } = meta;

      // 1. Add to admittedPeers
      setAdmittedPeers(prev => {
        const next = [...prev, guestPeerId];
        admittedPeersRef.current = next;
        return next;
      });

      // 2. Remove from pending requests
      setPendingJoinRequests(prev => prev.filter(r => r.peerId !== guestPeerId));
      delete pendingRequestsMetaRef.current[guestPeerId];

      // 3. Send admit-response to the guest
      if (conn && conn.open) {
        conn.send({
          type: 'admit-response',
          allowed: true
        });

        // 4. Send the guest-list to the guest (after a short delay to let guest update state)
        setTimeout(() => {
          if (conn.open) {
            const guestList = Object.keys(dataConnectionsRef.current)
              .filter(pid => pid !== guestPeerId && admittedPeersRef.current.includes(pid))
              .map(pid => {
                const p = peersRef.current.find(pr => pr.socketId === pid);
                return {
                  peerId: pid,
                  userName: p ? p.userName : 'Guest',
                  userId: p ? p.userId : pid,
                  micEnabled: p ? p.micEnabled : true,
                  videoEnabled: p ? p.videoEnabled : true
                };
              });
            conn.send({
              type: 'guest-list',
              guests: guestList
            });
          }
        }, 500);
      }

      // 5. Add guest to host's peers list
      setPeers(prev => {
        if (prev.some(p => p.socketId === guestPeerId)) return prev;
        return [...prev, {
          socketId: guestPeerId,
          userId: reqUserId,
          userName,
          stream: null,
          micEnabled: gMic,
          videoEnabled: gVideo,
          handRaised: false
        }];
      });
      addHistoryEntry(userName, 'joined');

      // 6. Call the guest from host to send host's media stream
      const stream = localStreamRef.current;
      if (stream && peer) {
        console.log('Host calling admitted guest:', guestPeerId);
        const call = peer.call(guestPeerId, stream, {
          metadata: { 
            userName: initialUserName, 
            userId, 
            micEnabled: micEnabledRef.current, 
            videoEnabled: videoEnabledRef.current 
          }
        });
        handleMediaCall(call);
      }
    };

    denyGuestRef.current = (guestPeerId: string) => {
      const meta = pendingRequestsMetaRef.current[guestPeerId];
      
      setPendingJoinRequests(prev => prev.filter(r => r.peerId !== guestPeerId));
      delete pendingRequestsMetaRef.current[guestPeerId];

      if (meta && meta.conn) {
        if (meta.conn.open) {
          meta.conn.send({
            type: 'admit-response',
            allowed: false
          });
        }
        meta.conn.close();
        if (dataConnectionsRef.current[guestPeerId]) {
          delete dataConnectionsRef.current[guestPeerId];
        }
      }
    };

    // Try starting as host if we are the creator
    initPeer(isCreator);

    return () => {
      peer?.destroy();
      Object.values(dataConnectionsRef.current).forEach(c => c.close());
      Object.values(mediaCallsRef.current).forEach(c => c.close());
      dataConnectionsRef.current = {};
      mediaCallsRef.current = {};
      if (initialStream) {
        initialStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [roomId, userId, initialUserName]);

  // Mic Toggle
  const toggleLocalMic = useCallback(async () => {
    const enabled = !micEnabled;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
    broadcastData({
      type: 'media-toggle',
      mediaType: 'audio',
      enabled
    });
    setMicEnabled(enabled);
  }, [micEnabled, broadcastData]);

  // Video Toggle
  const toggleLocalVideo = useCallback(async () => {
    const enabled = !videoEnabled;
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
    broadcastData({
      type: 'media-toggle',
      mediaType: 'video',
      enabled
    });
    setVideoEnabled(enabled);
  }, [videoEnabled, broadcastData]);

  // Hand Raise Toggle
  const toggleHandRaise = useCallback(async () => {
    const raised = !handRaised;
    broadcastData({
      type: 'hand-raise',
      raised
    });
    setHandRaised(raised);
  }, [handRaised, broadcastData]);

  // Screen Share Toggle
  const toggleScreenShare = useCallback(async () => {
    const nextState = !screenSharing;
    try {
      if (nextState) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const screenTrack = displayStream.getVideoTracks()[0];
        
        Object.values(mediaCallsRef.current).forEach(call => {
          const sender = call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        setLocalStream(displayStream);
        screenTrack.onended = () => { revertScreenShare(); };
      } else {
        revertScreenShare();
      }
      setScreenSharing(nextState);
    } catch (e) {
      console.error(e);
    }
  }, [screenSharing]);

  const revertScreenShare = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const videoTrack = cameraStream.getVideoTracks()[0];
      videoTrack.enabled = videoEnabled;
      const audioTrack = cameraStream.getAudioTracks()[0];
      audioTrack.enabled = micEnabled;

      Object.values(mediaCallsRef.current).forEach(call => {
        const sender = call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });

      setLocalStream(cameraStream);
    } catch (e) {
      console.error(e);
    }
  };

  // Send Chat message
  const sendChatMessage = useCallback((messageText: string) => {
    if (!messageText.trim()) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localId = peerInstanceRef.current?.id || 'local';
    
    broadcastData({
      type: 'chat',
      senderName: initialUserName,
      text: messageText.trim(),
      timestamp
    });

    setChatMessages(prev => [...prev, {
      senderId: localId,
      senderName: 'You',
      messageText: messageText.trim(),
      timestamp,
      isLocal: true
    }]);
  }, [initialUserName, broadcastData]);

  // Send Emoji Reaction
  const sendReaction = useCallback((emoji: string) => {
    broadcastData({
      type: 'reaction',
      senderName: initialUserName,
      emoji
    });
    const id = Math.random().toString(36).substring(2, 9);
    const drift = Math.random() * 80 - 40;
    setReactions(prev => [...prev, { id, senderName: 'You', emoji, drift }]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
    }, 4000);
  }, [initialUserName, broadcastData]);

  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled(prev => !prev);
  }, []);

  const leaveMeeting = useCallback(() => {
    peerInstanceRef.current?.destroy();
  }, []);

  const admitGuest = useCallback((peerId: string) => {
    admitGuestRef.current(peerId);
  }, []);

  const denyGuest = useCallback((peerId: string) => {
    denyGuestRef.current(peerId);
  }, []);

  const localSid = peerInstanceRef.current?.id || 'local';

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
    localSid,
    activeSpeakers,
    reactions,
    sendReaction,
    captions,
    captionsEnabled,
    toggleCaptions,
    joinHistory,
    admissionStatus,
    pendingJoinRequests,
    admitGuest,
    denyGuest
  };
}

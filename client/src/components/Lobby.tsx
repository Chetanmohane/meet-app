import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, ShieldAlert, Sparkles, X } from 'lucide-react';
import { UserSession } from '../App';

interface LobbyProps {
  roomId: string;
  user: UserSession;
  onJoin: (details: {
    userName: string;
    localStream: MediaStream | null;
    micEnabled: boolean;
    videoEnabled: boolean;
    videoEffect: string;
  }) => void;
}

export type VideoEffectType = 'none' | 'blur' | 'office' | 'beach' | 'space';

export default function Lobby({ roomId, user, onJoin }: LobbyProps) {
  const [userName, setUserName] = useState<string>(user.name);
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEffect, setVideoEffect] = useState<VideoEffectType>('none');
  const [showEffects, setShowEffects] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize preview stream
  useEffect(() => {
    const getPreviewStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error('Error getting media devices:', err);
        setPermissionError(err.message || 'Could not access camera or microphone.');
        
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setLocalStream(audioOnlyStream);
          setVideoEnabled(false);
        } catch (audioErr) {
          console.warn('Audio access also failed.', audioErr);
        }
      }
    };

    getPreviewStream();

    return () => {
      // Stream tracks are stopped inside useWebRTC or App.tsx, not here
    };
  }, []);

  // Update video element source if stream changes or video is toggled
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = videoEnabled ? localStream : null;
    }
  }, [localStream, videoEnabled]);

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micEnabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    onJoin({
      userName: userName.trim(),
      localStream,
      micEnabled,
      videoEnabled,
      videoEffect
    });
  };

  const userInitial = userName.trim() ? userName.trim().charAt(0).toUpperCase() : '?';

  return (
    <div className="lobby-container">
      <header className="lobby-header">
        <div className="logo-container">
          <span style={{ fontSize: '18px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <VideoIcon size={24} className="logo-icon" /> Google Meet Clone
          </span>
        </div>
      </header>

      <main className="lobby-content">
        <div className="preview-wrapper">
          <div className={`video-preview-box video-tile effect-${videoEffect}`}>
            {videoEnabled && localStream && localStream.getVideoTracks().length > 0 ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
              />
            ) : (
              <div className="preview-placeholder">
                <div className="big-avatar">
                  {userInitial}
                </div>
                <p>Camera is off</p>
              </div>
            )}
            
            <div className="preview-controls">
              <button 
                type="button"
                className={`round-control-btn ${!micEnabled ? 'muted' : ''}`}
                onClick={toggleMic}
                title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              
              <button 
                type="button"
                className={`round-control-btn ${!videoEnabled ? 'muted' : ''}`}
                onClick={toggleVideo}
                title={videoEnabled ? 'Turn camera off' : 'Turn camera on'}
              >
                {videoEnabled ? <VideoIcon size={20} /> : <VideoOff size={20} />}
              </button>

              {/* Background Effects Button */}
              <button 
                type="button"
                className={`round-control-btn ${videoEffect !== 'none' ? 'active' : ''}`}
                onClick={() => setShowEffects(!showEffects)}
                title="Apply visual effects"
                disabled={!videoEnabled}
              >
                <Sparkles size={20} />
              </button>
            </div>

            {/* Effects Selection Modal inside preview */}
            {showEffects && videoEnabled && (
              <div className="effects-dropdown-menu" style={{ bottom: '16px', left: '50%', transform: 'translateX(-50%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4>Choose background effect</h4>
                  <button 
                    type="button" 
                    className="btn-icon-sm" 
                    onClick={() => setShowEffects(false)}
                    style={{ padding: '2px' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="effects-grid">
                  <div 
                    className={`effect-item ${videoEffect === 'none' ? 'active' : ''}`}
                    onClick={() => setVideoEffect('none')}
                  >
                    <span className="effect-preview-icon">🚫</span>
                    <span>None</span>
                  </div>
                  <div 
                    className={`effect-item ${videoEffect === 'blur' ? 'active' : ''}`}
                    onClick={() => setVideoEffect('blur')}
                  >
                    <span className="effect-preview-icon">🌫️</span>
                    <span>Blur</span>
                  </div>
                  <div 
                    className={`effect-item ${videoEffect === 'office' ? 'active' : ''}`}
                    onClick={() => setVideoEffect('office')}
                  >
                    <span className="effect-preview-icon">🏢</span>
                    <span>Office</span>
                  </div>
                  <div 
                    className={`effect-item ${videoEffect === 'beach' ? 'active' : ''}`}
                    onClick={() => setVideoEffect('beach')}
                  >
                    <span className="effect-preview-icon">🏖️</span>
                    <span>Beach</span>
                  </div>
                  <div 
                    className={`effect-item ${videoEffect === 'space' ? 'active' : ''}`}
                    onClick={() => setVideoEffect('space')}
                  >
                    <span className="effect-preview-icon">🌌</span>
                    <span>Space</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {permissionError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-red)', fontSize: '14px', marginTop: '8px' }}>
              <ShieldAlert size={16} />
              <span>Permission Note: {permissionError}. You can still join without camera/mic permissions.</span>
            </div>
          )}
        </div>

        <div className="lobby-join-box">
          <h2>Ready to join?</h2>
          <p style={{ color: 'var(--text-secondary-dark)', fontSize: '15px' }}>
            Meeting code: <span style={{ fontFamily: 'monospace', color: 'white', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{roomId}</span>
          </p>

          <form onSubmit={handleJoin} className="join-form">
            <input
              type="text"
              placeholder="What's your name?"
              className="name-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
              maxLength={20}
              autoFocus
            />
            
            <button 
              type="submit" 
              className="btn-join-meet"
              disabled={!userName.trim()}
            >
              Ask to join
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

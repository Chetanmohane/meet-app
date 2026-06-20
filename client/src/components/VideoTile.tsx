import { useEffect, useRef } from 'react';
import { MicOff, Hand } from 'lucide-react';

interface VideoTileProps {
  isLocal: boolean;
  userName: string;
  stream: MediaStream | null;
  micEnabled: boolean;
  videoEnabled: boolean;
  handRaised: boolean;
  isSpeaking?: boolean;
  videoEffect?: string;
}

export default function VideoTile({ 
  isLocal, 
  userName, 
  stream, 
  micEnabled, 
  videoEnabled, 
  handRaised,
  isSpeaking = false,
  videoEffect = 'none'
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (stream && videoEnabled) {
        const hasVideoTracks = stream.getVideoTracks().length > 0;
        if (hasVideoTracks) {
          videoRef.current.srcObject = stream;
        } else {
          videoRef.current.srcObject = null;
        }
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream, videoEnabled]);

  const userInitial = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <div className={`video-tile ${isLocal ? 'local' : ''} ${isSpeaking ? 'speaking' : ''} effect-${videoEffect}`}>
      {videoEnabled && stream && stream.getVideoTracks().length > 0 ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
        />
      ) : (
        <div className="avatar-container">
          <div className="avatar-circle">
            {userInitial}
          </div>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary-dark)', display: 'flex', alignItems: 'center' }}>
            {userName} {isLocal ? '(You)' : ''}
            {isSpeaking && micEnabled && (
              <div className="voice-wave-indicator" style={{ marginBottom: '2px' }}>
                <div className="voice-bar"></div>
                <div className="voice-bar"></div>
                <div className="voice-bar"></div>
              </div>
            )}
          </span>
        </div>
      )}

      <div className="tile-overlay-bottom">
        <div className="tile-name" style={{ display: 'flex', alignItems: 'center' }}>
          <span>{userName} {isLocal ? '(You)' : ''}</span>
          {isSpeaking && micEnabled && (
            <div className="voice-wave-indicator">
              <div className="voice-bar"></div>
              <div className="voice-bar"></div>
              <div className="voice-bar"></div>
            </div>
          )}
        </div>
        
        <div className="tile-indicators">
          {!micEnabled && (
            <div className="indicator-badge muted" title="Microphone is off">
              <MicOff size={16} />
            </div>
          )}

          {handRaised && (
            <div className="indicator-badge raised" title="Hand is raised">
              <Hand size={16} fill="black" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

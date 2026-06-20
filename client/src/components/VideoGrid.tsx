import VideoTile from './VideoTile';
import { Peer } from '../hooks/useWebRTC';
import { LayoutMode } from './MeetingRoom';

interface VideoGridProps {
  localStream: MediaStream | null;
  localUserName: string;
  localMicEnabled: boolean;
  localVideoEnabled: boolean;
  localHandRaised: boolean;
  localSid: string;
  peers: Peer[];
  activeSpeakers: string[];
  layout: LayoutMode;
  localVideoEffect: string;
}

export default function VideoGrid({ 
  localStream, 
  localUserName, 
  localMicEnabled, 
  localVideoEnabled, 
  localHandRaised,
  localSid,
  peers,
  activeSpeakers,
  layout,
  localVideoEffect
}: VideoGridProps) {
  
  const totalParticipants = peers.length + 1;
  
  // Decide who is in the spotlight (active speaker or fallback first peer/local)
  let spotlightSid = '';
  if (activeSpeakers.length > 0) {
    const firstSpeaker = activeSpeakers[0];
    if (firstSpeaker === localSid || peers.some(p => p.socketId === firstSpeaker)) {
      spotlightSid = firstSpeaker;
    }
  }
  if (!spotlightSid) {
    spotlightSid = peers.length > 0 ? peers[0].socketId : localSid;
  }

  // Tiled Grid Layout (default)
  if (layout === 'tile') {
    let gridClass = 'peers-more';
    if (totalParticipants === 1) gridClass = 'peers-1';
    else if (totalParticipants === 2) gridClass = 'peers-2';
    else if (totalParticipants === 3) gridClass = 'peers-3';
    else if (totalParticipants === 4) gridClass = 'peers-4';
    else if (totalParticipants === 5 || totalParticipants === 6) gridClass = 'peers-5';

    return (
      <div className={`video-grid ${gridClass}`}>
        <VideoTile 
          isLocal={true}
          userName={localUserName}
          stream={localStream}
          micEnabled={localMicEnabled}
          videoEnabled={localVideoEnabled}
          handRaised={localHandRaised}
          isSpeaking={activeSpeakers.includes(localSid)}
          videoEffect={localVideoEffect}
        />

        {peers.map((peer) => (
          <VideoTile 
            key={peer.socketId}
            isLocal={false}
            userName={peer.userName}
            stream={peer.stream}
            micEnabled={peer.micEnabled}
            videoEnabled={peer.videoEnabled}
            handRaised={peer.handRaised}
            isSpeaking={activeSpeakers.includes(peer.socketId)}
          />
        ))}
      </div>
    );
  }

  // Spotlight Layout
  if (layout === 'spotlight') {
    return (
      <div className="spotlight-main-container">
        {spotlightSid === localSid ? (
          <VideoTile 
            isLocal={true}
            userName={localUserName}
            stream={localStream}
            micEnabled={localMicEnabled}
            videoEnabled={localVideoEnabled}
            handRaised={localHandRaised}
            isSpeaking={activeSpeakers.includes(localSid)}
            videoEffect={localVideoEffect}
          />
        ) : (
          (() => {
            const p = peers.find(peer => peer.socketId === spotlightSid);
            return p ? (
              <VideoTile 
                key={p.socketId}
                isLocal={false}
                userName={p.userName}
                stream={p.stream}
                micEnabled={p.micEnabled}
                videoEnabled={p.videoEnabled}
                handRaised={p.handRaised}
                isSpeaking={activeSpeakers.includes(p.socketId)}
              />
            ) : null;
          })()
        )}
      </div>
    );
  }

  // Sidebar Layout
  if (layout === 'sidebar') {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', gap: '16px' }} className="sidebar-layout-root">
        <div className="spotlight-main-container">
          {spotlightSid === localSid ? (
            <VideoTile 
              isLocal={true}
              userName={localUserName}
              stream={localStream}
              micEnabled={localMicEnabled}
              videoEnabled={localVideoEnabled}
              handRaised={localHandRaised}
              isSpeaking={activeSpeakers.includes(localSid)}
              videoEffect={localVideoEffect}
            />
          ) : (
            (() => {
              const p = peers.find(peer => peer.socketId === spotlightSid);
              return p ? (
                <VideoTile 
                  key={p.socketId}
                  isLocal={false}
                  userName={p.userName}
                  stream={p.stream}
                  micEnabled={p.micEnabled}
                  videoEnabled={p.videoEnabled}
                  handRaised={p.handRaised}
                  isSpeaking={activeSpeakers.includes(p.socketId)}
                />
              ) : null;
            })()
          )}
        </div>
        
        {totalParticipants > 1 && (
          <div className="sidebar-tiles-container">
            {spotlightSid !== localSid && (
              <VideoTile 
                isLocal={true}
                userName={localUserName}
                stream={localStream}
                micEnabled={localMicEnabled}
                videoEnabled={localVideoEnabled}
                handRaised={localHandRaised}
                isSpeaking={activeSpeakers.includes(localSid)}
                videoEffect={localVideoEffect}
              />
            )}
            
            {peers.filter(p => p.socketId !== spotlightSid).map((peer) => (
              <VideoTile 
                key={peer.socketId}
                isLocal={false}
                userName={peer.userName}
                stream={peer.stream}
                micEnabled={peer.micEnabled}
                videoEnabled={peer.videoEnabled}
                handRaised={peer.handRaised}
                isSpeaking={activeSpeakers.includes(peer.socketId)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

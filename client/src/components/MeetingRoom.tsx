import { useState, useEffect } from 'react';
import useWebRTC from '../hooks/useWebRTC';
import VideoGrid from './VideoGrid';
import Controls from './Controls';
import ChatDrawer from './ChatDrawer';
import ParticipantsDrawer from './ParticipantsDrawer';
import MeetingInfo from './MeetingInfo';

interface MeetingRoomProps {
  roomId: string;
  userId: string;
  userName: string;
  initialStream: MediaStream | null;
  initialMic: boolean;
  initialVideo: boolean;
  initialEffect: string;
  onLeave: () => void;
}

export type LayoutMode = 'tile' | 'spotlight' | 'sidebar';

export default function MeetingRoom({ 
  roomId, 
  userId, 
  userName, 
  initialStream, 
  initialMic, 
  initialVideo, 
  initialEffect,
  onLeave 
}: MeetingRoomProps) {
  
  const {
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
    
    // Premium integrations
    localSid,
    activeSpeakers,
    reactions,
    sendReaction,
    captions,
    captionsEnabled,
    toggleCaptions,
    joinHistory
  } = useWebRTC(roomId, userId, userName, initialStream, initialMic, initialVideo);

  const [activeDrawer, setActiveDrawer] = useState<'chat' | 'participants' | null>(null);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [layout, setLayout] = useState<LayoutMode>('tile');
  const [localVideoEffect, setLocalVideoEffect] = useState<string>(initialEffect);

  useEffect(() => {
    if (activeDrawer === 'chat') {
      setUnreadCount(0);
    }
  }, [activeDrawer, setUnreadCount]);

  const handleToggleDrawer = (drawerName: 'chat' | 'participants') => {
    if (activeDrawer === drawerName) {
      setActiveDrawer(null);
    } else {
      setActiveDrawer(drawerName);
    }
  };

  const handleLeave = () => {
    leaveMeeting();
    onLeave();
  };

  return (
    <div className="meeting-container">
      {/* Floating Emoji Reactions Overlay */}
      <div className="reactions-overlay-container">
        {reactions.map((r) => (
          <div 
            key={r.id} 
            className="floating-reaction" 
            style={{ '--drift': `${r.drift}px` } as React.CSSProperties}
          >
            <span className="floating-emoji">{r.emoji}</span>
            <span>{r.senderName}</span>
          </div>
        ))}
      </div>

      <div className={layout === 'sidebar' ? 'meeting-body-sidebar-mode' : 'meeting-body'}>
        <div className="video-area">
          <VideoGrid 
            localStream={localStream}
            localUserName={userName}
            localMicEnabled={micEnabled}
            localVideoEnabled={videoEnabled}
            localHandRaised={handRaised}
            localSid={localSid}
            peers={peers}
            activeSpeakers={activeSpeakers}
            layout={layout}
            localVideoEffect={localVideoEffect}
          />
          
          {/* Live Captions Subtitle Overlay */}
          {captionsEnabled && Object.keys(captions).length > 0 && (
            <div className="captions-overlay-container">
              {Object.entries(captions).map(([sid, caption]) => (
                <div key={sid} className="caption-bubble">
                  <span className="caption-sender-name">{caption.senderName}:</span>
                  <span>{caption.text}</span>
                </div>
              ))}
            </div>
          )}

          {showInfo && (
            <MeetingInfo 
              roomId={roomId} 
              onClose={() => setShowInfo(false)} 
            />
          )}
        </div>

        {activeDrawer === 'chat' && (
          <ChatDrawer 
            messages={chatMessages} 
            onSendMessage={sendChatMessage} 
            onClose={() => setActiveDrawer(null)} 
          />
        )}

        {activeDrawer === 'participants' && (
          <ParticipantsDrawer 
            peers={peers} 
            localUserName={userName}
            onClose={() => setActiveDrawer(null)} 
            joinHistory={joinHistory}
          />
        )}
      </div>

      <Controls 
        roomId={roomId}
        micEnabled={micEnabled}
        videoEnabled={videoEnabled}
        screenSharing={screenSharing}
        handRaised={handRaised}
        unreadChatCount={unreadCount}
        activeDrawer={activeDrawer}
        showInfo={showInfo}
        
        // Premium integrations
        captionsEnabled={captionsEnabled}
        layout={layout}
        videoEffect={localVideoEffect}
        onToggleMic={toggleLocalMic}
        onToggleVideo={toggleLocalVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleHand={toggleHandRaise}
        onToggleDrawer={handleToggleDrawer}
        onToggleInfo={() => setShowInfo(!showInfo)}
        onToggleCaptions={toggleCaptions}
        onSendReaction={sendReaction}
        onChangeLayout={setLayout}
        onChangeVideoEffect={setLocalVideoEffect}
        onLeave={handleLeave}
      />
    </div>
  );
}

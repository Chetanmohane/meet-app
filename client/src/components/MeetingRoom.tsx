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
  isCreator: boolean;
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
  onLeave,
  isCreator
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
    joinHistory,

    // Admittance
    admissionStatus,
    pendingJoinRequests,
    admitGuest,
    denyGuest
  } = useWebRTC(roomId, userId, userName, initialStream, initialMic, initialVideo, isCreator);

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

  if (admissionStatus === 'asking') {
    return (
      <div className="admittance-overlay-container">
        <div className="admittance-box">
          <div className="admittance-icon-container">
            <div className="admittance-icon-pulse"></div>
            <span style={{ fontSize: '32px' }}>🔒</span>
          </div>
          <h2>Asking to join...</h2>
          <p>You'll join the call when someone lets you in.</p>
          <button className="btn-cancel" onClick={handleLeave}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (admissionStatus === 'denied') {
    return (
      <div className="admittance-overlay-container">
        <div className="admittance-box">
          <div className="admittance-icon-container" style={{ background: 'rgba(234, 67, 53, 0.1)' }}>
            <span style={{ fontSize: '32px' }}>🚫</span>
          </div>
          <h2>You can't join this call</h2>
          <p>Someone in the meeting denied your request to join.</p>
          <button className="btn-return" onClick={handleLeave}>
            Return to home screen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-container">
      {/* Admittance notification toasts for Host */}
      {isCreator && pendingJoinRequests.length > 0 && (
        <div className="admittance-toast-container">
          {pendingJoinRequests.map((req) => (
            <div key={req.peerId} className="admittance-toast">
              <div className="admittance-toast-header">
                <div className="admittance-toast-avatar">
                  {req.userName ? req.userName.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="admittance-toast-text">
                  <span className="admittance-toast-title">Someone wants to join this call</span>
                  <span className="admittance-toast-desc">{req.userName}</span>
                </div>
              </div>
              <div className="admittance-toast-actions">
                <button className="btn-deny" onClick={() => denyGuest(req.peerId)}>
                  Deny entry
                </button>
                <button className="btn-admit" onClick={() => admitGuest(req.peerId)}>
                  Admit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            isCreator={isCreator}
            roomId={roomId}
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

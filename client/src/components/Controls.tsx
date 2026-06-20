import { useState } from 'react';
import { 
  Mic, MicOff, 
  Video, VideoOff, 
  Monitor, Hand, 
  MessageSquare, Users, 
  PhoneOff, Info, Copy, Check,
  Smile, Subtitles, LayoutGrid, Grid, Maximize, Columns,
  Sparkles, X, MoreVertical
} from 'lucide-react';
import { LayoutMode } from './MeetingRoom';

interface ControlsProps {
  roomId: string;
  micEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  unreadChatCount: number;
  activeDrawer: 'chat' | 'participants' | null;
  showInfo: boolean;
  
  // Premium props
  captionsEnabled: boolean;
  layout: LayoutMode;
  videoEffect: string;
  
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleHand: () => void;
  onToggleDrawer: (drawerName: 'chat' | 'participants') => void;
  onToggleInfo: () => void;
  onToggleCaptions: () => void;
  onSendReaction: (emoji: string) => void;
  onChangeLayout: (layout: LayoutMode) => void;
  onChangeVideoEffect: (effect: string) => void;
  onLeave: () => void;
}

export default function Controls({
  roomId,
  micEnabled,
  videoEnabled,
  screenSharing,
  handRaised,
  unreadChatCount,
  activeDrawer,
  showInfo,
  
  // Premium props
  captionsEnabled,
  layout,
  videoEffect,
  
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHand,
  onToggleDrawer,
  onToggleInfo,
  onToggleCaptions,
  onSendReaction,
  onChangeLayout,
  onChangeVideoEffect,
  onLeave
}: ControlsProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [showReactionTray, setShowReactionTray] = useState<boolean>(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState<boolean>(false);
  const [showEffects, setShowEffects] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  const handleCopyLink = () => {
    const meetLink = `${window.location.origin}/join/${roomId}`;
    navigator.clipboard.writeText(meetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="controls-container">
      <div className="controls-left">
        <span className="meeting-code-display">{roomId}</span>
        <button 
          className="btn-icon-sm" 
          onClick={handleCopyLink} 
          title="Copy meeting link"
        >
          {copied ? <Check size={16} style={{ color: 'var(--brand-green)' }} /> : <Copy size={16} />}
        </button>
      </div>

      <div className="controls-center">
        <button 
          onClick={onToggleMic}
          className={`control-btn ${!micEnabled ? 'off' : ''}`}
          title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button 
          onClick={onToggleVideo}
          className={`control-btn ${!videoEnabled ? 'off' : ''}`}
          title={videoEnabled ? 'Turn camera off' : 'Turn camera on'}
        >
          {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Live Captions Toggle (Desktop Only) */}
        <button 
          onClick={onToggleCaptions}
          className={`control-btn desktop-only-btn ${captionsEnabled ? 'active' : ''}`}
          title={captionsEnabled ? 'Turn off captions' : 'Turn on captions'}
        >
          <Subtitles size={20} />
        </button>

        {/* Floating Reactions Tray (Desktop Only) */}
        <div className="reaction-btn-wrapper desktop-only-btn">
          <button 
            onClick={() => setShowReactionTray(!showReactionTray)}
            className={`control-btn ${showReactionTray ? 'active' : ''}`}
            title="Send a reaction"
          >
            <Smile size={20} />
          </button>
          
          {showReactionTray && (
            <div className="reaction-tray">
              {['👍', '💖', '👏', '😂', '😮', '🎉'].map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => {
                    onSendReaction(emoji);
                    setShowReactionTray(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Background Effects Selector (Desktop Only) */}
        <div className="effects-btn-wrapper desktop-only-btn">
          <button 
            onClick={() => setShowEffects(!showEffects)}
            className={`control-btn ${videoEffect !== 'none' ? 'active' : ''}`}
            title="Apply visual effects"
            disabled={!videoEnabled}
          >
            <Sparkles size={20} />
          </button>
          
          {showEffects && (
            <div className="effects-dropdown-menu">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4>Background effects</h4>
                <button className="btn-icon-sm" onClick={() => setShowEffects(false)} style={{ padding: '2px' }}>
                  <X size={14} />
                </button>
              </div>
              <div className="effects-grid">
                <div 
                  className={`effect-item ${videoEffect === 'none' ? 'active' : ''}`}
                  onClick={() => { onChangeVideoEffect('none'); setShowEffects(false); }}
                >
                  <span className="effect-preview-icon">🚫</span>
                  <span>None</span>
                </div>
                <div 
                  className={`effect-item ${videoEffect === 'blur' ? 'active' : ''}`}
                  onClick={() => { onChangeVideoEffect('blur'); setShowEffects(false); }}
                >
                  <span className="effect-preview-icon">🌫️</span>
                  <span>Blur</span>
                </div>
                <div 
                  className={`effect-item ${videoEffect === 'office' ? 'active' : ''}`}
                  onClick={() => { onChangeVideoEffect('office'); setShowEffects(false); }}
                >
                  <span className="effect-preview-icon">🏢</span>
                  <span>Office</span>
                </div>
                <div 
                  className={`effect-item ${videoEffect === 'beach' ? 'active' : ''}`}
                  onClick={() => { onChangeVideoEffect('beach'); setShowEffects(false); }}
                >
                  <span className="effect-preview-icon">🏖️</span>
                  <span>Beach</span>
                </div>
                <div 
                  className={`effect-item ${videoEffect === 'space' ? 'active' : ''}`}
                  onClick={() => { onChangeVideoEffect('space'); setShowEffects(false); }}
                >
                  <span className="effect-preview-icon">🌌</span>
                  <span>Space</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Screen Share (Desktop Only) */}
        <button 
          onClick={onToggleScreenShare}
          className={`control-btn desktop-only-btn ${screenSharing ? 'active' : ''}`}
          title={screenSharing ? 'Stop presenting' : 'Present now'}
        >
          <Monitor size={20} />
        </button>

        {/* Hand Raise (Desktop Only) */}
        <button 
          onClick={onToggleHand}
          className={`control-btn desktop-only-btn ${handRaised ? 'active' : ''}`}
          title={handRaised ? 'Lower hand' : 'Raise hand'}
        >
          <Hand size={20} fill={handRaised ? 'white' : 'none'} />
        </button>

        {/* Mobile More Options Button */}
        <button 
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`control-btn mobile-more-btn ${showMoreMenu ? 'active' : ''}`}
          title="More options"
        >
          <MoreVertical size={20} />
        </button>

        <button 
          onClick={onLeave}
          className="control-btn danger"
          title="Leave call"
        >
          <PhoneOff size={20} />
        </button>
      </div>

      <div className="controls-right">
        {/* Layout Switcher selector (Desktop Only) */}
        <div className="layout-btn-wrapper desktop-only-btn">
          <button 
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            className={`control-btn panel-toggle-btn ${showLayoutMenu ? 'active' : ''}`}
            title="Change layout"
            style={{ width: '40px', height: '40px' }}
          >
            <LayoutGrid size={18} />
          </button>
          
          {showLayoutMenu && (
            <div className="layout-dropdown-menu">
              <button 
                className={`layout-dropdown-item ${layout === 'tile' ? 'active' : ''}`}
                onClick={() => {
                  onChangeLayout('tile');
                  setShowLayoutMenu(false);
                }}
              >
                <Grid size={16} /> Tiled Grid
              </button>
              <button 
                className={`layout-dropdown-item ${layout === 'spotlight' ? 'active' : ''}`}
                onClick={() => {
                  onChangeLayout('spotlight');
                  setShowLayoutMenu(false);
                }}
              >
                <Maximize size={16} /> Spotlight
              </button>
              <button 
                className={`layout-dropdown-item ${layout === 'sidebar' ? 'active' : ''}`}
                onClick={() => {
                  onChangeLayout('sidebar');
                  setShowLayoutMenu(false);
                }}
              >
                <Columns size={16} /> Sidebar View
              </button>
            </div>
          )}
        </div>

        {/* Info button (Desktop Only) */}
        <button 
          onClick={onToggleInfo}
          className={`control-btn panel-toggle-btn desktop-only-btn ${showInfo ? 'active' : ''}`}
          title="Meeting details"
          style={{ width: '40px', height: '40px' }}
        >
          <Info size={18} />
        </button>

        <button 
          onClick={() => onToggleDrawer('participants')}
          className={`control-btn panel-toggle-btn ${activeDrawer === 'participants' ? 'active' : ''}`}
          title="Show everyone"
          style={{ width: '40px', height: '40px' }}
        >
          <Users size={18} />
        </button>

        <button 
          onClick={() => onToggleDrawer('chat')}
          className={`control-btn panel-toggle-btn ${activeDrawer === 'chat' ? 'active' : ''}`}
          title="Chat with everyone"
          style={{ width: '40px', height: '40px' }}
        >
          <MessageSquare size={18} />
          {unreadChatCount > 0 && <div className="notification-badge" />}
        </button>
      </div>

      {/* Mobile More Options Bottom Sheet */}
      {showMoreMenu && (
        <div className="mobile-more-sheet-backdrop" onClick={() => setShowMoreMenu(false)}>
          <div className="mobile-more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h3>More options</h3>
              <button className="btn-icon-sm" onClick={() => setShowMoreMenu(false)}>
                <X size={18} />
              </button>
            </div>
            
            {/* Quick Reactions Bar */}
            <div className="sheet-reactions-row">
              {['👍', '💖', '👏', '😂', '😮', '🎉'].map(emoji => (
                <button 
                  key={emoji} 
                  className="sheet-reaction-emoji-btn"
                  onClick={() => {
                    onSendReaction(emoji);
                    setShowMoreMenu(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="sheet-options-list">
              {/* Hand Raise */}
              <button 
                className={`sheet-option-item ${handRaised ? 'active' : ''}`}
                onClick={() => { onToggleHand(); setShowMoreMenu(false); }}
              >
                <Hand size={18} fill={handRaised ? 'white' : 'none'} />
                <span>{handRaised ? 'Lower Hand' : 'Raise Hand'}</span>
              </button>

              {/* Screen Share */}
              <button 
                className={`sheet-option-item ${screenSharing ? 'active' : ''}`}
                onClick={() => { onToggleScreenShare(); setShowMoreMenu(false); }}
              >
                <Monitor size={18} />
                <span>{screenSharing ? 'Stop presenting' : 'Present Screen'}</span>
              </button>

              {/* Captions */}
              <button 
                className={`sheet-option-item ${captionsEnabled ? 'active' : ''}`}
                onClick={() => { onToggleCaptions(); setShowMoreMenu(false); }}
              >
                <Subtitles size={18} />
                <span>{captionsEnabled ? 'Turn Off Captions' : 'Turn On Captions'}</span>
              </button>

              {/* Background Effects */}
              <button 
                className="sheet-option-item"
                onClick={() => {
                  setShowEffects(true);
                  setShowMoreMenu(false);
                }}
                disabled={!videoEnabled}
              >
                <Sparkles size={18} />
                <span>Background Effects</span>
              </button>

              {/* Change Layout */}
              <button 
                className="sheet-option-item"
                onClick={() => {
                  setShowLayoutMenu(true);
                  setShowMoreMenu(false);
                }}
              >
                <LayoutGrid size={18} />
                <span>Change Layout</span>
              </button>

              {/* Meeting Details Info */}
              <button 
                className="sheet-option-item"
                onClick={() => {
                  onToggleInfo();
                  setShowMoreMenu(false);
                }}
              >
                <Info size={18} />
                <span>Meeting Details</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

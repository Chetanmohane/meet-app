import React, { useState, useEffect } from 'react';
import { Video, Keyboard, Link as LinkIcon, Calendar, Plus, X, Copy, Check } from 'lucide-react';
import { UserSession } from '../App';

interface LandingPageProps {
  user: UserSession;
  onSignOut: () => void;
  onCreateRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
}

export default function LandingPage({ user, onSignOut, onCreateRoom, onJoinRoom }: LandingPageProps) {
  const [roomCode, setRoomCode] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // Dropdown & Modal states
  const [showMeetDropdown, setShowMeetDropdown] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  
  const [showLaterModal, setShowLaterModal] = useState<boolean>(false);
  const [laterRoomCode, setLaterRoomCode] = useState<string>('');
  const [copiedLater, setCopiedLater] = useState<boolean>(false);

  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [calTitle, setCalTitle] = useState<string>('General Discussion');
  const [calDate, setCalDate] = useState<string>('');
  const [calTime, setCalTime] = useState<string>('12:00');
  const [scheduledDetails, setScheduledDetails] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      };
      setCurrentTime(date.toLocaleString('en-US', options).replace(',', ' •'));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helper to generate a room code
  const generateCode = () => {
    const randPart = (len: number) => Math.random().toString(36).substring(2, 2 + len);
    return `${randPart(3)}-${randPart(4)}-${randPart(3)}`;
  };

  const handleCreateLater = () => {
    const code = generateCode();
    setLaterRoomCode(code);
    setShowLaterModal(true);
    setShowMeetDropdown(false);
  };

  const handleStartInstant = () => {
    const code = generateCode();
    onCreateRoom(code);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = generateCode();
    const meetLink = `${window.location.origin}/join/${code}`;
    const details = `Subject: ${calTitle}\nDate: ${calDate}\nTime: ${calTime}\nMeeting Link: ${meetLink}`;
    setScheduledDetails(details);
  };

  const handleCopyLink = (linkText: string, setCopiedState: (s: boolean) => void) => {
    navigator.clipboard.writeText(linkText);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    let code = roomCode.trim();
    if (code.includes('/')) {
      const parts = code.split('/');
      code = parts[parts.length - 1];
    }
    
    code = code.split('?')[0];

    if (code) {
      onJoinRoom(code);
    }
  };

  return (
    <div className="landing-container">
      {/* App Header */}
      <header className="landing-header">
        <div className="logo-container">
          <Video size={32} strokeWidth={2.5} className="logo-icon" />
          <h1 className="logo-text">Google <span>Meet</span></h1>
        </div>
        
        <div className="header-right-side">
          <div className="header-time">{currentTime}</div>
          
          {/* User Profile Menu */}
          <div className="user-profile-menu-container">
            <button 
              className="profile-avatar-btn" 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              title="Google Account"
            >
              {user.avatar}
            </button>
            
            {showProfileMenu && (
              <div className="profile-dropdown-menu">
                <div className="dropdown-avatar-circle">{user.avatar}</div>
                <h4>{user.name}</h4>
                <p>{user.email}</p>
                <button className="btn-signout" onClick={onSignOut}>
                  Sign out of all accounts
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-content">
        <div className="landing-left">
          <h1>Premium video meetings.<br />Now free for everyone.</h1>
          <p>We re-engineered the service we built for secure business meetings, Google Meet, to make it free and available on any device.</p>
          
          <div className="action-row">
            {/* New Meeting Dropdown Container */}
            <div className="dropdown-wrapper">
              <button 
                className="btn-primary" 
                onClick={() => setShowMeetDropdown(!showMeetDropdown)}
              >
                <Video size={20} />
                New meeting
              </button>
              
              {showMeetDropdown && (
                <div className="btn-meet-dropdown">
                  <button className="dropdown-action-item" onClick={handleCreateLater}>
                    <LinkIcon size={18} />
                    <span>Create a meeting for later</span>
                  </button>
                  <button className="dropdown-action-item" onClick={handleStartInstant}>
                    <Plus size={18} />
                    <span>Start an instant meeting</span>
                  </button>
                  <button className="dropdown-action-item" onClick={() => { setShowCalendarModal(true); setShowMeetDropdown(false); }}>
                    <Calendar size={18} />
                    <span>Schedule in Google Calendar</span>
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleJoin} className="join-input-group">
              <Keyboard size={18} className="input-icon" />
              <input 
                type="text" 
                placeholder="Enter a code or link"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
              />
              <button 
                type="submit" 
                className="btn-text-join"
                disabled={!roomCode.trim()}
              >
                Join
              </button>
            </form>
          </div>
          
          <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary-light)' }}>
              <a href="#" style={{ color: 'var(--brand-blue)', textDecoration: 'none', fontWeight: '500' }}>Learn more</a> about Google Meet
            </span>
          </div>
        </div>

        <div className="landing-right">
          <div className="carousel-mock">
            <div className="mock-shapes"></div>
            <div className="mock-screen">
              <div className="mock-video-tile">
                <div className="mock-avatar">S</div>
                <span className="mock-badge">Sarah (Host)</span>
              </div>
              <div className="mock-controls">
                <div className="mock-dot active"></div>
                <div className="mock-dot"></div>
                <div className="mock-dot"></div>
              </div>
            </div>
          </div>
          <div className="carousel-info">
            <h3>Get a link you can share</h3>
            <p>Click <strong>New meeting</strong> to get a link you can send to people you want to meet with</p>
          </div>
        </div>
      </main>

      {/* 1. Modal: Meeting for Later Link Display */}
      {showLaterModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowLaterModal(false)} />
          <div className="calendar-invite-modal">
            <div className="modal-header">
              <h3>Here's the link to your meeting</h3>
              <button className="btn-icon-sm" onClick={() => setShowLaterModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary-light)', lineHeight: '18px', marginBottom: '16px' }}>
              Copy this link and send it to people you want to meet with. Make sure you save it so you can use it later.
            </p>
            <div className="copy-box" style={{ background: '#f1f3f4', color: '#202124' }}>
              <span>{`${window.location.origin}/join/${laterRoomCode}`}</span>
              <button 
                className="copy-btn" 
                onClick={() => handleCopyLink(`${window.location.origin}/join/${laterRoomCode}`, setCopiedLater)}
              >
                {copiedLater ? <Check size={16} style={{ color: 'var(--brand-green)' }} /> : <Copy size={16} />}
              </button>
            </div>
            <button 
              className="btn-primary" 
              style={{ width: '100%', marginTop: '20px' }}
              onClick={() => onJoinRoom(laterRoomCode)}
            >
              Join now
            </button>
          </div>
        </>
      )}

      {/* 2. Modal: Schedule in Google Calendar */}
      {showCalendarModal && (
        <>
          <div className="modal-backdrop" onClick={() => { setShowCalendarModal(false); setScheduledDetails(null); }} />
          <div className="calendar-invite-modal">
            <div className="modal-header">
              <h3>Schedule in Google Calendar</h3>
              <button className="btn-icon-sm" onClick={() => { setShowCalendarModal(false); setScheduledDetails(null); }}>
                <X size={18} />
              </button>
            </div>
            
            {!scheduledDetails ? (
              <form onSubmit={handleScheduleSubmit} className="modal-body-form">
                <div className="form-group">
                  <label style={{ color: 'var(--text-secondary-light)' }}>Meeting Topic / Title</label>
                  <input 
                    type="text" 
                    value={calTitle}
                    onChange={(e) => setCalTitle(e.target.value)}
                    required
                    style={{ border: '1px solid var(--border-light)', color: '#202124', background: 'white' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-secondary-light)' }}>Date</label>
                    <input 
                      type="date" 
                      value={calDate}
                      onChange={(e) => setCalDate(e.target.value)}
                      required
                      style={{ border: '1px solid var(--border-light)', color: '#202124', background: 'white' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: 'var(--text-secondary-light)' }}>Time</label>
                    <input 
                      type="time" 
                      value={calTime}
                      onChange={(e) => setCalTime(e.target.value)}
                      required
                      style={{ border: '1px solid var(--border-light)', color: '#202124', background: 'white' }}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '12px' }}>
                  Schedule Meeting
                </button>
              </form>
            ) : (
              <div>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary-light)', marginBottom: '16px' }}>
                  Meeting scheduled successfully! Send these invitation details to your guests:
                </p>
                <pre style={{ 
                  background: '#f1f3f4', 
                  color: '#202124', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '16px'
                }}>
                  {scheduledDetails}
                </pre>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button 
                    className="btn-signout"
                    style={{ flex: 1 }}
                    onClick={() => handleCopyLink(scheduledDetails, () => {})}
                  >
                    Copy Details
                  </button>
                  <button 
                    className="btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const code = scheduledDetails.split('Meeting Link: ')[1].split('/join/')[1].trim();
                      onJoinRoom(code);
                    }}
                  >
                    Join Room
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

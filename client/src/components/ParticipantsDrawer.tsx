import { X, Mic, MicOff, Video, VideoOff, Hand } from 'lucide-react';
import { Peer, HistoryEntry } from '../hooks/useWebRTC';

interface ParticipantsDrawerProps {
  peers: Peer[];
  localUserName: string;
  onClose: () => void;
  joinHistory: HistoryEntry[];
  isCreator: boolean;
  roomId: string;
}

export default function ParticipantsDrawer({ 
  peers, 
  localUserName, 
  onClose, 
  joinHistory,
  isCreator,
  roomId
}: ParticipantsDrawerProps) {
  const totalCount = peers.length + 1;

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const hostId = `${roomId}-host`;

  return (
    <div className="drawer-container">
      <div className="drawer-header">
        <h3>People ({totalCount})</h3>
        <button className="btn-icon-sm" onClick={onClose} title="Close panel">
          <X size={18} />
        </button>
      </div>

      <div className="participants-list">
        <div className="participant-item">
          <div className="p-item-left">
            <div className="p-avatar">
              {getInitial(localUserName)}
            </div>
            <div className="p-name" style={{ fontWeight: '600' }}>
              {localUserName} (You{isCreator ? ', Host/Admin' : ''})
            </div>
          </div>
        </div>

        {peers.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary-dark)', fontSize: '13px', padding: '0 12px' }}>
            No one else has joined yet. Share the room link to invite people.
          </div>
        ) : (
          peers.map((peer) => (
            <div key={peer.socketId} className="participant-item">
              <div className="p-item-left">
                <div className="p-avatar" style={{ backgroundColor: 'var(--text-secondary-light)' }}>
                  {getInitial(peer.userName)}
                </div>
                <div className="p-name">
                  {peer.userName}
                  {peer.socketId === hostId && (
                    <span style={{ 
                      color: 'var(--brand-blue)', 
                      fontSize: '10px', 
                      background: 'rgba(26,115,232,0.12)', 
                      border: '1px solid rgba(26,115,232,0.2)',
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      marginLeft: '8px',
                      fontWeight: '500'
                    }}>
                      Host/Admin
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-item-right">
                {peer.handRaised && (
                  <Hand size={16} style={{ color: 'var(--brand-yellow)' }} fill="var(--brand-yellow)" />
                )}
                {peer.micEnabled ? (
                  <Mic size={16} style={{ color: 'var(--text-secondary-dark)' }} />
                ) : (
                  <MicOff size={16} style={{ color: 'var(--brand-red)' }} />
                )}
                {peer.videoEnabled ? (
                  <Video size={16} style={{ color: 'var(--text-secondary-dark)' }} />
                ) : (
                  <VideoOff size={16} style={{ color: 'var(--brand-red)' }} />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Join History Log Section */}
      <div className="join-history-section" style={{ marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary-dark)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Activity History</h4>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
          {joinHistory.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary-dark)' }}>No actions logged.</span>
          ) : (
            joinHistory.map((log) => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <span style={{ color: '#e8eaed' }}>
                  <strong style={{ color: 'var(--brand-blue)', fontWeight: '500' }}>{log.userName}</strong>{' '}
                  {log.action === 'joined' ? 'joined' : 'left'}
                </span>
                <span style={{ color: 'var(--text-secondary-dark)', fontSize: '10px' }}>{log.timestamp}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

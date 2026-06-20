import { X, Mic, MicOff, Video, VideoOff, Hand } from 'lucide-react';
import { Peer } from '../hooks/useWebRTC';

interface ParticipantsDrawerProps {
  peers: Peer[];
  localUserName: string;
  onClose: () => void;
}

export default function ParticipantsDrawer({ peers, localUserName, onClose }: ParticipantsDrawerProps) {
  const totalCount = peers.length + 1;

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

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
              {localUserName} (You, Host)
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
    </div>
  );
}

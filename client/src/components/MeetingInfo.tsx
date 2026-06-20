import { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

interface MeetingInfoProps {
  roomId: string;
  onClose: () => void;
}

export default function MeetingInfo({ roomId, onClose }: MeetingInfoProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const getMeetLink = () => {
    return `${window.location.origin}/join/${roomId}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getMeetLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="meeting-info-modal">
      <div className="meeting-info-header">
        <h4>Your meeting's ready</h4>
        <button className="btn-icon-sm" onClick={onClose} title="Close card">
          <X size={16} />
        </button>
      </div>

      <p>Share this meeting link with others you want in the meeting.</p>
      
      <div className="copy-box">
        <span>{getMeetLink()}</span>
        <button className="copy-btn" onClick={handleCopy} title="Copy link">
          {copied ? <Check size={16} style={{ color: 'var(--brand-green)' }} /> : <Copy size={16} />}
        </button>
      </div>
      
      <p style={{ fontSize: '11px', marginTop: '12px', marginBottom: 0 }}>
        People who use this link will need to join via lobby before entering the call.
      </p>
    </div>
  );
}

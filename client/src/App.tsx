import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Lobby from './components/Lobby';
import MeetingRoom from './components/MeetingRoom';

export interface UserSession {
  name: string;
  email: string;
  avatar: string;
}

export default function App() {
  const [user, setUser] = useState<UserSession>(() => ({
    name: 'Google Guest',
    email: 'guest.meet@google.com',
    avatar: 'G'
  }));

  const [page, setPage] = useState<'landing' | 'lobby' | 'room'>('landing');
  const [roomId, setRoomId] = useState<string>('');
  const [userId] = useState<string>(() => 'user-' + Math.random().toString(36).substring(2, 11));
  const [userName, setUserName] = useState<string>('');
  
  const [initialStream, setInitialStream] = useState<MediaStream | null>(null);
  const [initialMic, setInitialMic] = useState<boolean>(true);
  const [initialVideo, setInitialVideo] = useState<boolean>(true);
  const [initialEffect, setInitialEffect] = useState<string>('none');

  useEffect(() => {
    const path = window.location.pathname;
    let potentialRoomId = path.replace(/^\/join\//, '').replace(/^\//, '');
    
    if (potentialRoomId && potentialRoomId.length >= 3) {
      potentialRoomId = potentialRoomId.split('/')[0];
      setRoomId(potentialRoomId);
      setPage('lobby');
    }
  }, []);

  const handleCreateRoom = (newRoomId: string) => {
    setRoomId(newRoomId);
    window.history.pushState({}, '', `/join/${newRoomId}`);
    setPage('lobby');
  };

  const handleJoinRoom = (targetRoomId: string) => {
    setRoomId(targetRoomId);
    window.history.pushState({}, '', `/join/${targetRoomId}`);
    setPage('lobby');
  };

  const handleJoinLobby = ({ 
    userName: name, 
    localStream, 
    micEnabled, 
    videoEnabled,
    videoEffect
  }: { 
    userName: string; 
    localStream: MediaStream | null; 
    micEnabled: boolean; 
    videoEnabled: boolean; 
    videoEffect: string;
  }) => {
    setUserName(name);
    setInitialStream(localStream);
    setInitialMic(micEnabled);
    setInitialVideo(videoEnabled);
    setInitialEffect(videoEffect);
    setPage('room');
  };

  const handleLeaveRoom = () => {
    setPage('landing');
    setRoomId('');
    setInitialStream(null);
    window.history.pushState({}, '', '/');
  };

  const handleSignOut = () => {
    setUser({
      name: 'Google Guest',
      email: 'guest.meet@google.com',
      avatar: 'G'
    });
    setPage('landing');
    setRoomId('');
    setInitialStream(null);
    window.history.pushState({}, '', '/');
  };

  return (
    <>
      {page === 'landing' && (
        <LandingPage 
          user={user}
          onSignOut={handleSignOut}
          onCreateRoom={handleCreateRoom} 
          onJoinRoom={handleJoinRoom} 
        />
      )}

      {page === 'lobby' && (
        <Lobby 
          roomId={roomId} 
          user={user}
          onJoin={handleJoinLobby} 
        />
      )}

      {page === 'room' && (
        <MeetingRoom 
          roomId={roomId} 
          userId={userId} 
          userName={userName} 
          initialStream={initialStream} 
          initialMic={initialMic} 
          initialVideo={initialVideo} 
          initialEffect={initialEffect}
          onLeave={handleLeaveRoom}
        />
      )}
    </>
  );
}

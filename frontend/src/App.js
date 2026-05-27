import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import MainMenu from './components/MainMenu/MainMenu';
import SettingsModal from './components/SettingsModal/SettingsModal';
import RulesModal from './components/RulesModal/RulesModal';
import Arena from './components/Arena/Arena';
import Lobby from './components/Lobby/Lobby';
import TutorialArena from './components/Arena/TutorialArena';

import './styles.css';

//  AFTER
const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://35.225.155.246:8000';

const App = () => {
  const [currentView, setCurrentView] = useState('MAIN_MENU');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  
  // Dynamic WebSockets & Multiplayer State Management
  const [socket, setSocket] = useState(null);
  const [dynamicSessionId, setDynamicSessionId] = useState('');
  const [assignedMarker, setAssignedMarker] = useState('');
  const [lobbyState, setLobbyState] = useState(null);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [challengerJoined, setChallengerJoined] = useState(false);

  const [difficulty, setDifficulty] = useState('Easy');
  const [animSpeed, setAnimSpeed] = useState('Neutral');
  const [volume, setVolume] = useState('Neutral');
  const [roundCount, setRoundCount] = useState(5);
  const [powerupsEnabled, setPowerupsEnabled] = useState(true);
  const [activePowerup, setActivePowerup] = useState('Double Selection');

  const [isHost, setIsHost] = useState(false);

const handleConnect = (code, role) => {
  // Connect to backend and assign role explicitly based on which button they clicked
  const newSocket = io(API_BASE, {
    query: { room: code, player: role }
  });

  setSocket(newSocket);
  setDynamicSessionId(code);
  setRoomCodeInput(code);
  setAssignedMarker(role);
  setIsHost(role === 'X'); // If they clicked "Create", they are X (Host)

  newSocket.on('connect', () => {
    console.log(`Connected as ${role} to room ${code}`);
  });

  // Listen for the other player joining
  newSocket.on('player_joined', (data) => {
    if (data.marker === 'O') {
      setChallengerJoined(true);
    }
  });

  // Listen for the host clicking start
  newSocket.on('match_started', (data) => {
    setLobbyState(data.state);
    setCurrentView('ARENA');
  });
};

const handleStartGame = () => {
  if (socket && socket.connected) {
    // Send signal to server to start the match (this triggers the handler we added earlier)
    socket.emit('start_match', { session_id: dynamicSessionId });
  }
};

  // Listen for real-time state synchronization from backend broker
  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      console.log("✅ Core System Connected to WebSocket Gateway");
    });

    socket.on('connect_error', (err) => {
      console.error("❌ Gateway Connection Failure:", err.message);
      // Optional: Handle fallback alert UI here
    });

    socket.on('sync_state', (data) => {
      console.log("🔄 State Sync Payload Received:", data);
      
      const state = data.state;
      if (!state) return;

      setLobbyState(state);

      // Check if a challenger has populated the room slots
      if (state.players && state.players.includes('O')) {
        setChallengerJoined(true);
      } else {
        setChallengerJoined(false);
      }

      // CRITICAL FIX: If the server marks the match as active or running, 
      // automatically push BOTH browsers into the ARENA view.
      if (state.is_active || state.status === 'RUNNING' || state.current_round > 0 || state.match_started) {
        setCurrentView('ARENA');
      }
    });

    // Handle universal match start broadcast signal if explicitly sent
    socket.on('match_started', (data) => {
      console.log("🚀 Match initialization signal verified.");
      if (data.state) setLobbyState(data.state);
      setCurrentView('ARENA');
    });

    // Clean up connections and remove listeners to prevent duplicates
    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('sync_state');
      socket.off('match_started');
    };
  }, [socket]);

  // Handler for creating a session (Host - Player X)
  const handleHostCreateLobby = (selectedRounds = roundCount) => {
    // If a socket already exists, disconnect it cleanly first
    if (socket) socket.disconnect();

    setRoundCount(selectedRounds);
    const generatedRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setDynamicSessionId(generatedRoomId);
    setAssignedMarker('X');

    const newSocket = io(API_BASE, {
      path: '/socket.io',
      query: { room: generatedRoomId, player: 'X' },
      forceNew: true // Prevents socket pooling reuse issues
    });

    setSocket(newSocket);
    setCurrentView('LOBBY_WAITING');
  };

  // Handler for joining an existing session (Challenger - Player O)
  const handleJoinLobby = () => {
    if (!roomCodeInput.trim()) return;
    if (socket) socket.disconnect(); // Safety wipe

    const targetRoom = roomCodeInput.trim().toUpperCase();
    setDynamicSessionId(targetRoom);
    setAssignedMarker('O');

    const newSocket = io(API_BASE, {
      path: '/socket.io',
      query: { room: targetRoom, player: 'O' },
      forceNew: true
    });

    setSocket(newSocket);
    setCurrentView('LOBBY_WAITING');
  };

  // Disconnect cleaner
  const handleDisconnectCleanup = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setLobbyState(null);
    setDynamicSessionId('');
    setAssignedMarker('');
    setChallengerJoined(false);
    setCurrentView('MAIN_MENU');
  };

  const handleHostStartMatch = () => {
    if (!socket || !challengerJoined) return;
    
    // Broadcast trigger signal to the backend server architecture
    socket.emit('start_match', { 
      session_id: dynamicSessionId,
      round_count: roundCount,
      powerups: powerupsEnabled 
    });
    
    /* NOTE: Optimistic navigation removed here. 
      We rely exclusively on the server sending 'match_started' or a 
      'sync_state' broadcast to change views. This guarantees both host 
      and challenger transition to the Arena simultaneously.
    */
  };

  return (
    <div className="app-root-container">
      {currentView === 'MAIN_MENU' && (
        <MainMenu 
          setCurrentView={setCurrentView} 
          setIsSettingsOpen={setIsSettingsOpen} 
          animSpeed={animSpeed} 
        />
      )}

      {currentView === 'TUTORIAL' && (
        <TutorialArena 
          animSpeed={animSpeed}
          onExitToMenu={() => setCurrentView('MAIN_MENU')}
        />
      )}

        {currentView === 'ROUND_MENU' && (
          <Lobby 
            onConnect={handleConnect}
            isConnected={!!socket}
            isHost={isHost}
            challengerJoined={challengerJoined}
            onStartGame={handleStartGame}
            roomCode={roomCodeInput}
            onCancel={() => setCurrentView('MAIN_MENU')}
          />
        )}

      {currentView === 'ARENA' && (
        <Arena 
          socket={socket}
          setIsSettingsOpen={setIsSettingsOpen}
          setIsRulesOpen={setIsRulesOpen}
          initialGameState={lobbyState}
          sessionId={dynamicSessionId}
          playerMarker={assignedMarker}
          roundCount={roundCount}
          powerupsEnabled={powerupsEnabled}
          activePowerup={activePowerup}
          onExitToMenu={handleDisconnectCleanup}
          animSpeed={animSpeed}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          difficulty={difficulty} setDifficulty={setDifficulty}
          animSpeed={animSpeed} setAnimSpeed={setAnimSpeed}
          volume={volume} setVolume={setVolume}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isRulesOpen && <RulesModal onClose={() => setIsRulesOpen(false)} />}
    </div>
  );
};

export default App;
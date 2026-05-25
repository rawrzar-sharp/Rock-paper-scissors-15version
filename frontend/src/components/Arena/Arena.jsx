import React, { useState, useEffect, useMemo, useRef } from 'react'; 
import { io } from 'socket.io-client';
import './Arena.css';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const Arena = ({
  sessionId,
  playerMarker,
  roundCount,
  powerupsEnabled,
  activePowerup,
  onExitToMenu,
  animSpeed = 'Neutral',
}) => {
  const GESTURES = useMemo(() => [
    { name: 'Rock', color: '#ecc94b', emoji: '🪨' },
    { name: 'Fire', color: '#f56565', emoji: '🔥' },
    { name: 'Scissors', color: '#4299e1', emoji: '✂️' },
    { name: 'Snake', color: '#ed64a6', emoji: '🐍' },
    { name: 'Human', color: '#9f7aea', emoji: '🧍' },
    { name: 'Tree', color: '#48bb78', emoji: '🌳' },
    { name: 'Wolf', color: '#805ad5', emoji: '🐺' },
    { name: 'Sponge', color: '#38b2ac', emoji: '🧽' },
    { name: 'Paper', color: '#ed8936', emoji: '📄' },
    { name: 'Air', color: '#a0aec0', emoji: '💨' },
    { name: 'Water', color: '#667eea', emoji: '💧' },
    { name: 'Dragon', color: '#e53e3e', emoji: '🐉' },
    { name: 'Devil', color: '#c53030', emoji: '😈' },
    { name: 'Lightning', color: '#d69e2e', emoji: '⚡' },
    { name: 'Gun', color: '#4a5568', emoji: '🔫' }
  ], []);

  const [socket, setSocket] = useState(null);
  const [selectedGestures, setSelectedGestures] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [clashAnnouncement, setClashAnnouncement] = useState('CONNECTING TO BATTLE ENGINE...');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMoveLocked, setIsMoveLocked] = useState(false);
  const [actionLogs, setActionLogs] = useState([]);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [availablePowerups, setAvailablePowerups] = useState([]);
  const [activatedPowerup, setActivatedPowerup] = useState(null);
  const [powerupAnimation, setPowerupAnimation] = useState(null);
  
  const wheelRef = useRef(null);
  const opponentMarker = playerMarker === 'X' ? 'O' : 'X';

  const pushLog = (text) => {
    setActionLogs((prev) => [{ id: `${Date.now()}-${Math.random()}`, text }, ...prev]);
  };

  const spinWheel = (duration = 1000) => {
    setIsSpinning(true);
    const spins = 3 + Math.random() * 2; 
    const targetRotation = wheelRotation + (360 * spins);
    setWheelRotation(targetRotation);
    
    setTimeout(() => {
      setIsSpinning(false);
    }, duration);
  };

// Arena.jsx (Update the useEffect block)
useEffect(() => {
  if (!sessionId || !playerMarker) return;

  const newSocket = io(API_BASE, {
    transports: ['websocket'],
    query: {
      room: sessionId,
      player: playerMarker
    }
  });

  newSocket.on('connect', () => {
    console.log('✅ Connected to Battle Engine');
  });

  newSocket.on('sync_state', (data) => {
    // Update your game board state here
    console.log('🔄 State Received:', data);
  });

  return () => newSocket.disconnect();
}, [sessionId, playerMarker]);

  const maxChoices = useMemo(() => {
    if (!gameState) return 1;
    return powerupsEnabled &&
      !gameState.powerup_used?.[playerMarker] &&
      (activatedPowerup === 'Double Selection' || activePowerup === 'Double Selection')
      ? 2
      : 1;
  }, [gameState, powerupsEnabled, playerMarker, activePowerup, activatedPowerup]);

  const handleSelectGesture = (gestureName) => {
    if (!gameState || gameState.is_paused || gameState.game_over || isMoveLocked) return;

    setSelectedGestures((prev) => {
      if (prev.includes(gestureName)) {
        return prev.filter((item) => item !== gestureName);
      }
      if (prev.length < maxChoices) {
        return [...prev, gestureName];
      }
      return [prev[prev.length - 1], gestureName];
    });
  };

  const handleLockMove = () => {
    if (!socket || !socket.connected) {
      setErrorMsg('Cannot lock move: Not connected to server.');
      return;
    }
    if (selectedGestures.length === 0) return;

    const usesPowerup = selectedGestures.length > 1;
    const movePayload = {
      action: 'MOVE',
      marker: playerMarker,
      gestures: selectedGestures,
      use_powerup: usesPowerup,
    };

    if (usesPowerup) {
      pushLog(`USER ${playerMarker === 'X' ? '1' : '2'} uses POWER UP, DOUBLE SELECTION TRIGGERED`);
    }

    socket.emit('player_action', movePayload);
    
    setSelectedGestures([]);
    setIsMoveLocked(true);
    setClashAnnouncement('MOVE TRANSMITTED. WAITING FOR RIVAL CONFIRMATION...');
    spinWheel(500);
  };

  const handleTogglePause = () => {
    if (!socket || !socket.connected) return;
    socket.emit('player_action', { action: 'PAUSE', marker: playerMarker });
  };

  const handleForfeit = () => {
    if (!socket || !socket.connected) return;
    socket.emit('player_action', { action: 'FORFEIT', marker: playerMarker });
    onExitToMenu?.();
  };

  const handlePickupPowerup = (powerup) => {
    setActivatedPowerup(powerup);
    socket.emit('player_action', { 
      action: 'PICKUP_POWERUP', 
      marker: playerMarker,
      powerup: powerup
    });
    
    setAvailablePowerups(prev => prev.filter(p => p !== powerup));
  };

  const renderSegmentedHealthBar = (health, isPlayer = true) => {
    const segments = roundCount;
    const healthPerSegment = 100 / segments;
    const filledSegments = Math.ceil(health / healthPerSegment);
    
    return (
      <div className="segmented-health-container" data-testid={isPlayer ? "player-health-bar" : "opponent-health-bar"}>
        <div className="health-label">
          Health: {health}%
        </div>
        <div className="health-segments">
          {[...Array(segments)].map((_, index) => {
            const isFilled = index < filledSegments;
            const isPartial = index === filledSegments - 1 && health % healthPerSegment !== 0;
            const fillPercentage = isPartial ? ((health % healthPerSegment) / healthPerSegment) * 100 : 100;
            
            return (
              <div 
                key={index} 
                className={`health-segment ${isFilled ? 'filled' : 'empty'}`}
                style={{
                  background: isFilled 
                    ? `linear-gradient(to right, #800000 ${fillPercentage}%, #edf2f7 ${fillPercentage}%)` 
                    : '#edf2f7'
                }}
              >
                {isFilled && '❤️'}
              </div>
            );
          })}
        </div>
        <div className="health-bar-backdrop">
          <div 
            className="health-bar-fill" 
            style={{ width: `${Math.max(0, health)}%` }}
          />
        </div>
      </div>
    );
  };

  if (!gameState) {
    return (
      <div className="arena-loading">
        <p className="loading-text">{clashAnnouncement}</p>
        {errorMsg && <p className="error-text">{errorMsg}</p>}
      </div>
    );
  }

  return (
    <div className="arena-container" data-testid="arena-container">
      <div className="arena-wrapper">
        
        <button
          onClick={handleForfeit}
          className="back-button"
          data-testid="back-button"
        >
          &lt;
        </button>

        <div className="arena-controls">
          <button 
            onClick={handleTogglePause} 
            className="control-button"
            data-testid="pause-button"
          >
            {gameState.is_paused ? '▶ RESUME' : '⏸ PAUSE'}
          </button>
          <button 
            onClick={handleForfeit} 
            className="control-button"
            data-testid="quit-button"
          >
            🏳️ QUIT
          </button>
        </div>

        <div className="arena-main">
          
          {/* LEFT SIDE: PLAYER AREA */}
          <div className="player-area">
            
            <div className="player-health-section">
              <div className="player-name">{gameState.players?.[playerMarker] || 'You'} ({playerMarker})</div>
              {renderSegmentedHealthBar(gameState.health?.[playerMarker] || 0, true)}
            </div>

            {/* Animated Gesture Wheel */}
            <div className="wheel-container">
              <div 
                ref={wheelRef}
                className={`gesture-wheel ${isSpinning ? 'spinning' : ''}`}
                style={{ 
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning ? 'transform 1.5s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
                }}
                data-testid="gesture-wheel"
              >
                {GESTURES.map((g, index) => {
                  const angle = (index * 2 * Math.PI) / GESTURES.length - Math.PI / 2;
                  const radius = 160;
                  const x = Math.round(radius * Math.cos(angle));
                  const y = Math.round(radius * Math.sin(angle));
                  const isSelected = selectedGestures.includes(g.name);

                  return (
                    <button
                      key={g.name}
                      disabled={isMoveLocked}
                      onClick={() => handleSelectGesture(g.name)}
                      className={`gesture-button ${isSelected ? 'selected' : ''}`}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                        background: g.color,
                      }}
                      title={g.name}
                      data-testid={`gesture-${g.name.toLowerCase()}`}
                    >
                      <span className="gesture-emoji">{g.emoji}</span>
                      <span className="gesture-name">{g.name.substring(0, 4)}</span>
                    </button>
                  );
                })}

                <div className="wheel-center">
                  <h2 className="wheel-instruction">
                    {isMoveLocked ? "🔒 Locked" : maxChoices > 1 ? "Choose 2" : "Choose 1"}
                  </h2>
                </div>
              </div>
            </div>

            {/* Power-ups Section */}
            <div className="powerups-section" data-testid="powerups-section">
              <div className="powerups-label">🎁 Power-ups Available</div>
              <div className={`powerups-container ${powerupAnimation || ''}`}>
                {availablePowerups.length > 0 ? (
                  availablePowerups.map((powerup, index) => (
                    <button
                      key={index}
                      onClick={() => handlePickupPowerup(powerup)}
                      className="powerup-button available"
                      data-testid={`powerup-${powerup.toLowerCase().replace(' ', '-')}`}
                    >
                      <span className="powerup-icon">
                        {powerup === 'Double Selection' && '⚔️'}
                        {powerup === 'Shield' && '🛡️'}
                        {powerup === 'Double Damage' && '💥'}
                      </span>
                      <span className="powerup-name">{powerup}</span>
                    </button>
                  ))
                ) : (
                  <div className="no-powerups">
                    {powerupsEnabled ? 'Win rounds to earn powerups!' : 'Powerups disabled'}
                  </div>
                )}
              </div>
              
              {activatedPowerup && (
                <div className="activated-powerup" data-testid="activated-powerup">
                  <span className="activated-label">Active:</span>
                  <span className="activated-name">{activatedPowerup}</span>
                </div>
              )}
            </div>

            <div className="action-area">
              <div className="announcement-text">{clashAnnouncement}</div>
              {!gameState.game_over ? (
                <button
                  disabled={selectedGestures.length === 0 || isMoveLocked}
                  onClick={handleLockMove}
                  className={`lock-button ${selectedGestures.length > 0 && !isMoveLocked ? 'active' : ''}`}
                  data-testid="lock-move-button"
                >
                  {isMoveLocked ? '✓ SUBMITTED' : `CONFIRM (${selectedGestures.length})`}
                </button>
              ) : (
                <div className="game-over-section">
                  <span className="winner-text">
                    {gameState.winner === 'DRAW' ? '🚨 MATCH DRAWN' : `🏆 WINNER: PLAYER ${gameState.winner}`}
                  </span>
                  <button 
                    onClick={onExitToMenu} 
                    className="return-button"
                    data-testid="return-home-button"
                  >
                    RETURN HOME
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDE: OPPONENT AREA */}
          <div className="opponent-area">
            
            <div className="opponent-info">
              <span className="opponent-label">RIVAL OPPONENT</span>
              <h2 className="opponent-name">
                {gameState.players?.[opponentMarker] || 'Rival'} ({opponentMarker})
              </h2>

              {renderSegmentedHealthBar(gameState.health?.[opponentMarker] || 0, false)}
              
              <div className="opponent-points">
                {gameState.points?.[opponentMarker] || 0} PTS
              </div>
            </div>

            <div className="opponent-wheel-preview">
              {GESTURES.slice(0, 7).map((g, index) => {
                const angle = (index * Math.PI) / 6 - Math.PI / 2;
                const radius = 120;
                const x = Math.round(radius * Math.cos(angle));
                const y = Math.round(radius * Math.sin(angle));

                return (
                  <div
                    key={`rival-${index}`}
                    className="opponent-gesture-dot"
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                      background: g.color,
                    }}
                  />
                );
              })}
            </div>

            <div className="opponent-status">
              <span className="status-main">
                {isMoveLocked ? "⏳ Evaluating..." : "✅ Ready!"}
              </span>
              <span className="status-sub">
                {isMoveLocked ? "Processing match data..." : "Awaiting your move..."}
              </span>
            </div>

          </div>

        </div>

        {/* BOTTOM: ACTION LOGS */}
        <div className="action-logs-container" data-testid="action-logs">
          <div className="logs-header">
            <span>⚡ LIVE BATTLE LOGS (WEBSOCKET STREAM)</span>
            <span className="live-indicator">● LIVE</span>
          </div>

          <div className="logs-content">
            {actionLogs.length === 0 ? (
              <span className="logs-empty">Waiting for match operations...</span>
            ) : (
              actionLogs.map((log) => (
                <div key={log.id} className="log-entry">
                  <span className="log-timestamp">[{new Date().toLocaleTimeString()}]</span> {log.text}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Arena;
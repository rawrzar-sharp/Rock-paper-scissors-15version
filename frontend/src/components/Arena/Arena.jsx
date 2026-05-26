import React, { useState, useEffect } from 'react';
import ArenaCircle from './ArenaCircle';
import './Arena.css';

const Arena = ({
  socket,
  setIsSettingsOpen,
  setIsRulesOpen,
  initialGameState,
  sessionId,
  playerMarker,
  powerupsEnabled,
  onExitToMenu,
  animSpeed
}) => {
  const [gameState, setGameState] = useState(initialGameState);
  const [actionLogs, setActionLogs] = useState([]);
  const [clashAnnouncement, setClashAnnouncement] = useState('AWAITING ENGAGEMENT');
  const [shakeScreen, setShakeScreen] = useState(false);
  
  const [stagedGesture, setStagedGesture] = useState(null);
  const [isPowerupArmed, setIsPowerupArmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(35);

  const hasLockedIn = gameState?.selections?.[playerMarker]?.length > 0;
  const bothUnselected = !gameState?.selections?.X?.length && !gameState?.selections?.O?.length;

  // Track opponent token identity cleanly
  const opponentMarker = playerMarker === 'X' ? 'O' : 'X';

  // State synchronization engine
  useEffect(() => {
    if (!socket) return;
    const handleSync = (data) => {
      setGameState(data.state);
      
      if (data.log) {
        setActionLogs((prev) => [{ id: Date.now() + Math.random(), text: data.log }, ...prev].slice(0, 10));
      }
      if (data.clash) {
        setShakeScreen(true);
        setTimeout(() => setShakeScreen(false), 500);
        
        if (data.clash.outcome === 'DRAW' || data.clash.outcome === 'tie') {
          setClashAnnouncement(`DEADLOCK: ${data.clash.move_x.toUpperCase()}`);
        } else {
          setClashAnnouncement(`PLAYER ${data.clash.outcome.replace('_win', '')} STRIKES!`);
        }
      }
    };
    socket.on('sync_state', handleSync);
    return () => socket.off('sync_state', handleSync);
  }, [socket]);

  // Turn reset / round advancement listener
  useEffect(() => {
    if (bothUnselected) {
      setStagedGesture(null);
      setIsPowerupArmed(false);
      setTimeLeft(35);
    }
  }, [bothUnselected]);

  // Precise countdown clock loop
  useEffect(() => {
    if (gameState?.game_over) return;
    if (timeLeft <= 0) {
      if (!hasLockedIn) {
        socket.emit('player_action', {
          action: 'TIMEOUT',
          sessionId,
          marker: playerMarker
        });
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, hasLockedIn, gameState?.game_over, socket, sessionId, playerMarker]);

  // Interactive handler to capture custom powerup selection
  const handlePowerupToggle = (powerupType) => {
    if (hasLockedIn || !powerupsEnabled) return;
    
    // Check if player has already exhausted this specific utility item
    const history = gameState?.used_powerups_history?.[playerMarker] || [];
    if (history.includes(powerupType)) return;

    // Toggle logic or equip choice on the backend
    const currentActive = gameState?.active_powerup?.[playerMarker];
    if (currentActive === powerupType) {
      setIsPowerupArmed(false);
      // Clean backend active slot choice if unselected
      socket.emit('player_action', {
        action: 'PICKUP_POWERUP',
        powerup: null,
        sessionId,
        marker: playerMarker
      });
    } else {
      setIsPowerupArmed(true);
      socket.emit('player_action', {
        action: 'PICKUP_POWERUP',
        powerup: powerupType,
        sessionId,
        marker: playerMarker
      });
    }
  };

  // Turn Commit
  const handleLockInMove = () => {
    if (!stagedGesture || hasLockedIn) return;
    socket.emit('player_action', {
      action: 'MOVE',
      gestures: [stagedGesture],
      use_powerup: isPowerupArmed,
      sessionId,
      marker: playerMarker
    });
  };

  const handleForfeitArena = () => {
    if (window.confirm('Are you sure you want to abandon the match?')) {
      socket.emit('player_action', { action: 'FORFEIT', sessionId, marker: playerMarker });
    }
  };

  // Safe UI Rendering calculations
  const myHealth = gameState?.health?.[playerMarker] ?? 5;
  const oppHealth = gameState?.health?.[opponentMarker] ?? 5;
  const totalRounds = gameState?.max_rounds ?? 5;

  const renderHealthBlocks = (current, total) => {
    return Array.from({ length: total }).map((_, i) => (
      <div 
        key={i} 
        className={`health-bar-segment ${i < current ? 'active-vital' : 'spent-vital'}`} 
      />
    ));
  };

  const AVAILABLE_POWERUPS = ['Shield', 'Double Damage', 'Heal'];

  return (
    <div className={`arena-container ${shakeScreen ? 'arena-screen-shake' : ''}`}>
      
      {/* 1. TOP UTILITY HEADER */}
      <header className="arena-top-nav">
        <div className="nav-group-left">
          <button onClick={() => setIsSettingsOpen(true)} className="nav-control-btn">⚙️ SYS CONFIG</button>
          <button onClick={() => setIsRulesOpen(true)} className="nav-control-btn rules-btn-highlight">📖 GAME RULES</button>
        </div>
        <div className="nav-room-badge">
          ARENA: <span className="room-code-txt">{sessionId}</span>
        </div>
        <div className="nav-group-right">
          <button onClick={handleForfeitArena} className="nav-control-btn forfeit-btn">🏳️ FORFEIT</button>
        </div>
      </header>

      {/* 2. ISOLATED CORE ARENA (WHEEL AND CHRONO ANNOUNCERS) */}
      <main className="arena-center-stage">
        <div className="arena-hud-announcer">
          <div className="ticker-timer-capsule">
            <span className="timer-label">MATCH TIME</span>
            <span className={`timer-clock ${timeLeft <= 10 ? 'imminent-danger' : ''}`}>{timeLeft}s</span>
          </div>
          <h1 className="clash-stream-title">{clashAnnouncement}</h1>
          <div className="player-identity-tag">OPERATING NODE: PLAYER [{playerMarker}]</div>
        </div>

        <div className="wheel-housing-vault">
          <ArenaCircle 
            animSpeed={animSpeed}
            isInteractive={!hasLockedIn && !gameState?.game_over}
            onSelectGesture={setStagedGesture}
            selectedGesture={stagedGesture}
          />
        </div>
      </main>

      {/* 3. CONSOLIDATED COMBAT CONTROL DECK (BOTTOM LAYOUT) */}
      <footer className="arena-control-deck-floor">
        
        {/* ROW 1: STATUS PANELS (HEALTH READOUTS) */}
        <div className="deck-status-row">
          {/* Your Profile Panel */}
          <div className="status-card-panel local-user">
            <div className="status-meta">
              <span className="user-title-tag">PLAYER {playerMarker} (YOU)</span>
              <span className="numeric-hp">{myHealth} / {totalRounds} HP</span>
            </div>
            <div className="health-grid-bar">
              {renderHealthBlocks(myHealth, totalRounds)}
            </div>
          </div>

          {/* Opponent Profile Panel */}
          <div className="status-card-panel rival-user">
            <div className="status-meta">
              <span className="user-title-tag">OPPONENT (PLAYER {opponentMarker})</span>
              <span className="numeric-hp">{oppHealth} / {totalRounds} HP</span>
            </div>
            <div className="health-grid-bar reverse-layout">
              {renderHealthBlocks(oppHealth, totalRounds)}
            </div>
          </div>
        </div>

        {/* ROW 2: INTERACTIVE CONTROLS & LOG TICKER */}
        <div className="deck-interaction-row">
          
          {/* Action Module */}
          <div className="interaction-cell controls-vault">
            {powerupsEnabled && (
              <div className="powerup-button-rack">
                {AVAILABLE_POWERUPS.map((pType) => {
                  const isUsed = gameState?.used_powerups_history?.[playerMarker]?.includes(pType);
                  const isActive = gameState?.active_powerup?.[playerMarker] === pType;
                  return (
                    <button
                      key={pType}
                      disabled={hasLockedIn || isUsed || gameState?.game_over}
                      onClick={() => handlePowerupToggle(pType)}
                      className={`power-node-btn ${isActive ? 'equipped-active' : ''} ${isUsed ? 'spent-node' : ''}`}
                    >
                      <span className="node-indicator"></span>
                      <span className="node-text">{pType.toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="lock-mechanism-bar">
              <button
                className={`deck-trigger-lock-btn ${hasLockedIn ? 'locked-engaged' : stagedGesture ? 'staged-ready' : ''}`}
                onClick={handleLockInMove}
                disabled={!stagedGesture || hasLockedIn || gameState?.game_over}
              >
                {hasLockedIn 
                  ? '🔒 RETRANSMITTING CHOICE...' 
                  : stagedGesture 
                    ? `ENGAGE: ${stagedGesture.toUpperCase()} ${isPowerupArmed ? '[+MODIFIER]' : ''}` 
                    : 'SELECT GESTURE TO ENGAGE'}
              </button>
            </div>
          </div>

          {/* Live Action Logs Module */}
          <div className="interaction-cell ticker-vault">
            <div className="ticker-header-banner">⚡ FEED RECORDINGS</div>
            <div className="ticker-scroller-window">
              {actionLogs.length === 0 ? (
                <div className="ticker-line-void">Systems initialized. Awaiting engagement profiles...</div>
              ) : (
                actionLogs.map((log) => (
                  <div key={log.id} className="ticker-line-entry">
                    <span className="ticker-timestamp">]</span>
                    <span className="ticker-string-body">{log.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </footer>

      {/* 4. GAME OVER OVERLAY TERMINAL */}
      {gameState?.game_over && (
        <div className="terminal-screen-overlay">
          <div className="terminal-box">
            <h2 className="terminal-header">MATCH TERMINATED</h2>
            <p className="terminal-winner">
              <span>{gameState.winner === 'DRAW' ? '🚨 MUTUAL DESTRUCTION' : `🏆 VICTOR OUTCOME: PLAYER ${gameState.winner}`}</span>
            </p>
            <button onClick={onExitToMenu} className="terminal-return-btn">DISCONNECT LOBBY FEED</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Arena;
import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

const Arena = ({
  sessionId,
  playerMarker,
  roundCount,
  powerupsEnabled,
  activePowerup,
  onExitToMenu,
  animSpeed, // Kept in props in case you route it to other child components later
}) => {
  const GESTURES = useMemo(() => [
    { name: 'Rock', color: '#ecc94b' },
    { name: 'Fire', color: '#f56565' },
    { name: 'Scissors', color: '#4299e1' },
    { name: 'Snake', color: '#ed64a6' },
    { name: 'Human', color: '#9f7aea' },
    { name: 'Tree', color: '#ed8936' },
    { name: 'Wolf', color: '#48bb78' },
    { name: 'Sponge', color: '#38b2ac' },
    { name: 'Paper', color: '#ecc94b' },
    { name: 'Air', color: '#a0aec0' },
    { name: 'Water', color: '#667eea' },
    { name: 'Dragon', color: '#e53e3e' },
    { name: 'Devil', color: '#319795' },
    { name: 'Lightning', color: '#d69e2e' },
    { name: 'Gun', color: '#4a5568' }
  ], []);

  const [socket, setSocket] = useState(null);
  const [selectedGestures, setSelectedGestures] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [clashAnnouncement, setClashAnnouncement] = useState('CONNECTING TO BATTLE ENGINE...');
  const [errorMsg, setErrorMsg] = useState('');
  
  // State for streaming historical RabbitMQ action events down in the logging console
  const [actionLogs, setActionLogs] = useState([]);

  // Helper to safely append logs with unique React IDs to prevent rendering bugs
  const pushLog = (text) => {
    setActionLogs((prev) => [{ id: `${Date.now()}-${Math.random()}`, text }, ...prev]);
  };

  const opponentMarker = playerMarker === 'X' ? 'O' : 'X';

  useEffect(() => {
    if (!sessionId || !playerMarker) return;

    const ws = new WebSocket(`${WS_BASE}/api/rps15/ws/${sessionId}/${playerMarker}`);
    setSocket(ws);

    ws.onopen = () => {
      setClashAnnouncement('CONNECTED TO LIVE REPLICATOR. LOCK SELECTIONS.');
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      
      if (payload.state) {
        setGameState(payload.state);
      }

      // Check if there is an explicit RabbitMQ style log message or event breakdown payload
      if (payload.log) {
        pushLog(payload.log);
      }

      if (payload.clash) {
        const isMeX = playerMarker === 'X';
        let customLog = "";

        if (payload.clash.outcome === 'X_win') {
          const banner = isMeX ? "HIT! You beat your opponent!" : "MISS! Opponent struck through your defense!";
          setClashAnnouncement(banner);
          customLog = `USER X attacks USER O and HIT, USER O DOWN Health`;
        } else if (payload.clash.outcome === 'O_win') {
          const banner = isMeX ? "MISS! Opponent countered your strike!" : "HIT! You countered your opponent!";
          setClashAnnouncement(banner);
          customLog = `USER O attacks USER X and HIT, USER X DOWN Health`;
        } else {
          setClashAnnouncement('SYMMETRICAL TIE! Systems locked.');
          customLog = `USER X and USER O tied their gesture sequence battle.`;
        }
        
        // Fallback live logger if backend doesn't broadcast custom log frames directly
        if (!payload.log) {
          pushLog(customLog);
        }
      }
    };

    ws.onerror = () => {
      setErrorMsg('WebSocket connection encountered a critical failure.');
    };

    ws.onclose = () => {
      setClashAnnouncement('DISCONNECTED FROM ARENA HOST.');
    };

    return () => {
      ws.close();
    };
  }, [sessionId, playerMarker]);

  const maxChoices = useMemo(() => {
    if (!gameState) return 1;
    return powerupsEnabled &&
      !gameState.powerup_used?.[playerMarker] &&
      (gameState.active_powerup_type === 'Double Selection' || activePowerup === 'Double Selection')
      ? 2
      : 1;
  }, [gameState, powerupsEnabled, playerMarker, activePowerup]);

  const handleSelectGesture = (gestureName) => {
    if (!gameState || gameState.is_paused || gameState.game_over) return;

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
    if (!socket || socket.readyState !== WebSocket.OPEN) {
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

    // Pre-log powerup actions dynamically if triggered
    if (usesPowerup) {
      pushLog(`USER ${playerMarker === 'X' ? '1' : '2'} uses POWER UP, DOUBLE SELECTION TRIGGERED`);
    }

    socket.send(JSON.stringify(movePayload));
    setSelectedGestures([]);
  };

  const handleTogglePause = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ action: 'PAUSE', marker: playerMarker }));
  };

  const handleForfeit = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ action: 'FORFEIT', marker: playerMarker }));
    onExitToMenu?.();
  };

  if (!gameState) {
    return (
      <div style={{ backgroundColor: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' }}>
        <p style={{ color: '#2d3748', fontWeight: 'bold' }}>{clashAnnouncement}</p>
        {errorMsg && <p style={{ color: '#e53e3e' }}>{errorMsg}</p>}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', width: '100%', padding: '20px 0', boxSizing: 'border-box', color: '#000', fontFamily: '"Courier New", Courier, monospace' }}>
      
      {/* Centered Main Layout Grid Box */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', border: '2px solid #000', padding: '15px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {/* Back navigation button */}
        <button 
          onClick={handleForfeit}
          style={{ position: 'absolute', top: '15px', left: '15px', background: '#e2e8f0', border: '1px solid #000', padding: '10px 15px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold', zIndex: 20 }}
        >
          &lt;
        </button>

        {/* Top Header Controls / Utility Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
          <button onClick={handleTogglePause} style={{ padding: '5px 12px', border: '1px solid #000', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
            {gameState.is_paused ? '▶ RESUME' : '⏸ PAUSE'}
          </button>
          <button onClick={handleForfeit} style={{ padding: '5px 12px', border: '1px solid #000', background: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>
            🏳️ QUIT
          </button>
        </div>

        {/* Arena Workspace Split: Left Combat Arena vs Right Rival Sidebar */}
        <div style={{ display: 'flex', borderTop: '2px solid #000', minHeight: '520px' }}>
          
          {/* LEFT SIDE: MAIN PLAYER RING AREA */}
          <div style={{ flex: '2', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', borderRight: '2px solid #000', position: 'relative', overflow: 'hidden' }}>
            
            {/* Self Health status header tracking */}
            <div style={{ width: '100%', textAlign: 'center', marginBottom: '10px', position: 'relative', zIndex: 10 }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Health Bar ({gameState.players?.[playerMarker] || 'You'})</div>
              <div style={{ width: '100%', height: '14px', background: '#edf2f7', border: '1px solid #000', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(0, gameState.health?.[playerMarker] || 0)}%`, height: '100%', background: '#800000', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>

            {/* Main Circle Component Wrapper */}
            <div style={{ position: 'relative', width: '380px', height: '380px', margin: '20px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              
              {/* Dynamic Absolute Coordinates Ring Layout */}
              {GESTURES.map((g, index) => {
                const angle = (index * 2 * Math.PI) / GESTURES.length - Math.PI / 2;
                const radius = 160;
                const x = Math.round(radius * Math.cos(angle));
                const y = Math.round(radius * Math.sin(angle));
                const isSelected = selectedGestures.includes(g.name);

                return (
                  <button
                    key={g.name}
                    onClick={() => handleSelectGesture(g.name)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      margin: '-25px 0 0 -25px', // Perfectly centers the 50x50 button over its coordinate
                      transform: `translate(${x}px, ${y}px)`,
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: g.color,
                      border: isSelected ? '4px solid #000' : '2px solid #4a5568',
                      boxShadow: isSelected ? '0 0 12px rgba(0,0,0,0.6)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      color: '#000',
                      zIndex: 10
                    }}
                    title={g.name}
                  >
                    {g.name.substring(0, 5)}
                  </button>
                );
              })}

              {/* Circle Center Display Console */}
              <div style={{ textAlign: 'center', zIndex: 2 }}>
                <h2 style={{ fontSize: '28px', margin: '0 0 5px 0', letterSpacing: '1px' }}>
                  {maxChoices > 1 ? "Choose two" : "Choose one"}
                </h2>
                
                {/* Active Match Power-up Selection Badges */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#718096', marginBottom: '4px' }}>Power up</div>
                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '10px', padding: '3px 6px', border: '1px solid #000', background: activePowerup === 'Double Selection' ? '#cbd5e0' : '#fff' }}>Double Selection</span>
                    <span style={{ fontSize: '10px', padding: '3px 6px', border: '1px solid #000', background: activePowerup === 'Shield' ? '#cbd5e0' : '#fff' }}>Shield</span>
                    <span style={{ fontSize: '10px', padding: '3px 6px', border: '1px solid #000', background: activePowerup === 'Double Damage' ? '#cbd5e0' : '#fff' }}>Double Damage</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Form Action Buttons */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', position: 'relative', zIndex: 10 }}>
              <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#4a5568' }}>{clashAnnouncement}</div>
              {!gameState.game_over ? (
                <button
                  disabled={selectedGestures.length === 0}
                  onClick={handleLockMove}
                  style={{ padding: '8px 24px', background: selectedGestures.length === 0 ? '#cbd5e0' : '#000', color: selectedGestures.length === 0 ? '#718096' : '#fff', border: 'none', fontWeight: 'bold', cursor: selectedGestures.length === 0 ? 'not-allowed' : 'pointer', width: '200px' }}
                >
                  CONFIRM ({selectedGestures.length})
                </button>
              ) : (
                <div style={{ textAlign: 'center', border: '1px dashed #000', padding: '10px', width: '100%' }}>
                  <span style={{ fontWeight: 'bold', marginRight: '10px' }}>
                    {gameState.winner === 'DRAW' ? '🚨 MATCH DRAWN' : `🏆 WINNER: PLAYER ${gameState.winner}`}
                  </span>
                  <button onClick={onExitToMenu} style={{ padding: '4px 12px', background: '#fff', border: '1px solid #000', cursor: 'pointer' }}>
                    RETURN HOME
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDE: RIVAL SIDEBAR LAYOUT */}
          <div style={{ flex: '1', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            
            {/* Opponent Profile Identity card header */}
            <div style={{ textAlign: 'right', position: 'relative', zIndex: 10 }}>
              <span style={{ fontSize: '12px', color: '#718096', display: 'block' }}>RIVAL OPPONENT</span>
              <h2 style={{ fontSize: '26px', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {gameState.players?.[opponentMarker] || 'Rival'} ({opponentMarker})
              </h2>
              
              {/* Rival Health Bar */}
              <div style={{ width: '100%', height: '14px', background: '#edf2f7', border: '1px solid #000', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ width: `${Math.max(0, gameState.health?.[opponentMarker] || 0)}%`, height: '100%', background: '#800000', float: 'right', transition: 'width 0.3s ease' }}></div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{gameState.points?.[opponentMarker] || 0} PTS</span>
            </div>

            {/* Partial Right Arch decorative circle matching layout image context */}
            <div style={{ position: 'absolute', right: '-100px', top: '50%', transform: 'translateY(-50%)', width: '240px', height: '240px', border: '1px dashed #cbd5e0', borderRadius: '50%', pointerEvents: 'none', zIndex: 1 }}>
              {GESTURES.slice(0, 7).map((g, index) => {
                const angle = (index * Math.PI) / 6 - Math.PI / 2; // Semi-circle spread
                const radius = 120;
                const x = Math.round(radius * Math.cos(angle));
                const y = Math.round(radius * Math.sin(angle));
                
                return (
                  <div 
                    key={`rival-${index}`} 
                    style={{ 
                      position: 'absolute', 
                      top: '50%', 
                      left: '50%',
                      margin: '-12px 0 0 -12px', 
                      transform: `translate(${x}px, ${y}px)`, 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: g.color,
                      border: '1px solid #718096' 
                    }} 
                  />
                );
              })}
            </div>

            {/* Dynamic Status / Action triggers */}
            <div style={{ textAlign: 'center', marginBottom: '30px', zIndex: 10, position: 'relative' }}>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#e53e3e', display: 'block' }}>
                Ready!
              </span>
              <span style={{ fontSize: '11px', color: '#718096' }}>Waiting for system lock confirmation...</span>
            </div>

          </div>

        </div>

        {/* BOTTOM BOX: RABBITMQ LIVE EMULATED AMQP CONSOLE ACTION LOGS */}
        <div style={{ marginTop: '15px', border: '2px solid #000', background: '#000', color: '#00ff00', padding: '12px', fontFamily: '"Courier New", monospace', fontSize: '13px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #00ff00', paddingBottom: '4px', marginBottom: '8px', color: '#fff', fontWeight: 'bold' }}>
            <span>⚡ RABBITMQ AMQP STREAMING LOGS (QUEUE: rps15.battle.actions)</span>
            <span style={{ color: '#00ff00' }}>● LIVE</span>
          </div>
          
          <div style={{ maxHeight: '140px', minHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
            {actionLogs.length === 0 ? (
              <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>[Waiting for match operations to invoke message brokers...]</span>
            ) : (
              actionLogs.map((log) => (
                <div key={log.id} style={{ whiteSpace: 'pre-wrap' }}>
                  <span style={{ color: '#fff' }}>[{new Date().toLocaleTimeString()}]</span> {log.text}
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
import React, { useState } from 'react';
import './Lobby.css'; 

const Lobby = ({ onConnect, isConnected, isHost, challengerJoined, onStartGame, roomCode, onCancel }) => {
  const [inputCode, setInputCode] = useState('');
  const [isHovered, setIsHovered] = useState(null);

  // Re-architected Structured Landscape Background Component
  const HabitatBackground = () => (
    <div className="habitat-container">
      {/* Upper Atmospheric Layer */}
      <div className="zone-sky">
        <div className="habitat-element dragon">🐉</div>
        <div className="habitat-element cloud-lightning">☁️⚡</div>
        <div className="habitat-element wind">💨</div>
      </div>
      
      {/* Ground Foundation Layer */}
      <div className="zone-land">
        <div className="habitat-element tree-1">🌲</div>
        <div className="habitat-element tree-2">🌲</div>
        <div className="habitat-element rock">🪨</div>
        <div className="habitat-element human">🧍</div>
        <div className="habitat-element wolf">🐺</div>
        <div className="habitat-element devil">😈</div>
        <div className="habitat-element snake">🐍</div>
        <div className="habitat-element fire">🔥</div>

        {/* Dedicated Circular Lake Zone */}
        <div className="zone-lake">
          <div className="lake-water-cluster">
            <span className="water-emoji wave-1">🌊</span>
            <span className="water-emoji wave-2">🌊</span>
            <span className="water-emoji wave-3">🌊</span>
          </div>
        </div>
      </div>
    </div>
  );

  // VIEW 1: ENTER ROOM CODE
  if (!isConnected) {
    return (
      <div className="lobby-container blue-theme">
        <div className="grid-overlay"></div>
        <HabitatBackground />
        
        <div className="lobby-box">
          <div className="decorative-header">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          
          <h2 className="glitch-text">MULTIPLAYER ARENA</h2>
          <p className="subtitle">SECURE CONNECTION REQUIRED</p>
          
          <div className="input-wrapper">
            <input
              type="text"
              className="room-input"
              placeholder="ENTER SECURE CODE"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={10}
            />
            <div className="input-glow"></div>
          </div>
          
          <div className="button-group">
            <button 
              className="btn-lobby host-btn" 
              onClick={() => onConnect(inputCode, 'X')}
              disabled={!inputCode}
              onMouseEnter={() => setIsHovered('host')}
              onMouseLeave={() => setIsHovered(null)}
            >
              HOST PROTOCOL
            </button>
            <button 
              className="btn-lobby join-btn" 
              onClick={() => onConnect(inputCode, 'O')}
              disabled={!inputCode}
              onMouseEnter={() => setIsHovered('join')}
              onMouseLeave={() => setIsHovered(null)}
            >
              JOIN MATRIX
            </button>
          </div>
          <button className="btn-cancel" onClick={onCancel}>CANCEL</button>
        </div>
      </div>
    );
  }

  // VIEW 2: WAITING LOBBY
  return (
    <div className="lobby-container blue-theme">
      <div className="grid-overlay"></div>
      <HabitatBackground />

      <div className="lobby-box">
        <div className="decorative-header">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
        
        <div className="status-header">
          <h2>UPLINK ESTABLISHED</h2>
          <div className="room-badge">ROOM: {roomCode}</div>
        </div>
        
        <div className="status-board">
          {isHost ? (
            <>
              <h3 className="role-text highlight-blue">HOST PROTOCOL ACTIVE [ PLAYER X ]</h3>
              {challengerJoined ? (
                <div className="ready-state fade-in">
                  <div className="radar-ping success"></div>
                  <p className="success-text">CHALLENGER DETECTED</p>
                  <button className="btn-lobby start-btn engage-pulse" onClick={onStartGame}>
                    ENGAGE DRIVE MATRIX
                  </button>
                </div>
              ) : (
                <div className="waiting-state">
                  <div className="radar-ping scanning"></div>
                  <p className="pulse-text">SCANNING FOR CHALLENGER...</p>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="role-text highlight-cyan">CHALLENGER PROTOCOL ACTIVE [ PLAYER O ]</h3>
              <div className="ready-state fade-in">
                <div className="radar-ping success"></div>
                <p className="success-text">SYNCHRONIZED WITH HOST</p>
                <p className="pulse-text mt-4">AWAITING MATRIX ENGAGEMENT...</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
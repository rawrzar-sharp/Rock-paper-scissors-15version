import React from 'react';
import './ArenaSettings.css';

const ArenaSettings = ({
  animSpeed,
  setAnimSpeed,
  volume,
  setVolume,
  sfxEnabled,
  setSfxEnabled,
  onClose,
}) => {
  return (
    <div className="arena-modal-overlay arena-blur">
      <div className="arena-modal-content">
        <div className="arena-modal-header">
          <div className="terminal-ping"></div>
          <h3>COCKPIT CONFIGURATION</h3>
        </div>
        
        <hr className="arena-divider" />

        {/* 1. TACTICAL SFX FEED (Replaced Bot Difficulty) */}
        <div className="arena-setting-group">
          <label>TACTICAL SFX ENGINE</label>
          <div className="arena-toggle-group">
            <button
              className={`arena-btn ${sfxEnabled ? 'active-cyan' : ''}`}
              onClick={() => setSfxEnabled(true)}
            >
              ENGAGED
            </button>
            <button
              className={`arena-btn ${!sfxEnabled ? 'active-red' : ''}`}
              onClick={() => setSfxEnabled(false)}
            >
              MUTED
            </button>
          </div>
        </div>

        {/* 2. ANIMATION SPEED */}
        <div className="arena-setting-group">
          <label>MATRIX ANIMATION SPEED</label>
          <div className="arena-toggle-group">
            <button
              className={`arena-btn ${animSpeed === 'Low' ? 'active-blue' : ''}`}
              onClick={() => setAnimSpeed('Low')}
            >
              LOW
            </button>
            <button
              className={`arena-btn ${animSpeed === 'Neutral' ? 'active-blue' : ''}`}
              onClick={() => setAnimSpeed('Neutral')}
            >
              NEUTRAL
            </button>
            <button
              className={`arena-btn ${animSpeed === 'High' ? 'active-blue' : ''}`}
              onClick={() => setAnimSpeed('High')}
            >
              MAX OVERDRIVE
            </button>
          </div>
        </div>

        {/* 3. MASTER VOLUME */}
        <div className="arena-setting-group">
          <label>MASTER DECK VOLUME</label>
          <div className="arena-toggle-group">
            <button
              className={`arena-btn ${volume === 'Low' ? 'active-blue' : ''}`}
              onClick={() => setVolume('Low')}
            >
              MIN
            </button>
            <button
              className={`arena-btn ${volume === 'Neutral' ? 'active-blue' : ''}`}
              onClick={() => setVolume('Neutral')}
            >
              MID
            </button>
            <button
              className={`arena-btn ${volume === 'High' ? 'active-blue' : ''}`}
              onClick={() => setVolume('High')}
            >
              MAX
            </button>
          </div>
        </div>

        <button className="arena-btn-save" onClick={onClose}>
          COMMIT CONFIG CHANGES
        </button>
      </div>
    </div>
  );
};

export default ArenaSettings;
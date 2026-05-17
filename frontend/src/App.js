import React, { useState } from 'react';
import './styles.css';

const MainMenu = () => {
  const [currentView, setCurrentView] = useState('MAIN_MENU'); // 'MAIN_MENU' or 'ROUND_MENU'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  
  // Settings States
  const [difficulty, setDifficulty] = useState('Easy');
  const [animSpeed, setAnimSpeed] = useState('Neutral');
  const [volume, setVolume] = useState('Neutral');

  // Round Menu States
  const [roundCount, setRoundCount] = useState(5);
  const [powerupsEnabled, setPowerupsEnabled] = useState(true);
  const [activePowerup, setActivePowerup] = useState('Double Selection'); // Interactive selection

  const handSigns = Array.from({ length: 15 });

  // Shared circular ring component to avoid redundancy
  const renderRotatingCircle = (isMini = false) => {
    const radius = isMini ? 160 : 260; // Scale down circle for the setup menu layout
    return (
      <div className={`circle-container ${isMini ? 'mini-ring' : ''} ${animSpeed === 'Low' ? 'slow' : animSpeed === 'High' ? 'fast' : ''}`}>
        {handSigns.map((_, index) => {
          const angle = (index / 15) * 360;
          const handNumber = index + 1;
          const imgSrc = `/hand${handNumber}.png`;

          return (
            <div
              key={index}
              className="hand-icon-wrapper"
              style={{ transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)` }}
            >
              <img className="hand-icon" src={imgSrc} alt={`hand ${handNumber}`} draggable={false} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="main-container">
      
      {/* VIEW 1: MAIN MENU */}
      {currentView === 'MAIN_MENU' && (
        <>
          {renderRotatingCircle(false)}

          <div className="title-container">
            <h1>ROCK<br/>PAPER<br/>SCISSORS</h1>
            <h2>V15</h2>
          </div>

          <div className="nav-buttons">
            <button className="btn btn-settings" onClick={() => setIsSettingsOpen(true)}>Settings</button>
            <button className="btn btn-play" onClick={() => setCurrentView('ROUND_MENU')}>PLAY</button>
            <button className="btn btn-practice">Practice (Bot)</button>
          </div>
        </>
      )}

      {/* VIEW 2: ROUND SETUP MENU */}
      {currentView === 'ROUND_MENU' && (
        <div className="round-menu-workspace fade-in">
          {/* Top-Left Back Arrow Navigation */}
          <button className="back-arrow-btn" onClick={() => setCurrentView('MAIN_MENU')}>
            &#x2190;
          </button>

          <div className="round-menu-split">
            {/* Left Column: Graphics + Action */}
            <div className="split-left">
              <div className="circle-display-frame">
                {renderRotatingCircle(true)}
              </div>
              <button className="btn btn-rules-trigger" onClick={() => setIsRulesOpen(true)}>
                Game Rules
              </button>
            </div>

            {/* Right Column: Game Setup Parameters */}
            <div className="split-right">
              <h2 className="workspace-title">Round Menu</h2>

              {/* Parameter 1: Match Rounds Configuration */}
              <div className="setup-card">
                <div className="setup-card-header">
                  <label className="section-label">Match Duration</label>
                  <span className="stat-hint">
                    {roundCount === 1 ? '⚡ 1x Health Bar (Sudden Death)' : `❤️ ${roundCount} Rounds (Max Health)`}
                  </span>
                </div>
                <div className="counter-selector">
                  <button 
                    disabled={roundCount <= 1} 
                    onClick={() => setRoundCount(prev => prev - 1)}
                    className="counter-btn"
                  >
                    &#x276E;
                  </button>
                  <div className="counter-display">{roundCount}</div>
                  <button 
                    disabled={roundCount >= 5} 
                    onClick={() => setRoundCount(prev => prev + 1)}
                    className="counter-btn"
                  >
                    &#x276F;
                  </button>
                </div>
              </div>

              {/* Parameter 2: Power-Ups Configuration */}
              <div className="setup-card">
                <div className="setup-card-header-toggle">
                  <label className="section-label">Enable Power-ups</label>
                  <label className="switch-container">
                    <input 
                      type="checkbox" 
                      checked={powerupsEnabled} 
                      onChange={(e) => setPowerupsEnabled(e.target.checked)} 
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>

                {powerupsEnabled && (
                  <div className="powerup-options-grid grid-pop">
                    
                    <div 
                      className={`powerup-node ${activePowerup === 'Double Selection' ? 'selected green-glow' : ''}`}
                      onClick={() => setActivePowerup('Double Selection')}
                    >
                      <div className="node-badge green-badge">Double Selection</div>
                      <p>Allows users to have double signs that align and attack the rival.</p>
                      <span className="node-modifier text-green">+2x Damage</span>
                    </div>

                    <div 
                      className={`powerup-node ${activePowerup === 'Shield' ? 'selected blue-glow' : ''}`}
                      onClick={() => setActivePowerup('Shield')}
                    >
                      <div className="node-badge blue-badge">Shield</div>
                      <p>Shields user perfectly from an incoming Rival elemental attack sequence.</p>
                      <span className="node-modifier text-blue">+1x Protection</span>
                    </div>

                    <div 
                      className={`powerup-node ${activePowerup === 'Double Damage' ? 'selected red-glow' : ''}`}
                      onClick={() => setActivePowerup('Double Damage')}
                    >
                      <div className="node-badge red-badge">Double Damage</div>
                      <p>Inflicts double damage using a single sign. Overridden if attack misses.</p>
                      <span className="node-modifier text-red">Critical Hit</span>
                    </div>

                  </div>
                )}
              </div>

              {/* Core Final Battle Action Button */}
              <button className="btn btn-battle-start" onClick={() => alert('Launching Arena...')}>
                ENTER ARENA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CORE MODAL 1: SETTINGS */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Settings</h3>
            <div className="setting-group">
              <label>Bot mode Difficulty</label>
              <div className="toggle-group">
                <button className={difficulty === 'Easy' ? 'active green' : ''} onClick={() => setDifficulty('Easy')}>Easy</button>
                <button className={difficulty === 'Medium' ? 'active yellow' : ''} onClick={() => setDifficulty('Medium')}>Medium</button>
                <button className={difficulty === 'Hard' ? 'active red' : ''} onClick={() => setDifficulty('Hard')}>Hard</button>
              </div>
            </div>
            <div className="setting-group">
              <label>Animation Speed</label>
              <div className="toggle-group">
                <button className={animSpeed === 'Low' ? 'active green' : ''} onClick={() => setAnimSpeed('Low')}>Low</button>
                <button className={animSpeed === 'Neutral' ? 'active yellow' : ''} onClick={() => setAnimSpeed('Neutral')}>Neutral</button>
                <button className={animSpeed === 'High' ? 'active red' : ''} onClick={() => setAnimSpeed('High')}>High</button>
              </div>
            </div>
            <div className="setting-group">
              <label>Audio Volume</label>
              <div className="toggle-group">
                <button className={volume === 'Low' ? 'active green' : ''} onClick={() => setVolume('Low')}>Low</button>
                <button className={volume === 'Neutral' ? 'active yellow' : ''} onClick={() => setVolume('Neutral')}>Neutral</button>
                <button className={volume === 'High' ? 'active red' : ''} onClick={() => setVolume('High')}>High</button>
              </div>
            </div>
            <button className="btn btn-save" onClick={() => setIsSettingsOpen(false)}>Save</button>
          </div>
        </div>
      )}

      {/* CORE MODAL 2: GAME RULES OVERLAY */}
      {isRulesOpen && (
        <div className="modal-overlay backend-blur">
          <div className="modal-content rules-modal-expanded">
            <h3 className="rules-heading">Game Rules</h3>
            <div className="rules-split-layout">
              <div className="rules-infographic-left">
                {/* Re-rendering scaled circle layout inside rules to hint relationship mechanics */}
                {renderRotatingCircle(true)}
                <div className="ring-overlay-text">15-Way Multi-Hand Matrix</div>
              </div>
              <div className="rules-text-right">
                <ol className="rules-list">
                  <li>Icons pointed to by vectors are defeated, while icons pointing outward are dominant. <br/><span className="rules-highlight">Example: Gun &gt; Sponge, Water &gt; Fire, Tree &gt; Devil.</span></li>
                  <li>Power-ups are high-tactical items and can only be triggered <strong>once per match turn</strong>.</li>
                  <li>Disconnecting or leaving early automatically surrenders victory to the opponent.</li>
                  <li>Both competitors must lock selections and state <strong>'Ready!'</strong> before evaluation.</li>
                  <li>Symmetrical ties resolve cleanly; no health reduction or damage is assigned.</li>
                  <li>Victory is declared for the participant with the highest remaining HP pool.</li>
                  <li>Surviving a round unlocks a calculated random chance to replenish or earn custom power-ups.</li>
                </ol>
              </div>
            </div>
            <button className="btn btn-rules-close" onClick={() => setIsRulesOpen(false)}>
              Continue
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MainMenu;
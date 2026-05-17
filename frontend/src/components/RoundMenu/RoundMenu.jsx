import React from 'react';
import RotatingCircle from '../RotatingCircle/RotatingCircle';
import './roundMenu.css';

const RoundMenu = ({
  setCurrentView,
  setIsRulesOpen,
  roundCount,
  setRoundCount,
  powerupsEnabled,
  setPowerupsEnabled,
  activePowerup,
  setActivePowerup,
  animSpeed,
  onEnterArena,
}) => {
  const handCount = 15;

  return (
    <div className="main-container">
      <div className="round-menu-workspace fade-in">
        {/* Top-Left Back Arrow Navigation */}
        <button className="back-arrow-btn" onClick={() => setCurrentView('MAIN_MENU')}>
          &#x2190;
        </button>

        <div className="round-menu-split">
          {/* Left Column: Graphics + Action */}
          <div className="split-left">
            <div className="circle-display-frame">
              <RotatingCircle animSpeed={animSpeed} isMini={true} handCount={handCount} />
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
                  {roundCount === 1
                    ? '\u26a1 1x Health Bar (Sudden Death)'
                    : `\u2764\ufe0f ${roundCount} Rounds (Max Health)`}
                </span>
              </div>

              <div className="counter-selector">
                <button
                  disabled={roundCount <= 1}
                  onClick={() => setRoundCount((prev) => prev - 1)}
                  className="counter-btn"
                >
                  &#x276E;
                </button>
                <div className="counter-display">{roundCount}</div>
                <button
                  disabled={roundCount >= 5}
                  onClick={() => setRoundCount((prev) => prev + 1)}
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
                    className={`powerup-node ${
                      activePowerup === 'Double Selection'
                        ? 'selected green-glow'
                        : ''
                    }`}
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
                    className={`powerup-node ${
                      activePowerup === 'Double Damage' ? 'selected red-glow' : ''
                    }`}
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
            <button className="btn btn-battle-start" onClick={onEnterArena}>
              ENTER ARENA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoundMenu;


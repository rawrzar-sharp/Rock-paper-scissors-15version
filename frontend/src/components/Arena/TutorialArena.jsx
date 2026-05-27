import React, { useState, useEffect } from 'react';
import ArenaCircle from './ArenaCircle';
import './Arena.css';

// Logika pemenang RPS-15 khusus untuk Bot lokal
const RPS15_WINS = {
  "Rock": ["Fire", "Scissors", "Snake", "Human", "Tree", "Wolf", "Sponge"],
  "Fire": ["Scissors", "Snake", "Human", "Tree", "Wolf", "Sponge", "Paper"],
  "Scissors": ["Snake", "Human", "Tree", "Wolf", "Sponge", "Paper", "Air"],
  "Snake": ["Human", "Tree", "Wolf", "Sponge", "Paper", "Air", "Water"],
  "Human": ["Tree", "Wolf", "Sponge", "Paper", "Air", "Water", "Dragon"],
  "Tree": ["Wolf", "Sponge", "Paper", "Air", "Water", "Dragon", "Devil"],
  "Wolf": ["Sponge", "Paper", "Air", "Water", "Devil", "Lightning", "Gun"],
  "Sponge": ["Paper", "Air", "Water", "Dragon", "Devil", "Lightning", "Gun"],
  "Paper": ["Air", "Water", "Dragon", "Devil", "Lightning", "Gun", "Rock"],
  "Air": ["Water", "Dragon", "Devil", "Lightning", "Gun", "Rock", "Fire"],
  "Water": ["Dragon", "Devil", "Lightning", "Gun", "Rock", "Fire", "Scissors"],
  "Dragon": ["Wolf", "Devil", "Lightning", "Gun", "Rock", "Fire", "Scissors"],
  "Devil": ["Lightning", "Gun", "Rock", "Fire", "Scissors", "Snake", "Human"],
  "Lightning": ["Gun", "Rock", "Fire", "Scissors", "Snake", "Human", "Tree"],
  "Gun": ["Rock", "Fire", "Scissors", "Snake", "Human", "Tree", "Sponge"]
};

const TutorialArena = ({ onExitToMenu, animSpeed }) => {
  const [tutorialStep, setTutorialStep] = useState(0); // 0: Intro, 1: Clash, 2: Powerup, 3: Freeplay
  const [myHealth, setMyHealth] = useState(5);
  const [botHealth, setBotHealth] = useState(5);
  const [stagedGesture, setStagedGesture] = useState(null);
  const [activePowerup, setActivePowerup] = useState(null);
  const [actionLogs, setActionLogs] = useState([{ id: 1, text: "Welcome to the Simulation. Select a gesture to begin." }]);
  const [clashAnnouncement, setClashAnnouncement] = useState('TUTORIAL MODE ENGAGED');
  const [shakeScreen, setShakeScreen] = useState(false);

  const AVAILABLE_POWERUPS = ['Shield', 'Double Damage', 'Heal'];
  const GESTURES = Object.keys(RPS15_WINS);

  const logAction = (msg) => {
    setActionLogs((prev) => [{ id: Date.now(), text: msg }, ...prev].slice(0, 10));
  };

  const handleLockInMove = () => {
    if (!stagedGesture) return;

    // BOT LOGIC: Random Choice & Random Powerup
    const botGesture = GESTURES[Math.floor(Math.random() * GESTURES.length)];
    const botUsesPowerup = Math.random() > 0.6; // 40% chance bot uses a powerup
    const botPowerup = botUsesPowerup ? AVAILABLE_POWERUPS[Math.floor(Math.random() * AVAILABLE_POWERUPS.length)] : null;

    // RESOLUTION LOGIC
    let outcome = '';
    let dmgToMe = 0;
    let dmgToBot = 0;

    if (stagedGesture === botGesture) {
      outcome = 'DRAW';
    } else if (RPS15_WINS[stagedGesture].includes(botGesture)) {
      outcome = 'YOU WIN';
      dmgToBot = 1;
    } else {
      outcome = 'BOT WINS';
      dmgToMe = 1;
    }

    // POWERUP MODIFIERS
    if (activePowerup === 'Double Damage' && outcome === 'YOU WIN') dmgToBot *= 2;
    if (botPowerup === 'Double Damage' && outcome === 'BOT WINS') dmgToMe *= 2;
    if (activePowerup === 'Shield' && outcome === 'BOT WINS') dmgToMe = 0;
    if (botPowerup === 'Shield' && outcome === 'YOU WIN') dmgToBot = 0;
    if (activePowerup === 'Heal') { setMyHealth(h => Math.min(5, h + 1)); dmgToMe = 0; dmgToBot = 0; }
    if (botPowerup === 'Heal') { setBotHealth(h => Math.min(5, h + 1)); dmgToMe = 0; dmgToBot = 0; }

    // APPLY DAMAGE
    setMyHealth(h => Math.max(0, h - dmgToMe));
    setBotHealth(h => Math.max(0, h - dmgToBot));

    // UI UPDATES
    setShakeScreen(true);
    setTimeout(() => setShakeScreen(false), 500);
    setClashAnnouncement(`${outcome}! Bot used ${botGesture.toUpperCase()}`);
    
    let logMsg = `You used [${stagedGesture.toUpperCase()}] ${activePowerup ? `(+${activePowerup})` : ''} vs Bot [${botGesture.toUpperCase()}] ${botPowerup ? `(+${botPowerup})` : ''}.`;
    logAction(logMsg);

    // TUTORIAL PROGRESSION
    if (tutorialStep === 0) {
      setTutorialStep(1);
      logAction("GUIDE: Excellent. Now try using a POWERUP from the left panel before engaging!");
    } else if (tutorialStep === 1 && activePowerup) {
      setTutorialStep(2);
      logAction("GUIDE: Great job using a module! Defeat the Bot to complete the simulation.");
    }

    setStagedGesture(null);
    setActivePowerup(null);
  };

  const isGameOver = myHealth === 0 || botHealth === 0;

  return (
    <div className={`arena-container ${shakeScreen ? 'arena-screen-shake' : ''}`}>
      <header className="arena-top-nav">
        <div className="nav-room-badge">ARENA: <span className="room-code-txt">TUTORIAL_SIM</span></div>
        <button onClick={onExitToMenu} className="nav-control-btn forfeit-btn">LEAVE TUTORIAL</button>
      </header>

      {/* TUTORIAL GUIDE MESSAGE */}
      {tutorialStep < 2 && (
        <div style={{ backgroundColor: 'rgba(0, 255, 255, 0.2)', padding: '10px', textAlign: 'center', color: '#0ff', borderBottom: '1px solid #0ff' }}>
          {tutorialStep === 0 ? "TUTORIAL: Select a gesture from the wheel, then click ENGAGE." : "TUTORIAL: Click a Powerup (like Shield or Double Damage), pick a gesture, and ENGAGE."}
        </div>
      )}

      <main className="arena-center-stage">
        <div className="arena-hud-announcer">
          <h1 className="clash-stream-title">{clashAnnouncement}</h1>
        </div>
        <div className="wheel-housing-vault">
          <ArenaCircle 
            animSpeed={animSpeed}
            isInteractive={!isGameOver}
            onSelectGesture={setStagedGesture}
            selectedGesture={stagedGesture}
          />
        </div>
      </main>

      <footer className="arena-control-deck-floor">
        <div className="deck-status-row">
          <div className="status-card-panel local-user">
            <div className="status-meta"><span>YOU (TRAINEE)</span><span>{myHealth} / 5 HP</span></div>
            <div className="health-grid-bar">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className={`health-bar-segment ${i < myHealth ? 'active-vital' : 'spent-vital'}`} />)}
            </div>
          </div>
          <div className="status-card-panel rival-user">
            <div className="status-meta"><span>BOT (TRAINER)</span><span>{botHealth} / 5 HP</span></div>
            <div className="health-grid-bar reverse-layout">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className={`health-bar-segment ${i < botHealth ? 'active-vital' : 'spent-vital'}`} />)}
            </div>
          </div>
        </div>

        <div className="deck-interaction-row">
          <div className="interaction-cell controls-vault">
            <div className="powerup-button-rack">
              {AVAILABLE_POWERUPS.map((pType) => (
                <button
                  key={pType}
                  disabled={isGameOver}
                  onClick={() => setActivePowerup(activePowerup === pType ? null : pType)}
                  className={`power-node-btn ${activePowerup === pType ? 'equipped-active' : ''}`}
                >
                  <span className="node-text">{pType.toUpperCase()}</span>
                </button>
              ))}
            </div>
            <div className="lock-mechanism-bar">
              <button
                className={`deck-trigger-lock-btn ${stagedGesture ? 'staged-ready' : ''}`}
                onClick={handleLockInMove}
                disabled={!stagedGesture || isGameOver}
              >
                {stagedGesture ? `ENGAGE: ${stagedGesture.toUpperCase()}` : 'SELECT GESTURE'}
              </button>
            </div>
          </div>

          <div className="interaction-cell ticker-vault">
            <div className="ticker-header-banner">⚡ TUTORIAL FEED</div>
            <div className="ticker-scroller-window">
              {actionLogs.map((log) => (
                <div key={log.id} className="ticker-line-entry"><span className="ticker-string-body">{log.text}</span></div>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {isGameOver && (
        <div className="terminal-screen-overlay">
          <div className="terminal-box">
            <h2 className="terminal-header">SIMULATION COMPLETE</h2>
            <p className="terminal-winner">{myHealth > 0 ? '🏆 YOU DEFEATED THE BOT!' : '💀 THE BOT WON. KEEP PRACTICING!'}</p>
            <button onClick={onExitToMenu} className="terminal-return-btn">RETURN TO MENU</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorialArena;
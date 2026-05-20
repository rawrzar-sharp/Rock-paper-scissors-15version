import React, { useState } from 'react';
import MainMenu from './components/MainMenu/MainMenu';
import RoundMenu from './components/RoundMenu/RoundMenu';
import SettingsModal from './components/SettingsModal/SettingsModal';
import RulesModal from './components/RulesModal/RulesModal';
import Arena from './components/Arena/Arena';

import './styles.css';

const App = () => {
  const [currentView, setCurrentView] = useState('MAIN_MENU');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  
  // 1. Initialize variables inside the component scope
  const queryParams = new URLSearchParams(window.location.search);
  const dynamicSessionId = queryParams.get('room') || 'session_1';
  const assignedMarker = queryParams.get('player') || 'X';

  const [difficulty, setDifficulty] = useState('Easy');
  const [animSpeed, setAnimSpeed] = useState('Neutral');
  const [volume, setVolume] = useState('Neutral');
  const [roundCount, setRoundCount] = useState(5);
  const [powerupsEnabled, setPowerupsEnabled] = useState(true);
  const [activePowerup, setActivePowerup] = useState('Double Selection');

  const onEnterArena = () => {
    setCurrentView('ARENA');
  };

  return (
    <>
      {currentView === 'MAIN_MENU' && (
        <MainMenu
          setCurrentView={setCurrentView}
          setIsSettingsOpen={setIsSettingsOpen}
          animSpeed={animSpeed}
        />
      )}

      {currentView === 'ROUND_MENU' && (
        <RoundMenu
          setCurrentView={setCurrentView}
          setIsRulesOpen={setIsRulesOpen}
          roundCount={roundCount}
          setRoundCount={setRoundCount}
          powerupsEnabled={powerupsEnabled}
          setPowerupsEnabled={setPowerupsEnabled}
          activePowerup={activePowerup}
          setActivePowerup={setActivePowerup}
          animSpeed={animSpeed}
          onEnterArena={onEnterArena}
        />
      )}

      {/* 2. Pass the defined variables as props */}
      {currentView === 'ARENA' && (
        <Arena
          sessionId={dynamicSessionId}
          playerMarker={assignedMarker}
          roundCount={roundCount}
          powerupsEnabled={powerupsEnabled}
          activePowerup={activePowerup}
          animSpeed={animSpeed}
          onExitToMenu={() => setCurrentView('MAIN_MENU')}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          animSpeed={animSpeed}
          setAnimSpeed={setAnimSpeed}
          volume={volume}
          setVolume={setVolume}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}


      {isRulesOpen && <RulesModal onClose={() => setIsRulesOpen(false)} />}
    </>
  );
};

export default App;
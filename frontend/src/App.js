import React, { useState } from 'react';
import MainMenu from './components/MainMenu/MainMenu';
import RoundMenu from './components/RoundMenu/RoundMenu';
import SettingsModal from './components/SettingsModal/SettingsModal';
import RulesModal from './components/RulesModal/RulesModal';

import './styles.css';

const App = () => {
  const [currentView, setCurrentView] = useState('MAIN_MENU');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Settings States
  const [difficulty, setDifficulty] = useState('Easy');
  const [animSpeed, setAnimSpeed] = useState('Neutral');
  const [volume, setVolume] = useState('Neutral');

  // Round Menu States
  const [roundCount, setRoundCount] = useState(5);
  const [powerupsEnabled, setPowerupsEnabled] = useState(true);
  const [activePowerup, setActivePowerup] = useState('Double Selection');

  const onEnterArena = () => {
    alert('Launching Arena...');
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


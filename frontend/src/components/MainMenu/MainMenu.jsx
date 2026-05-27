import React from 'react';
import RotatingCircle from '../RotatingCircle/RotatingCircle';
import './mainMenu.css';

const MainMenu = ({ setCurrentView, setIsSettingsOpen, animSpeed }) => {
  return (
    <div className="main-container">
      <>
        <RotatingCircle animSpeed={animSpeed} isMini={false} />

        <div className="title-container">
          <h1>
            ROCK<br />PAPER<br />SCISSORS
          </h1>
          <h2>V15</h2>
        </div>

        <div className="nav-buttons">
          <button className="btn btn-settings" onClick={() => setIsSettingsOpen(true)}>
            Settings
          </button>
          <button className="btn btn-play" onClick={() => setCurrentView('ROUND_MENU')}>
            PLAY Multiplayer
          </button>
          {/* TOMBOL TUTORIAL BARU */}
          <button className="btn btn-practice" onClick={() => setCurrentView('TUTORIAL')}>
            Practice Bot
          </button>
        </div>
      </>
    </div>
  );
};

export default MainMenu;
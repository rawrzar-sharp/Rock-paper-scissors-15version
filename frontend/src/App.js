import React, { useState } from 'react';
import './styles.css';

const MainMenu = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings States
  const [difficulty, setDifficulty] = useState('Easy');
  const [animSpeed, setAnimSpeed] = useState('Neutral');
  const [volume, setVolume] = useState('Neutral');

  // Array of 15 placeholders for your hand signs
  const handSigns = Array.from({ length: 15 });

  return (
    <div className="main-container">
      {/* Background Rotating Circle */}
      <div className={`circle-container ${animSpeed === 'Low' ? 'slow' : animSpeed === 'High' ? 'fast' : ''}`}>
        {handSigns.map((_, index) => {
          // Calculate angle for each item to distribute them evenly in a circle
          const angle = (index / 15) * 360;
          return (
            <div 
              key={index} 
              className="hand-icon-wrapper"
              style={{ transform: `rotate(${angle}deg) translate(250px) rotate(-${angle}deg)` }}
            >
              {/* Replace the div below with an <img> tag pointing to your cropped hand icons */}
              <div className="hand-icon-placeholder">{index + 1}</div>
            </div>
          );
        })}
      </div>

      {/* Center Title */}
      <div className="title-container">
        <h1>ROCK<br/>PAPER<br/>SCISSORS</h1>
        <h2>V15</h2>
      </div>

      {/* Bottom Navigation Buttons */}
      <div className="nav-buttons">
        <button className="btn btn-settings" onClick={() => setIsSettingsOpen(true)}>Settings</button>
        <button className="btn btn-play">PLAY</button>
        <button className="btn btn-practice">Practice (Bot)</button>
      </div>

      {/* Settings Modal */}
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
    </div>
  );
};

export default MainMenu;
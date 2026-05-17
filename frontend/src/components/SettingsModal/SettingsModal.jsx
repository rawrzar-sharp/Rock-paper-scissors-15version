import React from 'react';
import './settingsModal.css';

const SettingsModal = ({
  difficulty,
  setDifficulty,
  animSpeed,
  setAnimSpeed,
  volume,
  setVolume,
  onClose,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Settings</h3>

        <div className="setting-group">
          <label>Bot mode Difficulty</label>
          <div className="toggle-group">
            <button
              className={difficulty === 'Easy' ? 'active green' : ''}
              onClick={() => setDifficulty('Easy')}
            >
              Easy
            </button>
            <button
              className={difficulty === 'Medium' ? 'active yellow' : ''}
              onClick={() => setDifficulty('Medium')}
            >
              Medium
            </button>
            <button
              className={difficulty === 'Hard' ? 'active red' : ''}
              onClick={() => setDifficulty('Hard')}
            >
              Hard
            </button>
          </div>
        </div>

        <div className="setting-group">
          <label>Animation Speed</label>
          <div className="toggle-group">
            <button
              className={animSpeed === 'Low' ? 'active green' : ''}
              onClick={() => setAnimSpeed('Low')}
            >
              Low
            </button>
            <button
              className={animSpeed === 'Neutral' ? 'active yellow' : ''}
              onClick={() => setAnimSpeed('Neutral')}
            >
              Neutral
            </button>
            <button
              className={animSpeed === 'High' ? 'active red' : ''}
              onClick={() => setAnimSpeed('High')}
            >
              High
            </button>
          </div>
        </div>

        <div className="setting-group">
          <label>Audio Volume</label>
          <div className="toggle-group">
            <button
              className={volume === 'Low' ? 'active green' : ''}
              onClick={() => setVolume('Low')}
            >
              Low
            </button>
            <button
              className={volume === 'Neutral' ? 'active yellow' : ''}
              onClick={() => setVolume('Neutral')}
            >
              Neutral
            </button>
            <button
              className={volume === 'High' ? 'active red' : ''}
              onClick={() => setVolume('High')}
            >
              High
            </button>
          </div>
        </div>

        <button className="btn btn-save" onClick={onClose}>
          Save
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;


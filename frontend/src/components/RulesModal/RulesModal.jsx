import React from 'react';
import './rulesModal.css';

const RulesModal = ({ onClose }) => {
  return (
    <div className="modal-overlay backend-blur">
      <div className="modal-content rules-modal-expanded">
        <h3 className="rules-heading">Game Rules</h3>

        <div className="rules-split-layout">
          <div className="rules-infographic-left">
            {/* Replaced rotating circle with circulating image in game rules */}
            <img
              src="/image.png"
              alt="circulating image"
              style={{ width: '100%', maxWidth: '280px', height: 'auto', borderRadius: '12px' }}
              draggable={false}
            />
            <div className="ring-overlay-text">15 Version Rock Paper Scissors</div>
          </div>

          <div className="rules-text-right">
            <ol className="rules-list">
              <li>
                Icons pointed to by vectors are defeated, while icons pointing outward are dominant.
                <br />
                <span className="rules-highlight">
                  Example: Gun {'>'} Sponge, Water {'>'} Fire, Tree {'>'} Devil.
                </span>
              </li>
              <li>
                Power-ups are high-tactical items and can only be triggered <strong>once per match turn</strong>.
              </li>
              <li>Disconnecting or leaving early automatically surrenders victory to the opponent.</li>
              <li>
                Both competitors must lock selections and state <strong>'Ready!'</strong> before evaluation.
              </li>
              <li>Symmetrical ties resolve cleanly; no health reduction or damage is assigned.</li>
              <li>Victory is declared for the participant with the highest remaining HP pool.</li>
              <li>Surviving a round unlocks a calculated random chance to replenish or earn custom power-ups.</li>
            </ol>
          </div>
        </div>

        <button className="btn btn-rules-close" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
};

export default RulesModal;


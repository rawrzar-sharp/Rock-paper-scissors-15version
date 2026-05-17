import React from 'react';
import './rotatingCircle.css';

const RotatingCircle = ({ animSpeed, handCount = 15, isMini = false }) => {
  const radius = isMini ? 160 : 260;
  const handSigns = Array.from({ length: handCount });

  return (
    <div
      className={`circle-container ${isMini ? 'mini-ring' : ''} ${
        animSpeed === 'Low' ? 'slow' : animSpeed === 'High' ? 'fast' : ''
      }`}
    >
      {handSigns.map((_, index) => {
        const angle = (index / handCount) * 360;
        const handNumber = index + 1;
        const imgSrc = `/hand${handNumber}.png`;

        return (
          <div
            key={index}
            className="hand-icon-wrapper"
            style={{ transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg)` }}
          >
            <img
              className="hand-icon"
              src={imgSrc}
              alt={`hand ${handNumber}`}
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
};

export default RotatingCircle;


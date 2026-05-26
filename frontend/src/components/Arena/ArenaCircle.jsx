import React, { useState } from 'react';
import './arenaCircle.css';

// Exact RPS-15 chronological hand indexing
const GESTURES = [
  'Rock', 'Fire', 'Scissors', 'Snake', 'Human', 
  'Tree', 'Wolf', 'Sponge', 'Paper', 'Air', 
  'Water', 'Dragon', 'Devil', 'Lightning', 'Gun'
];

const ArenaCircle = ({ animSpeed = 'Neutral', isInteractive = true, onSelectGesture, selectedGesture }) => {
  const radius = 250; // Locked standard arena size
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Map animSpeed prop to corresponding CSS configuration classes
  const speedClass = animSpeed === 'Low' ? 'slow' : animSpeed === 'High' ? 'fast' : 'neutral';

  return (
    <div className={`arena-circle-container ${speedClass} ${isInteractive ? 'interactive' : 'disabled'}`}>
      {GESTURES.map((gestureName, index) => {
        const angle = (index / GESTURES.length) * 360;
        const handNumber = index + 1;
        const imgSrc = `/hand${handNumber}.png`;
        const isHovered = hoveredIndex === index;
        const isSelected = selectedGesture === gestureName;

        return (
          <div
            key={index}
            className={`arena-hand-wrapper ${isSelected ? 'selected' : ''}`}
            style={{ 
              transform: `rotate(${angle}deg) translate(${radius}px) rotate(-${angle}deg) ${isHovered ? 'scale(1.25)' : 'scale(1)'}`,
              zIndex: isHovered || isSelected ? 50 : 10
            }}
            onMouseEnter={() => isInteractive && setHoveredIndex(index)}
            onMouseLeave={() => isInteractive && setHoveredIndex(null)}
            onClick={() => isInteractive && onSelectGesture(gestureName)}
          >
            <img
              className="arena-hand-img"
              src={imgSrc}
              alt={gestureName}
              title={gestureName}
              draggable={false}
            />
            {isInteractive && isHovered && (
              <div className="arena-gesture-tooltip">{gestureName.toUpperCase()}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ArenaCircle;
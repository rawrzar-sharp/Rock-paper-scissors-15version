import React, { useEffect, useMemo, useState } from 'react';

const GESTURES = [
  'Rock',
  'Fire',
  'Scissors',
  'Snake',
  'Human',
  'Tree',
  'Wolf',
  'Sponge',
  'Paper',
  'Air',
  'Water',
  'Dragon',
  'Devil',
  'Lightning',
  'Gun',
];


export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [computerGesture, setComputerGesture] = useState(null);
  const [winner, setWinner] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const gestureOrder = useMemo(() => GESTURES, []);

  useEffect(() => {
    // Create a session once
    (async () => {
      try {
        setError('');
        const res = await fetch('/api/rps15/session', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to create session');
        setSessionId(data.session_id);
      } catch (e) {
        setError(e.message || String(e));
      }
    })();
  }, []);

  async function onPick(gesture) {
    if (!sessionId) return;

    setSelected(gesture);
    setComputerGesture(null);
    setWinner(null);
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/rps15/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, user_gesture: gesture }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Move failed');

      setComputerGesture(data.computer_gesture);
      setWinner(data.winner);
      setMessage(data.message);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1>Rock Paper Scissors 15</h1>
      <p className="subtitle">Choose a gesture. Beat the computer using the 15-gesture circle rules.</p>

      <div className="board">
        {gestureOrder.map((g) => {
          const isSelected = selected === g;
          return (
            <button
              key={g}
              className={"gesture" + (isSelected ? ' selected' : '')}
              onClick={() => onPick(g)}
              disabled={loading}
              title={g}
            >
              {g}
            </button>
          );
        })}
      </div>

      <div className="result">
        <div className="line"><b>You:</b> {selected ?? '—'}</div>
        <div className="line"><b>Computer:</b> {computerGesture ?? '—'}</div>
        <div className="line"><b>Winner:</b> {winner ?? '—'}</div>
        {message ? <div className="message">{message}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </div>
    </div>
  );
}


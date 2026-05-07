import { useState } from 'react'

function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const handleUnlock = (e) => {
    e.preventDefault()
    const storedPin = localStorage.getItem('appPin')
    if (pin === storedPin) {
      localStorage.setItem('appLocked', 'false')
      onUnlock()
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  return (
    <div className="lock-screen">
      <div className="lock-container">
        <h2>App Locked</h2>
        <p>Enter your PIN to unlock</p>
        <form onSubmit={handleUnlock}>
          {error && <div className="lock-error">{error}</div>}
          <input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            maxLength={8}
            className="lock-input"
            autoFocus
          />
          <button type="submit" className="lock-btn">
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}

export default LockScreen

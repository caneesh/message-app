import { useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc } from 'firebase/firestore'

function MisunderstandingAiButton({ currentUser, onClick, disabled }) {
  const [aiEnabled, setAiEnabled] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    checkAiEnabled()
  }, [currentUser])

  const checkAiEnabled = async () => {
    try {
      const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'ai')
      const snapshot = await getDoc(settingsRef)
      if (snapshot.exists()) {
        const settings = snapshot.data()
        setAiEnabled(
          settings.enabled &&
          settings.features?.misunderstandingHelper !== false
        )
      }
    } catch (err) {
      console.error('Error checking AI settings:', err)
    }
  }

  if (!aiEnabled) {
    return null
  }

  return (
    <button
      type="button"
      className="misunderstanding-ai-btn"
      onClick={onClick}
      disabled={disabled}
      title="AI Help (powered by Claude)"
      aria-label="Get AI help with this misunderstanding"
    >
      ✨ AI Help
    </button>
  )
}

export default MisunderstandingAiButton

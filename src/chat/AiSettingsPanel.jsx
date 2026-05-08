import { useState, useEffect } from 'react'
import { db } from '../firebase/firebaseConfig'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

function AiSettingsPanel({ currentUser }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState({
    enabled: false,
    consentedAt: null,
    features: {
      toneRepair: true,
      messageToTask: true,
    },
  })
  const [showConsent, setShowConsent] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    loadSettings()
  }, [currentUser])

  const loadSettings = async () => {
    try {
      const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'ai')
      const snapshot = await getDoc(settingsRef)
      if (snapshot.exists()) {
        setSettings(snapshot.data())
      }
    } catch (err) {
      console.error('Error loading AI settings:', err)
      setError('Failed to load AI settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async (newSettings) => {
    setSaving(true)
    setError('')
    try {
      const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'ai')
      await setDoc(settingsRef, {
        ...newSettings,
        updatedAt: serverTimestamp(),
      })
      setSettings(newSettings)
    } catch (err) {
      console.error('Error saving AI settings:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleEnableAI = async () => {
    const newSettings = {
      ...settings,
      enabled: true,
      consentedAt: serverTimestamp(),
    }
    await saveSettings(newSettings)
    setShowConsent(false)
  }

  const handleDisableAI = async () => {
    const newSettings = {
      ...settings,
      enabled: false,
    }
    await saveSettings(newSettings)
  }

  const handleFeatureToggle = async (feature) => {
    const newSettings = {
      ...settings,
      features: {
        ...settings.features,
        [feature]: !settings.features?.[feature],
      },
    }
    await saveSettings(newSettings)
  }

  if (loading) {
    return (
      <div className="settings-section">
        <h3>AI Features</h3>
        <p className="settings-note">Loading...</p>
      </div>
    )
  }

  return (
    <div className="settings-section">
      <h3>AI Features</h3>
      <p className="settings-note">
        Optional AI-powered features to help improve communication.
        Your message content is processed securely and not stored after suggestions are generated.
      </p>

      {error && <div className="settings-error">{error}</div>}

      {!settings.enabled ? (
        showConsent ? (
          <div className="ai-consent">
            <h4>Enable AI Features</h4>
            <div className="ai-consent-text">
              <p>By enabling AI features, you agree that:</p>
              <ul>
                <li>Your message text will be sent to our AI provider (Anthropic Claude) for processing</li>
                <li>Only the specific message you request help with is sent</li>
                <li>Content is not stored after generating suggestions</li>
                <li>Sensitive data (SSN, credit cards, etc.) is automatically filtered</li>
                <li>AI features are rate-limited to prevent abuse</li>
              </ul>
            </div>
            <div className="ai-consent-actions">
              <button
                className="settings-btn"
                onClick={handleEnableAI}
                disabled={saving}
              >
                {saving ? 'Enabling...' : 'I Agree, Enable AI'}
              </button>
              <button
                className="settings-btn secondary"
                onClick={() => setShowConsent(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="settings-btn"
            onClick={() => setShowConsent(true)}
          >
            Enable AI Features
          </button>
        )
      ) : (
        <div className="ai-settings-enabled">
          <div className="ai-status-badge enabled">AI Features Enabled</div>

          <div className="ai-features-list">
            <h4>Individual Features</h4>

            <div className="ai-feature-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={settings.features?.toneRepair !== false}
                  onChange={() => handleFeatureToggle('toneRepair')}
                  disabled={saving}
                />
                <span className="feature-name">Tone Repair</span>
                <span className="feature-desc">Suggest softer ways to phrase messages</span>
              </label>
            </div>

            <div className="ai-feature-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={settings.features?.messageToTask !== false}
                  onChange={() => handleFeatureToggle('messageToTask')}
                  disabled={saving}
                />
                <span className="feature-name">Message to Task</span>
                <span className="feature-desc">Extract reminders and tasks from messages</span>
              </label>
            </div>
          </div>

          <button
            className="settings-btn danger"
            onClick={handleDisableAI}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Disable AI Features'}
          </button>
        </div>
      )}
    </div>
  )
}

export default AiSettingsPanel

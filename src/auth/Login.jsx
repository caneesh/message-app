import { useState } from 'react'
import { useAuth } from './AuthContext'
import FakeErrorTestLogin from './FakeErrorTestLogin'

function Login() {
  const { startPhoneLogin, confirmPhoneCode } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState('phone') // 'phone' or 'code'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNormalLogin, setShowNormalLogin] = useState(false)

  const handleSendCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await startPhoneLogin(phoneNumber)
    setLoading(false)

    if (result.success) {
      setStep('code')
    } else {
      setError(result.error)
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await confirmPhoneCode(verificationCode)
    setLoading(false)

    if (!result.success) {
      setError(result.error)
    }
  }

  const handleBack = () => {
    setStep('phone')
    setVerificationCode('')
    setError('')
  }

  // If test login is enabled and user hasn't requested normal login, show fake error page
  const testLoginEnabled = import.meta.env.VITE_ENABLE_TEST_LOGIN === 'true'
  if (testLoginEnabled && !showNormalLogin) {
    return (
      <>
        <div id="recaptcha-container"></div>
        <FakeErrorTestLogin
          onNormalLoginRequested={() => setShowNormalLogin(true)}
        />
      </>
    )
  }

  // Normal login flow
  return (
    <div className="container">
      <div id="recaptcha-container"></div>
      {step === 'phone' ? (
        <form className="auth-form" onSubmit={handleSendCode}>
          <div className="auth-logo">
            <img
              src="/logo.svg"
              alt="OneRoom"
              className="auth-logo-img logo-light"
            />
            <img
              src="/logo-dark.svg"
              alt="OneRoom"
              className="auth-logo-img logo-dark"
            />
          </div>
          <h2>Sign In</h2>
          {error && <p className="error-message">{error}</p>}
          <input
            type="tel"
            placeholder="Phone number (e.g., +13125551234)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
          {/* Back to test login - visible only in dev/test mode */}
          {testLoginEnabled && (
            <p>
              <a onClick={() => setShowNormalLogin(false)}>Back to test login</a>
            </p>
          )}
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleVerifyCode}>
          <h2>Enter Code</h2>
          <p style={{ textAlign: 'center', marginBottom: '15px', color: '#666' }}>
            We sent a code to {phoneNumber}
          </p>
          {error && <p className="error-message">{error}</p>}
          <input
            type="text"
            placeholder="Verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
          <p>
            <a onClick={handleBack}>Use a different number</a>
          </p>
        </form>
      )}
    </div>
  )
}

export default Login

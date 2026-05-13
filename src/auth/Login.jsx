import { useState } from 'react'
import { useAuth } from './AuthContext'

function Login() {
  const { startPhoneLogin, confirmPhoneCode } = useAuth()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState('phone') // 'phone' or 'code'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

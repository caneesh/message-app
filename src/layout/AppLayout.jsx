import { useAuth } from '../auth/AuthContext'
import Login from '../auth/Login'
import PremiumDemo from '../pages/PremiumDemo'

function AppLayout() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-canvas)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    )
  }

  if (currentUser) {
    return <PremiumDemo />
  }

  return <Login />
}

export default AppLayout

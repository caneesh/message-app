import { useAuth } from '../auth/AuthContext'
import Login from '../auth/Login'
import ChatPage from '../chat/ChatPage'

function AppLayout() {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (currentUser) {
    return <ChatPage />
  }

  return <Login />
}

export default AppLayout

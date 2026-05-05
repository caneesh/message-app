import { AuthProvider } from './auth/AuthContext'
import AppLayout from './layout/AppLayout'

function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  )
}

export default App

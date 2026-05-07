import { AuthProvider } from './auth/AuthContext'
import AppLayout from './layout/AppLayout'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

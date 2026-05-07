import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    const sanitizedError = {
      message: error.message || 'Unknown error',
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      componentStack: errorInfo.componentStack?.split('\n').slice(0, 5).join('\n'),
      timestamp: new Date().toISOString(),
      area: 'ui',
    }

    console.error('[ErrorBoundary]', sanitizedError)

    if (import.meta.env.DEV) {
      console.error('Full error:', error)
      console.error('Component stack:', errorInfo.componentStack)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <h2>Something went wrong</h2>
            <p>
              The app encountered an unexpected error. Please try refreshing the page.
            </p>
            <div className="error-boundary-actions">
              <button onClick={this.handleRetry}>Try Again</button>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

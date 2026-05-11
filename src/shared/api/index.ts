export { APIClient, initAPIClient, getAPIClient } from './client'
export { messagesApi } from './features/messagesApi'
export { decisionsApi } from './features/decisionsApi'

// Combined API namespace for convenience
export const api = {
  messages: () => import('./features/messagesApi').then((m) => m.messagesApi),
  decisions: () => import('./features/decisionsApi').then((m) => m.decisionsApi),
}

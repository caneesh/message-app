import { useState } from 'react'
import {
  PremiumShell,
  PremiumDashboard,
  PremiumChat,
  PremiumDecisions,
  PremiumPromises,
} from '@/components/premium'
import type { NavItemId } from '@/types'

const mockMessages = [
  { id: '1', senderId: 'partner', text: "Hey! How was your day?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), status: 'read' as const },
  { id: '2', senderId: 'user', text: "Pretty good! Had a productive meeting this morning.", timestamp: new Date(Date.now() - 1000 * 60 * 60), status: 'read' as const },
  { id: '3', senderId: 'partner', text: "That's great! I was thinking about our dinner plans for Friday. Should we try that new Italian place?", timestamp: new Date(Date.now() - 1000 * 60 * 50), status: 'read' as const },
  { id: '4', senderId: 'user', text: "Yes, I'd love that! Let's make it a decision.", timestamp: new Date(Date.now() - 1000 * 60 * 45), status: 'read' as const },
  { id: '5', senderId: 'partner', text: "Perfect. I'll book for 7pm. Can't wait!", timestamp: new Date(Date.now() - 1000 * 60 * 40), status: 'read' as const },
]

const mockDecisions = [
  { id: '1', title: 'Friday dinner at Italian Place', description: 'Try the new Italian restaurant downtown for date night', status: 'proposed' as const, category: 'Date Night', createdAt: new Date(Date.now() - 1000 * 60 * 30), updatedAt: new Date(Date.now() - 1000 * 60 * 30), createdBy: 'partner', confirmedBy: ['partner'] },
  { id: '2', title: 'Weekly budget review on Sundays', description: 'Spend 30 minutes every Sunday reviewing our shared expenses', status: 'active' as const, category: 'Finance', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), createdBy: 'user', confirmedBy: ['user', 'partner'] },
  { id: '3', title: 'No phones during dinner', description: 'Keep our evening meals device-free to focus on each other', status: 'active' as const, category: 'Household', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), createdBy: 'partner', confirmedBy: ['user', 'partner'] },
  { id: '4', title: 'Vacation destination: Japan', description: 'Plan our 2-week vacation to Japan in October', status: 'completed' as const, category: 'Travel', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), createdBy: 'user', confirmedBy: ['user', 'partner'] },
]

const mockPromises = [
  { id: '1', title: 'Pick up groceries after work', description: 'Get the items on the shared list', status: 'active' as const, madeBy: 'user', madeAt: new Date(Date.now() - 1000 * 60 * 60 * 4), dueDate: new Date(Date.now() + 1000 * 60 * 60 * 2), category: 'Errands' },
  { id: '2', title: 'Plan the anniversary dinner', description: 'Book restaurant and arrange flowers', status: 'active' as const, madeBy: 'partner', madeAt: new Date(Date.now() - 1000 * 60 * 60 * 24), dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5), category: 'Special Events' },
  { id: '3', title: 'Fix the kitchen faucet', status: 'active' as const, madeBy: 'user', madeAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24), category: 'Home' },
  { id: '4', title: 'Call mom on her birthday', status: 'fulfilled' as const, madeBy: 'partner', madeAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), fulfilledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), category: 'Family' },
]

const mockActivity = [
  { id: '1', type: 'decision' as const, title: 'New decision proposed', description: 'Friday dinner at Italian Place', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
  { id: '2', type: 'promise' as const, title: 'Promise made', description: 'Pick up groceries after work', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4) },
  { id: '3', type: 'message' as const, title: 'New message', description: 'Perfect. I\'ll book for 7pm!', timestamp: new Date(Date.now() - 1000 * 60 * 40) },
  { id: '4', type: 'reminder' as const, title: 'Upcoming reminder', description: 'Weekly budget review tomorrow', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
]

export function PremiumDemo() {
  const [activeTab, setActiveTab] = useState<NavItemId>('dashboard')
  const [messages, setMessages] = useState(mockMessages)

  const currentUserId = 'user'
  const partnerName = 'Alex'

  const handleSendMessage = (text: string) => {
    const newMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUserId,
      text,
      timestamp: new Date(),
      status: 'sending' as const,
    }
    setMessages((prev) => [...prev, newMessage])

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMessage.id ? { ...m, status: 'sent' as const } : m))
      )
    }, 500)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <PremiumDashboard
            stats={{
              activeDecisions: 2,
              pendingConfirmations: 1,
              activePromises: 3,
              upcomingReminders: 2,
            }}
            recentActivity={mockActivity}
            partnerName={partnerName}
            onNavigate={(tab) => setActiveTab(tab as NavItemId)}
          />
        )

      case 'chat':
        return (
          <PremiumChat
            messages={messages}
            currentUserId={currentUserId}
            partnerName={partnerName}
            onSendMessage={handleSendMessage}
          />
        )

      case 'decisions':
        return (
          <PremiumDecisions
            decisions={mockDecisions}
            currentUserId={currentUserId}
            partnerName={partnerName}
            onCreateDecision={() => console.log('Create decision')}
            onViewDecision={(id) => console.log('View decision', id)}
            onConfirmDecision={(id) => console.log('Confirm decision', id)}
          />
        )

      case 'promises':
        return (
          <PremiumPromises
            promises={mockPromises}
            currentUserId={currentUserId}
            partnerName={partnerName}
            onCreatePromise={() => console.log('Create promise')}
            onViewPromise={(id) => console.log('View promise', id)}
            onFulfillPromise={(id) => console.log('Fulfill promise', id)}
          />
        )

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-[20px] font-semibold text-[var(--text-primary)] mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              <p className="text-[14px] text-[var(--text-secondary)]">
                This section is coming soon
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <PremiumShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      partnerName={partnerName}
    >
      {renderContent()}
    </PremiumShell>
  )
}

export default PremiumDemo

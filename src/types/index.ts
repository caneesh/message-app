import { Timestamp } from 'firebase/firestore'

export interface User {
  uid: string
  phoneNumber: string
  email?: string
}

export interface Message {
  id: string
  type: 'text' | 'file'
  text: string
  senderId: string
  senderPhone: string
  createdAt: Timestamp
  replyTo?: {
    messageId: string
    senderId: string
    textPreview: string
  }
  file?: {
    storagePath: string
    fileName: string
    contentType: string
    size: number
    url: string
  }
  edited?: boolean
  editedAt?: Timestamp
}

export interface Decision {
  id: string
  title: string
  decision: string
  reason?: string
  status: 'active' | 'changed' | 'cancelled'
  relatedMessageId?: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  updatedBy?: string
}

export interface Promise {
  id: string
  title: string
  description?: string
  ownerUid: string
  status: 'pending' | 'done' | 'cancelled'
  dueAt?: Timestamp | null
  sourceMessageId?: string
  sourceMessageTextPreview?: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
  completedBy?: string
}

export interface Reminder {
  id: string
  title: string
  notes?: string
  dueAt?: Timestamp | null
  priority: 'low' | 'normal' | 'high'
  completed: boolean
  assignedTo?: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
  completedBy?: string
}

export interface Reaction {
  uid: string
  emoji: string
  createdAt: Timestamp
}

export interface EmotionalReceipt {
  uid: string
  receipt: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface CheckIn {
  id: string
  userId: string
  dateKey: string
  mood: string
  note?: string
  createdAt: Timestamp
}

export interface Misunderstanding {
  id: string
  whatIMeant?: string
  whatIHeard?: string
  whatINeed?: string
  status: 'open' | 'resolved'
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  resolvedBy?: string
  resolvedAt?: Timestamp
  responseByOther?: string
}

export type NavItemId =
  | 'dashboard'
  | 'chat'
  | 'reminders'
  | 'notes'
  | 'events'
  | 'lists'
  | 'decisions'
  | 'promises'
  | 'followups'
  | 'capsules'
  | 'misunderstandings'
  | 'vault'
  | 'checkin'
  | 'care'
  | 'memories'
  | 'devices'
  | 'settings'

export interface NavItem {
  id: NavItemId
  label: string
  icon: React.ComponentType<{ className?: string }>
  category: 'core' | 'planning' | 'decisions' | 'archive' | 'wellbeing' | 'settings'
}

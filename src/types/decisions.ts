import { Timestamp } from 'firebase/firestore'

/**
 * Decision Lifecycle Types
 *
 * A decision is a shared agreement between two people.
 * It has a lifecycle: Draft → Proposed → Active → (Changed/Completed/Cancelled)
 */

export type DecisionStatus =
  | 'draft'      // Being written, not yet proposed
  | 'proposed'   // Awaiting partner confirmation
  | 'active'     // Both parties confirmed
  | 'changed'    // Modified from original (history preserved)
  | 'completed'  // Successfully concluded
  | 'cancelled'  // Voided by mutual agreement

export type DecisionCategory =
  | 'relationship'  // Us, communication, boundaries
  | 'lifestyle'     // Home, routines, habits
  | 'financial'     // Money, budgets, expenses
  | 'family'        // Extended family, children
  | 'social'        // Friends, activities
  | 'work'          // Career, schedules
  | 'health'        // Wellness, medical
  | 'other'

export type ConfirmationStatus = 'pending' | 'confirmed' | 'disputed'

export interface DecisionConfirmation {
  oderId: string
  status: ConfirmationStatus
  confirmedAt?: Timestamp
  note?: string
}

export interface DecisionChange {
  id: string
  decisionId: string
  previousDecision: string
  newDecision: string
  previousReason?: string
  newReason?: string
  changedBy: string
  changedAt: Timestamp
  changeNote?: string
}

export interface LinkedConversation {
  messageId: string
  messagePreview: string
  sentBy: string
  sentAt: Timestamp
  linkType: 'origin' | 'reference' | 'discussion'
}

export interface Decision {
  id: string

  // Core content
  title: string
  decision: string
  reason?: string
  category: DecisionCategory

  // Lifecycle
  status: DecisionStatus

  // Confirmation (two-party agreement)
  confirmations: {
    [userId: string]: DecisionConfirmation
  }

  // Links
  linkedConversations: LinkedConversation[]
  linkedPromiseIds: string[]

  // Metadata
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  updatedBy?: string

  // Optional scheduling
  effectiveDate?: Timestamp
  expirationDate?: Timestamp

  // Archive
  completedAt?: Timestamp
  completedBy?: string
  cancelledAt?: Timestamp
  cancelledBy?: string
  cancellationReason?: string
}

// View model for UI
export interface DecisionWithMeta extends Decision {
  changeCount: number
  lastChange?: DecisionChange
  isFullyConfirmed: boolean
  myConfirmation?: DecisionConfirmation
  partnerConfirmation?: DecisionConfirmation
  daysActive: number
}

// Filter options
export interface DecisionFilters {
  status: DecisionStatus | 'all'
  category: DecisionCategory | 'all'
  createdBy: string | 'all'
  timeRange: 'week' | 'month' | 'quarter' | 'year' | 'all'
  search: string
}

// Sort options
export type DecisionSortField = 'createdAt' | 'updatedAt' | 'title' | 'status'
export type DecisionSortDirection = 'asc' | 'desc'

export interface DecisionSort {
  field: DecisionSortField
  direction: DecisionSortDirection
}

// Stats for dashboard
export interface DecisionStats {
  total: number
  active: number
  proposed: number
  changed: number
  completed: number
  cancelled: number
  averageDaysActive: number
  byCategory: Record<DecisionCategory, number>
}

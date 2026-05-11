import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PromiseCard } from './PromiseCard'
import type { Promise } from '@/types'

type ViewTab = 'to-me' | 'by-me'

interface PromiseSplitViewProps {
  promisesToMe: Promise[]
  promisesByMe: Promise[]
  currentUserId: string
  onMarkDone?: (promiseId: string) => void
  onCancel?: (promiseId: string) => void
  onDelete?: (promiseId: string) => void
  className?: string
}

export function PromiseSplitView({
  promisesToMe,
  promisesByMe,
  currentUserId,
  onMarkDone,
  onCancel,
  onDelete,
  className,
}: PromiseSplitViewProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('to-me')

  const tabs: { key: ViewTab; label: string; count: number; icon: JSX.Element }[] = [
    {
      key: 'to-me',
      label: 'Promises To Me',
      count: promisesToMe.length,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      ),
    },
    {
      key: 'by-me',
      label: 'Promises I Made',
      count: promisesByMe.length,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      ),
    },
  ]

  const activePromises = activeTab === 'to-me' ? promisesToMe : promisesByMe

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-1 p-1 bg-surface-tertiary rounded-xl mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
              'text-sm font-medium',
              'transition-all duration-200',
              activeTab === tab.key
                ? 'bg-surface-secondary text-content-primary shadow-sm'
                : 'text-content-secondary hover:text-content-primary'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 text-xs rounded-full',
                activeTab === tab.key
                  ? 'bg-accent/10 text-accent'
                  : 'bg-surface-secondary text-content-tertiary'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activePromises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-surface-tertiary flex items-center justify-center">
              <svg className="w-8 h-8 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-content-primary mb-1">
              No promises yet
            </h3>
            <p className="text-sm text-content-tertiary max-w-xs">
              {activeTab === 'to-me'
                ? "When someone makes a commitment to you, it'll appear here"
                : "Promises you make to others will show up here"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePromises.map((promise) => (
              <PromiseCard
                key={promise.id}
                promise={promise}
                currentUserId={currentUserId}
                onMarkDone={onMarkDone ? () => onMarkDone(promise.id) : undefined}
                onCancel={onCancel ? () => onCancel(promise.id) : undefined}
                onDelete={onDelete ? () => onDelete(promise.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default PromiseSplitView

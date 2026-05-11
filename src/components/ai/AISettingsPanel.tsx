import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AIUserSettings } from '@/types/ai-insights'

interface AISettingsPanelProps {
  settings: AIUserSettings
  onUpdateSettings: (settings: Partial<AIUserSettings>) => void
  onClose?: () => void
  className?: string
}

export function AISettingsPanel({
  settings,
  onUpdateSettings,
  onClose,
  className,
}: AISettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState(settings)
  const [hasChanges, setHasChanges] = useState(false)

  const updateFeature = (feature: keyof AIUserSettings['features'], enabled: boolean) => {
    setLocalSettings((prev) => ({
      ...prev,
      features: { ...prev.features, [feature]: enabled },
    }))
    setHasChanges(true)
  }

  const updateMasterToggle = (enabled: boolean) => {
    setLocalSettings((prev) => ({ ...prev, aiEnabled: enabled }))
    setHasChanges(true)
  }

  const handleSave = () => {
    onUpdateSettings(localSettings)
    setHasChanges(false)
  }

  return (
    <div className={cn('bg-surface-secondary rounded-2xl overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
            <span className="text-xl">✨</span>
          </div>
          <div>
            <h2 className="font-semibold text-content-primary">AI Features</h2>
            <p className="text-sm text-content-tertiary">Customize your AI assistance</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-content-tertiary hover:text-content-secondary hover:bg-surface-tertiary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Master toggle */}
      <div className="px-5 py-4 border-b border-border-light">
        <ToggleRow
          title="Enable AI Features"
          description="Turn on intelligent assistance for your relationship"
          enabled={localSettings.aiEnabled}
          onChange={updateMasterToggle}
          primary
        />
      </div>

      {/* Feature toggles */}
      <div className={cn(
        'px-5 py-4 space-y-4',
        !localSettings.aiEnabled && 'opacity-50 pointer-events-none'
      )}>
        <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
          Features
        </p>

        <ToggleRow
          title="Agreement Reminders"
          description="Surface relevant past decisions during conversations"
          enabled={localSettings.features.agreementReminders}
          onChange={(v) => updateFeature('agreementReminders', v)}
        />

        <ToggleRow
          title="Memory Resurfacing"
          description="Bring back meaningful moments at the right time"
          enabled={localSettings.features.memoryResurfacing}
          onChange={(v) => updateFeature('memoryResurfacing', v)}
        />

        <ToggleRow
          title="Promise Tracking"
          description="Gentle reminders about commitments"
          enabled={localSettings.features.promiseTracking}
          onChange={(v) => updateFeature('promiseTracking', v)}
        />

        <ToggleRow
          title="Coordination Tips"
          description="Quick actions like adding to calendar"
          enabled={localSettings.features.coordinationTips}
          onChange={(v) => updateFeature('coordinationTips', v)}
        />

        <ToggleRow
          title="Emotional Clarity"
          description="Tone suggestions while composing messages"
          enabled={localSettings.features.emotionalClarity}
          onChange={(v) => updateFeature('emotionalClarity', v)}
        />

        <ToggleRow
          title="Partnership Pulse"
          description="Weekly insights about your relationship"
          enabled={localSettings.features.relationshipPulse}
          onChange={(v) => updateFeature('relationshipPulse', v)}
        />

        <ToggleRow
          title="Conflict Detection"
          description="Identify conversations to revisit"
          enabled={localSettings.features.conflictDetection}
          onChange={(v) => updateFeature('conflictDetection', v)}
        />

        <ToggleRow
          title="Workload Awareness"
          description="See how you share responsibilities"
          enabled={localSettings.features.workloadAwareness}
          onChange={(v) => updateFeature('workloadAwareness', v)}
        />
      </div>

      {/* Privacy section */}
      <div className={cn(
        'px-5 py-4 border-t border-border-light',
        !localSettings.aiEnabled && 'opacity-50 pointer-events-none'
      )}>
        <p className="text-xs font-medium text-content-tertiary uppercase tracking-wider mb-4">
          Privacy
        </p>

        <ToggleRow
          title="Allow Message Analysis"
          description="Let AI read messages to provide suggestions"
          enabled={localSettings.privacy.allowMessageAnalysis}
          onChange={(v) => setLocalSettings((prev) => ({
            ...prev,
            privacy: { ...prev.privacy, allowMessageAnalysis: v },
          }))}
        />
      </div>

      {/* Privacy notice */}
      <div className="px-5 py-4 bg-surface-tertiary border-t border-border-light">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-info-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-content-secondary">
              AI features process your data securely. We never train AI models on your conversations or share your data with third parties.
            </p>
            <button className="text-sm font-medium text-primary-600 hover:text-primary-700 mt-1">
              Learn more about privacy
            </button>
          </div>
        </div>
      </div>

      {/* Save button */}
      {hasChanges && (
        <div className="px-5 py-4 border-t border-border-light">
          <button
            onClick={handleSave}
            className={cn(
              'w-full py-3 rounded-xl',
              'bg-primary-500 text-white',
              'font-semibold text-sm',
              'hover:bg-primary-600 active:bg-primary-700',
              'transition-colors'
            )}
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
}

interface ToggleRowProps {
  title: string
  description: string
  enabled: boolean
  onChange: (enabled: boolean) => void
  primary?: boolean
}

function ToggleRow({ title, description, enabled, onChange, primary }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className={cn(
          'font-medium',
          primary ? 'text-base text-content-primary' : 'text-sm text-content-primary'
        )}>
          {title}
        </p>
        <p className="text-sm text-content-tertiary mt-0.5">
          {description}
        </p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  )
}

interface ToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0',
        'rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        enabled ? 'bg-primary-500' : 'bg-neutral-200'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5',
          'rounded-full bg-white shadow',
          'transform ring-0 transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

export default AISettingsPanel

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/animations/variants/list'

interface Memory {
  id: string
  title: string
  description?: string
  date: Date
  thumbnailUrl?: string
  type: 'photo' | 'milestone' | 'trip' | 'celebration'
  tags: string[]
}

export function MemoryVault() {
  const [view, setView] = useState<'grid' | 'timeline'>('grid')
  const [filter, setFilter] = useState<string | null>(null)

  // Mock data
  const memories: Memory[] = [
    {
      id: '1',
      title: 'First hiking trip together',
      description: 'Mount Rainier National Park',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
      type: 'trip',
      tags: ['adventure', 'outdoors'],
    },
    {
      id: '2',
      title: 'Our anniversary dinner',
      description: 'At that Italian place we love',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180),
      type: 'celebration',
      tags: ['anniversary', 'dinner'],
    },
    {
      id: '3',
      title: 'Got our apartment',
      description: 'The day we moved in together',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 400),
      type: 'milestone',
      tags: ['home', 'milestone'],
    },
    {
      id: '4',
      title: 'Weekend at the cabin',
      description: 'Best spontaneous trip ever',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      type: 'trip',
      tags: ['cabin', 'weekend'],
    },
    {
      id: '5',
      title: 'Beach sunset',
      description: 'That perfect evening on the coast',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
      type: 'photo',
      tags: ['beach', 'sunset'],
    },
    {
      id: '6',
      title: 'Cooking class together',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60),
      type: 'celebration',
      tags: ['cooking', 'date'],
    },
  ]

  const tags = Array.from(new Set(memories.flatMap((m) => m.tags)))

  const filteredMemories = filter
    ? memories.filter((m) => m.tags.includes(filter))
    : memories

  const typeIcons = {
    photo: '📷',
    milestone: '🎯',
    trip: '✈️',
    celebration: '🎉',
  }

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-secondary/80 backdrop-blur-xl border-b border-border-light safe-area-top">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-content-primary">Memories</h1>
              <p className="text-sm text-content-secondary mt-1">
                {memories.length} shared memories
              </p>
            </div>
            <button className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
              'bg-primary-500 text-white font-medium text-sm',
              'hover:bg-primary-600 transition-colors'
            )}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Memory
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Filters & View Toggle */}
          <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tags */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setFilter(null)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                  !filter
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-tertiary text-content-secondary hover:bg-surface-sunken'
                )}
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilter(tag)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors capitalize',
                    filter === tag
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-tertiary text-content-secondary hover:bg-surface-sunken'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex gap-1 p-1 rounded-xl bg-surface-tertiary">
              <button
                onClick={() => setView('grid')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  view === 'grid'
                    ? 'bg-surface-secondary text-content-primary shadow-sm'
                    : 'text-content-tertiary hover:text-content-secondary'
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setView('timeline')}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  view === 'timeline'
                    ? 'bg-surface-secondary text-content-primary shadow-sm'
                    : 'text-content-tertiary hover:text-content-secondary'
                )}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </motion.div>

          {/* Grid View */}
          {view === 'grid' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMemories.map((memory) => (
                <motion.div
                  key={memory.id}
                  variants={staggerItem}
                  className="group cursor-pointer"
                >
                  <div className={cn(
                    'aspect-square rounded-2xl overflow-hidden relative',
                    'bg-gradient-to-br',
                    memory.type === 'trip' && 'from-blue-100 to-blue-200',
                    memory.type === 'celebration' && 'from-pink-100 to-pink-200',
                    memory.type === 'milestone' && 'from-purple-100 to-purple-200',
                    memory.type === 'photo' && 'from-amber-100 to-amber-200'
                  )}>
                    {memory.thumbnailUrl ? (
                      <img
                        src={memory.thumbnailUrl}
                        alt={memory.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl">{typeIcons[memory.type]}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-white font-medium text-sm line-clamp-1">{memory.title}</p>
                      <p className="text-white/70 text-xs">{formatDate({ toDate: () => memory.date } as any, 'long')}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Timeline View */}
          {view === 'timeline' && (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border-light" />
              <div className="space-y-6 pl-12">
                {filteredMemories
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((memory) => (
                    <motion.div
                      key={memory.id}
                      variants={staggerItem}
                      className="relative"
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        'absolute -left-12 top-4 w-8 h-8 rounded-full flex items-center justify-center text-lg',
                        'border-4 border-surface-primary z-10',
                        memory.type === 'trip' && 'bg-blue-100',
                        memory.type === 'celebration' && 'bg-pink-100',
                        memory.type === 'milestone' && 'bg-purple-100',
                        memory.type === 'photo' && 'bg-amber-100'
                      )}>
                        {typeIcons[memory.type]}
                      </div>

                      <div className="bg-surface-secondary rounded-2xl border border-border-light p-4 hover:border-border hover:shadow-sm transition-all">
                        <div className="flex items-start gap-4">
                          {memory.thumbnailUrl && (
                            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-surface-tertiary">
                              <img
                                src={memory.thumbnailUrl}
                                alt={memory.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-content-tertiary mb-1">
                              {formatDate({ toDate: () => memory.date } as any, 'long')}
                            </p>
                            <h3 className="font-semibold text-content-primary">{memory.title}</h3>
                            {memory.description && (
                              <p className="text-sm text-content-secondary mt-1">{memory.description}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              {memory.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 rounded-full bg-surface-tertiary text-xs text-content-tertiary capitalize"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredMemories.length === 0 && (
            <motion.div variants={staggerItem} className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💜</span>
              </div>
              <h3 className="text-lg font-semibold text-content-primary mb-2">
                No memories yet
              </h3>
              <p className="text-sm text-content-secondary max-w-sm mx-auto">
                Start capturing your special moments together. Photos, milestones, and memories worth keeping.
              </p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  )
}

export default MemoryVault

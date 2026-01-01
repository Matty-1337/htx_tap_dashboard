'use client'

import { motion } from 'framer-motion'
import { GlassCard } from './GlassCard'
import { formatCurrency, formatNumber } from '@/lib/ui'
import clsx from 'clsx'

interface MenuBucketsProps {
  buckets: {
    stars: any[]
    monitor: any[]
    investigate: any[]
    remove: any[]
  }
  onItemClick?: (item: string) => void
}

export function MenuBuckets({ buckets, onItemClick }: MenuBucketsProps) {
  const bucketConfig = [
    {
      key: 'stars' as const,
      label: 'Stars',
      description: 'High revenue, high count, low volatility',
      color: 'var(--primary)',
      items: buckets.stars.slice(0, 5),
    },
    {
      key: 'monitor' as const,
      label: 'Monitor',
      description: 'High revenue, low count or medium volatility',
      color: 'var(--secondary)',
      items: buckets.monitor.slice(0, 5),
    },
    {
      key: 'investigate' as const,
      label: 'Investigate',
      description: 'Medium revenue, high volatility',
      color: 'var(--accent)',
      items: buckets.investigate.slice(0, 5),
    },
    {
      key: 'remove' as const,
      label: 'Remove',
      description: 'Low revenue, low count, high volatility',
      color: 'var(--muted)',
      items: buckets.remove.slice(0, 5),
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {bucketConfig.map((config, index) => (
        <motion.div
          key={config.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <GlassCard>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {config.label}
                </h4>
                <div
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${config.color}20`,
                    color: config.color,
                  }}
                >
                  {buckets[config.key].length}
                </div>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                {config.description}
              </p>
              
              {config.items.length > 0 ? (
                <div className="space-y-2">
                  {config.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      onClick={() => onItemClick && onItemClick(item.Item)}
                      className={clsx(
                        'p-2 rounded text-xs transition-all',
                        onItemClick && 'cursor-pointer hover:bg-[rgba(var(--primary-rgb),0.05)]'
                      )}
                      style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      <div className="font-medium" style={{ color: 'var(--text)' }}>
                        {item.Item}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span style={{ color: 'var(--muted)' }}>
                          {formatCurrency(item.Revenue)}
                        </span>
                        <span style={{ color: 'var(--muted)' }}>
                          {formatNumber(item.Count)}x
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>
                  No items in this category
                </p>
              )}
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  )
}

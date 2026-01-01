'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

export type DatePreset = '7d' | '30d' | '90d' | 'mtd'

interface DateRangeSelectorProps {
  preset: DatePreset | null
  onPresetChange: (preset: DatePreset) => void
  className?: string
}

const PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'mtd', label: 'Month to date' },
]

export function DateRangeSelector({ preset, onPresetChange, className }: DateRangeSelectorProps) {
  return (
    <div className={clsx('flex items-center gap-2 flex-wrap', className)}>
      <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
        Date Range:
      </span>
      <div className="flex items-center gap-2">
        {PRESETS.map((p) => {
          const isActive = preset === p.value
          return (
            <button
              key={p.value}
              onClick={() => onPresetChange(p.value)}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-md transition-all',
                isActive
                  ? 'text-white shadow-sm'
                  : 'hover:bg-[var(--surface)]'
              )}
              style={{
                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--muted)',
                border: isActive ? 'none' : '1px solid var(--card-border)',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

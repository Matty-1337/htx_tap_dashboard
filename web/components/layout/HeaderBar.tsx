'use client'

import { ReactNode } from 'react'
import { Filter } from 'lucide-react'
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector'

interface HeaderBarProps {
  title: string
  subtitle?: string
  datePreset?: '7d' | '30d' | '90d' | 'mtd'
  onDatePresetChange?: (preset: '7d' | '30d' | '90d' | 'mtd') => void
  onFilterClick?: () => void
  rightContent?: ReactNode
}

export function HeaderBar({
  title,
  subtitle,
  datePreset = '30d',
  onDatePresetChange,
  onFilterClick,
  rightContent,
}: HeaderBarProps) {
  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md border-b"
      style={{
        backgroundColor: 'rgba(18, 18, 26, 0.8)',
        borderColor: 'var(--card-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="max-w-[1920px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-page-title">{title}</h1>
            {subtitle && (
              <p className="text-body muted mt-1">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {onDatePresetChange && (
              <DateRangeSelector
                preset={datePreset}
                onPresetChange={onDatePresetChange}
              />
            )}

            {onFilterClick && (
              <button
                onClick={onFilterClick}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                }}
              >
                <Filter size={16} />
                <span className="text-body">Filter</span>
              </button>
            )}

            {rightContent}
          </div>
        </div>
      </div>
    </header>
  )
}

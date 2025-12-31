'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { PillBadge } from './PillBadge'
import clsx from 'clsx'

interface Filters {
  selectedServer?: string
  selectedStatus?: string
  selectedCategory?: string
  datePreset?: '7d' | '30d' | '90d' | 'mtd'
}

interface ActiveFiltersProps {
  filters: Filters
  onRemoveFilter: (key: keyof Filters) => void
  onClearAll: () => void
}

export function ActiveFilters({ filters, onRemoveFilter, onClearAll }: ActiveFiltersProps) {
  const getDatePresetLabel = (preset?: string): string => {
    switch (preset) {
      case '7d': return 'Last 7 days'
      case '30d': return 'Last 30 days'
      case '90d': return 'Last 90 days'
      case 'mtd': return 'Month to date'
      default: return ''
    }
  }

  const activeFilters = [
    filters.datePreset && { key: 'datePreset' as const, label: 'Date Range', value: getDatePresetLabel(filters.datePreset) },
    filters.selectedServer && { key: 'selectedServer' as const, label: 'Server', value: filters.selectedServer },
    filters.selectedStatus && { key: 'selectedStatus' as const, label: 'Status', value: filters.selectedStatus },
    filters.selectedCategory && { key: 'selectedCategory' as const, label: 'Category', value: filters.selectedCategory },
  ].filter(Boolean) as Array<{ key: keyof Filters; label: string; value: string }>

  if (activeFilters.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 flex-wrap mb-6"
    >
      <span className="text-sm font-medium text-gray-700">Active Filters:</span>
      <AnimatePresence>
        {activeFilters.map((filter) => (
          <motion.div
            key={filter.key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-1"
          >
            <PillBadge variant="default">
              {filter.label}: {filter.value}
            </PillBadge>
            <button
              onClick={() => onRemoveFilter(filter.key)}
              className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={`Remove ${filter.label} filter`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        onClick={onClearAll}
        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
      >
        Clear all
      </button>
    </motion.div>
  )
}

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { prettifyColumnName, formatNumber, formatCurrency, formatPercent } from '@/lib/ui'
import { GlassCard } from './GlassCard'
import clsx from 'clsx'

interface DataTablePreviewProps {
  data: any[]
  columns?: string[]
  title?: string
  maxRows?: number
  expandable?: boolean
  onRowClick?: (row: any) => void
}

export function DataTablePreview({
  data,
  columns,
  title,
  maxRows = 25,
  expandable = true,
  onRowClick,
}: DataTablePreviewProps) {
  const [expanded, setExpanded] = useState(false)
  const [expandedRows, setExpandedRows] = useState(maxRows)

  if (!data || data.length === 0) {
    return (
      <GlassCard>
        <div className="p-6 text-center text-gray-500">
          <p>No data available</p>
        </div>
      </GlassCard>
    )
  }

  // Auto-detect columns from first row if not provided
  const detectedColumns = columns || (data.length > 0 ? Object.keys(data[0]) : [])
  const displayColumns = detectedColumns.slice(0, 10) // Limit to 10 columns
  const displayRows = expanded ? data.slice(0, expandedRows) : data.slice(0, maxRows)
  const hasMore = data.length > maxRows && !expanded

  // Format cell value
  const formatCellValue = (value: any, columnName: string): string => {
    if (value === null || value === undefined) return '-'
    
    const colLower = columnName.toLowerCase()
    if (colLower.includes('pct') || colLower.includes('rate') || colLower.includes('percent')) {
      return formatPercent(value)
    }
    if (colLower.includes('revenue') || colLower.includes('value') || colLower.includes('price') || colLower.includes('waste')) {
      return formatCurrency(value)
    }
    if (typeof value === 'number') {
      return formatNumber(value)
    }
    return String(value)
  }

  return (
    <GlassCard>
      <div className="p-6">
        {title && <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {displayColumns.map((col) => (
                      <th
                        key={col}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                      >
                        {prettifyColumnName(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <AnimatePresence>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayRows.map((row, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.01 }}
                        onClick={() => onRowClick && onRowClick(row)}
                        className={clsx(
                          'hover:bg-gray-50 transition-colors',
                          idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                          onRowClick && 'cursor-pointer'
                        )}
                      >
                        {displayColumns.map((col) => (
                          <td
                            key={col}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            {formatCellValue(row[col], col)}
                          </td>
                        ))}
                      </motion.tr>
                    ))}
                  </tbody>
                </AnimatePresence>
              </table>
            </div>
          </div>
        </div>
        {hasMore && expandable && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => {
              setExpanded(true)
              setExpandedRows(100)
            }}
            className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View more ({data.length - maxRows} more rows)
          </motion.button>
        )}
        {expanded && data.length > expandedRows && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setExpandedRows(Math.min(expandedRows + 50, data.length))}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Load more ({Math.min(50, data.length - expandedRows)} more)
          </motion.button>
        )}
        <div className="mt-4 text-xs text-gray-500">
          Showing {displayRows.length} of {data.length} rows
        </div>
      </div>
    </GlassCard>
  )
}

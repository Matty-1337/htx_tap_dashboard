import clsx from 'clsx'

// Typography scales
export const typography = {
  h1: 'text-4xl font-bold tracking-tight',
  h2: 'text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold',
  h4: 'text-xl font-medium',
  body: 'text-base',
  bodySmall: 'text-sm',
  caption: 'text-xs text-gray-500',
}

// Spacing tokens
export const spacing = {
  xs: 'p-2',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
}

// Card styles - glass morphism effect
export const cardStyles = {
  base: 'bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-lg shadow-gray-200/50',
  hover: 'transition-all duration-300 hover:shadow-xl hover:shadow-gray-300/50 hover:-translate-y-0.5',
  glass: 'bg-white/70 backdrop-blur-md border border-gray-200/30 rounded-xl shadow-2xl',
}

// Number formatting helpers
export const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const formatPercent = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return `${num.toFixed(2)}%`
}

// Format KPI value based on key
export const formatKpiValue = (key: string, value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '-'
  
  const keyLower = key.toLowerCase()
  if (keyLower.includes('pct') || keyLower.includes('rate') || keyLower.includes('percent')) {
    return formatPercent(value)
  }
  if (keyLower.includes('revenue') || keyLower.includes('premium') || keyLower.includes('value') || keyLower.includes('waste')) {
    return formatCurrency(value)
  }
  return formatNumber(value)
}

// Prettify column names
export const prettifyColumnName = (name: string): string => {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

// Format key for display
export const formatKey = (key: string): string => {
  return prettifyColumnName(key)
}

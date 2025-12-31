'use client'

import clsx from 'clsx'

interface PillBadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

export function PillBadge({ children, variant = 'default', className }: PillBadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          color: 'rgba(34, 197, 94, 1)',
        }
      case 'warning':
        return {
          backgroundColor: 'rgba(234, 179, 8, 0.2)',
          color: 'rgba(234, 179, 8, 1)',
        }
      case 'danger':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          color: 'rgba(239, 68, 68, 1)',
        }
      default:
        return {
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--card-border)',
        }
    }
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-3 py-1 text-xs font-medium',
        className
      )}
      style={{
        borderRadius: 'var(--radius)',
        ...getVariantStyles(),
      }}
    >
      {children}
    </span>
  )
}

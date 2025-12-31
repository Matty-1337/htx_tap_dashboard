'use client'

import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export type PillBadgeVariant = 'default' | 'success' | 'warning' | 'danger'

export type PillBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: PillBadgeVariant
  className?: string
}

export function PillBadge({ variant = 'default', className, ...props }: PillBadgeProps) {
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
      {...props}
      className={clsx(
        'inline-flex items-center px-3 py-1 text-xs font-medium',
        className
      )}
      style={{
        borderRadius: 'var(--radius)',
        ...getVariantStyles(),
        ...props.style,
      }}
    >
      {props.children}
    </span>
  )
}

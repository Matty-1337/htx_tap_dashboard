'use client'

import { ReactNode } from 'react'
import { GlassCard } from '../GlassCard'
import clsx from 'clsx'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  controls?: ReactNode
}

export function ChartCard({ title, subtitle, children, className, controls }: ChartCardProps) {
  return (
    <GlassCard className={clsx('p-6', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {controls && <div className="flex items-center gap-2">{controls}</div>}
      </div>
      <div className="w-full">
        {children}
      </div>
    </GlassCard>
  )
}

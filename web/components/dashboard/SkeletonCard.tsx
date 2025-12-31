'use client'

import { motion } from 'framer-motion'
import clsx from 'clsx'

interface SkeletonCardProps {
  className?: string
  height?: string
}

export function SkeletonCard({ className, height = 'h-32' }: SkeletonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={clsx(
        'bg-gray-100/50 rounded-xl',
        'animate-pulse',
        height,
        className
      )}
    />
  )
}

export function SkeletonKpiCard() {
  return (
    <SkeletonCard className="p-6">
      <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
      <div className="h-8 w-32 bg-gray-200 rounded" />
    </SkeletonCard>
  )
}

export function SkeletonTable() {
  return (
    <SkeletonCard className="p-6">
      <div className="h-6 w-48 bg-gray-200 rounded mb-4" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-full bg-gray-200 rounded" />
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
      </div>
    </SkeletonCard>
  )
}

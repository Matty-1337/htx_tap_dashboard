'use client'

import { motion } from 'framer-motion'

export function SkeletonShimmer() {
  return (
    <motion.div
      className="absolute inset-0 -translate-x-full"
      animate={{
        translateX: ['0%', '100%'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
      }}
    />
  )
}

'use client'

import { motion } from 'framer-motion'
import type { MetricStat } from '@/components/landing/data'

type MetricPillProps = MetricStat & {
  index: number
}

export function MetricPill({ label, value, trend, index }: MetricPillProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      className="glass-panel rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-lg shadow-slate-900/40"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/60">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {trend ? <p className="text-xs text-emerald-300">{trend}</p> : null}
    </motion.div>
  )
}


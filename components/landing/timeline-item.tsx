'use client'

import { motion } from 'framer-motion'
import type { TimelineStep } from '@/components/landing/data'

type TimelineItemProps = TimelineStep & {
  index: number
}

export function TimelineItem({ icon: Icon, title, description, stage, metric, index }: TimelineItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -32 : 32 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className="relative flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-white"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/30">
        <Icon className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">{stage}</span>
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-200">{metric}</span>
        </div>
        <h4 className="text-lg font-semibold tracking-tight">{title}</h4>
        <p className="text-sm text-white/70">{description}</p>
      </div>
    </motion.div>
  )
}


'use client'

import { motion } from 'framer-motion'
import type { FeatureCardContent } from '@/components/landing/data'
import { cn } from '@/lib/utils'

type FeatureCardProps = FeatureCardContent & {
  index: number
}

export function FeatureCard({ icon: Icon, title, description, badge, points, index }: FeatureCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay: index * 0.08 }}
      className={cn(
        'glass-panel gradient-border relative flex h-full flex-col gap-4 rounded-3xl p-6 text-white shadow-[0_40px_120px_rgba(1,3,9,0.65)]'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg ring-1 ring-white/20">
          <Icon className="h-6 w-6" />
        </div>
        {badge ? (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="text-sm leading-relaxed text-white/70">{description}</p>
      </div>
      {points?.length ? (
        <ul className="mt-auto space-y-1 text-sm text-white/75">
          {points.map((point, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </motion.article>
  )
}


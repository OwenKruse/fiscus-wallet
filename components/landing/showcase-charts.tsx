'use client'

import * as React from 'react'
import { motion, useInView } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, PolarAngleAxis, RadialBar, RadialBarChart, XAxis } from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const performanceData = [
  { label: 'Jan', actual: 120, plan: 95 },
  { label: 'Feb', actual: 138, plan: 112 },
  { label: 'Mar', actual: 156, plan: 132 },
  { label: 'Apr', actual: 180, plan: 150 },
  { label: 'May', actual: 205, plan: 164 },
  { label: 'Jun', actual: 230, plan: 188 },
]

const automationCoverage = [
  { name: 'Smart rules', value: 86, fill: 'hsl(160 93% 45%)' },
  { name: 'Bills ready', value: 72, fill: 'hsl(222 89% 66%)' },
]

const performanceConfig: ChartConfig = {
  actual: {
    label: 'Actual spend',
    color: 'hsl(215 100% 67%)',
  },
  plan: {
    label: 'Plan',
    color: 'hsl(160 100% 40%)',
  },
}

const radialConfig: ChartConfig = {
  'Smart rules': {
    label: 'Spend covered by rules',
    color: 'hsl(160 93% 45%)',
  },
  'Bills ready': {
    label: 'Bills ready ahead of time',
    color: 'hsl(222 89% 66%)',
  },
}

const kpis = [
  { label: 'Spend under smart rules', value: 93, suffix: '%', subtext: 'transactions auto-classified', decimals: 0 },
  { label: 'Goals autofunded', value: 4, suffix: '', subtext: 'active sinking funds', decimals: 0 },
  { label: 'Bill reminder lead time', value: 3, suffix: ' days', subtext: 'before due date', decimals: 0 },
] as const

type AnimatedCounterProps = {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
}

const AnimatedCounter = ({ value, prefix = '', suffix = '', decimals = 0 }: AnimatedCounterProps) => {
  const ref = React.useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-20%' })
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    if (!isInView) return
    const duration = 1200
    let animationFrame: number
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setDisplayValue(progress * value)
      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick)
      }
    }

    animationFrame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(animationFrame)
  }, [isInView, value])

  return (
    <span ref={ref} className="font-mono text-3xl font-semibold text-white">
      {`${prefix}${displayValue.toFixed(decimals)}${suffix}`}
    </span>
  )
}

export function ShowcaseCharts() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
      >
        <Card className="h-full rounded-3xl border border-white/10 bg-white/5 text-white shadow-[0_30px_80px_rgba(3,7,18,0.45)]">
          <CardHeader>
            <CardTitle>Spending vs plan</CardTitle>
            <CardDescription className="text-white/60">Compare actual spend with the plan you set for the month.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={performanceConfig} className="h-[320px] max-w-full">
              <AreaChart data={performanceData} margin={{ left: 0, top: 10, right: 0 }}>
                <defs>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-plan)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-plan)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#9CA3AF" />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={3} fill="url(#netGradient)" />
                <Area
                  type="monotone"
                  dataKey="plan"
                  stroke="var(--color-plan)"
                  strokeDasharray="6 6"
                  fill="url(#forecastGradient)"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 text-white shadow-[0_30px_80px_rgba(3,7,18,0.45)]">
          <CardHeader>
            <CardTitle>Smart rule coverage</CardTitle>
            <CardDescription className="text-white/60">See how much of your money movement is automated.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 lg:flex-row">
            <ChartContainer config={radialConfig} className="h-[260px] lg:h-[280px] lg:w-1/2">
              <RadialBarChart
                data={automationCoverage}
                innerRadius="30%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                barSize={18}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" background cornerRadius={18} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              </RadialBarChart>
            </ChartContainer>
            <div className="space-y-5 lg:w-1/2">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">{kpi.label}</p>
                  <AnimatedCounter value={kpi.value} suffix={kpi.suffix} decimals={kpi.decimals} />
                  <p className="text-white/60">{kpi.subtext}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}


'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, PlayCircle, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FeatureCard } from '@/components/landing/feature-card'
import { MetricPill } from '@/components/landing/metric-pill'
import { TimelineItem } from '@/components/landing/timeline-item'
import { ShowcaseCharts } from '@/components/landing/showcase-charts'
import {
  automationSteps,
  customerLogos,
  featureCards,
  heroStats,
  navLinks,
  securityPoints,
  testimonials,
} from '@/components/landing/data'
import { cn } from '@/lib/utils'

const heroHighlights = [
  {
    title: '',
    value: '',
    subtext: '',
    className: 'left-4 top-6',
  },
  {
    title: 'Goals on track',
    value: '4 / 5',
    subtext: 'for this month',
    className: 'bottom-8 right-6',
  },
] as const

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#040918]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold">F</span>
            <span className="text-base font-semibold tracking-tight">Fiscus Wallet</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-white/80 hover:text-white">
              <Link href="/auth/signin">Sign in</Link>
            </Button>
            <Button asChild className="bg-white text-[#030712] hover:bg-white/90">
              <Link href="/auth/signup">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 transform">
          <div className="h-64 w-[120vw] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent)] blur-3xl" />
        </div>

        <section id="hero" className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-16 pt-20 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-8">
            <Badge variant="outline" className="border-white/20 bg-white/5 text-xs uppercase tracking-[0.3em] text-white/70 backdrop-blur">
              Personal finance OS
            </Badge>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl"
            >
              See every account, plan every goal, and stay under budget without spreadsheets.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-lg leading-relaxed text-white/70"
            >
              Fiscus Wallet is your calm command center for cash, cards, bills, and dreams. Connect banks once and let adaptive
              budgets tell you what&apos;s safe to spend before payday hits.
            </motion.p>
            <div className="flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="group bg-white text-[#030712] hover:bg-white/80">
                <Link href="/auth/signup">
                  Start tracking free
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10">
                <Link href="#analytics">
                  Preview sample budget
                  <PlayCircle className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Bank-level security & private by default
              </div>
              <span className="hidden h-1 w-1 rounded-full bg-white/40 md:inline-block" />
              <span>Thousands of households stay on plan</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="gradient-border glass-panel relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_80px_rgba(4,4,20,0.6)]">
              <div className="soft-grid absolute inset-0 opacity-60" />
              <div className="relative space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Household snapshot</p>
                  <p className="mt-2 text-4xl font-semibold">$14,280</p>
                  <p className="text-sm text-emerald-300">Safe to spend</p>
                </div>
                <div className="space-y-4 rounded-2xl border border-white/10 bg-[#080d1f]/80 p-4">
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>Budget envelopes</span>
                    <span>12 active</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '78%' }}
                      transition={{ duration: 1.2, delay: 0.4 }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-cyan-400"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Goals funded</span>
                    <span>78% to plan</span>
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/80">
                  <div className="flex items-center justify-between">
                    <span>Upcoming bills</span>
                    <span className="text-emerald-300">5 due soon</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Next action</span>
                    <span>Pay card on 12th</span>
                  </div>
                </div>
              </div>
              {heroHighlights.map((highlight, index) => (
                <motion.div
                  key={highlight.title}
                  className={cn(
                    'float-card absolute w-52 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/80 backdrop-blur-xl',
                    highlight.className
                  )}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 6 + index, repeat: Infinity, ease: 'easeInOut', delay: index * 0.5 }}
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">{highlight.title}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{highlight.value}</p>
                  <p className="text-xs text-white/70">{highlight.subtext}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4">
          <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Loved by creators, couples, and families</p>
            <div className="flex flex-wrap items-center gap-6 text-base font-medium text-white/70 sm:justify-between">
              {customerLogos.map((logo) => (
                <span key={logo} className="tracking-[0.2em] text-white/50">
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 w-full max-w-6xl px-4">
          <div className="grid gap-4 md:grid-cols-4">
            {heroStats.map((stat, index) => (
              <MetricPill key={stat.label} {...stat} index={index} />
            ))}
          </div>
        </section>

        <section id="platform" className="mx-auto mt-20 w-full max-w-6xl px-4">
          <div className="space-y-4 text-white">
            <Badge variant="outline" className="border-white/20 bg-white/5 text-xs uppercase tracking-[0.3em] text-white/70">
              Budgets & goals
            </Badge>
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                A calm daily snapshot for every dollar you manage.
              </h2>
              <p className="max-w-2xl text-lg text-white/70">
                Build budgets, envelopes, and goal trackers that update automatically so you never wonder where money went or what&apos;s safe to spend.
              </p>
            </div>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {featureCards.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </section>

        <section id="automation" className="mx-auto mt-24 w-full max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-6">
              <Badge variant="outline" className="border-white/20 bg-white/5 text-xs uppercase tracking-[0.3em] text-white/70">
                Automation
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Personal autopilot with gentle guardrails.
              </h2>
              <p className="text-lg text-white/70">
                Smart rules categorize purchases, move money into goals, and nudge you before bills or budgets drift. You stay in control while the boring work runs itself.
              </p>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80">
                <p className="text-sm uppercase tracking-[0.35em] text-white/50">Weekly autopilot plan</p>
                <div className="mt-4 space-y-3 text-sm">
                  <p>• Move $150 to travel + $75 to rainy-day fund every payday.</p>
                  <p>• Ping me if dining out crosses $300 this month.</p>
                  <p>• Pay Visa card three days before it&apos;s due.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {automationSteps.map((step, index) => (
                <TimelineItem key={step.title} {...step} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="analytics" className="mx-auto mt-24 w-full max-w-6xl px-4">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-4">
              <Badge variant="outline" className="border-white/20 bg-white/5 text-xs uppercase tracking-[0.3em] text-white/70">
                Insights
              </Badge>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Know what&apos;s safe to spend today—and next Friday.
              </h2>
              <p className="text-lg text-white/70">
                Forecast cash flow, compare months, and see upcoming bills next to goal progress so every spending decision has context.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">
                Upcoming bills <span className="text-white">5</span>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">
                Goals funded <span className="text-white">4</span>
              </div>
            </div>
          </div>
          <div className="mt-10">
            <ShowcaseCharts />
          </div>
        </section>

        <section id="security" className="mx-auto mt-24 w-full max-w-6xl px-4">
          <div className="space-y-4">
            <Badge variant="outline" className="border-white/20 bg-white/5 text-xs uppercase tracking-[0.3em] text-white/70">
              Safety
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Bank-level protection, privacy-first choices.</h2>
            <p className="max-w-2xl text-lg text-white/70">
              Your credentials never touch our servers, sensitive fields stay encrypted, and you decide when to export or delete data.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {securityPoints.map((point) => (
              <div key={point.title} className="glass-panel gradient-border rounded-3xl border border-white/10 p-6 text-white">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <point.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{point.title}</h3>
                <p className="mt-2 text-sm text-white/70">{point.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="testimonials" className="mx-auto mt-24 w-full max-w-6xl px-4">
          <div className="space-y-4">
            <Badge variant="outline" className="border-white/20 bg-white/5 text-xs uppercase tracking-[0.3em] text-white/70">
              Proof
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">People actually stick to budgets now.</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="glass-panel gradient-border flex h-full flex-col rounded-3xl border border-white/10 p-6 text-white"
              >
                <p className="text-lg font-medium leading-relaxed text-white/80">“{testimonial.quote}”</p>
                <div className="mt-6 space-y-2 text-sm text-white/70">
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p>
                    {testimonial.title}, {testimonial.company}
                  </p>
                  <p className="text-emerald-300">{testimonial.metric}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="cta" className="mx-auto my-24 w-full max-w-5xl px-4">
          <div className="glass-panel gradient-border rounded-[40px] border border-white/10 p-10 text-center text-white">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Ready to begin</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Give every dollar a job in minutes.</h2>
            <p className="mt-4 text-lg text-white/70">
              Connect accounts, set your first three goals, and let Fiscus keep you informed with gentle daily nudges.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-white text-[#030712] hover:bg-white/80">
                <Link href="/auth/signup">Start tracking free</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="bg-transparent text-white ring-1 ring-white/30 hover:bg-white/10">
                <Link href="/pricing">
                  See pricing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}


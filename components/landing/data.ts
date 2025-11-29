import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  BellRing,
  Fingerprint,
  Gauge,
  Lock,
  PiggyBank,
  Radar,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'

export type NavLink = {
  label: string
  href: string
}

export type MetricStat = {
  label: string
  value: string
  trend?: string
}

export type FeatureCardContent = {
  title: string
  description: string
  icon: LucideIcon
  badge?: string
  points?: string[]
}

export type TimelineStep = {
  title: string
  description: string
  icon: LucideIcon
  stage: string
  metric: string
}

export type SecurityPoint = {
  title: string
  description: string
  icon: LucideIcon
}

export type Testimonial = {
  quote: string
  name: string
  title: string
  company: string
  metric: string
}

export const navLinks: NavLink[] = [
  { label: 'Overview', href: '#hero' },
  { label: 'Budgets', href: '#platform' },
  { label: 'Automation', href: '#automation' },
  { label: 'Insights', href: '#analytics' },
  { label: 'Safety', href: '#security' },
  { label: 'Stories', href: '#testimonials' },
]

export const heroStats: MetricStat[] = [
  { label: 'Avg. monthly savings', value: '+$420', trend: 'with smart rules' },
  { label: 'Bills auto-tracked', value: '32', trend: 'per household' },
  { label: 'Goals hitting schedule', value: '92%', trend: 'within plan' },
  { label: 'Community rating', value: '4.8 / 5', trend: 'across stores' },
]

export const featureCards: FeatureCardContent[] = [
  {
    title: 'Every account, one glance',
    description: 'Link banks, cards, cash, and investments to see where money sits in real time.',
    icon: Wallet,
    badge: 'All accounts',
    points: ['Secure read-only sync', 'Automatic balance refresh'],
  },
  {
    title: 'Budgets that bend, not break',
    description: 'Create envelopes that learn from your habits and auto-adjust when life shifts.',
    icon: Gauge,
    points: ['Recurring + one-off categories', 'Suggested caps from history'],
  },
  {
    title: 'Goal envelopes & sinking funds',
    description: 'Set targets for travel, debt paydown, or rainy days and watch them fill automatically.',
    icon: PiggyBank,
    badge: 'Auto-fund',
    points: ['Rule-based transfers', 'Progress reminders'],
  },
  {
    title: 'Smart nudges & alerts',
    description: 'Get gentle notifications when spending trends spike or bills look off.',
    icon: BellRing,
    points: ['Merchant-level insights', 'Daily digest emails'],
  },
]

export const automationSteps: TimelineStep[] = [
  {
    title: 'Link banks & wallets',
    description: 'Use Plaid-powered sync to pull balances and transactions without storing your credentials.',
    icon: Wallet,
    stage: 'Minute 1',
    metric: 'Accounts in 90s',
  },
  {
    title: 'Auto-categorize everything',
    description: 'Smart tags learn your routines, split transactions, and surface subscriptions you forgot.',
    icon: Sparkles,
    stage: 'Day 2',
    metric: '97% accuracy',
  },
  {
    title: 'Design the monthly plan',
    description: 'Drag sliders to set spending caps, priority goals, and bill reminders in one view.',
    icon: Gauge,
    stage: 'Week 1',
    metric: 'Ready in 15 min',
  },
  {
    title: 'Stay accountable',
    description: 'Progress bars, alerts, and digest emails keep you nudged before you overspend.',
    icon: Radar,
    stage: 'Always on',
    metric: 'Daily clarity',
  },
]

export const securityPoints: SecurityPoint[] = [
  {
    title: 'Private by default',
    description: 'Passkeys and device-based approvals keep your dashboard locked to you.',
    icon: Fingerprint,
  },
  {
    title: 'Encryption end to end',
    description: 'Bank-level TLS plus field encryption before anything touches disk.',
    icon: Lock,
  },
  {
    title: 'Control your data',
    description: 'Export or delete with one click. We never sell data or show ads.',
    icon: BadgeCheck,
  },
  {
    title: 'Always-on monitoring',
    description: 'Background scans watch for unusual logins or sync errors and alert instantly.',
    icon: ShieldCheck,
  },
]

export const testimonials: Testimonial[] = [
  {
    quote: 'I went from spreadsheets and post-its to an inbox that tells me exactly what to pay and what I can splurge on.',
    name: 'Lena Ortiz',
    title: 'Freelance designer',
    company: 'Austin, TX',
    metric: '+$380 saved / mo',
  },
  {
    quote: 'Shared envelopes helped my partner and I align on groceries, daycare, and travel without awkward check-ins.',
    name: 'Marcus & Eli',
    title: 'New parents',
    company: 'Portland, OR',
    metric: 'Debt-free in 9 mo',
  },
  {
    quote: 'The daily digest keeps my ADHD brain in the loop. I actually know where my money is before payday hits.',
    name: 'Priya Shah',
    title: 'Product manager',
    company: 'Seattle, WA',
    metric: '4 goals funded',
  },
]

export const customerLogos = ['Indie Collective', 'Sidekick Homes', 'Morning Ledger', 'Northwind Creators', 'Budget Club']


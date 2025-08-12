import { PrismaClient } from '@prisma/client'
import { BillingHistoryData } from '../../types/subscription'

export interface IBillingHistoryService {
  getBillingHistory(userId: string, limit?: number, offset?: number): Promise<BillingHistoryData[]>
  getBillingHistoryBySubscription(subscriptionId: string, limit?: number, offset?: number): Promise<BillingHistoryData[]>
  createBillingRecord(data: CreateBillingRecordData): Promise<BillingHistoryData>
  getBillingRecord(id: string): Promise<BillingHistoryData | null>
  getTotalBillingAmount(userId: string, startDate?: Date, endDate?: Date): Promise<number>
  getInvoiceData(billingRecordId: string): Promise<InvoiceData | null>
}

export interface CreateBillingRecordData {
  subscriptionId: string
  userId: string
  stripeInvoiceId?: string
  amount: number
  currency: string
  status: string
  billingReason: string
  periodStart: Date
  periodEnd: Date
  paidAt?: Date
}

export interface InvoiceData {
  billingRecord: BillingHistoryData
  subscription: {
    id: string
    tier: string
    billingCycle: string
  }
  user: {
    id: string
    email?: string
    name?: string
  }
  lineItems: InvoiceLineItem[]
}

export interface InvoiceLineItem {
  description: string
  amount: number
  currency: string
  periodStart: Date
  periodEnd: Date
}

export class BillingHistoryService implements IBillingHistoryService {
  constructor(private prisma: PrismaClient) {}

  async getBillingHistory(userId: string, limit: number = 50, offset: number = 0): Promise<BillingHistoryData[]> {
    const records = await this.prisma.billingHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return records.map(this.mapPrismaToBillingHistory)
  }

  async getBillingHistoryBySubscription(subscriptionId: string, limit: number = 50, offset: number = 0): Promise<BillingHistoryData[]> {
    const records = await this.prisma.billingHistory.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return records.map(this.mapPrismaToBillingHistory)
  }

  async createBillingRecord(data: CreateBillingRecordData): Promise<BillingHistoryData> {
    const record = await this.prisma.billingHistory.create({
      data: {
        subscriptionId: data.subscriptionId,
        userId: data.userId,
        stripeInvoiceId: data.stripeInvoiceId,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        billingReason: data.billingReason,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        paidAt: data.paidAt,
      }
    })

    return this.mapPrismaToBillingHistory(record)
  }

  async getBillingRecord(id: string): Promise<BillingHistoryData | null> {
    const record = await this.prisma.billingHistory.findUnique({
      where: { id }
    })

    return record ? this.mapPrismaToBillingHistory(record) : null
  }

  async getTotalBillingAmount(userId: string, startDate?: Date, endDate?: Date): Promise<number> {
    const whereClause: any = {
      userId,
      status: 'paid'
    }

    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = startDate
      }
      if (endDate) {
        whereClause.createdAt.lte = endDate
      }
    }

    const result = await this.prisma.billingHistory.aggregate({
      where: whereClause,
      _sum: {
        amount: true
      }
    })

    return Number(result._sum.amount) || 0
  }

  async getInvoiceData(billingRecordId: string): Promise<InvoiceData | null> {
    const billingRecord = await this.prisma.billingHistory.findUnique({
      where: { id: billingRecordId },
      include: {
        subscription: true
      }
    })

    if (!billingRecord) {
      return null
    }

    // Get user data from Nile users table
    const user = await this.prisma.$queryRaw<Array<{ id: string; email?: string; name?: string }>>`
      SELECT id, email, name FROM users.users WHERE id = ${billingRecord.userId}::uuid
    `

    const userData = user[0] || { id: billingRecord.userId }

    // Create line items based on billing reason and subscription tier
    const lineItems: InvoiceLineItem[] = []
    
    if (billingRecord.billingReason === 'subscription_cycle') {
      const tierName = billingRecord.subscription.tier.charAt(0).toUpperCase() + 
                      billingRecord.subscription.tier.slice(1).toLowerCase()
      const cycleText = billingRecord.subscription.billingCycle === 'YEARLY' ? 'Annual' : 'Monthly'
      
      lineItems.push({
        description: `${tierName} Plan - ${cycleText} Subscription`,
        amount: Number(billingRecord.amount),
        currency: billingRecord.currency,
        periodStart: billingRecord.periodStart,
        periodEnd: billingRecord.periodEnd
      })
    } else {
      lineItems.push({
        description: billingRecord.billingReason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        amount: Number(billingRecord.amount),
        currency: billingRecord.currency,
        periodStart: billingRecord.periodStart,
        periodEnd: billingRecord.periodEnd
      })
    }

    return {
      billingRecord: this.mapPrismaToBillingHistory(billingRecord),
      subscription: {
        id: billingRecord.subscription.id,
        tier: billingRecord.subscription.tier,
        billingCycle: billingRecord.subscription.billingCycle
      },
      user: userData,
      lineItems
    }
  }

  private mapPrismaToBillingHistory(record: any): BillingHistoryData {
    return {
      id: record.id,
      subscriptionId: record.subscriptionId,
      userId: record.userId,
      stripeInvoiceId: record.stripeInvoiceId,
      amount: Number(record.amount),
      currency: record.currency,
      status: record.status,
      billingReason: record.billingReason,
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      paidAt: record.paidAt,
      createdAt: record.createdAt
    }
  }
}
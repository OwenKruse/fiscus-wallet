import { describe, it, expect, beforeEach, vi } from 'vitest'

import { InvoiceService } from '../../../../lib/subscription/invoice-service'
import { authMiddleware } from '../../../../lib/auth/auth-middleware'

// Mock the auth middleware
vi.mock('../../../../lib/auth/auth-middleware', () => ({
  authMiddleware: vi.fn()
}))

const mockAuthMiddleware = vi.mocked(authMiddleware)

describe('/api/billing/invoice/[id]', () => {
  let mockPrisma: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = {
      billingHistory: {
        findFirst: vi.fn(),
        findUnique: vi.fn()
      },
      $queryRaw: vi.fn()
    }
    vi.mocked(PrismaClient).mockImplementation(() => mockPrisma)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET', () => {
    const mockBillingRecord = {
      id: 'bill-1',
      subscriptionId: 'sub-1',
      userId: 'user-123',
      stripeInvoiceId: 'inv_123',
      amount: 5.00,
      currency: 'usd',
      status: 'paid',
      billingReason: 'subscription_cycle',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-02-01'),
      paidAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      subscription: {
        id: 'sub-1',
        tier: 'GROWTH',
        billingCycle: 'MONTHLY'
      }
    }

    const mockUser = [{ id: 'user-123', email: 'test@example.com', name: 'Test User' }]

    it('should return invoice data in JSON format by default', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: true,
        userId: 'user-123'
      })

      mockPrisma.billingHistory.findFirst.mockResolvedValue({
        id: 'bill-1',
        userId: 'user-123'
      })

      mockPrisma.billingHistory.findUnique.mockResolvedValue(mockBillingRecord)
      mockPrisma.$queryRaw.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/billing/invoice/bill-1')
      const response = await GET(request, { params: { id: 'bill-1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.invoice.billingRecord.id).toBe('bill-1')
      expect(data.data.downloadUrls.html).toBe('/api/billing/invoice/bill-1?format=html')
      expect(data.data.downloadUrls.pdf).toBe('/api/billing/invoice/bill-1?format=pdf')
    })

    it('should return HTML format when requested', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: true,
        userId: 'user-123'
      })

      mockPrisma.billingHistory.findFirst.mockResolvedValue({
        id: 'bill-1',
        userId: 'user-123'
      })

      mockPrisma.billingHistory.findUnique.mockResolvedValue(mockBillingRecord)
      mockPrisma.$queryRaw.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/billing/invoice/bill-1?format=html')
      const response = await GET(request, { params: { id: 'bill-1' } })
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/html')
      expect(html).toContain('Invoice #')
      expect(html).toContain('Growth Plan - Monthly Subscription')
      expect(html).toContain('test@example.com')
    })

    it('should return PDF format when requested', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: true,
        userId: 'user-123'
      })

      mockPrisma.billingHistory.findFirst.mockResolvedValue({
        id: 'bill-1',
        userId: 'user-123'
      })

      mockPrisma.billingHistory.findUnique.mockResolvedValue(mockBillingRecord)
      mockPrisma.$queryRaw.mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/billing/invoice/bill-1?format=pdf')
      const response = await GET(request, { params: { id: 'bill-1' } })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: false,
        error: 'No token provided'
      })

      const request = new NextRequest('http://localhost:3000/api/billing/invoice/bill-1')
      const response = await GET(request, { params: { id: 'bill-1' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 404 for billing record not owned by user', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: true,
        userId: 'user-123'
      })

      mockPrisma.billingHistory.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/billing/invoice/bill-1')
      const response = await GET(request, { params: { id: 'bill-1' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('BILLING_RECORD_NOT_FOUND')
    })

    it('should return 500 if invoice generation fails', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: true,
        userId: 'user-123'
      })

      mockPrisma.billingHistory.findFirst.mockResolvedValue({
        id: 'bill-1',
        userId: 'user-123'
      })

      mockPrisma.billingHistory.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/billing/invoice/bill-1')
      const response = await GET(request, { params: { id: 'bill-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVOICE_GENERATION_FAILED')
    })

    it('should handle database errors gracefully', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: true,
        userId: 'user-123'
      })

      mockPrisma.billingHistory.findFirst.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost:3000/api/billing/invoice/bill-1')
      const response = await GET(request, { params: { id: 'bill-1' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })
})
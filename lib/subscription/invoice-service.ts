import { BillingHistoryService, InvoiceData } from './billing-history-service'
import { PrismaClient } from '@prisma/client'

export interface IInvoiceService {
  generateInvoice(billingRecordId: string): Promise<InvoiceData | null>
  generateInvoicePDF(billingRecordId: string): Promise<Buffer | null>
  getInvoiceHTML(invoiceData: InvoiceData): string
}

export class InvoiceService implements IInvoiceService {
  private billingHistoryService: BillingHistoryService

  constructor(private prisma: PrismaClient) {
    this.billingHistoryService = new BillingHistoryService(prisma)
  }

  async generateInvoice(billingRecordId: string): Promise<InvoiceData | null> {
    return this.billingHistoryService.getInvoiceData(billingRecordId)
  }

  async generateInvoicePDF(billingRecordId: string): Promise<Buffer | null> {
    const invoiceData = await this.generateInvoice(billingRecordId)
    if (!invoiceData) {
      return null
    }

    const html = this.getInvoiceHTML(invoiceData)
    
    // For now, we'll return a simple text-based PDF representation
    // In a production environment, you would use a library like puppeteer or jsPDF
    // to generate actual PDFs from HTML
    
    try {
      // This is a placeholder implementation
      // In production, you would use something like:
      // const puppeteer = require('puppeteer')
      // const browser = await puppeteer.launch()
      // const page = await browser.newPage()
      // await page.setContent(html)
      // const pdf = await page.pdf({ format: 'A4' })
      // await browser.close()
      // return pdf
      
      // For now, return HTML as buffer for demonstration
      return Buffer.from(html, 'utf-8')
    } catch (error) {
      console.error('Error generating PDF:', error)
      return null
    }
  }

  getInvoiceHTML(invoiceData: InvoiceData): string {
    const { billingRecord, subscription, user, lineItems } = invoiceData
    
    const formatCurrency = (amount: number, currency: string) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
      }).format(amount)
    }

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date)
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${billingRecord.id}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
        }
        .invoice-info {
            text-align: right;
        }
        .invoice-number {
            font-size: 18px;
            font-weight: 600;
            color: #374151;
        }
        .invoice-date {
            color: #6b7280;
            margin-top: 5px;
        }
        .billing-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
        }
        .billing-section h3 {
            margin: 0 0 10px 0;
            color: #374151;
            font-size: 16px;
        }
        .billing-section p {
            margin: 5px 0;
            color: #6b7280;
        }
        .line-items {
            margin-bottom: 30px;
        }
        .line-items table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .line-items th,
        .line-items td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .line-items th {
            background-color: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        .line-items .amount {
            text-align: right;
        }
        .total-section {
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
            text-align: right;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .total-amount {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status.paid {
            background-color: #d1fae5;
            color: #065f46;
        }
        .status.failed {
            background-color: #fee2e2;
            color: #991b1b;
        }
        .status.pending {
            background-color: #fef3c7;
            color: #92400e;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">Finance Dashboard</div>
        <div class="invoice-info">
            <div class="invoice-number">Invoice #${billingRecord.id.slice(-8).toUpperCase()}</div>
            <div class="invoice-date">${formatDate(billingRecord.createdAt)}</div>
            <div class="status ${billingRecord.status}">${billingRecord.status}</div>
        </div>
    </div>

    <div class="billing-details">
        <div class="billing-section">
            <h3>Bill To:</h3>
            <p><strong>${user.name || 'Customer'}</strong></p>
            <p>${user.email || 'No email on file'}</p>
            <p>Customer ID: ${user.id.slice(-8).toUpperCase()}</p>
        </div>
        <div class="billing-section">
            <h3>Billing Period:</h3>
            <p><strong>${formatDate(billingRecord.periodStart)} - ${formatDate(billingRecord.periodEnd)}</strong></p>
            <p>Subscription: ${subscription.tier} (${subscription.billingCycle})</p>
            ${billingRecord.paidAt ? `<p>Paid: ${formatDate(billingRecord.paidAt)}</p>` : ''}
            ${billingRecord.stripeInvoiceId ? `<p>Stripe Invoice: ${billingRecord.stripeInvoiceId}</p>` : ''}
        </div>
    </div>

    <div class="line-items">
        <h3>Invoice Details</h3>
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Period</th>
                    <th class="amount">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${lineItems.map(item => `
                    <tr>
                        <td>${item.description}</td>
                        <td>${formatDate(item.periodStart)} - ${formatDate(item.periodEnd)}</td>
                        <td class="amount">${formatCurrency(item.amount, item.currency)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="total-section">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(billingRecord.amount, billingRecord.currency)}</span>
        </div>
        <div class="total-row">
            <span>Tax:</span>
            <span>$0.00</span>
        </div>
        <div class="total-row total-amount">
            <span>Total:</span>
            <span>${formatCurrency(billingRecord.amount, billingRecord.currency)}</span>
        </div>
    </div>

    <div class="footer">
        <p>Thank you for your business!</p>
        <p>If you have any questions about this invoice, please contact our support team.</p>
    </div>
</body>
</html>
    `.trim()
  }
}
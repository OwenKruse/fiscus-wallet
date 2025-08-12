import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '../../../../../lib/subscription/invoice-service'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../../../../../lib/auth/auth-middleware'

const prisma = new PrismaClient()
const invoiceService = new InvoiceService(prisma)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply authentication middleware
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    const userId = authResult.userId!
    const billingRecordId = params.id
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json, html, pdf

    // Verify the billing record belongs to the user
    const billingRecord = await prisma.billingHistory.findFirst({
      where: {
        id: billingRecordId,
        userId
      }
    })

    if (!billingRecord) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'BILLING_RECORD_NOT_FOUND',
          message: 'Billing record not found or access denied'
        }
      }, { status: 404 })
    }

    const invoiceData = await invoiceService.generateInvoice(billingRecordId)
    
    if (!invoiceData) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVOICE_GENERATION_FAILED',
          message: 'Failed to generate invoice data'
        }
      }, { status: 500 })
    }

    // Handle different response formats
    switch (format) {
      case 'html':
        const html = invoiceService.getInvoiceHTML(invoiceData)
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `inline; filename="invoice-${billingRecordId.slice(-8)}.html"`
          }
        })

      case 'pdf':
        const pdfBuffer = await invoiceService.generateInvoicePDF(billingRecordId)
        if (!pdfBuffer) {
          return NextResponse.json({
            success: false,
            error: {
              code: 'PDF_GENERATION_FAILED',
              message: 'Failed to generate PDF'
            }
          }, { status: 500 })
        }

        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${billingRecordId.slice(-8)}.pdf"`
          }
        })

      default: // json
        return NextResponse.json({
          success: true,
          data: {
            invoice: invoiceData,
            downloadUrls: {
              html: `/api/billing/invoice/${billingRecordId}?format=html`,
              pdf: `/api/billing/invoice/${billingRecordId}?format=pdf`
            }
          }
        })
    }

  } catch (error) {
    console.error('Error generating invoice:', error)
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate invoice'
      }
    }, { status: 500 })
  }
}
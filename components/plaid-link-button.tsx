"use client"

import { useState } from 'react'
import { usePlaid } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Link, Plus, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { PlaidLinkInitializer } from './plaid-link-initializer'

interface PlaidLinkButtonProps {
  onSuccess?: () => void
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  children?: React.ReactNode
  className?: string
}

export function PlaidLinkButton({
  onSuccess,
  variant = 'default',
  size = 'default',
  children,
  className
}: PlaidLinkButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { createLinkToken, exchangeToken, createLinkTokenState, exchangeTokenState } = usePlaid()
  const { toast } = useToast()

  const handleOpenPlaidLink = async () => {
    setIsOpen(true)
    setIsConnecting(true)
    setConnectionStatus('connecting')
    setErrorMessage(null)

    try {
      // Create link token - userId will be handled by auth middleware
      const linkTokenResponse = await createLinkToken()
      setLinkToken(linkTokenResponse.linkToken)
      setIsConnecting(false)
    } catch (error) {
      console.error('Failed to create link token:', error)
      setErrorMessage('Failed to initialize bank connection. Please try again.')
      setConnectionStatus('error')
      setIsConnecting(false)
      toast({
        title: "Connection Error",
        description: "Failed to connect to your bank. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePlaidSuccess = async (publicToken: string, metadata: any) => {
    setConnectionStatus('connecting')

    try {
      await exchangeToken({
        publicToken
      })

      setConnectionStatus('success')
      toast({
        title: "Success",
        description: "Your bank account has been connected successfully!",
      })

      // Close dialog after a short delay
      setTimeout(() => {
        setIsOpen(false)
        setConnectionStatus('idle')
        setLinkToken(null)
        onSuccess?.()
      }, 2000)

    } catch (error) {
      console.error('Failed to exchange token:', error)
      setErrorMessage('Failed to complete bank connection. Please try again.')
      setConnectionStatus('error')
      toast({
        title: "Connection Error",
        description: "Failed to complete bank connection. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePlaidExit = (err: any, metadata: any) => {
    if (err) {
      console.error('Plaid Link error:', err)
      setErrorMessage('Bank connection was cancelled or failed.')
      setConnectionStatus('error')
      toast({
        title: "Connection Cancelled",
        description: "Bank connection was cancelled.",
        variant: "destructive",
      })
    } else {
      setIsOpen(false)
      setConnectionStatus('idle')
      setLinkToken(null)
    }
  }

  const handleRetry = () => {
    setConnectionStatus('idle')
    setErrorMessage(null)
    handleOpenPlaidLink()
  }

  return (
    <>
      <Button
        onClick={handleOpenPlaidLink}
        variant={variant}
        size={size}
        className={className}
        disabled={createLinkTokenState.isLoading}
      >
        {createLinkTokenState.isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Link className="h-4 w-4 mr-2" />
        )}
        {children || 'Connect Bank Account'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogPortal>
          <DialogOverlay className="!z-[100]" />
          <DialogContent className="sm:max-w-[500px] !z-[101]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Connect Your Bank Account
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {connectionStatus === 'idle' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Secure Bank Connection</CardTitle>
                    <CardDescription>
                      Connect your bank account to automatically sync your financial data
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Bank-level security with Plaid</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Automatic transaction sync</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Real-time account balances</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {connectionStatus === 'connecting' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm text-gray-600">
                      {isConnecting ? 'Initializing secure connection...' : 'Connecting to your bank...'}
                    </p>
                  </div>

                  {linkToken && (
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Connection Progress</span>
                        <Badge variant="secondary">In Progress</Badge>
                      </div>
                      <Progress value={isConnecting ? 30 : 70} className="h-2" />
                    </div>
                  )}
                </div>
              )}

              {connectionStatus === 'success' && (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-600">Connection Successful!</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Your bank account has been connected successfully.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 justify-center">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Account data will sync automatically</span>
                  </div>
                </div>
              )}

              {connectionStatus === 'error' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                    <h3 className="text-lg font-semibold text-red-600 mt-2">Connection Failed</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {errorMessage || 'Failed to connect to your bank account.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleRetry} className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {linkToken && connectionStatus === 'connecting' && !isConnecting && (
                <div className="border rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      You will be redirected to your bank's secure login page.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-700">
                        <strong>Security Note:</strong> Your bank credentials are never stored and are only used for secure authentication.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>

      {/* Plaid Link Initializer */}
      <PlaidLinkInitializer
        linkToken={linkToken}
        onSuccess={handlePlaidSuccess}
        onExit={handlePlaidExit}
        onLoad={() => {
          setIsOpen(false)
          setIsConnecting(false)
        }}
      />
    </>
  )
} 
"use client"

import { useEffect, useRef } from 'react'
import { usePlaid } from '@/hooks/use-api'

interface PlaidLinkInitializerProps {
  linkToken: string | null
  onSuccess: (publicToken: string, metadata: any) => void
  onExit: (err: any, metadata: any) => void
  onLoad?: () => void
}

export function PlaidLinkInitializer({
  linkToken,
  onSuccess,
  onExit,
  onLoad
}: PlaidLinkInitializerProps) {
  const plaidRef = useRef<any>(null)
  const { exchangeToken } = usePlaid()

  useEffect(() => {
    if (!linkToken) return

    // Dynamically import Plaid Link
    const initializePlaidLink = async () => {
      try {
        // Check if Plaid is already loaded
        if (typeof window !== 'undefined' && (window as any).Plaid) {
          const { Plaid } = window as any
          initializeLink(Plaid)
        } else {
          // Load Plaid Link script
          const script = document.createElement('script')
          script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
          script.onload = () => {
            const { Plaid } = window as any
            initializeLink(Plaid)
          }
          script.onerror = () => {
            console.error('Failed to load Plaid Link script')
            onExit(new Error('Failed to load Plaid Link'), {})
          }
          document.head.appendChild(script)
        }
      } catch (error) {
        console.error('Failed to initialize Plaid Link:', error)
        onExit(error, {})
      }
    }

    const initializeLink = (Plaid: any) => {
      try {
        const config = {
          token: linkToken,
          onSuccess: (publicToken: string, metadata: any) => {
            console.log('Plaid Link success:', { publicToken, metadata })
            onSuccess(publicToken, metadata)
          },
          onExit: (err: any, metadata: any) => {
            console.log('Plaid Link exit:', { err, metadata })
            onExit(err, metadata)
          },
          onLoad: () => {
            console.log('Plaid Link loaded')
            onLoad?.()
          },
          onEvent: (eventName: string, metadata: any) => {
            console.log('Plaid Link event:', eventName, metadata)
          }
        }

        plaidRef.current = Plaid.create(config)
        plaidRef.current.open()
      } catch (error) {
        console.error('Failed to create Plaid Link:', error)
        onExit(error, {})
      }
    }

    initializePlaidLink()

    // Cleanup function
    return () => {
      if (plaidRef.current) {
        try {
          plaidRef.current.destroy()
        } catch (error) {
          console.error('Failed to destroy Plaid Link:', error)
        }
      }
    }
  }, [linkToken, onSuccess, onExit, onLoad])

  // This component doesn't render anything visible
  return null
} 
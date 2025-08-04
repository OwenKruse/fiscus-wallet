"use client"

import { useEffect, useRef } from 'react'
import { usePlaid } from '@/hooks/use-api'

interface PlaidInvestmentLinkInitializerProps {
  linkToken: string | null
  onSuccess: (publicToken: string, metadata: any) => void
  onExit: (err: any, metadata: any) => void
  onLoad?: () => void
}

export function PlaidInvestmentLinkInitializer({ 
  linkToken, 
  onSuccess, 
  onExit, 
  onLoad 
}: PlaidInvestmentLinkInitializerProps) {
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
        console.error('Failed to initialize Plaid Investment Link:', error)
        onExit(error, {})
      }
    }

    const initializeLink = (Plaid: any) => {
      try {
        const config = {
          token: linkToken,
          onSuccess: (publicToken: string, metadata: any) => {
            console.log('Plaid Investment Link success:', { publicToken, metadata })
            onSuccess(publicToken, metadata)
          },
          onExit: (err: any, metadata: any) => {
            console.log('Plaid Investment Link exit:', { err, metadata })
            onExit(err, metadata)
          },
          onLoad: () => {
            console.log('Plaid Investment Link loaded')
            onLoad?.()
          },
          onEvent: (eventName: string, metadata: any) => {
            console.log('Plaid Investment Link event:', eventName, metadata)
            
            // Log investment-specific events
            if (eventName === 'HANDOFF') {
              console.log('Investment account handoff initiated')
            } else if (eventName === 'MATCHED_SELECT_INSTITUTION') {
              console.log('Investment institution selected:', metadata.institution_name)
            } else if (eventName === 'SUBMIT_CREDENTIALS') {
              console.log('Investment credentials submitted')
            }
          }
        }

        plaidRef.current = Plaid.create(config)
        plaidRef.current.open()
      } catch (error) {
        console.error('Failed to create Plaid Investment Link:', error)
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
          console.error('Failed to destroy Plaid Investment Link:', error)
        }
      }
    }
  }, [linkToken, onSuccess, onExit, onLoad])

  // This component doesn't render anything visible
  return null
}
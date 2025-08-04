"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, ArrowRight, Shield, Fingerprint, Smartphone, Mail, Lock, User, Apple, Chrome, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useAuthContext } from "@/components/auth-provider"
import { PublicRoute } from "@/components/protected-route"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [signInMethod, setSignInMethod] = useState<"email" | "phone" | "biometric">("email")
  
  const { signIn, error, clearError, signInState } = useAuthContext()
  const { isLoading, isSuccess } = signInState

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    try {
      await signIn({ email, password })
    } catch (error) {
      // Error is handled by the auth context
      console.error('Sign in error:', error)
    }
  }

  const handleSocialSignIn = (provider: string) => {
    console.log(`Sign in with ${provider}`)
  }

  return (
    <PublicRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.02)_0%,transparent_50%)] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <div className="text-3xl font-serif font-bold text-black tracking-tight">Fiscus</div>
          </Link>
          <h1 className="text-2xl font-semibold text-black mb-2">Sign in to your account</h1>
          <p className="text-gray-600">Welcome back to Fiscus Financial</p>
        </div>

        {/* Main Sign In Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Sign In Method Selector */}
            <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
              <button
                onClick={() => setSignInMethod("email")}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  signInMethod === "email" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"
                }`}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </button>
              <button
                onClick={() => setSignInMethod("phone")}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  signInMethod === "phone" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"
                }`}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Phone
              </button>
              <button
                onClick={() => setSignInMethod("biometric")}
                className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  signInMethod === "biometric" ? "bg-white text-black shadow-sm" : "text-gray-600 hover:text-black"
                }`}
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                Touch ID
              </button>
            </div>

            {/* Email Sign In Form */}
            {signInMethod === "email" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 border-gray-200 focus:border-black focus:ring-black transition-colors text-base"
                      required
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 border-gray-200 focus:border-black focus:ring-black transition-colors text-base"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-gray-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
                    />
                    <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-black hover:text-gray-600 transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-black text-white hover:bg-gray-800 transition-all duration-300 font-medium text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-lg"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      Sign in with Fiscus
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </div>
                  )}
                </Button>
              </form>
            )}

            {/* Phone Sign In */}
            {signInMethod === "phone" && (
              <div className="space-y-4">
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="Phone number"
                    className="pl-10 h-12 border-gray-200 focus:border-black focus:ring-black transition-colors text-base"
                  />
                </div>
                <Button className="w-full h-12 bg-black text-white hover:bg-gray-800 transition-all duration-300 font-medium text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  Send verification code
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Biometric Sign In */}
            {signInMethod === "biometric" && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center">
                    <Fingerprint className="h-10 w-10 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black mb-2">Use Touch ID</h3>
                  <p className="text-gray-600 text-sm">Place your finger on the sensor to sign in securely</p>
                </div>
                <Button className="w-full h-12 bg-black text-white hover:bg-gray-800 transition-all duration-300 font-medium text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  Authenticate with Touch ID
                </Button>
              </div>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social Sign In Options */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialSignIn("Apple")}
                className="w-full h-12 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 font-medium text-base bg-transparent"
              >
                <Apple className="h-5 w-5 mr-3" />
                Continue with Apple
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialSignIn("Google")}
                className="w-full h-12 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 font-medium text-base bg-transparent"
              >
                <Chrome className="h-5 w-5 mr-3" />
                Continue with Google
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-100">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-black mb-1">Bank-level security</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                Your data is protected with 256-bit SSL encryption and multi-factor authentication. We never store your
                credentials in plain text.
              </p>
            </div>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-black font-semibold hover:text-gray-600 transition-colors">
              Create one now
            </Link>
          </p>
        </div>

        {/* Footer Links */}
        <div className="flex justify-center space-x-6 mt-8 text-xs text-gray-500">
          <Link href="/privacy" className="hover:text-gray-700 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-gray-700 transition-colors">
            Terms of Service
          </Link>
          <Link href="/support" className="hover:text-gray-700 transition-colors">
            Support
          </Link>
        </div>
      </div>

        {/* Error Display */}
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Success Display */}
        {isSuccess && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md">
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Sign in successful! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-16 h-16 bg-black/5 rounded-full animate-float opacity-30"></div>
        <div className="absolute bottom-20 right-10 w-12 h-12 bg-black/10 rounded-full animate-float-delay opacity-20"></div>
        <div className="absolute top-1/2 left-5 w-8 h-8 bg-black/15 rounded-full animate-float-delay-2 opacity-10"></div>
      </div>
    </PublicRoute>
  )
}

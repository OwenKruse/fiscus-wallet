"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Mail,
  Lock,
  User,
  Phone,
  Building,
  Apple,
  Chrome,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { useAuthContext } from "@/components/auth-provider"
import { PublicRoute } from "@/components/protected-route"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    confirmPassword: "",
  })
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptMarketing, setAcceptMarketing] = useState(false)
  
  const { signUp, error, clearError, signUpState } = useAuthContext()
  const { isLoading, isSuccess } = signUpState

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const [passwordMismatch, setPasswordMismatch] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setPasswordMismatch(false)
    
    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      setPasswordMismatch(true)
      return
    }
    
    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        company: formData.company,
      })
    } catch (error) {
      // Error is handled by the auth context
      console.error('Sign up error:', error)
    }
  }

  const passwordRequirements = [
    { text: "At least 8 characters", met: formData.password.length >= 8 },
    { text: "Contains uppercase letter", met: /[A-Z]/.test(formData.password) },
    { text: "Contains lowercase letter", met: /[a-z]/.test(formData.password) },
    { text: "Contains number", met: /\d/.test(formData.password) },
  ]

  return (
    <PublicRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(0,0,0,0.02)_0%,transparent_50%)] pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <div className="text-3xl font-serif font-bold text-black tracking-tight">Fiscus</div>
          </Link>
          <h1 className="text-2xl font-semibold text-black mb-2">Create your account</h1>
          <p className="text-gray-600">Join thousands of professionals managing their wealth with Fiscus</p>
        </div>

        {/* Main Sign Up Card */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="pl-10 h-12 border-gray-200 focus:border-black focus:ring-black transition-colors text-base"
                    required
                  />
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="h-12 border-gray-200 focus:border-black focus:ring-black transition-colors text-base"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-black focus:ring-black transition-colors text-base"
                  required
                />
              </div>

              {/* Phone */}
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-black focus:ring-black transition-colors text-base"
                />
              </div>

              {/* Company */}
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Company (optional)"
                  value={formData.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-black focus:ring-black transition-colors text-base"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
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

              {/* Password Requirements */}
              {formData.password && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Password requirements:</p>
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle
                        className={`h-4 w-4 ${req.met ? "text-green-600" : "text-gray-300"} transition-colors`}
                      />
                      <span className={`text-sm ${req.met ? "text-green-600" : "text-gray-500"} transition-colors`}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirm Password */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className={`pl-10 pr-10 h-12 border-gray-200 focus:border-black focus:ring-black transition-colors text-base ${
                    passwordMismatch && formData.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password Mismatch Error */}
              {passwordMismatch && formData.confirmPassword && (
                <div className="text-red-500 text-sm flex items-center space-x-1">
                  <AlertCircle className="h-4 w-4" />
                  <span>Passwords do not match</span>
                </div>
              )}

              {/* Terms and Marketing */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                    className="border-gray-300 data-[state=checked]:bg-black data-[state=checked]:border-black mt-0.5"
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms" className="text-black font-medium hover:text-gray-600 transition-colors">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-black font-medium hover:text-gray-600 transition-colors">
                      Privacy Policy
                    </Link>
                  </label>
                </div>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="marketing"
                    checked={acceptMarketing}
                    onCheckedChange={(checked) => setAcceptMarketing(checked as boolean)}
                    className="border-gray-300 data-[state=checked]:bg-black data-[state=checked]:border-black mt-0.5"
                  />
                  <label htmlFor="marketing" className="text-sm text-gray-600 cursor-pointer leading-relaxed">
                    I'd like to receive market insights and product updates via email
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !acceptTerms}
                className="w-full h-12 bg-black text-white hover:bg-gray-800 transition-all duration-300 font-medium text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:shadow-lg disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  <div className="flex items-center">
                    Create Fiscus account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </div>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or sign up with</span>
              </div>
            </div>

            {/* Social Sign Up Options */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 font-medium text-base bg-transparent"
              >
                <Apple className="h-5 w-5 mr-3" />
                Continue with Apple
              </Button>
              <Button
                type="button"
                variant="outline"
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
              <h4 className="text-sm font-semibold text-black mb-1">Your data is secure</h4>
              <p className="text-xs text-gray-600 leading-relaxed">
                We use industry-standard encryption and never share your personal information with third parties.
              </p>
            </div>
          </div>
        </div>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-black font-semibold hover:text-gray-600 transition-colors">
              Sign in
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
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-lg">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {error.includes('already exists') && (
                  <div className="mt-2">
                    <Link href="/auth/signin" className="text-sm underline hover:no-underline">
                      Sign in to your existing account
                    </Link>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Success Display */}
        {isSuccess && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-lg">
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Account created successfully! Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Floating Elements */}
        <div className="absolute top-20 right-10 w-16 h-16 bg-black/5 rounded-full animate-float opacity-30"></div>
        <div className="absolute bottom-20 left-10 w-12 h-12 bg-black/10 rounded-full animate-float-delay opacity-20"></div>
      </div>
    </PublicRoute>
  )
}

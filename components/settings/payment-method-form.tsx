'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CreditCard, 
  Shield, 
  AlertCircle, 
  CheckCircle,
  Edit,
  Plus,
  Trash2
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface PaymentMethodFormProps {
  className?: string;
}

interface PaymentMethodData {
  methods: PaymentMethod[];
  loading: boolean;
  error: string | null;
}

export function PaymentMethodForm({ className }: PaymentMethodFormProps) {
  const [paymentData, setPaymentData] = useState<PaymentMethodData>({
    methods: [],
    loading: true,
    error: null
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvc: '',
    name: '',
    email: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US'
    }
  });

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      setPaymentData(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/billing/payment-methods');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to fetch payment methods');
      }
      
      setPaymentData({
        methods: result.data || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setPaymentData({
        methods: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payment methods'
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      handleInputChange('cardNumber', formatted);
    }
  };

  const handleExpiryChange = (field: 'expiryMonth' | 'expiryYear', value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (field === 'expiryMonth' && numericValue.length <= 2) {
      const month = parseInt(numericValue);
      if (month >= 1 && month <= 12) {
        handleInputChange(field, numericValue.padStart(2, '0'));
      } else if (numericValue === '') {
        handleInputChange(field, '');
      }
    } else if (field === 'expiryYear' && numericValue.length <= 4) {
      handleInputChange(field, numericValue);
    }
  };

  const handleCvcChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 4) {
      handleInputChange('cvc', numericValue);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length < 13) {
      errors.push('Valid card number is required');
    }
    
    if (!formData.expiryMonth || !formData.expiryYear) {
      errors.push('Expiry date is required');
    } else {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const expYear = parseInt(formData.expiryYear);
      const expMonth = parseInt(formData.expiryMonth);
      
      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        errors.push('Card has expired');
      }
    }
    
    if (!formData.cvc || formData.cvc.length < 3) {
      errors.push('Valid CVC is required');
    }
    
    if (!formData.name.trim()) {
      errors.push('Cardholder name is required');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setSubmitError(validationErrors.join(', '));
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/billing/payment-method', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardNumber: formData.cardNumber.replace(/\s/g, ''),
          expMonth: parseInt(formData.expiryMonth),
          expYear: parseInt(formData.expiryYear),
          cvc: formData.cvc,
          name: formData.name,
          email: formData.email,
          address: formData.address
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to update payment method');
      }
      
      // Reset form and refresh payment methods
      setFormData({
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        cvc: '',
        name: '',
        email: '',
        address: {
          line1: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'US'
        }
      });
      setIsEditing(false);
      await fetchPaymentMethods();
      
    } catch (error) {
      console.error('Error updating payment method:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to update payment method');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/billing/payment-method/${paymentMethodId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to delete payment method');
      }
      
      await fetchPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to delete payment method');
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      const response = await fetch(`/api/billing/payment-method/${paymentMethodId}/default`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to set default payment method');
      }
      
      await fetchPaymentMethods();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to set default payment method');
    }
  };

  const getBrandIcon = (brand: string) => {
    // You could add specific brand icons here
    return <CreditCard className="h-4 w-4" />;
  };

  if (paymentData.loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Methods
        </CardTitle>
        <CardDescription>
          Manage your payment methods for subscription billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {paymentData.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{paymentData.error}</AlertDescription>
          </Alert>
        )}

        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Existing Payment Methods */}
        {paymentData.methods.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Saved Payment Methods</h3>
            <div className="space-y-3">
              {paymentData.methods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getBrandIcon(method.brand)}
                    <div>
                      <div className="font-medium">
                        {method.brand.toUpperCase()} •••• {method.last4}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Expires {method.expMonth.toString().padStart(2, '0')}/{method.expYear}
                        {method.isDefault && (
                          <span className="ml-2 text-green-600 font-medium">Default</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add/Edit Payment Method Form */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-medium">
              {paymentData.methods.length > 0 ? 'Add New Payment Method' : 'Add Payment Method'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  maxLength={19}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="expiryMonth">Expiry Month</Label>
                <Input
                  id="expiryMonth"
                  type="text"
                  placeholder="MM"
                  value={formData.expiryMonth}
                  onChange={(e) => handleExpiryChange('expiryMonth', e.target.value)}
                  maxLength={2}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="expiryYear">Expiry Year</Label>
                <Input
                  id="expiryYear"
                  type="text"
                  placeholder="YYYY"
                  value={formData.expiryYear}
                  onChange={(e) => handleExpiryChange('expiryYear', e.target.value)}
                  maxLength={4}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  type="text"
                  placeholder="123"
                  value={formData.cvc}
                  onChange={(e) => handleCvcChange(e.target.value)}
                  maxLength={4}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="name">Cardholder Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Billing Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="address.line1">Address Line 1</Label>
                  <Input
                    id="address.line1"
                    type="text"
                    placeholder="123 Main St"
                    value={formData.address.line1}
                    onChange={(e) => handleInputChange('address.line1', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="address.city">City</Label>
                  <Input
                    id="address.city"
                    type="text"
                    placeholder="New York"
                    value={formData.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="address.state">State</Label>
                  <Input
                    id="address.state"
                    type="text"
                    placeholder="NY"
                    value={formData.address.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="address.postalCode">Postal Code</Label>
                  <Input
                    id="address.postalCode"
                    type="text"
                    placeholder="10001"
                    value={formData.address.postalCode}
                    onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="address.country">Country</Label>
                  <Input
                    id="address.country"
                    type="text"
                    value={formData.address.country}
                    onChange={(e) => handleInputChange('address.country', e.target.value)}
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Your payment information is securely processed by Stripe
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Payment Method
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex gap-3">
            <Button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              {paymentData.methods.length > 0 ? (
                <>
                  <Plus className="h-4 w-4" />
                  Add Payment Method
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Add Payment Method
                </>
              )}
            </Button>
            {paymentData.methods.length === 0 && (
              <Button
                variant="outline"
                onClick={fetchPaymentMethods}
              >
                Refresh
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
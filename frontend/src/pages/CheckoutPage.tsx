import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course } from '../types';
import { ShieldCheck, CheckCircle2, AlertOctagon, ArrowLeft, Lock, CreditCard } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const referenceParam = searchParams.get('reference');
  const stripeRefParam = searchParams.get('stripe_ref');

  // ALL HOOKS MUST BE DECLARED UNCONDITIONALLY AT TOP LEVEL
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ discountAmount: number; finalPrice: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'mpesa' | 'paystack' | 'paypal'>('stripe');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (stripeRefParam) {
      handleVerifyStripeReference(stripeRefParam);
    } else if (referenceParam) {
      handleVerifyPaystackReference(referenceParam);
    } else if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId, referenceParam, stripeRefParam]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get('/courses');
      const found = res.data.courses.find((c: Course) => c.id === courseId);
      if (found) {
        setCourse(found);
        if (found.isEnrolled) {
          setError('YOU_ARE_ALREADY_ENROLLED');
        }
      } else {
        setError('Course not found in catalog.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load course details.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !course) return;
    try {
      const res = await api.post('/payments/validate-coupon', {
        code: couponCode,
        price: course.price,
      });
      setAppliedCoupon(res.data.coupon);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Invalid coupon code.');
    }
  };

  const handleProcessPayment = async () => {
    if (!course) return;
    try {
      setProcessing(true);
      setError(null);

      if (paymentMethod === 'stripe') {
        const res = await api.post('/payments/stripe/initialize', {
          courseId: course.id,
          couponCode: appliedCoupon ? couponCode : undefined,
        });

        if (res.data.success) {
          if (res.data.alreadyEnrolled && res.data.courseSlug) {
            navigate(`/courses/${res.data.courseSlug}/learn`);
            return;
          }

          if (res.data.checkoutUrl && res.data.checkoutUrl.startsWith('http') && !res.data.checkoutUrl.includes('/checkout?stripe_ref=')) {
            window.location.href = res.data.checkoutUrl;
          } else {
            // Direct verification for demo/sandbox Stripe mode
            await handleVerifyStripeReference(res.data.reference);
          }
        }
      } else if (paymentMethod === 'paystack' || paymentMethod === 'mpesa') {
        const res = await api.post('/payments/paystack/initialize', {
          courseId: course.id,
          couponCode: appliedCoupon ? couponCode : undefined,
        });

        if (res.data.success) {
          if (res.data.alreadyEnrolled && res.data.courseSlug) {
            navigate(`/courses/${res.data.courseSlug}/learn`);
            return;
          }

          if (res.data.authorization_url) {
            window.location.href = res.data.authorization_url;
          } else if (res.data.reference) {
            await handleVerifyPaystackReference(res.data.reference);
          }
        }
      } else {
        // PayPal
        const res = await api.post('/payments/stripe/initialize', {
          courseId: course.id,
          couponCode: appliedCoupon ? couponCode : undefined,
        });
        if (res.data.alreadyEnrolled && res.data.courseSlug) {
          navigate(`/courses/${res.data.courseSlug}/learn`);
          return;
        }
        if (res.data.reference) {
          await handleVerifyStripeReference(res.data.reference);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.data?.message?.includes('already enrolled')) {
        setError('YOU_ARE_ALREADY_ENROLLED');
      } else {
        setError(err.response?.data?.message || 'Payment processing failed.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyStripeReference = async (ref: string) => {
    try {
      setVerifying(true);
      setLoading(true);
      const res = await api.get(`/payments/stripe/verify/${ref}`);
      if (res.data.success) {
        setPaymentSuccess(true);
        setSuccessData(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Stripe payment verification failed.');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleVerifyPaystackReference = async (ref: string) => {
    try {
      setVerifying(true);
      setLoading(true);
      const res = await api.get(`/payments/paystack/verify/${ref}`);
      if (res.data.success) {
        setPaymentSuccess(true);
        setSuccessData(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Paystack payment verification failed.');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A1322] text-[#F8FAFC] space-y-4 font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4FD1C5] border-t-transparent"></div>
        {verifying && <p className="text-sm font-semibold text-[#CBD5E1]">Verifying Payment Confirmation...</p>}
      </div>
    );
  }

  if (paymentSuccess && successData) {
    return (
      <div className="min-h-screen bg-[#0A1322] text-[#F8FAFC] py-16 px-4 flex items-center justify-center font-sans">
        <div className="bg-[#132742] border border-[#22C55E]/30 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center mx-auto shadow-lg shadow-[#22C55E]/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs font-black uppercase rounded-full">
              Payment Successful ✓
            </span>
            <h2 className="text-2xl font-black text-[#F8FAFC]">Enrollment Confirmed!</h2>
            <p className="text-xs text-[#CBD5E1]">Thank you! You are now enrolled in {successData.courseTitle || 'your course'}.</p>
          </div>

          <div className="p-4 bg-[#0E1D33] border border-[#23426A] rounded-2xl text-left text-xs space-y-2 text-[#CBD5E1]">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Transaction Reference</span>
              <span className="font-mono text-[#4FD1C5]">{successData.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Status</span>
              <span className="font-bold text-[#22C55E]">COMPLETED</span>
            </div>
          </div>

          <Link
            to={`/courses/${successData.courseSlug || course?.slug || ''}/learn`}
            className="w-full py-3.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 flex items-center justify-center space-x-2 transition"
          >
            <span>Start Learning Now</span>
          </Link>
        </div>
      </div>
    );
  }

  // Handle Already Enrolled State
  if (error === 'YOU_ARE_ALREADY_ENROLLED' || course?.isEnrolled) {
    return (
      <div className="min-h-screen bg-[#0A1322] text-[#F8FAFC] flex items-center justify-center p-6 font-sans">
        <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-8 max-w-md text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#1A365D] border border-[#4FD1C5]/30 text-[#4FD1C5] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">You Are Already Enrolled! 🎉</h2>
          <p className="text-xs text-[#CBD5E1]">
            You already have active lifetime access to <strong>{course?.title || 'this course'}</strong>.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              to={`/courses/${course?.slug || ''}/learn`}
              className="w-full py-3 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] text-xs font-bold rounded-xl shadow-md transition"
            >
              Start Learning Now →
            </Link>
            <Link
              to="/dashboard"
              className="w-full py-2.5 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] text-[#CBD5E1] text-xs font-bold rounded-xl"
            >
              Go to Student Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-[#0A1322] text-[#F8FAFC] flex items-center justify-center p-6 font-sans">
        <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-8 max-w-md text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center mx-auto">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">Payment Could Not Be Completed</h2>
          <p className="text-xs text-[#CBD5E1]">{error || 'Course not found.'}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] text-[#CBD5E1] text-xs font-bold rounded-xl">
              Try Again
            </button>
            <Link to="/courses" className="px-4 py-2 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] text-xs font-bold rounded-xl">
              Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const finalAmount = appliedCoupon ? appliedCoupon.finalPrice : course.price;

  return (
    <div className="bg-[#0A1322] text-[#F8FAFC] min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-xs font-medium text-[#94A3B8]">
          <Link to="/" className="hover:text-[#4FD1C5]">Home</Link>
          <span>/</span>
          <span className="text-[#F8FAFC] font-semibold">Checkout</span>
        </nav>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Order Summary (Left) */}
          <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-sm font-bold text-[#F8FAFC]">Order Summary</h2>

            <div className="flex items-center space-x-4 p-3 bg-[#0E1D33] border border-[#23426A] rounded-xl">
              <img
                src={course.thumbnail || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80'}
                alt={course.title}
                className="w-16 h-12 object-cover rounded-lg bg-[#0A1322]"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[#F8FAFC] line-clamp-1">{course.title}</h3>
                <p className="text-xs text-[#94A3B8]">{course.instructor?.name || 'Khalil Instructor'}</p>
                <p className="text-xs font-bold text-[#4FD1C5] mt-1">${course.price.toFixed(2)}</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#23426A] text-xs text-[#CBD5E1]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-[#F8FAFC]">${course.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Fee</span>
                <span className="font-semibold text-[#F8FAFC]">$0.00</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#F8FAFC] pt-3 border-t border-[#23426A]">
                <span>Total</span>
                <span className="text-[#4FD1C5] text-base">${finalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Choose Payment Method (Right) */}
          <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-sm font-bold text-[#F8FAFC]">Choose Payment Method</h2>

            {/* Payment Method Selector Cards */}
            <div className="space-y-3">
              {/* Stripe Option */}
              <label
                onClick={() => setPaymentMethod('stripe')}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                  paymentMethod === 'stripe' ? 'border-[#4FD1C5] bg-[#1A365D]/40' : 'border-[#23426A] bg-[#0E1D33] hover:border-[#4FD1C5]/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input type="radio" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} className="accent-[#4FD1C5]" />
                  <div>
                    <h4 className="text-xs font-bold text-[#F8FAFC]">Stripe Payment</h4>
                    <p className="text-[11px] text-[#94A3B8]">Pay securely with Credit / Debit Card via Stripe</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#4FD1C5]/20 text-[#4FD1C5] text-[10px] font-extrabold rounded">RECOMMENDED</span>
              </label>

              {/* M-PESA Option */}
              <label
                onClick={() => setPaymentMethod('mpesa')}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                  paymentMethod === 'mpesa' ? 'border-[#4FD1C5] bg-[#1A365D]/40' : 'border-[#23426A] bg-[#0E1D33] hover:border-[#4FD1C5]/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input type="radio" checked={paymentMethod === 'mpesa'} onChange={() => setPaymentMethod('mpesa')} className="accent-[#4FD1C5]" />
                  <div>
                    <h4 className="text-xs font-bold text-[#F8FAFC]">M-PESA</h4>
                    <p className="text-[11px] text-[#94A3B8]">Pay securely with M-PESA mobile money</p>
                  </div>
                </div>
              </label>

              {/* Paystack Option */}
              <label
                onClick={() => setPaymentMethod('paystack')}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                  paymentMethod === 'paystack' ? 'border-[#4FD1C5] bg-[#1A365D]/40' : 'border-[#23426A] bg-[#0E1D33] hover:border-[#4FD1C5]/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input type="radio" checked={paymentMethod === 'paystack'} onChange={() => setPaymentMethod('paystack')} className="accent-[#4FD1C5]" />
                  <div>
                    <h4 className="text-xs font-bold text-[#F8FAFC]">Paystack Gateway</h4>
                    <p className="text-[11px] text-[#94A3B8]">Pay with Paystack portal</p>
                  </div>
                </div>
              </label>
            </div>

            {/* M-PESA Phone Number Input */}
            {paymentMethod === 'mpesa' && (
              <div>
                <label className="block text-xs font-bold text-[#CBD5E1] uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="w-full px-4 py-2.5 bg-[#0E1D33] border border-[#23426A] rounded-xl text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#4FD1C5]"
                />
              </div>
            )}

            {/* Action Submit Button */}
            <button
              onClick={handleProcessPayment}
              disabled={processing}
              className="w-full py-3.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition text-sm flex items-center justify-center space-x-2"
            >
              <Lock className="h-4 w-4" />
              <span>
                {processing
                  ? 'Processing Payment...'
                  : `Pay $${finalAmount.toFixed(2)} with ${paymentMethod === 'stripe' ? 'Stripe' : paymentMethod === 'mpesa' ? 'M-PESA' : 'Paystack'}`}
              </span>
            </button>

            {/* Security Footer Badge */}
            <div className="pt-2 text-center text-xs text-[#94A3B8] flex items-center justify-center space-x-1">
              <span>Encrypted & secure payments via</span>
              <span className="font-bold text-[#4FD1C5] font-sans tracking-tight uppercase">{paymentMethod}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};



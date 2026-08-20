import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course } from '../types';
import { ShieldCheck, CheckCircle2, AlertOctagon, ArrowLeft, Lock, CreditCard, Sparkles } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const referenceParam = searchParams.get('reference') || searchParams.get('trxref');

  // State
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ discountAmount: number; finalPrice: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    if (referenceParam) {
      handleVerifyPaystackReference(referenceParam);
    } else if (courseId) {
      fetchCourseDetails();
    } else {
      setLoading(false);
      setError('No course specified for checkout.');
    }
  }, [courseId, referenceParam]);

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

      const res = await api.post('/payments/initialize', {
        courseId: course.id,
        couponCode: appliedCoupon ? couponCode : undefined,
      });

      if (res.data.success) {
        if (res.data.alreadyEnrolled && res.data.courseSlug) {
          navigate(`/courses/${res.data.courseSlug}/learn`);
          return;
        }

        if (res.data.freeWithCoupon && res.data.courseSlug) {
          navigate(`/courses/${res.data.courseSlug}/learn`);
          return;
        }

        if (res.data.authorization_url) {
          // Redirect to official Paystack checkout
          window.location.href = res.data.authorization_url;
        } else if (res.data.reference) {
          await handleVerifyPaystackReference(res.data.reference);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 409 || err.response?.data?.message?.includes('already enrolled')) {
        setError('YOU_ARE_ALREADY_ENROLLED');
      } else {
        setError(err.response?.data?.message || 'Unable to initialize payment. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyPaystackReference = async (ref: string) => {
    try {
      setVerifying(true);
      setLoading(true);
      const res = await api.get(`/payments/verify/${encodeURIComponent(ref)}`);
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
        {verifying ? (
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-[#F8FAFC]">Verifying Payment with Paystack...</p>
            <p className="text-xs text-[#94A3B8]">Confirming your transaction and activating course access.</p>
          </div>
        ) : (
          <p className="text-sm font-semibold text-[#CBD5E1]">Loading Checkout Details...</p>
        )}
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
              Payment Confirmed ✓
            </span>
            <h2 className="text-2xl font-black text-[#F8FAFC]">Enrollment Complete!</h2>
            <p className="text-xs text-[#CBD5E1]">
              Thank you! You now have lifetime access to <span className="text-[#F8FAFC] font-semibold">{successData.courseTitle || 'your course'}</span>.
            </p>
          </div>

          <div className="p-4 bg-[#0E1D33] border border-[#23426A] rounded-2xl text-left text-xs space-y-2 text-[#CBD5E1]">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Transaction Reference</span>
              <span className="font-mono text-[#4FD1C5] truncate max-w-[200px]">{successData.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Payment Provider</span>
              <span className="font-bold text-[#F8FAFC]">Paystack</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Access Status</span>
              <span className="font-bold text-[#22C55E]">ACTIVE LIFETIME ACCESS</span>
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
  if (error === 'YOU_ARE_ALREADY_ENROLLED' && course) {
    return (
      <div className="min-h-screen bg-[#0A1322] text-[#F8FAFC] flex items-center justify-center p-6 font-sans">
        <div className="bg-[#132742] border border-[#22C55E]/30 rounded-3xl p-8 max-w-md text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#F8FAFC]">Already Enrolled</h2>
          <p className="text-xs text-[#CBD5E1]">
            You already have active access to <span className="font-semibold text-white">"{course.title}"</span>.
          </p>
          <div className="pt-2">
            <Link
              to={`/courses/${course.slug}/learn`}
              className="w-full py-3 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition"
            >
              <span>Go to Course Player</span>
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
          <p className="text-xs text-[#CBD5E1]">{error || 'Unable to proceed with course checkout.'}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] text-[#CBD5E1] text-xs font-bold rounded-xl transition">
              Try Again
            </button>
            <Link to="/courses" className="px-4 py-2 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] text-xs font-bold rounded-xl transition">
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
          <Link to={`/courses/${course.slug}`} className="hover:text-[#4FD1C5] truncate max-w-[200px]">{course.title}</Link>
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
                <p className="text-xs font-bold text-[#4FD1C5] mt-1">{course.price.toFixed(0)} KSH</p>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Coupon Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo coupon"
                  className="flex-1 px-3 py-2 bg-[#0E1D33] border border-[#23426A] rounded-xl text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#4FD1C5]"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-[#1A365D] hover:bg-[#23426A] text-[#4FD1C5] font-bold text-xs rounded-xl border border-[#4FD1C5]/30 transition"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[#23426A] text-xs text-[#CBD5E1]">
              <div className="flex justify-between">
                <span>Tuition Price</span>
                <span className="font-semibold text-[#F8FAFC]">{course.price.toFixed(0)} KSH</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-[#22C55E]">
                  <span>Coupon Discount</span>
                  <span className="font-semibold">-{appliedCoupon.discountAmount.toFixed(0)} KSH</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Processing Fee</span>
                <span className="font-semibold text-[#22C55E]">Free (0 KSH)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#F8FAFC] pt-3 border-t border-[#23426A]">
                <span>Total Due</span>
                <span className="text-[#4FD1C5] text-base">{finalAmount.toFixed(0)} KSH</span>
              </div>
            </div>
          </div>

          {/* Payment Method & Paystack Checkout (Right) */}
          <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-sm font-bold text-[#F8FAFC]">Secure Payment via Paystack</h2>

            {/* Paystack Channel Cards Info */}
            <div className="p-4 rounded-xl border border-[#4FD1C5] bg-[#1A365D]/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-[#4FD1C5]" />
                  <div>
                    <h4 className="text-xs font-bold text-[#F8FAFC]">Paystack Checkout</h4>
                    <p className="text-[11px] text-[#94A3B8]">M-Pesa, Card, Bank Transfer, Apple Pay</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#4FD1C5]/20 text-[#4FD1C5] text-[10px] font-extrabold rounded">OFFICIAL GATEWAY</span>
              </div>
              <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                You will be securely redirected to Paystack's encrypted portal to complete your enrollment with your preferred payment method.
              </p>
            </div>

            {/* Action Submit Button */}
            <button
              onClick={handleProcessPayment}
              disabled={processing}
              className="w-full py-3.5 bg-[#4FD1C5] hover:bg-[#38B2AC] disabled:opacity-50 text-[#0A1322] font-extrabold rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition text-sm flex items-center justify-center space-x-2"
            >
              <Lock className="h-4 w-4" />
              <span>
                {processing
                  ? 'Redirecting to Paystack...'
                  : `Pay ${finalAmount.toFixed(0)} KSH with Paystack`}
              </span>
            </button>

            {/* Security Footer Badge */}
            <div className="pt-2 text-center text-xs text-[#94A3B8] flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
              <span>256-Bit SSL Encrypted Payment via</span>
              <span className="font-bold text-[#4FD1C5] uppercase">Paystack</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

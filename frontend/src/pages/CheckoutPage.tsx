import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Course } from '../types';
import { ShieldCheck, CheckCircle2, AlertOctagon, Lock, CreditCard } from 'lucide-react';

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
        setError(err.response?.data?.message || 'Payment initialization failed. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifyPaystackReference = async (reference: string) => {
    try {
      setVerifying(true);
      setError(null);

      const res = await api.get(`/payments/verify/${reference}`);

      if (res.data.success || res.data.status === 'COMPLETED' || res.data.payment) {
        const pInfo = res.data.payment || res.data;
        setPaymentSuccess(true);
        setSuccessData({
          reference: pInfo.reference || reference,
          courseTitle: pInfo.courseTitle || course?.title || 'Your Course',
          courseSlug: pInfo.courseSlug || course?.slug || '',
          ...pInfo,
        });
      } else {
        setError(res.data.message || 'Payment verification could not be completed.');
      }
    } catch (err: any) {
      if (err.response?.data?.status === 'COMPLETED' || err.response?.data?.message?.includes('already verified')) {
        const pInfo = err.response?.data?.payment || err.response?.data || {};
        setPaymentSuccess(true);
        setSuccessData({
          reference: pInfo.reference || reference,
          courseTitle: pInfo.courseTitle || course?.title || 'Your Course',
          courseSlug: pInfo.courseSlug || course?.slug || '',
          ...pInfo,
        });
      } else {
        setError(err.response?.data?.message || 'Payment verification failed.');
      }
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white space-y-4 font-sans transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#087F78] border-t-transparent"></div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono tracking-wide">
          {verifying ? 'Verifying payment with Paystack...' : 'Loading checkout details...'}
        </p>
      </div>
    );
  }

  // Handle Payment Success State
  if (paymentSuccess && successData) {
    return (
      <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white flex items-center justify-center p-6 font-sans transition-colors">
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-8 max-w-md w-full text-center shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] text-xs font-bold font-mono uppercase rounded-full">
              Payment Confirmed ✓
            </span>
            <h2 className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white">Enrollment Complete!</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Thank you! You now have lifetime access to <span className="text-[#0B1F3A] dark:text-white font-bold">{successData.courseTitle || 'your course'}</span>.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-2xl text-left text-xs space-y-2 text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Transaction Reference</span>
              <span className="font-mono text-[#087F78] dark:text-[#14B8A6] truncate max-w-[200px]">{successData.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Payment Provider</span>
              <span className="font-bold text-[#0B1F3A] dark:text-white">Paystack</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Access Status</span>
              <span className="font-bold text-[#10B981]">ACTIVE LIFETIME ACCESS</span>
            </div>
          </div>

          <Link
            to={`/courses/${successData.courseSlug || course?.slug || ''}/learn`}
            className="w-full py-3.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-2 transition"
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
      <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white flex items-center justify-center p-6 font-sans transition-colors">
        <div className="bg-white dark:bg-[#102A43] border border-teal-200 dark:border-teal-700/50 rounded-3xl p-8 max-w-md text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white">Already Enrolled</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            You already have active access to <span className="font-semibold text-[#0B1F3A] dark:text-white">"{course.title}"</span>.
          </p>
          <div className="pt-2">
            <Link
              to={`/courses/${course.slug}/learn`}
              className="w-full py-3 bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-xs"
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
      <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white flex items-center justify-center p-6 font-sans transition-colors">
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-8 max-w-md text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[#EF4444] flex items-center justify-center mx-auto">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-white">Payment Could Not Be Completed</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{error || 'Unable to proceed with course checkout.'}</p>
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition">
              Try Again
            </button>
            <Link to="/courses" className="px-4 py-2 bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold rounded-xl transition shadow-xs">
              Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const finalAmount = appliedCoupon ? appliedCoupon.finalPrice : course.price;

  return (
    <div className="bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans pb-24 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-[#087F78] dark:hover:text-[#14B8A6]">Home</Link>
          <span>/</span>
          <Link to={`/courses/${course.slug}`} className="hover:text-[#087F78] dark:hover:text-[#14B8A6] truncate max-w-[200px]">{course.title}</Link>
          <span>/</span>
          <span className="text-[#0B1F3A] dark:text-white font-bold">Checkout</span>
        </nav>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Order Summary (Left) */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-sm font-bold text-[#0B1F3A] dark:text-white">Order Summary</h2>

            <div className="flex items-center space-x-4 p-3 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl">
              <img
                src={course.thumbnail || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80'}
                alt={course.title}
                className="w-16 h-12 object-cover rounded-lg bg-slate-200 dark:bg-slate-700"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white line-clamp-1">{course.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{course.instructor?.name || 'Khalil Instructor'}</p>
                <p className="text-xs font-bold text-[#087F78] dark:text-[#14B8A6] mt-1">{course.price.toFixed(0)} KSH</p>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Coupon Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo coupon"
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#087F78] dark:text-[#14B8A6] font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-[#1E3A56] text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Tuition Price</span>
                <span className="font-semibold text-[#0B1F3A] dark:text-white">{course.price.toFixed(0)} KSH</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-[#10B981]">
                  <span>Coupon Discount</span>
                  <span className="font-semibold">-{appliedCoupon.discountAmount.toFixed(0)} KSH</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Processing Fee</span>
                <span className="font-semibold text-[#10B981]">Free (0 KSH)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#0B1F3A] dark:text-white pt-3 border-t border-slate-100 dark:border-[#1E3A56]">
                <span>Total Due</span>
                <span className="text-[#087F78] dark:text-[#14B8A6] text-base">{finalAmount.toFixed(0)} KSH</span>
              </div>
            </div>
          </div>

          {/* Payment Method & Paystack Checkout (Right) */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-sm font-bold text-[#0B1F3A] dark:text-white">Secure Payment via Paystack</h2>

            {/* Paystack Channel Cards Info */}
            <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-700/50 bg-teal-50/50 dark:bg-[#087F78]/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-[#087F78] dark:text-[#14B8A6]" />
                  <div>
                    <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-white">Paystack Checkout</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">M-Pesa, Card, Bank Transfer, Apple Pay</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#087F78] text-white text-[10px] font-bold rounded">OFFICIAL GATEWAY</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                You will be securely redirected to Paystack's encrypted portal to complete your enrollment with your preferred payment method.
              </p>
            </div>

            {/* Action Submit Button */}
            <button
              onClick={handleProcessPayment}
              disabled={processing}
              className="w-full py-3.5 bg-[#087F78] hover:bg-[#076E6A] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition text-sm flex items-center justify-center space-x-2"
            >
              <Lock className="h-4 w-4" />
              <span>
                {processing
                  ? 'Redirecting to Paystack...'
                  : `Pay ${finalAmount.toFixed(0)} KSH with Paystack`}
              </span>
            </button>

            {/* Security Footer Badge */}
            <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>256-Bit SSL Encrypted Payment via</span>
              <span className="font-bold text-[#087F78] dark:text-[#14B8A6] uppercase">Paystack</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

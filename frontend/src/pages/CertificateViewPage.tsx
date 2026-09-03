import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Certificate } from '../types';
import {
  Share2,
  ArrowLeft,
  ExternalLink,
  Download,
  Award,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { exportCertificateToPdf } from '../utils/exportCertificatePdf';

export const CertificateViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchCertificate();
  }, [id]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/certificates/${id}`);
      const cert: Certificate = res.data.certificate;
      setCertificate(cert);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load certificate record.');
    } finally {
      setLoading(false);
    }
  };

  const certNumber = certificate?.certificateNumber || certificate?.id || id || '';
  const officialVerificationUrl = `https://khalilacademy.com/verify/${certNumber}`;
  const localVerificationRoute = `/verify/${certNumber}`;

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await exportCertificateToPdf('academic-certificate-document', `KhalilAcademy_Certificate_${certNumber}.pdf`);
    } catch (err: any) {
      console.error('DOM export error, falling back to server API export:', err);
      try {
        const response = await api.get(`/certificates/${certNumber}/download`, {
          responseType: 'blob',
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `KhalilAcademy_Certificate_${certNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (fallbackErr) {
        alert('Failed to download certificate PDF. Please try again.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(officialVerificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLinkedInShare = () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(officialVerificationUrl)}`;
    window.open(shareUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white space-y-4 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#087F78] border-t-transparent"></div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide">Loading Official Academic Credential...</p>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white flex items-center justify-center p-6 font-sans transition-colors">
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-8 max-w-md text-center space-y-4 shadow-xs">
          <Award className="h-12 w-12 text-[#F59E0B] mx-auto" />
          <h2 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white">Certificate Unavailable</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{error || 'Certificate record could not be found in the registry.'}</p>
          <Link
            to="/student/certificates"
            className="inline-block px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Return to My Certificates
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(certificate.issueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const status = certificate?.status || (certificate?.isRevoked ? 'REVOKED' : 'ACTIVE');

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white py-10 px-3 sm:px-6 lg:px-8 font-sans pb-24 transition-colors">
      
      {/* Top Action Bar (Print Hidden) */}
      <div className="max-w-[1120px] mx-auto mb-6 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <Link
          to="/student/certificates"
          className="flex items-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] transition"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Certificates
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {status === 'ACTIVE' ? (
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs transition shadow-xs disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{downloading ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
          ) : (
            <button
              disabled
              className="flex items-center space-x-2 px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed opacity-60"
            >
              <Download className="h-4 w-4" />
              <span>Download Disabled ({status})</span>
            </button>
          )}

          <Link
            to={localVerificationRoute}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0B1F3A] dark:text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            <ShieldCheck className="h-4 w-4 text-[#087F78] dark:text-[#14B8A6]" />
            <span>Verify Credential</span>
          </Link>

          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0B1F3A] dark:text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            {copied ? <Check className="h-4 w-4 text-[#10B981]" /> : <ExternalLink className="h-4 w-4 text-slate-500 dark:text-[#A9BACB]" />}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          {status === 'ACTIVE' && (
            <button
              onClick={handleLinkedInShare}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#0A66C2] hover:bg-[#004182] text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              <Share2 className="h-4 w-4" />
              <span>Share Credential</span>
            </button>
          )}
        </div>
      </div>

      {/* Prominent Lifecycle Alert Callout */}
      {status === 'REVOKED' && (
        <div className="max-w-[1120px] mx-auto mb-6 p-5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 print:hidden space-y-2 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="font-extrabold text-sm text-red-700 dark:text-red-300 flex items-center gap-1.5">
              🚫 OFFICIAL CERTIFICATE REVOKED
            </span>
            {certificate.course && (
              <Link
                to={`/learn/${certificate.course.slug || certificate.courseId}`}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition"
              >
                Go to Course Re-Certification →
              </Link>
            )}
          </div>
          <p className="text-slate-700 dark:text-slate-300">
            This certificate has been revoked and is permanently invalid. Reason:{' '}
            <strong className="text-red-800 dark:text-red-200">
              {certificate.revocationReason || 'Requirements bypassed or improper coursework.'}
            </strong>
          </p>
        </div>
      )}

      {status === 'SUSPENDED' && (
        <div className="max-w-[1120px] mx-auto mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 print:hidden shadow-xs">
          <span className="font-bold text-amber-800 dark:text-amber-300">
            ⚠️ CERTIFICATE SUSPENDED UNDER ADMINISTRATIVE REVIEW
          </span>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            This certificate is temporarily invalid while coursework is under review. Reason: {certificate.suspensionReason || 'Administrative verification.'}
          </p>
        </div>
      )}

      {status === 'REPLACED' && (
        <div className="max-w-[1120px] mx-auto mb-6 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 print:hidden flex items-center justify-between gap-4 shadow-xs">
          <div>
            <span className="font-bold text-indigo-800 dark:text-indigo-300">
              ℹ️ CERTIFICATE SUPERSEDED & REPLACED
            </span>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
              This historical certificate was replaced by an updated credential earned through re-certification.
            </p>
          </div>
          {certificate.replacedByCertificateNumber && (
            <Link
              to={`/certificates/${certificate.replacedByCertificateNumber}`}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition shrink-0"
            >
              View Active Replacement Credential ({certificate.replacedByCertificateNumber}) →
            </Link>
          )}
        </div>
      )}

      {/* Main Certificate Presentation Wrapper (Scrollable on small mobile) */}
      <div className="max-w-[1140px] mx-auto overflow-x-auto pb-6">
        
        {/* Printable & Exportable Academic Certificate Document (A4 Landscape Proportions) */}
        <div
          id="academic-certificate-document"
          className="w-[1080px] min-w-[1080px] min-h-[760px] mx-auto bg-[#FCFDFA] text-[#0B1F3A] p-9 relative select-none shadow-2xl rounded-sm print:shadow-none print:m-0"
          style={{
            backgroundColor: '#FCFDFA',
            backgroundImage: `
              radial-gradient(circle at center, rgba(8, 127, 120, 0.03) 0%, transparent 70%),
              repeating-linear-gradient(45deg, rgba(14, 42, 71, 0.012) 0px, rgba(14, 42, 71, 0.012) 1px, transparent 1px, transparent 10px)
            `,
          }}
        >
          {/* Outer Heavy Royal Navy & Gold Border Framing */}
          <div className="w-full h-full border-[3px] border-[#0E2A47] p-3.5 relative bg-[#FCFDFA]">
            
            {/* Inner Gold Guilloche Hairline Border */}
            <div className="w-full h-full border border-[#C5A059] p-6 flex flex-col justify-between relative bg-white" style={{ backgroundColor: '#FFFFFF' }}>
              
              {/* Corner Victorian Ornamental Flourishes */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-[#C5A059] flex items-start justify-start p-1">
                <div className="w-2 h-2 bg-[#C5A059] rounded-xs" />
              </div>
              <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-[#C5A059] flex items-start justify-end p-1">
                <div className="w-2 h-2 bg-[#C5A059] rounded-xs" />
              </div>
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-[#C5A059] flex items-end justify-start p-1">
                <div className="w-2 h-2 bg-[#C5A059] rounded-xs" />
              </div>
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-[#C5A059] flex items-end justify-end p-1">
                <div className="w-2 h-2 bg-[#C5A059] rounded-xs" />
              </div>

              {/* Faint Watermark Logo in Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
                <img
                  src="/logo-transparent.png"
                  alt=""
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                  className="w-96 h-96 object-contain grayscale"
                />
              </div>

              {/* ========================================================= */}
              {/* 1. ACADEMY INSTITUTIONAL HEADER */}
              {/* ========================================================= */}
              <div className="text-center space-y-2 relative z-10 pt-1">
                {/* Official Academy Brand Logo */}
                <div className="flex items-center justify-center mb-1">
                  <img
                    src="/logo-transparent.png"
                    alt="Khalil Academy Logo"
                    onError={(e) => {
                      e.currentTarget.src = '/logo.png';
                    }}
                    className="h-16 w-auto object-contain drop-shadow-xs"
                  />
                </div>

                <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-[0.28em] text-[#0E2A47] uppercase">
                  KHALIL ACADEMY
                </h1>
                
                <div className="flex items-center justify-center space-x-4 pt-0.5">
                  <div className="h-[1.5px] w-24 bg-gradient-to-r from-transparent via-[#C5A059] to-[#C5A059]" />
                  <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.35em] text-[#0E2A47] bg-[#F8FAFC] border border-[#CBD5E1] px-5 py-1 rounded-full shadow-xs">
                    CERTIFICATE OF COMPLETION
                  </p>
                  <div className="h-[1.5px] w-24 bg-gradient-to-r from-[#C5A059] via-[#C5A059] to-transparent" />
                </div>
              </div>

              {/* ========================================================= */}
              {/* 2. MAIN CREDENTIAL STATEMENT */}
              {/* ========================================================= */}
              <div className="text-center space-y-3.5 my-auto py-3 relative z-10">
                <p className="font-serif italic text-base text-[#64748B] tracking-wide">
                  This is to officially certify that
                </p>

                {/* Recipient Name - Visual Focal Point */}
                <div className="py-1">
                  <h2 className="font-serif text-4xl sm:text-5xl font-black text-[#0B1F3A] tracking-tight inline-block border-b-[2.5px] border-[#C5A059] pb-2 px-10 min-w-[420px]">
                    {certificate.studentName}
                  </h2>
                </div>

                <p className="font-serif italic text-sm text-[#64748B] tracking-wide">
                  has successfully fulfilled all rigorous academic coursework, practical requirements, and assessments in
                </p>

                {/* Program Title */}
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl sm:text-3xl font-extrabold text-[#087F78] tracking-tight">
                    {certificate.courseTitle}
                  </h3>
                  <div>
                    <span className="font-sans text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#0E2A47] bg-[#F1F5F9] px-4 py-1 rounded-full border border-[#CBD5E1] inline-block shadow-2xs">
                      Professional Certificate • 80%+ Academic Honors
                    </span>
                  </div>
                </div>

                {/* Formal Academic Statement */}
                <p className="font-sans text-xs text-[#475569] max-w-2xl mx-auto leading-relaxed pt-0.5">
                  This credential is awarded in recognition of demonstrated proficiency and successful mastery of all learning outcomes and professional standards prescribed by the faculty of Khalil Academy.
                </p>
              </div>

              {/* ========================================================= */}
              {/* 3. CREDENTIAL METADATA GRID */}
              {/* ========================================================= */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 grid grid-cols-4 gap-3 text-center my-2 relative z-10 shadow-2xs">
                <div className="border-r border-[#E2E8F0] last:border-none px-2">
                  <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider block">Recipient</span>
                  <span className="text-xs font-bold text-[#0B1F3A] truncate block mt-0.5">{certificate.studentName}</span>
                </div>
                <div className="border-r border-[#E2E8F0] last:border-none px-2">
                  <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider block">Credential Type</span>
                  <span className="text-xs font-bold text-[#0B1F3A] block mt-0.5">Professional Certificate</span>
                </div>
                <div className="border-r border-[#E2E8F0] last:border-none px-2">
                  <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider block">Completion Date</span>
                  <span className="text-xs font-bold text-[#0B1F3A] block mt-0.5">{formattedDate}</span>
                </div>
                <div className="px-2">
                  <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider block">Credential Status</span>
                  <span className="text-xs font-extrabold text-[#059669] flex items-center justify-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" /> Verified Valid
                  </span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* 4. SIGNATURES & OFFICIAL ACADEMY SEAL */}
              {/* ========================================================= */}
              <div className="pt-4 border-t border-[#E2E8F0] grid grid-cols-3 items-end gap-6 relative z-10">
                
                {/* Left Signature: Academic Director */}
                <div className="text-center space-y-1">
                  <div className="h-10 flex items-end justify-center pb-1">
                    <span className="font-serif italic text-xl text-[#0E2A47] font-bold border-b border-[#94A3B8] w-48 block">
                      Eng. Khalil A. Wali
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#0B1F3A]">Eng. Khalil A. Wali</p>
                  <p className="text-[10px] text-[#64748B]">Academic Director · Khalil Academy</p>
                </div>

                {/* Center: Official Circular Gold Medal Seal with Academy Logo */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-22 h-22 rounded-full border-2 border-[#C5A059] p-1 flex flex-col items-center justify-center bg-[#FCFDFA] shadow-md relative">
                    <div className="w-full h-full rounded-full border-[1.5px] border-[#0E2A47] p-1 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#FFFDF0] to-[#FFF8D6]">
                      <img
                        src="/logo-transparent.png"
                        alt="Official Seal Logo"
                        onError={(e) => {
                          e.currentTarget.src = '/logo.png';
                        }}
                        className="w-7 h-7 object-contain my-0.5"
                      />
                      <span className="text-[7.5px] font-black uppercase text-[#059669] tracking-wider leading-none">OFFICIAL SEAL</span>
                      <span className="text-[6.5px] font-bold text-[#0E2A47] tracking-tighter leading-none mt-0.5">EST. 2024</span>
                    </div>
                  </div>
                </div>

                {/* Right Signature: Program Instructor */}
                <div className="text-center space-y-1">
                  <div className="h-10 flex items-end justify-center pb-1">
                    <span className="font-serif italic text-xl text-[#0E2A47] font-bold border-b border-[#94A3B8] w-48 block">
                      {certificate.instructorName || 'Academic Faculty'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#0B1F3A]">{certificate.instructorName || 'Academic Faculty'}</p>
                  <p className="text-[10px] text-[#64748B]">Program Instructor · Khalil Academy</p>
                </div>

              </div>

              {/* ========================================================= */}
              {/* 5. VERIFICATION & SECURITY FOOTER */}
              {/* ========================================================= */}
              <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-[#64748B] relative z-10">
                
                {/* Left: Verification URL with mini QR code */}
                <div className="flex items-center space-x-3">
                  {certificate.qrCodeUrl ? (
                    <img
                      src={certificate.qrCodeUrl}
                      alt="Certificate Verification QR Code"
                      className="w-10 h-10 border border-[#CBD5E1] p-0.5 rounded bg-white"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-slate-100 border border-[#CBD5E1] rounded flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-[#0B1F3A] block uppercase text-[9px] tracking-wider">Verify Credential</span>
                    <a
                      href={officialVerificationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#087F78] hover:underline font-mono text-[10px] font-semibold"
                    >
                      {officialVerificationUrl}
                    </a>
                  </div>
                </div>

                {/* Center: Digital Authenticity Seal */}
                <div className="hidden sm:flex items-center space-x-1.5 text-[#059669] font-bold uppercase text-[9px] tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Institutional Credential</span>
                </div>

                {/* Right: Certificate ID */}
                <div className="text-right font-mono">
                  <span className="text-[#94A3B8] block text-[9px] font-bold">CERTIFICATE ID</span>
                  <span className="font-bold text-[#0B1F3A] text-xs">{certNumber}</span>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#07111F] text-[#F8FAFC] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4FD1C5] border-t-transparent"></div>
        <p className="text-xs font-semibold text-[#CBD5E1] tracking-wide">Loading Official Academic Credential...</p>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-[#07111F] text-[#F8FAFC] flex items-center justify-center p-6 font-sans">
        <div className="bg-[#0E1D33] border border-[#23426A] rounded-3xl p-8 max-w-md text-center space-y-4 shadow-2xl">
          <Award className="h-12 w-12 text-[#F59E0B] mx-auto" />
          <h2 className="text-xl font-extrabold text-[#F8FAFC]">Certificate Unavailable</h2>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">{error || 'Certificate record could not be found in the registry.'}</p>
          <Link
            to="/student/certificates"
            className="inline-block px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs rounded-xl shadow-md transition"
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

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F8FAFC] py-10 px-3 sm:px-6 lg:px-8 font-sans selection:bg-[#4FD1C5] selection:text-[#0A1322]">
      
      {/* Top Action Bar (Print Hidden) */}
      <div className="max-w-[1120px] mx-auto mb-8 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <Link
          to="/student/certificates"
          className="flex items-center text-xs font-bold text-[#CBD5E1] hover:text-[#4FD1C5] transition"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Certificates
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold rounded-xl text-xs transition shadow-lg shadow-[#4FD1C5]/20 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{downloading ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>

          <Link
            to={localVerificationRoute}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#0E1D33] border border-[#23426A] hover:bg-[#1A365D] text-[#F8FAFC] font-bold rounded-xl text-xs transition shadow-sm"
          >
            <ShieldCheck className="h-4 w-4 text-[#4FD1C5]" />
            <span>Verify Credential</span>
          </Link>

          <button
            onClick={handleCopyLink}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#0E1D33] border border-[#23426A] hover:bg-[#1A365D] text-[#F8FAFC] font-bold rounded-xl text-xs transition shadow-sm"
          >
            {copied ? <Check className="h-4 w-4 text-[#22C55E]" /> : <ExternalLink className="h-4 w-4 text-[#CBD5E1]" />}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleLinkedInShare}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#0A66C2] hover:bg-[#004182] text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            <Share2 className="h-4 w-4" />
            <span>Share Credential</span>
          </button>
        </div>
      </div>

      {/* Main Certificate Presentation Wrapper (Scrollable on small mobile) */}
      <div className="max-w-[1120px] mx-auto overflow-x-auto pb-6">
        
        {/* Printable & Exportable Academic Certificate Document (A4 Landscape Proportions) */}
        <div
          id="academic-certificate-document"
          className="w-[1060px] min-w-[1060px] h-[750px] min-h-[750px] mx-auto bg-[#FCFDFE] text-[#0A1322] p-8 relative select-none shadow-2xl rounded-sm print:shadow-none print:m-0 block"
          style={{
            boxSizing: 'border-box',
          }}
        >
          {/* Outer Academic Border Framing */}
          <div className="w-full h-full border-[3px] border-[#0E1E36] p-2 relative flex flex-col justify-between" style={{ boxSizing: 'border-box' }}>
            
            {/* Inner Double Hairline Border with Gold Accents */}
            <div className="w-full h-full border border-[#C5A059] px-8 py-6 flex flex-col justify-between relative bg-white" style={{ boxSizing: 'border-box' }}>
              
              {/* Corner Victorian Flourishes */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-[2.5px] border-l-[2.5px] border-[#C5A059]" />
              <div className="absolute top-2 right-2 w-8 h-8 border-t-[2.5px] border-r-[2.5px] border-[#C5A059]" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-[2.5px] border-l-[2.5px] border-[#C5A059]" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-[2.5px] border-r-[2.5px] border-[#C5A059]" />

              {/* ========================================================= */}
              {/* 1. ACADEMY HEADER & GRAND OFFICIAL LOGO */}
              {/* ========================================================= */}
              <div className="text-center relative z-10">
                {/* Official Brand Logo with fixed pixel dimensions */}
                <div className="flex items-center justify-center mb-2">
                  <img
                    src="/logo.png"
                    alt="Khalil Academy"
                    style={{
                      width: '140px',
                      height: '115px',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto',
                    }}
                  />
                </div>

                <div className="flex items-center justify-center space-x-4 mb-2">
                  <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent" />
                  <span className="font-['Cinzel',serif] text-[13px] font-black uppercase tracking-[0.35em] text-[#0E1E36]">
                    CERTIFICATE OF COMPLETION
                  </span>
                  <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent" />
                </div>
              </div>

              {/* ========================================================= */}
              {/* 2. MAIN CREDENTIAL CITATION */}
              {/* ========================================================= */}
              <div className="text-center relative z-10 my-auto">
                <p className="font-['Cormorant_Garamond',serif] italic text-base text-[#475569] tracking-wide mb-1.5">
                  This certificate is proudly conferred upon
                </p>

                {/* Recipient Full Name */}
                <div className="mb-2">
                  <h2 className="font-['Playfair_Display',serif] text-5xl font-black text-[#0E1E36] tracking-tight inline-block border-b-2 border-[#C5A059] pb-1 px-12 min-w-[420px]">
                    {certificate.studentName}
                  </h2>
                </div>

                <p className="font-['Cormorant_Garamond',serif] italic text-sm text-[#475569] tracking-wide mb-1">
                  for successfully completing and demonstrating mastery in
                </p>

                {/* Course Title */}
                <div className="mb-1">
                  <h3 className="font-['Playfair_Display',serif] text-3xl font-black text-[#0E1E36] tracking-normal mb-1">
                    {certificate.courseTitle}
                  </h3>
                  <div>
                    <span className="font-['Cinzel',serif] text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#C5A059] bg-[#0E1E36] px-5 py-0.5 rounded-full inline-block shadow-sm">
                      Professional Specialization
                    </span>
                  </div>
                </div>

                {/* Formal Academic Citation */}
                <p className="font-sans text-[11px] text-[#64748B] max-w-2xl mx-auto leading-relaxed mt-2">
                  This credential certifies that the recipient has satisfied all rigorous academic requirements, assessments, practical projects, and learning standards established by Khalil Academy.
                </p>
              </div>

              {/* ========================================================= */}
              {/* 3. SIGNATURES & OFFICIAL ACADEMY SEAL */}
              {/* ========================================================= */}
              <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-3 items-end gap-6 relative z-10">
                
                {/* Left Signature: Academic Director */}
                <div className="text-center space-y-1">
                  <div className="h-12 flex items-end justify-center pb-1">
                    <span className="font-['Alex_Brush',cursive] text-4xl text-[#0E1E36] font-medium leading-none">
                      Eng. Khalil A. Wali
                    </span>
                  </div>
                  <div className="w-48 mx-auto border-t border-[#94A3B8] pt-1">
                    <p className="text-xs font-bold text-[#0E1E36]">Eng. Khalil A. Wali</p>
                    <p className="text-[10px] text-[#64748B]">Academic Director · Khalil Academy</p>
                  </div>
                </div>

                {/* Center: Official Circular Academy Seal */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-[#C5A059] p-1 flex flex-col items-center justify-center bg-[#FCFDFE] shadow-md relative">
                    <div className="w-full h-full rounded-full border border-[#0E1E36] p-1 flex flex-col items-center justify-center text-center">
                      <img
                        src="/logo.png"
                        alt="Official Seal Emblem"
                        style={{ width: '28px', height: '28px', objectFit: 'contain', display: 'block', margin: '0 auto 2px' }}
                      />
                      <span className="text-[6.5px] font-black uppercase text-[#0E1E36] tracking-widest leading-none">OFFICIAL SEAL</span>
                      <span className="text-[6px] font-black uppercase text-[#C5A059] tracking-wider leading-none mt-0.5">ACCREDITED</span>
                    </div>
                  </div>
                </div>

                {/* Right Signature: Program Instructor */}
                <div className="text-center space-y-1">
                  <div className="h-12 flex items-end justify-center pb-1">
                    <span className="font-['Alex_Brush',cursive] text-4xl text-[#0E1E36] font-medium leading-none">
                      {certificate.instructorName || 'Academic Faculty'}
                    </span>
                  </div>
                  <div className="w-48 mx-auto border-t border-[#94A3B8] pt-1">
                    <p className="text-xs font-bold text-[#0E1E36]">{certificate.instructorName || 'Academic Faculty'}</p>
                    <p className="text-[10px] text-[#64748B]">Faculty Instructor · Khalil Academy</p>
                  </div>
                </div>

              </div>

              {/* ========================================================= */}
              {/* 4. VERIFICATION & SECURITY FOOTER */}
              {/* ========================================================= */}
              <div className="mt-2 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[10px] text-[#64748B] relative z-10">
                
                {/* Left: Verification URL with mini QR code */}
                <div className="flex items-center space-x-3">
                  {certificate.qrCodeUrl ? (
                    <img
                      src={certificate.qrCodeUrl}
                      alt="Certificate Verification QR Code"
                      style={{ width: '38px', height: '38px', objectFit: 'contain', display: 'block' }}
                      className="border border-[#CBD5E1] p-0.5 rounded bg-white"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-slate-100 border border-[#CBD5E1] rounded flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-[#0E1E36] block uppercase text-[9px] tracking-wider">Online Verification</span>
                    <a
                      href={officialVerificationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1A365D] hover:underline font-mono text-[9px]"
                    >
                      {officialVerificationUrl}
                    </a>
                  </div>
                </div>

                {/* Center: Issue Date */}
                <div className="text-center">
                  <span className="text-[#94A3B8] block text-[9px] uppercase tracking-wider font-bold">Issue Date</span>
                  <span className="font-bold text-[#0E1E36]">{formattedDate}</span>
                </div>

                {/* Right: Certificate ID */}
                <div className="text-right font-mono">
                  <span className="text-[#94A3B8] block text-[9px] uppercase tracking-wider font-bold">Certificate ID</span>
                  <span className="font-bold text-[#0E1E36]">{certNumber}</span>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

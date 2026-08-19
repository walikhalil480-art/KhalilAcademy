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
          className="w-[1060px] min-w-[1060px] min-h-[750px] mx-auto bg-[#FCFDFF] text-[#0A1322] p-10 relative select-none shadow-2xl rounded-sm print:shadow-none print:m-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at center, rgba(79, 209, 197, 0.03) 0%, transparent 70%),
              repeating-linear-gradient(45deg, rgba(26, 54, 93, 0.015) 0px, rgba(26, 54, 93, 0.015) 1px, transparent 1px, transparent 8px)
            `,
          }}
        >
          {/* Outer Academic Border Framing */}
          <div className="w-full h-full border-2 border-[#1A365D] p-3 relative">
            
            {/* Inner Double Hairline Border with Gold/Teal Accents */}
            <div className="w-full h-full border border-[#23426A]/40 p-6 flex flex-col justify-between relative bg-white/80">
              
              {/* Corner Ornamental Flourishes */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#C5A059]" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#C5A059]" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#C5A059]" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#C5A059]" />

              {/* Faint Watermark Emblem in Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035]">
                <div className="w-96 h-96 rounded-full border-[12px] border-[#1A365D] flex items-center justify-center">
                  <span className="font-['Cinzel',serif] text-5xl font-black text-[#1A365D] tracking-widest text-center">
                    KHALIL<br />ACADEMY
                  </span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* 1. ACADEMY HEADER */}
              {/* ========================================================= */}
              <div className="text-center space-y-2 relative z-10 pt-2">
                {/* Emblem Badge */}
                <div className="flex items-center justify-center space-x-3 mb-1">
                  <div className="w-12 h-12 rounded-full bg-[#1A365D] border-2 border-[#C5A059] flex items-center justify-center shadow-sm">
                    <Award className="w-6 h-6 text-[#4FD1C5]" />
                  </div>
                </div>

                <h1 className="font-['Cinzel',serif] text-2xl sm:text-3xl font-bold tracking-[0.28em] text-[#1A365D] uppercase">
                  KHALIL ACADEMY
                </h1>
                
                <div className="flex items-center justify-center space-x-4">
                  <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent" />
                  <p className="font-sans text-[11px] font-extrabold uppercase tracking-[0.35em] text-[#4FD1C5] bg-[#1A365D] px-4 py-0.5 rounded-full">
                    CERTIFICATE OF COMPLETION
                  </p>
                  <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent" />
                </div>
              </div>

              {/* ========================================================= */}
              {/* 2. MAIN CREDENTIAL STATEMENT */}
              {/* ========================================================= */}
              <div className="text-center space-y-3.5 my-auto py-4 relative z-10">
                <p className="font-['Cormorant_Garamond',serif] italic text-base text-[#475569] tracking-wide">
                  This certificate is proudly presented to
                </p>

                {/* Recipient Name - Visual Focal Point */}
                <div className="py-1">
                  <h2 className="font-['Playfair_Display',serif] text-4xl sm:text-5xl font-bold text-[#0A1322] tracking-tight inline-block border-b-2 border-[#C5A059]/60 pb-2 px-8 min-w-[380px]">
                    {certificate.studentName}
                  </h2>
                </div>

                <p className="font-['Cormorant_Garamond',serif] italic text-sm text-[#475569] tracking-wide">
                  for successfully completing the comprehensive program
                </p>

                {/* Program Title */}
                <div>
                  <h3 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-bold text-[#1A365D] tracking-normal">
                    {certificate.courseTitle}
                  </h3>
                  <div className="mt-1.5">
                    <span className="font-sans text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#1A365D] bg-[#1A365D]/5 px-4 py-1 rounded-full border border-[#1A365D]/15 inline-block">
                      Professional Certificate
                    </span>
                  </div>
                </div>

                {/* Formal Academic Statement */}
                <p className="font-sans text-xs text-[#64748B] max-w-2xl mx-auto leading-relaxed pt-1">
                  This certificate recognizes the successful completion of the required coursework, practical exercises, assessments, and learning objectives prescribed by Khalil Academy.
                </p>
              </div>

              {/* ========================================================= */}
              {/* 3. CREDENTIAL METADATA GRID */}
              {/* ========================================================= */}
              <div className="bg-[#FAFBFD] border border-[#E2E8F0] rounded-xl p-3 grid grid-cols-4 gap-3 text-center my-2 relative z-10">
                <div className="border-r border-[#E2E8F0] last:border-none px-2">
                  <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider block">Recipient</span>
                  <span className="text-xs font-bold text-[#0A1322] truncate block mt-0.5">{certificate.studentName}</span>
                </div>
                <div className="border-r border-[#E2E8F0] last:border-none px-2">
                  <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider block">Credential Type</span>
                  <span className="text-xs font-bold text-[#0A1322] block mt-0.5">Professional Certificate</span>
                </div>
                <div className="border-r border-[#E2E8F0] last:border-none px-2">
                  <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider block">Completion Date</span>
                  <span className="text-xs font-bold text-[#0A1322] block mt-0.5">{formattedDate}</span>
                </div>
                <div className="px-2">
                  <span className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider block">Credential Status</span>
                  <span className="text-xs font-extrabold text-[#059669] flex items-center justify-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" /> Verified
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
                    <span className="font-['Playfair_Display',serif] italic text-lg text-[#1A365D] font-bold border-b border-[#94A3B8] w-48 block">
                      Eng. Khalil A. Wali
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#0A1322]">Academic Director</p>
                  <p className="text-[10px] text-[#64748B]">Khalil Academy</p>
                </div>

                {/* Center: Official Circular Academy Seal */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-[#C5A059] p-1 flex flex-col items-center justify-center bg-[#FCFDFF] shadow-sm relative">
                    <div className="w-full h-full rounded-full border border-[#1A365D] p-1 flex flex-col items-center justify-center text-center">
                      <span className="text-[7px] font-black uppercase text-[#1A365D] tracking-widest leading-none">KHALIL ACADEMY</span>
                      <ShieldCheck className="w-4 h-4 text-[#C5A059] my-0.5" />
                      <span className="text-[7px] font-black uppercase text-[#059669] tracking-wider leading-none">CERTIFIED</span>
                      <span className="text-[6px] font-bold text-[#64748B] tracking-tighter leading-none mt-0.5">EST. 2024</span>
                    </div>
                  </div>
                </div>

                {/* Right Signature: Program Instructor */}
                <div className="text-center space-y-1">
                  <div className="h-10 flex items-end justify-center pb-1">
                    <span className="font-['Playfair_Display',serif] italic text-lg text-[#1A365D] font-bold border-b border-[#94A3B8] w-48 block">
                      {certificate.instructorName || 'Academic Faculty'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#0A1322]">{certificate.instructorName || 'Academic Faculty'}</p>
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
                    <span className="font-bold text-[#0A1322] block uppercase text-[9px] tracking-wider">Verify Credential</span>
                    <a
                      href={officialVerificationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#1A365D] hover:underline font-mono"
                    >
                      {officialVerificationUrl}
                    </a>
                  </div>
                </div>

                {/* Center: Digital Authenticity Seal */}
                <div className="hidden sm:flex items-center space-x-1.5 text-[#059669] font-bold uppercase text-[9px] tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Institutional Credential</span>
                </div>

                {/* Right: Certificate ID */}
                <div className="text-right font-mono">
                  <span className="text-[#94A3B8] block text-[9px]">CERTIFICATE ID</span>
                  <span className="font-bold text-[#0A1322]">{certNumber}</span>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

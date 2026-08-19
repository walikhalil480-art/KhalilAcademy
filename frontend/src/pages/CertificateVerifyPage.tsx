import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Certificate } from '../types';
import { ShieldCheck, CheckCircle2, AlertOctagon, Award, Calendar, User, BookOpen, ExternalLink, ArrowLeft } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const CertificateVerifyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVerification();
  }, [id]);

  const fetchVerification = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/certificates/verify/${id}`);
      setCertificate(res.data.certificate);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Certificate record not found in the official registry or has been revoked.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#07111F] text-[#F8FAFC] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4FD1C5] border-t-transparent"></div>
        <p className="text-xs font-semibold text-[#CBD5E1]">Verifying Credential on Official Registry...</p>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-[#07111F] text-[#F8FAFC] flex items-center justify-center p-6 font-sans">
        <div className="bg-[#0E1D33] border border-[#23426A] rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center mx-auto">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-[#F8FAFC]">Unverified Credential</h2>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              {error || 'The requested Certificate ID could not be validated in the Khalil Academy Credential Registry.'}
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/courses"
              className="inline-block px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-bold rounded-xl text-xs shadow-md transition"
            >
              Browse Academic Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(certificate.issueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const certNumber = certificate.certificateNumber || certificate.id || id;

  return (
    <div className="min-h-screen bg-[#07111F] text-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
      <div className="max-w-xl w-full bg-[#0E1D33] border border-[#23426A] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Registry Top Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-[#1A365D] border border-[#C5A059] flex items-center justify-center shadow-sm">
              <Award className="w-5 h-5 text-[#4FD1C5]" />
            </div>
            <span className="font-['Cinzel',serif] text-sm font-bold tracking-[0.2em] text-[#F8FAFC] uppercase">
              KHALIL ACADEMY
            </span>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-xs font-black uppercase rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>VERIFIED CREDENTIAL</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC]">
            Official Credential Verification
          </h1>
          <p className="text-xs text-[#CBD5E1]">
            Digital certification authenticated via Khalil Academy Registry
          </p>
        </div>

        {/* Verification Metadata Box */}
        <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-5 space-y-4 text-xs divide-y divide-[#23426A]">
          
          {/* Recipient */}
          <div className="flex items-start justify-between gap-4 pt-1 first:pt-0">
            <span className="text-[#94A3B8] font-bold uppercase tracking-wider">Recipient</span>
            <span className="text-sm font-extrabold text-[#F8FAFC] text-right">{certificate.studentName}</span>
          </div>

          {/* Certificate Program */}
          <div className="flex items-start justify-between gap-4 pt-3">
            <span className="text-[#94A3B8] font-bold uppercase tracking-wider">Certificate</span>
            <span className="text-xs font-bold text-[#4FD1C5] text-right">
              {certificate.courseTitle} Professional Certificate
            </span>
          </div>

          {/* Certificate ID */}
          <div className="flex items-start justify-between gap-4 pt-3">
            <span className="text-[#94A3B8] font-bold uppercase tracking-wider">Certificate ID</span>
            <span className="font-mono font-bold text-[#22C55E] text-right">{certNumber}</span>
          </div>

          {/* Issued by */}
          <div className="flex items-start justify-between gap-4 pt-3">
            <span className="text-[#94A3B8] font-bold uppercase tracking-wider">Issued By</span>
            <span className="font-bold text-[#F8FAFC] text-right">Khalil Academy</span>
          </div>

          {/* Issue Date */}
          <div className="flex items-start justify-between gap-4 pt-3">
            <span className="text-[#94A3B8] font-bold uppercase tracking-wider">Issue Date</span>
            <span className="font-bold text-[#CBD5E1] text-right">{formattedDate}</span>
          </div>

          {/* Credential Status */}
          <div className="flex items-start justify-between gap-4 pt-3">
            <span className="text-[#94A3B8] font-bold uppercase tracking-wider">Status</span>
            <span className="font-extrabold text-[#22C55E] uppercase flex items-center gap-1 text-right">
              <ShieldCheck className="w-4 h-4 text-[#22C55E]" /> VALID / VERIFIED
            </span>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link
            to={`/certificates/${certificate.certificateNumber || certificate.id}`}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold rounded-xl text-xs transition shadow-md shadow-[#4FD1C5]/20"
          >
            <span>View Full Document</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <Link
            to="/courses"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-[#132742] hover:bg-[#1A365D] border border-[#23426A] text-[#CBD5E1] hover:text-[#F8FAFC] font-bold rounded-xl text-xs transition"
          >
            <span>Browse Academy</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

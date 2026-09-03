import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Certificate } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Lock,
} from 'lucide-react';

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
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/certificates/verify/${id}`);
      setCertificate(res.data.certificate);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Certificate record not found in the official registry or has been deleted.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white space-y-4 transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#087F78] border-t-transparent"></div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Verifying Credential on Official Registry...
        </p>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white flex items-center justify-center p-6 font-sans transition-colors">
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-8 max-w-md w-full text-center shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[#EF4444] flex items-center justify-center mx-auto">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white">Unverified Credential</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {error || 'The requested Certificate ID could not be validated in the Khalil Academy Credential Registry.'}
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/courses"
              className="inline-block px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition"
            >
              Browse Academic Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedIssueDate = new Date(certificate.issueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const certNumber = certificate.certificateNumber || certificate.id || id;
  const status = certificate.status || (certificate.isRevoked ? 'REVOKED' : 'ACTIVE');

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-sans pb-24 transition-colors">
      <div className="max-w-xl w-full bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Registry Top Header */}
        <div className="text-center space-y-3">
          <div className="relative flex items-center justify-center">
            <img
              src="/logo-transparent.png"
              alt="Khalil Academy"
              className="w-20 h-auto mx-auto object-contain drop-shadow-sm dark:hidden"
              onError={(e) => {
                e.currentTarget.src = '/logo.png';
              }}
            />
            <img
              src="/logo-dark-mode.png"
              alt="Khalil Academy"
              className="w-20 h-auto mx-auto object-contain drop-shadow-md hidden dark:block"
              onError={(e) => {
                e.currentTarget.src = '/logo.png';
              }}
            />
          </div>

          {/* Status-specific top badges */}
          {status === 'ACTIVE' && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] text-xs font-bold font-mono uppercase rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>OFFICIALLY VERIFIED & ACTIVE</span>
            </div>
          )}

          {status === 'SUSPENDED' && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 text-amber-600 dark:text-amber-400 text-xs font-bold font-mono uppercase rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>TEMPORARILY SUSPENDED</span>
            </div>
          )}

          {status === 'REVOKED' && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-700/50 text-red-600 dark:text-red-400 text-xs font-bold font-mono uppercase rounded-full">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>PERMANENTLY REVOKED</span>
            </div>
          )}

          {status === 'REPLACED' && (
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-700/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold font-mono uppercase rounded-full">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>SUPERSEDED & REPLACED</span>
            </div>
          )}

          <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B1F3A] dark:text-white">
            Official Credential Verification
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Digital certification registry record verified via Khalil Academy
          </p>
        </div>

        {/* Status Callout Banners */}
        {status === 'SUSPENDED' && (
          <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Credential Currently Under Administrative Review</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              This certificate has been temporarily suspended while under review. It cannot currently be used as proof of completion.
            </p>
            {certificate.suspensionReason && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                Public Review Note: {certificate.suspensionReason}
              </p>
            )}
          </div>
        )}

        {status === 'REVOKED' && (
          <div className="p-4 rounded-2xl bg-red-50/80 dark:bg-red-950/20 border border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
              <AlertOctagon className="w-4 h-4 text-red-600" />
              <span>Credential Permanently Revoked & Invalid</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              This certificate was revoked by Khalil Academy academic administration and is permanently invalid. It does not represent legitimate completion of course requirements.
            </p>
            {certificate.revocationCategory && (
              <div className="text-[11px] font-medium text-red-700 dark:text-red-300 bg-red-100/60 dark:bg-red-900/30 px-2.5 py-1 rounded-lg inline-block">
                Category: {certificate.revocationCategory.replace(/_/g, ' ')}
              </div>
            )}
          </div>
        )}

        {status === 'REPLACED' && (
          <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
              <RefreshCw className="w-4 h-4 text-indigo-600" />
              <span>Superseded by New Re-Certification Credential</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              The recipient completed required re-certification activities. This historical certificate has been archived and replaced with an active credential.
            </p>
            {certificate.replacedByCertificateNumber && (
              <Link
                to={`/certificates/verify/${certificate.replacedByCertificateNumber}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition"
              >
                <span>View Active Replacement Credential ({certificate.replacedByCertificateNumber})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        )}

        {/* Verification Metadata Box */}
        <div className="bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4 text-xs divide-y divide-slate-200 dark:divide-slate-700">
          
          {/* Recipient */}
          <div className="flex items-start justify-between gap-4 pt-1 first:pt-0">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Recipient</span>
            <span className="text-sm font-bold text-[#0B1F3A] dark:text-white text-right">{certificate.studentName}</span>
          </div>

          {/* Certificate Program */}
          <div className="flex items-start justify-between gap-4 pt-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Certificate</span>
            <span className="text-xs font-bold text-[#087F78] dark:text-[#14B8A6] text-right">
              {certificate.courseTitle} Professional Certificate
            </span>
          </div>

          {/* Certificate ID */}
          <div className="flex items-start justify-between gap-4 pt-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Certificate ID</span>
            <span className="font-mono font-bold text-[#087F78] dark:text-[#14B8A6] text-right">{certNumber}</span>
          </div>

          {/* Issued by */}
          <div className="flex items-start justify-between gap-4 pt-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Issued By</span>
            <span className="font-bold text-[#0B1F3A] dark:text-white text-right">Khalil Academy</span>
          </div>

          {/* Issue Date */}
          <div className="flex items-start justify-between gap-4 pt-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Issue Date</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-right">{formattedIssueDate}</span>
          </div>

          {/* Credential Status */}
          <div className="flex items-start justify-between gap-4 pt-3">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Current Status</span>
            <div className="text-right">
              {status === 'ACTIVE' && (
                <span className="font-bold text-[#087F78] dark:text-[#14B8A6] uppercase flex items-center justify-end gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" /> ACTIVE / VALID
                </span>
              )}
              {status === 'SUSPENDED' && (
                <span className="font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center justify-end gap-1">
                  <AlertTriangle className="w-4 h-4" /> SUSPENDED
                </span>
              )}
              {status === 'REVOKED' && (
                <span className="font-bold text-red-600 dark:text-red-400 uppercase flex items-center justify-end gap-1">
                  <AlertOctagon className="w-4 h-4" /> REVOKED
                </span>
              )}
              {status === 'REPLACED' && (
                <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase flex items-center justify-end gap-1">
                  <RefreshCw className="w-4 h-4" /> REPLACED
                </span>
              )}
            </div>
          </div>

          {/* Replacement Link row if replaced */}
          {status === 'REPLACED' && certificate.replacedByCertificateNumber && (
            <div className="flex items-start justify-between gap-4 pt-3">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Replacement Credential</span>
              <Link
                to={`/certificates/verify/${certificate.replacedByCertificateNumber}`}
                className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-right"
              >
                {certificate.replacedByCertificateNumber}
              </Link>
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {status === 'ACTIVE' ? (
            <Link
              to={`/certificates/${certificate.certificateNumber || certificate.id}`}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              <span>View Full Document</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed opacity-75"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Document Unavailable ({status})</span>
            </button>
          )}

          <Link
            to="/courses"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition"
          >
            <span>Browse Academy</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

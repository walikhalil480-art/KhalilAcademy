import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Certificate } from '../types';
import { Award, Download } from 'lucide-react';

export const StudentCertificatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCertId, setSearchCertId] = useState('');

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/certificates/my-certificates');
      setCertificates(res.data.certificates || []);
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCertId.trim()) {
      navigate(`/certificates/verify/${searchCertId.trim()}`);
    }
  };

  const handleDownloadPdf = async (certNumber: string) => {
    try {
      const response = await api.get(`/certificates/${certNumber}/download`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Certificate_${certNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download certificate PDF.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[75vh] bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white transition-colors">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#087F78] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white py-10 px-4 sm:px-6 lg:px-8 font-sans pb-24 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-[#087F78]/30 border border-[#087F78]/20 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] text-xs font-bold font-mono">
            <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Academic Credentials</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white">My Certificates</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">View and download your official course completion certificates</p>
        </div>

        {/* Certificate Cards List */}
        {certificates.length > 0 ? (
          <div className="space-y-4">
            {certificates.map((cert) => {
              const formattedDate = new Date(cert.issueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              const certNum = cert.certificateNumber || cert.id;
              const status = cert.status || (cert.isRevoked ? 'REVOKED' : 'ACTIVE');

              return (
                <div
                  key={cert.id}
                  className={`bg-white dark:bg-[#102A43] border rounded-2xl p-5 shadow-xs flex flex-col gap-4 transition ${
                    status === 'REVOKED'
                      ? 'border-red-300 dark:border-red-900/60 bg-red-50/10 dark:bg-red-950/10'
                      : status === 'SUSPENDED'
                      ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/10 dark:bg-amber-950/10'
                      : status === 'REPLACED'
                      ? 'border-indigo-300 dark:border-indigo-900/60 bg-indigo-50/10 dark:bg-indigo-950/10'
                      : 'border-slate-200/90 dark:border-[#1E3A56]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                          status === 'REVOKED'
                            ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-500'
                            : status === 'SUSPENDED'
                            ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-500'
                            : status === 'REPLACED'
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-500'
                            : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/60 text-[#F59E0B]'
                        }`}
                      >
                        <Award className="h-7 w-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white">{cert.courseTitle}</h3>
                          {status === 'ACTIVE' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                              ACTIVE
                            </span>
                          )}
                          {status === 'SUSPENDED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                              SUSPENDED
                            </span>
                          )}
                          {status === 'REVOKED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                              REVOKED
                            </span>
                          )}
                          {status === 'REPLACED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                              REPLACED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {cert.instructorName || 'Academy Instructor'}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Issued on {formattedDate} • ID: <strong className="text-[#087F78] dark:text-[#14B8A6] font-mono">{certNum}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-center">
                      <Link
                        to={`/certificates/${certNum}`}
                        className="px-3.5 py-2 bg-slate-50 dark:bg-[#152F4A] hover:bg-slate-100 dark:hover:bg-slate-700 text-[#0B1F3A] dark:text-white font-bold rounded-xl text-xs transition border border-slate-200 dark:border-slate-700 shadow-xs"
                      >
                        View Details
                      </Link>
                      {status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleDownloadPdf(certNum)}
                          className="px-4 py-2 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center space-x-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download PDF</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed opacity-60 flex items-center space-x-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>PDF Unavailable</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status contextual alert message */}
                  {status === 'REVOKED' && (
                    <div className="p-3.5 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-red-700 dark:text-red-300">
                          ⚠️ Certificate Revoked & Re-Certification Required
                        </span>
                        {cert.course && (
                          <Link
                            to={`/learn/${cert.course.slug || cert.courseId}`}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg transition"
                          >
                            Restart Coursework
                          </Link>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Reason: <span className="font-medium text-red-800 dark:text-red-200">{cert.revocationReason || 'Coursework must be recompleted legitimately.'}</span>
                      </p>
                      {cert.activeRecertificationRequirement && (
                        <div className="text-[11px] text-slate-700 dark:text-slate-300 pt-1 border-t border-red-200/60 dark:border-red-900/60">
                          Re-certification Scope:{' '}
                          <strong className="text-red-800 dark:text-red-200 font-mono">
                            {cert.activeRecertificationRequirement.scope}
                          </strong>
                          {cert.activeRecertificationRequirement.notes && (
                            <span> — {cert.activeRecertificationRequirement.notes}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {status === 'SUSPENDED' && (
                    <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-200">
                      <strong>Administrative Review:</strong> This certificate is temporarily suspended while coursework is reviewed. You will be notified when review is complete.
                    </div>
                  )}

                  {status === 'REPLACED' && cert.replacedByCertificateNumber && (
                    <div className="p-3 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-3">
                      <span>This credential was replaced following successful re-certification.</span>
                      <Link
                        to={`/certificates/${cert.replacedByCertificateNumber}`}
                        className="font-bold text-indigo-700 dark:text-indigo-300 hover:underline"
                      >
                        View Replacement Credential ({cert.replacedByCertificateNumber}) →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-10 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-[#F59E0B] border border-amber-200 dark:border-amber-700/60 flex items-center justify-center mx-auto">
              <Award className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">No Certificates Earned Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              Complete 100% of an enrolled course to automatically unlock and issue your official verified certificate.
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition"
            >
              Go to My Learning
            </Link>
          </div>
        )}

        {/* Bottom Verify Certificate Widget */}
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-6 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#0B1F3A] dark:text-white uppercase tracking-wider">Verify a certificate</h3>
          
          <form onSubmit={handleVerify} className="flex gap-3">
            <input
              type="text"
              value={searchCertId}
              onChange={(e) => setSearchCertId(e.target.value)}
              placeholder="Enter certificate ID (e.g. KHA-2026-000001)"
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold rounded-xl text-xs shadow-xs transition"
            >
              Verify
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

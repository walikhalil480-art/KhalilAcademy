import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Certificate } from '../types';
import { Award, Download, Search, FileText, ExternalLink, Sparkles } from 'lucide-react';

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
      <div className="flex items-center justify-center min-h-[75vh] bg-[#0A1322] text-[#F8FAFC]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#4FD1C5] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1322] text-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Page Title */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A365D] border border-[#4FD1C5]/30 text-[#4FD1C5] text-xs font-bold">
            <Award className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Academic Credentials</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">My Certificates</h1>
          <p className="text-xs text-[#CBD5E1]">View and download your official course completion certificates</p>
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

              return (
                <div key={cert.id} className="bg-[#132742] border border-[#23426A] rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-xl bg-[#0A1322] border border-[#23426A] flex items-center justify-center text-[#F59E0B] flex-shrink-0">
                      <Award className="h-7 w-7 text-[#F59E0B]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#F8FAFC]">{cert.courseTitle}</h3>
                      <p className="text-xs text-[#CBD5E1] mt-0.5">{cert.instructorName || 'Academy Instructor'}</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">Completed on {formattedDate} • ID: <strong className="text-[#4FD1C5] font-mono">{certNum}</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    <Link
                      to={`/certificates/${certNum}`}
                      className="px-3.5 py-2 bg-[#0E1D33] hover:bg-[#1A365D] text-[#F8FAFC] font-bold rounded-xl text-xs transition border border-[#23426A]"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDownloadPdf(certNum)}
                      className="px-4 py-2 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold rounded-xl text-xs transition shadow-md shadow-[#4FD1C5]/20 flex items-center space-x-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-10 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#0A1322] text-[#F59E0B] border border-[#23426A] flex items-center justify-center mx-auto">
              <Award className="h-8 w-8" />
            </div>
            <h3 className="text-base font-extrabold text-[#F8FAFC]">No Certificates Earned Yet</h3>
            <p className="text-xs text-[#CBD5E1] max-w-sm mx-auto leading-relaxed">
              Complete 100% of an enrolled course to automatically unlock and issue your official verified certificate.
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold rounded-xl text-xs shadow-md transition"
            >
              Go to My Learning
            </Link>
          </div>
        )}

        {/* Bottom Verify Certificate Widget */}
        <div className="bg-[#132742] border border-[#23426A] rounded-2xl p-6 shadow-xl space-y-3">
          <h3 className="text-xs font-extrabold text-[#F8FAFC] uppercase tracking-wider">Verify a certificate</h3>
          
          <form onSubmit={handleVerify} className="flex gap-3">
            <input
              type="text"
              value={searchCertId}
              onChange={(e) => setSearchCertId(e.target.value)}
              placeholder="Enter certificate ID (e.g. KHA-2026-000001)"
              className="flex-1 px-4 py-2.5 bg-[#0E1D33] border border-[#23426A] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#4FD1C5]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold rounded-xl text-xs shadow-md transition"
            >
              Verify
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

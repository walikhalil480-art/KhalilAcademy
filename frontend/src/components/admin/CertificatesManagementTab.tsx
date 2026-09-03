import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import {
  Certificate,
  CertificateStatus,
  RevocationReasonCategory,
  RecertificationScope,
  CertificateAuditLog,
} from '../../types';
import {
  Award,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  RotateCcw,
  Ban,
  PauseCircle,
  History,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  User,
  BookOpen,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface CertificatesManagementTabProps {
  courseId?: string;
  isInstructorView?: boolean;
}

export const CertificatesManagementTab: React.FC<CertificatesManagementTabProps> = ({
  courseId,
  isInstructorView = false,
}) => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  // Suspend Modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [submittingSuspend, setSubmittingSuspend] = useState(false);

  // Restore Modal
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [submittingRestore, setSubmittingRestore] = useState(false);

  // Revoke Modal
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revocationCategory, setRevocationCategory] = useState<RevocationReasonCategory>(
    'ACADEMIC_MISCONDUCT'
  );
  const [revocationReason, setRevocationReason] = useState('');
  const [recertScope, setRecertScope] = useState<RecertificationScope>('FINAL_ASSIGNMENT');
  const [recertNotes, setRecertNotes] = useState('');
  const [submittingRevoke, setSubmittingRevoke] = useState(false);

  // Audit Logs Modal
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<CertificateAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  useEffect(() => {
    fetchCertificates();
  }, [page, statusFilter, courseId]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 15,
      };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      if (courseId) params.courseId = courseId;

      const res = await api.get('/certificates/manage/list', { params });
      if (res.data.success) {
        setCertificates(res.data.certificates || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalCount(res.data.pagination?.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to load certificates for management:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCertificates();
  };

  // Open Suspend
  const openSuspend = (cert: Certificate) => {
    setSelectedCert(cert);
    setSuspendReason('');
    setSuspendModalOpen(true);
  };

  const handleSuspend = async () => {
    if (!selectedCert || !suspendReason.trim()) return;
    try {
      setSubmittingSuspend(true);
      await api.post(`/certificates/${selectedCert.id}/suspend`, {
        reason: suspendReason.trim(),
      });
      setSuspendModalOpen(false);
      await fetchCertificates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to suspend certificate.');
    } finally {
      setSubmittingSuspend(false);
    }
  };

  // Open Restore
  const openRestore = (cert: Certificate) => {
    setSelectedCert(cert);
    setRestoreReason('Review cleared. Reinstated to active status.');
    setRestoreModalOpen(true);
  };

  const handleRestore = async () => {
    if (!selectedCert) return;
    try {
      setSubmittingRestore(true);
      await api.post(`/certificates/${selectedCert.id}/restore`, {
        reason: restoreReason.trim(),
      });
      setRestoreModalOpen(false);
      await fetchCertificates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to restore certificate.');
    } finally {
      setSubmittingRestore(false);
    }
  };

  // Open Revoke
  const openRevoke = (cert: Certificate) => {
    setSelectedCert(cert);
    setRevocationCategory('ACADEMIC_MISCONDUCT');
    setRevocationReason('');
    setRecertScope('FINAL_ASSIGNMENT');
    setRecertNotes('');
    setRevokeModalOpen(true);
  };

  const handleRevoke = async () => {
    if (!selectedCert || !revocationReason.trim() || revocationReason.trim().length < 10) {
      alert('A detailed revocation reason (minimum 10 characters) is required.');
      return;
    }
    try {
      setSubmittingRevoke(true);
      await api.post(`/certificates/${selectedCert.id}/revoke`, {
        category: revocationCategory,
        reason: revocationReason.trim(),
        recertificationScope: recertScope,
        notes: recertNotes.trim(),
        requireFinalAssignment: recertScope === 'FINAL_ASSIGNMENT' || recertScope === 'FULL_COURSE',
      });
      setRevokeModalOpen(false);
      await fetchCertificates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to revoke certificate.');
    } finally {
      setSubmittingRevoke(false);
    }
  };

  // Open Audit Logs
  const openAuditLogs = async (cert: Certificate) => {
    setSelectedCert(cert);
    setAuditModalOpen(true);
    try {
      setLoadingLogs(true);
      const res = await api.get(`/certificates/${cert.id}/audit-logs`);
      setAuditLogs(res.data.auditLogs || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load audit history.');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Open Soft Delete
  const openDelete = (cert: Certificate) => {
    setSelectedCert(cert);
    setDeleteReason('');
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCert) return;
    try {
      setSubmittingDelete(true);
      await api.delete(`/certificates/${selectedCert.id}`, {
        data: { reason: deleteReason.trim() },
      });
      setDeleteModalOpen(false);
      await fetchCertificates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to archive certificate.');
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Counter calculations
  const countActive = certificates.filter((c) => c.status === 'ACTIVE').length;
  const countSuspended = certificates.filter((c) => c.status === 'SUSPENDED').length;
  const countRevoked = certificates.filter((c) => c.status === 'REVOKED').length;
  const countReplaced = certificates.filter((c) => c.status === 'REPLACED').length;

  return (
    <div className="space-y-6 font-sans">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-[#F59E0B]" />
            <span>Certificate Registry & Governance</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographic certificate lifecycle management, revocation audit trails, and re-certification controls.
          </p>
        </div>

        {/* Counter Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-bold">
            {countActive} Active
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold">
            {countSuspended} Suspended
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-bold">
            {countRevoked} Revoked
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold">
            {countReplaced} Replaced
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by certificate number, student name, email, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white focus:outline-none focus:border-[#087F78]"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white font-medium focus:outline-none focus:border-[#087F78]"
          >
            <option value="ALL">All Statuses ({totalCount})</option>
            <option value="ACTIVE">ACTIVE Only</option>
            <option value="SUSPENDED">SUSPENDED Only</option>
            <option value="REVOKED">REVOKED Only</option>
            <option value="REPLACED">REPLACED Only</option>
          </select>

          <button
            onClick={() => {
              setPage(1);
              fetchCertificates();
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-[#087F78] border-t-transparent mx-auto"></div>
            <p className="text-xs text-slate-400">Loading certificate registry records...</p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Award className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-[#0B1F3A] dark:text-white">No certificates found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No certificate records match your filter criteria or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#0B1F3A] dark:text-white">
              <thead className="bg-slate-50 dark:bg-[#0D223F] border-b border-slate-200 dark:border-[#1E3A56] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Certificate ID</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Course</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {certificates.map((cert) => {
                  const formattedDate = new Date(cert.issueDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr
                      key={cert.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-[#152F4A]/50 transition-colors"
                    >
                      {/* Certificate Number */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <a
                            href={`/verify/${cert.certificateNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono font-bold text-[#087F78] dark:text-[#14B8A6] hover:underline flex items-center gap-1"
                          >
                            <span>{cert.certificateNumber}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {cert.replacedByCertificateNumber && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                              ↳ Replaced by {cert.replacedByCertificateNumber}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Student */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold block text-[#0B1F3A] dark:text-white">
                            {cert.studentName}
                          </span>
                          <span className="text-[11px] text-slate-400 block font-mono">
                            {cert.studentEmail || 'Registered student'}
                          </span>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <span className="font-medium truncate block" title={cert.courseTitle}>
                          {cert.courseTitle}
                        </span>
                      </td>

                      {/* Issue Date */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {formattedDate}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        {cert.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            <ShieldCheck className="w-3 h-3" /> ACTIVE
                          </span>
                        )}
                        {cert.status === 'SUSPENDED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3" /> SUSPENDED
                          </span>
                        )}
                        {cert.status === 'REVOKED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                            <AlertOctagon className="w-3 h-3" /> REVOKED
                          </span>
                        )}
                        {cert.status === 'REPLACED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <RefreshCw className="w-3 h-3" /> REPLACED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Audit History */}
                          <button
                            onClick={() => openAuditLogs(cert)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#152F4A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                            title="View Immutable Audit History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend (if ACTIVE) */}
                          {cert.status === 'ACTIVE' && (
                            <button
                              onClick={() => openSuspend(cert)}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-300 font-bold text-[11px] transition flex items-center gap-1"
                            >
                              <PauseCircle className="w-3 h-3" />
                              <span>Suspend</span>
                            </button>
                          )}

                          {/* Restore (if SUSPENDED) */}
                          {cert.status === 'SUSPENDED' && (
                            <button
                              onClick={() => openRestore(cert)}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 dark:text-teal-300 font-bold text-[11px] transition flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                          )}

                          {/* Revoke (if ACTIVE or SUSPENDED) */}
                          {(cert.status === 'ACTIVE' || cert.status === 'SUSPENDED') && (
                            <button
                              onClick={() => openRevoke(cert)}
                              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-300 font-bold text-[11px] transition flex items-center gap-1"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          )}

                          {/* Soft Delete (Admins only) */}
                          {isAdmin && cert.status !== 'DELETED' && (
                            <button
                              onClick={() => openDelete(cert)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#152F4A] hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 hover:text-red-600 transition"
                              title="Archive & Soft Delete (Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-[#1E3A56] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Page {page} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 font-bold"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-40 font-bold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* REVOCATION MODAL */}
      {/* ========================================================================= */}
      {revokeModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                <AlertOctagon className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">
                  Revoke Certificate & Require Re-Certification
                </h3>
              </div>
              <button
                onClick={() => setRevokeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Certificate Summary */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div>
                Certificate ID: <strong className="font-mono text-[#087F78] dark:text-[#14B8A6]">{selectedCert.certificateNumber}</strong>
              </div>
              <div>
                Student: <strong>{selectedCert.studentName}</strong> ({selectedCert.studentEmail})
              </div>
              <div>
                Course: <strong>{selectedCert.courseTitle}</strong>
              </div>
            </div>

            {/* Strict Notice */}
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 leading-relaxed space-y-1">
              <strong>⚠️ Permanent Auditable Action:</strong>
              <p>
                Certificates are <em>never</em> deleted when revoked. This record will permanently show as <strong>REVOKED</strong> on the public verification registry. To regain certification, the student will need to fulfill the re-certification requirements defined below, after which a brand new certificate number will be generated.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              {/* Reason Category */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Revocation Reason Category *
                </label>
                <select
                  value={revocationCategory}
                  onChange={(e) => setRevocationCategory(e.target.value as RevocationReasonCategory)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white font-medium focus:outline-none focus:border-red-500"
                >
                  <option value="ACADEMIC_MISCONDUCT">Academic Misconduct / Cheating Violation</option>
                  <option value="FINAL_ASSIGNMENT_IMPROPER">Final Capstone / Assignment Plagiarism or Fraud</option>
                  <option value="REQUIREMENTS_BYPASSED">Course Completion Requirements Bypassed</option>
                  <option value="ASSESSMENT_INVALIDATED">Assessment Results Invalidated / Tampered</option>
                  <option value="SYSTEM_ERROR">Platform / Technical System Error</option>
                  <option value="OTHER">Other Administrative Reason</option>
                </select>
              </div>

              {/* Mandatory Explanation */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Detailed Explanation * (min 10 characters)
                </label>
                <textarea
                  rows={3}
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  placeholder="Explain why this credential is being revoked. This will be stored in the permanent audit trail and summarized safely on the registry..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Re-Certification Scope */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Re-Certification Requirement Scope *
                </label>
                <select
                  value={recertScope}
                  onChange={(e) => setRecertScope(e.target.value as RecertificationScope)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white font-medium focus:outline-none focus:border-red-500"
                >
                  <option value="FINAL_ASSIGNMENT">Final Assignment Only (Student resubmits Capstone)</option>
                  <option value="FULL_COURSE">Full Course Retake (All lessons, quizzes, and projects)</option>
                  <option value="SELECTED_ASSESSMENTS">Selected Assessments (Quizzes & Assignments)</option>
                  <option value="SELECTED_LESSONS">Selected Lessons Review</option>
                  <option value="CUSTOM">Custom Scope / Specific Instructions</option>
                </select>
              </div>

              {/* Re-Certification Student Guidance */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Student Guidance Notes (Optional)
                </label>
                <input
                  type="text"
                  value={recertNotes}
                  onChange={(e) => setRecertNotes(e.target.value)}
                  placeholder="e.g. Please re-submit original code and document architecture without plagiarism..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setRevokeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={submittingRevoke || revocationReason.trim().length < 10}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {submittingRevoke ? 'Revoking & Logging...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUSPEND MODAL */}
      {/* ========================================================================= */}
      {suspendModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">
                  Suspend Certificate
                </h3>
              </div>
              <button
                onClick={() => setSuspendModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Suspension temporarily flags Certificate <strong className="font-mono">{selectedCert.certificateNumber}</strong> as invalid while under administrative review. PDF downloads and valid status verification will be suspended until resolved.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Suspension Justification *
              </label>
              <textarea
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Investigation underway into potential unauthorized assistance or academic irregularity..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSuspendModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={submittingSuspend || !suspendReason.trim()}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {submittingSuspend ? 'Suspending...' : 'Suspend Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESTORE MODAL */}
      {/* ========================================================================= */}
      {restoreModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">
                  Restore Certificate to ACTIVE
                </h3>
              </div>
              <button
                onClick={() => setRestoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Restoring Certificate <strong className="font-mono">{selectedCert.certificateNumber}</strong> will clear its suspension and immediately reactivate valid public verification and PDF downloads.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Restoration Resolution Note
              </label>
              <input
                type="text"
                value={restoreReason}
                onChange={(e) => setRestoreReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={submittingRestore}
                className="px-5 py-2 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {submittingRestore ? 'Restoring...' : 'Restore to ACTIVE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUDIT LOG TIMELINE MODAL */}
      {/* ========================================================================= */}
      {auditModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-200">
                <History className="w-5 h-5 text-[#087F78]" />
                <div>
                  <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">
                    Immutable Audit Trail
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {selectedCert.certificateNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAuditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audit History Timeline */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {loadingLogs ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#087F78]" />
                  Loading cryptographic audit records...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No explicit audit transitions logged for this credential.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                  {auditLogs.map((log) => {
                    const logDate = new Date(log.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={log.id} className="relative text-xs space-y-1">
                        {/* Dot indicator */}
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#087F78] ring-4 ring-white dark:ring-[#102A43]" />

                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold text-[#0B1F3A] dark:text-white uppercase tracking-wider text-[11px]">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{logDate}</span>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          {log.reason}
                        </p>

                        <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                          <span>
                            Actor:{' '}
                            <strong className="text-slate-600 dark:text-slate-300">
                              {log.performerName || log.performerRole || 'System'}
                            </strong>
                          </span>
                          {log.previousStatus && log.newStatus && (
                            <span>
                              Transition: {log.previousStatus} → {log.newStatus}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setAuditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs"
              >
                Close Audit History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SOFT DELETE MODAL (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {deleteModalOpen && selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans animate-fade-in">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">
                  Archive & Soft Delete Certificate
                </h3>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to soft-delete Certificate <strong className="font-mono">{selectedCert.certificateNumber}</strong>?
              This sets its status to <code>DELETED</code> and hides it from regular lists while preserving its immutable audit record.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Deletion Reason
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Administrative cleanup / superseded record"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-[#0B1F3A] dark:text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={submittingDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {submittingDelete ? 'Archiving...' : 'Confirm Soft Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
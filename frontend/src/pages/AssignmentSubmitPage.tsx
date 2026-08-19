import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Assignment, AssignmentSubmission } from '../types';
import { FileCode, Upload, CheckCircle2, ArrowLeft, Clock } from 'lucide-react';

export const AssignmentSubmitPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchAssignmentData = async () => {
      try {
        const res = await api.get(`/assignments/${id}`);
        if (res.data.success) {
          setAssignment(res.data.assignment);
          if (res.data.submission) {
            setSubmission(res.data.submission);
            setSubmissionText(res.data.submission.submissionText || '');
            setFileUrl(res.data.submission.fileUrl || '');
          }
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignmentData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post(`/assignments/${id}/submit`, {
        submissionText,
        fileUrl,
      });

      if (res.data.success) {
        setSubmission(res.data.submission);
        alert('Assignment submitted successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !assignment) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#0A1322] text-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-[#4FD1C5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-[#0A1322] min-h-screen text-[#F8FAFC] font-sans">
      
      {/* Header */}
      <div className="bg-[#132742] p-6 rounded-2xl border border-[#23426A] space-y-3 shadow-xl">
        <button onClick={() => navigate(-1)} className="text-xs text-[#CBD5E1] hover:text-[#4FD1C5] flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Course
        </button>

        <div className="flex justify-between items-start">
          <h1 className="text-xl font-extrabold text-[#F8FAFC] flex items-center gap-2">
            <FileCode className="w-5 h-5 text-[#4FD1C5]" /> {assignment.title}
          </h1>
          <span className="px-3 py-1 bg-[#0E1D33] rounded-xl border border-[#23426A] text-xs text-[#4FD1C5] font-bold">
            Max Score: {assignment.maxScore} pts
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0E1D33] border border-[#23426A] text-xs text-[#CBD5E1] space-y-2">
          <span className="font-bold text-[#F8FAFC] block uppercase tracking-wider text-[10px]">Instructions</span>
          <p className="whitespace-pre-wrap leading-relaxed">{assignment.instructions}</p>
        </div>
      </div>

      {/* Graded Result View (If graded) */}
      {submission && submission.status === 'GRADED' && (
        <div className="p-6 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/30 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Evaluated & Graded
            </span>
            <span className="text-lg font-extrabold text-[#F8FAFC]">
              Score: {submission.score} / {assignment.maxScore}
            </span>
          </div>
          {submission.feedback && (
            <div className="p-3 rounded-xl bg-[#0E1D33] text-xs text-[#CBD5E1] border border-[#23426A]">
              <strong className="text-[#F8FAFC] block mb-1">Instructor Feedback:</strong>
              <p>{submission.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] space-y-5 shadow-xl">
        <h3 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">Your Work Submission</h3>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#CBD5E1]">Written Explanation / Summary</label>
          <textarea
            rows={5}
            placeholder="Describe your technical solution, architecture blueprint, or repository details..."
            value={submissionText}
            onChange={(e) => setSubmissionText(e.target.value)}
            className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl p-3 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#4FD1C5]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#CBD5E1]">Artifact / File URL (GitHub / PDF / Storage)</label>
          <input
            type="url"
            placeholder="https://github.com/your-username/your-repo-artifact"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl p-2.5 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#4FD1C5]"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> {submitting ? 'Submitting Work...' : 'Submit Assignment'}
          </button>
        </div>
      </form>

    </div>
  );
};

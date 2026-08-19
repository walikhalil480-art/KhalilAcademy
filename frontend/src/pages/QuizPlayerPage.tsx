import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Quiz } from '../types';
import { HelpCircle, Clock, CheckCircle2, XCircle, ArrowLeft, Award } from 'lucide-react';

export const QuizPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<any>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/quizzes/${id}`);
        if (res.data.success) {
          setQuiz(res.data.quiz);
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Quiz error.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    setSubmitting(true);

    const payload = {
      answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      })),
    };

    try {
      const res = await api.post(`/quizzes/${quiz.id}/attempt`, payload);
      if (res.data.success) {
        setResultModal(res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !quiz) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#0A1322] text-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-[#4FD1C5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-[#0A1322] min-h-screen text-[#F8FAFC] font-sans">
      
      {/* Quiz Top Header */}
      <div className="bg-[#132742] p-6 rounded-2xl border border-[#23426A] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <button onClick={() => navigate(-1)} className="text-xs text-[#CBD5E1] hover:text-[#4FD1C5] flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h1 className="text-xl font-extrabold text-[#F8FAFC] flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#4FD1C5]" /> {quiz.title}
          </h1>
          <p className="text-xs text-[#CBD5E1] mt-1">{quiz.description || 'Knowledge assessment quiz.'}</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-[#CBD5E1]">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0E1D33] rounded-xl border border-[#23426A]">
            <Clock className="w-4 h-4 text-[#F59E0B]" /> {quiz.timeLimitMinutes} mins limit
          </div>
          <div className="px-3 py-1.5 bg-[#0E1D33] rounded-xl border border-[#23426A]">
            Passing: <span className="text-[#4FD1C5]">{quiz.passingScore}%</span>
          </div>
        </div>
      </div>

      {/* Questions Stack */}
      <div className="space-y-6">
        {quiz.questions?.map((q, idx) => (
          <div key={q.id} className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-[#F8FAFC] flex items-start gap-2">
              <span className="text-[#4FD1C5] font-extrabold">Q{idx + 1}.</span>
              <span>{q.questionText}</span>
            </h3>

            <div className="space-y-2.5 pt-1">
              {q.options?.map((opt) => {
                const isSelected = answers[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(q.id, opt.id)}
                    className={`w-full p-3.5 rounded-xl text-left text-xs flex items-center justify-between border transition ${
                      isSelected
                        ? 'bg-[#1A365D] text-[#4FD1C5] border-[#4FD1C5] font-semibold'
                        : 'bg-[#0E1D33] text-[#CBD5E1] border-[#23426A] hover:border-[#4FD1C5]/50'
                    }`}
                  >
                    <span>{opt.optionText}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#4FD1C5] bg-[#4FD1C5]' : 'border-[#23426A]'}`}>
                      {isSelected && <div className="w-1.5 h-1.5 bg-[#0A1322] rounded-full" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={handleSubmitQuiz}
          disabled={submitting}
          className="px-8 py-3 rounded-xl bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs shadow-xl shadow-[#4FD1C5]/20 transition disabled:opacity-50"
        >
          {submitting ? 'Grading Answers...' : 'Submit Quiz Attempt'}
        </button>
      </div>

      {/* Results Modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 bg-[#0A1322]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-8 max-w-xl w-full space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            <div className="text-center space-y-3">
              {resultModal.passed ? (
                <div className="w-16 h-16 rounded-full bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10" />
                </div>
              )}

              <h2 className="text-2xl font-extrabold text-[#F8FAFC]">
                {resultModal.passed ? 'Quiz Passed!' : 'Quiz Attempt Failed'}
              </h2>

              <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-[#0E1D33] border border-[#23426A] text-[#CBD5E1]">
                Score: <span className="text-[#4FD1C5] font-extrabold">{resultModal.percentage}%</span> (Passing: {resultModal.passingScore}%)
              </div>
            </div>

            {/* Answer Explanations Review */}
            <div className="space-y-4 max-h-60 overflow-y-auto border-t border-[#23426A] pt-4">
              <h4 className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">Answer Rationale Feedback</h4>
              {resultModal.results?.map((r: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-xl text-xs space-y-1 ${r.isCorrect ? 'bg-[#22C55E]/15 border border-[#22C55E]/30' : 'bg-[#EF4444]/15 border border-[#EF4444]/30'}`}>
                  <div className="font-bold text-[#F8FAFC]">{r.questionText}</div>
                  <div className="text-[#94A3B8]">Selected: {r.selectedOptionText}</div>
                  {!r.isCorrect && <div className="text-[#22C55E] font-semibold">Correct Answer: {r.correctOptionText}</div>}
                  <div className="text-[11px] text-[#CBD5E1] italic pt-1">{r.explanation}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 rounded-xl bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] text-[#F8FAFC] font-bold text-xs transition"
            >
              Close & Return to Course
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

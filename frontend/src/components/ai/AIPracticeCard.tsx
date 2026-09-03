import React, { useState } from 'react';
import { aiService } from '../../services/aiService';
import {
  HelpCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

interface AIPracticeCardProps {
  lessonId: string;
  lessonTitle?: string;
  onClose?: () => void;
}

export const AIPracticeCard: React.FC<AIPracticeCardProps> = ({
  lessonId,
  lessonTitle,
}) => {
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [questionText, setQuestionText] = useState<string | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [questionType, setQuestionType] = useState<
    'multiple_choice' | 'true_false' | 'short_answer' | 'scenario' | 'coding' | 'conceptual'
  >('multiple_choice');
  const [error, setError] = useState<string | null>(null);

  const fetchQuestion = async () => {
    try {
      setLoading(true);
      setError(null);
      setStudentAnswer('');
      setEvaluationResult(null);

      const res = await aiService.generatePractice({
        lessonId,
        questionType,
        difficulty,
      });

      if (res.success && res.questionText) {
        setQuestionText(res.questionText);
      } else {
        setError('Failed to generate practice question. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error generating question.');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentAnswer.trim() || !questionText || evaluating) return;

    try {
      setEvaluating(true);
      setError(null);

      const res = await aiService.evaluatePractice({
        lessonId,
        question: questionText,
        studentAnswer: studentAnswer.trim(),
        questionType,
      });

      if (res.success) {
        setEvaluationResult(res.evaluation);
      } else {
        setError('Unable to evaluate answer.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error evaluating answer.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs text-[#0B1F3A] dark:text-white transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-[#087F78]/30 border border-[#087F78]/20 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <span>AI Practice & Knowledge Check</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {lessonTitle ? `Grounded in "${lessonTitle}"` : 'Adaptive practice questions'}
            </p>
          </div>
        </div>

        {/* Difficulty Pill */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#152F4A] p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
          {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setDifficulty(lvl)}
              className={`px-2.5 py-1 rounded-lg capitalize transition ${
                difficulty === lvl
                  ? 'bg-[#087F78] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Initial State / Question Generator */}
      {!questionText && (
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-[#087F78]/30 border border-[#087F78]/20 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] mx-auto flex items-center justify-center shadow-xs">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-[#0B1F3A] dark:text-white">Test Your Understanding</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Generate an interactive question tailored to this lesson to check your mastery.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[
              { id: 'multiple_choice', label: 'Multiple Choice' },
              { id: 'short_answer', label: 'Short Answer' },
              { id: 'scenario', label: 'Scenario / Troubleshooting' },
              { id: 'coding', label: 'Coding / CLI' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setQuestionType(t.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  questionType === t.id
                    ? 'bg-teal-50 dark:bg-[#087F78]/30 border-[#087F78] text-[#087F78] dark:text-[#14B8A6]'
                    : 'bg-slate-50 dark:bg-[#152F4A] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchQuestion}
            disabled={loading}
            className="px-6 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Question...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Practice Question</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Active Question Display */}
      {questionText && (
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 text-xs sm:text-sm text-[#0B1F3A] dark:text-white leading-relaxed whitespace-pre-wrap">
            {questionText}
          </div>

          {/* Student Answer Input Form */}
          {!evaluationResult && (
            <form onSubmit={handleEvaluate} className="space-y-3">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">Your Answer or Explanation:</label>
              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Type your option letter (e.g. A, B) or explanation here..."
                rows={3}
                className="w-full p-3.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 focus:border-[#087F78] rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#0B223D] focus:outline-none transition resize-none leading-relaxed"
                required
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={fetchQuestion}
                  disabled={loading || evaluating}
                  className="px-3.5 py-2 bg-slate-50 dark:bg-[#152F4A] hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Try Another Question</span>
                </button>

                <button
                  type="submit"
                  disabled={evaluating || !studentAnswer.trim()}
                  className="px-5 py-2 bg-[#087F78] hover:bg-[#076E6A] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  {evaluating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Answer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Evaluation & Feedback Section */}
          {evaluationResult && (
            <div className="space-y-4 pt-2">
              <div className="p-4 sm:p-5 bg-teal-50 dark:bg-[#087F78]/20 border border-teal-200 dark:border-teal-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#087F78] dark:text-[#14B8A6]">
                  <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                  <span>AI Tutor Evaluation & Feedback:</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {evaluationResult}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={fetchQuestion}
                  className="px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2"
                >
                  <span>Next Practice Question</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

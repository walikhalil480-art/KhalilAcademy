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
  BookOpen,
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
    <div className="bg-[#102342] border border-[#23426A] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl text-[#F8FAFC]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#23426A] pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#4FD1C5]/15 border border-[#4FD1C5]/30 text-[#4FD1C5] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
              <span>AI Practice & Knowledge Check</span>
            </h3>
            <p className="text-[11px] text-[#94A3B8]">
              {lessonTitle ? `Grounded in "${lessonTitle}"` : 'Adaptive practice questions'}
            </p>
          </div>
        </div>

        {/* Difficulty Pill */}
        <div className="flex items-center gap-1.5 bg-[#0A1322] p-1 rounded-xl border border-[#23426A] text-[11px] font-semibold">
          {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setDifficulty(lvl)}
              className={`px-2.5 py-1 rounded-lg capitalize transition ${
                difficulty === lvl
                  ? 'bg-[#4FD1C5] text-[#0A1322] font-bold shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
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
          <div className="w-14 h-14 rounded-2xl bg-[#1A365D] border border-[#23426A] text-[#4FD1C5] mx-auto flex items-center justify-center shadow-lg">
            <HelpCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-[#F8FAFC]">Test Your Understanding</h4>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  questionType === t.id
                    ? 'bg-[#1A365D] border-[#4FD1C5] text-[#4FD1C5]'
                    : 'bg-[#0E1D33] border-[#23426A] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchQuestion}
            disabled={loading}
            className="px-6 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition inline-flex items-center gap-2 disabled:opacity-50"
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
          <div className="bg-[#0A1322] border border-[#23426A] rounded-xl p-4 sm:p-5 text-xs sm:text-sm text-[#F8FAFC] leading-relaxed whitespace-pre-wrap">
            {questionText}
          </div>

          {/* Student Answer Input Form */}
          {!evaluationResult && (
            <form onSubmit={handleEvaluate} className="space-y-3">
              <label className="text-xs font-bold text-[#CBD5E1] block">Your Answer or Explanation:</label>
              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Type your option letter (e.g. A, B) or explanation here..."
                rows={3}
                className="w-full p-3.5 bg-[#0E1D33] border border-[#23426A] focus:border-[#4FD1C5] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none transition resize-none leading-relaxed"
                required
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={fetchQuestion}
                  disabled={loading || evaluating}
                  className="px-3.5 py-2 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] rounded-xl text-xs font-semibold text-[#CBD5E1] transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Try Another Question</span>
                </button>

                <button
                  type="submit"
                  disabled={evaluating || !studentAnswer.trim()}
                  className="px-5 py-2 bg-[#4FD1C5] hover:bg-[#38B2AC] disabled:opacity-50 text-[#0A1322] font-extrabold text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition flex items-center gap-1.5"
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
              <div className="p-4 sm:p-5 bg-[#0E1D33] border border-[#4FD1C5]/40 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#4FD1C5]">
                  <CheckCircle2 className="w-4 h-4 text-[#4FD1C5]" />
                  <span>AI Tutor Evaluation & Feedback:</span>
                </div>
                <div className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">
                  {evaluationResult}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={fetchQuestion}
                  className="px-5 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition flex items-center gap-2"
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
        <div className="p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-xl text-xs text-[#EF4444] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

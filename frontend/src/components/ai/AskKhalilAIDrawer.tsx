import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../../services/aiService';
import { AIMessage, AIConversation, AIActionType } from '../../types/ai';
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  Code2,
  HelpCircle,
  Compass,
  FileText,
  AlertCircle,
  Lightbulb,
  Terminal,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface AskKhalilAIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string;
  courseTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  initialAction?: AIActionType;
}

export const AskKhalilAIDrawer: React.FC<AskKhalilAIDrawerProps> = ({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
  initialAction,
}) => {
  // Chat State
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Technical Code/Error Toggle inside input
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Adaptive Level
  const [explanationLevel, setExplanationLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, courseId]);

  useEffect(() => {
    if (isOpen && initialAction) {
      if (initialAction === 'EXPLAIN') {
        handleSendMessage(`Explain the core concepts of "${lessonTitle || 'this lesson'}" clearly.`, 'EXPLAIN');
      } else if (initialAction === 'SUMMARY') {
        handleSendMessage(`Please summarize the lesson "${lessonTitle || 'this lesson'}" with key takeaways.`, 'SUMMARY');
      } else if (initialAction === 'QUIZ') {
        handleSendMessage(`Quiz me on "${lessonTitle || 'this lesson'}". Give me a question to test my understanding, and wait for my answer.`, 'QUIZ');
      } else if (initialAction === 'CODE_HELP') {
        setShowCodeInput(true);
      } else if (initialAction === 'STUDY_PLAN') {
        handleSendMessage(`What should I study next based on my current course progress and the curriculum?`, 'STUDY_PLAN');
      }
    }
  }, [isOpen, initialAction, lessonId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const fetchConversations = async () => {
    try {
      setLoadingHistory(true);
      const res = await aiService.getConversations(courseId);
      if (res.success && res.conversations) {
        setConversations(res.conversations);
        if (res.conversations.length > 0 && !activeConversationId) {
          loadConversation(res.conversations[0].id);
        }
      }
    } catch (err) {
      console.warn('Could not load AI conversations:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      setLoadingHistory(true);
      setActiveConversationId(convId);
      setShowHistoryDropdown(false);
      const res = await aiService.getConversation(convId);
      if (res.success && res.conversation) {
        setMessages(res.conversation.messages || []);
      }
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStartNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setShowHistoryDropdown(false);
    setInputMessage('');
    setCodeSnippet('');
    setErrorMessage('');
    setShowCodeInput(false);
  };

  const handleClearChat = async () => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    try {
      await aiService.clearConversation(activeConversationId);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear conversation:', err);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiService.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        handleStartNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSendMessage = async (customPrompt?: string, actionType: AIActionType = 'GENERAL') => {
    let textToSend = (customPrompt || inputMessage).trim();

    // If code or error is supplied in the code box
    if (showCodeInput && (codeSnippet.trim() || errorMessage.trim())) {
      if (codeSnippet.trim()) {
        textToSend += `\n\n\`\`\`\n${codeSnippet.trim()}\n\`\`\``;
      }
      if (errorMessage.trim()) {
        textToSend += `\n\n**Error / Output:**\n\`\`\`text\n${errorMessage.trim()}\n\`\`\``;
      }
    }

    if (!textToSend || sending) return;

    setInputMessage('');
    setCodeSnippet('');
    setErrorMessage('');
    setShowCodeInput(false);
    setError(null);

    // Optimistic temporary user message
    const tempUserMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversationId || '',
      role: 'USER',
      content: textToSend,
      actionType,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const res = await aiService.sendMessage({
        message: textToSend,
        conversationId: activeConversationId || undefined,
        courseId,
        lessonId,
        actionType,
        contextMeta: {
          level: explanationLevel,
          courseTitle,
          lessonTitle,
        },
      });

      if (res.success) {
        if (!activeConversationId) {
          setActiveConversationId(res.conversationId);
          fetchConversations();
        }
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          res.userMessage,
          res.assistantMessage,
        ]);
      } else {
        setError("I'm having trouble processing your request right now. Please try again.");
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        "I'm having trouble connecting right now. Please check your network or try again.";
      setError(errMsg);
    } finally {
      setSending(false);
    }
  };

  const handleRetry = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'USER');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content, (lastUserMsg.actionType as any) || 'GENERAL');
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to render code blocks with syntax styling and copy button
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const language = lines[0].trim().match(/^[a-zA-Z0-9_-]+$/) ? lines[0].trim() : '';
        const code = language ? lines.slice(1).join('\n') : lines.join('\n');

        return (
          <div key={pIdx} className="my-3 rounded-xl overflow-hidden border border-[#23426A] bg-[#070E1A]">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0E1D33] border-b border-[#23426A] text-[11px] text-[#94A3B8] font-mono">
              <span>{language || 'code'}</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="hover:text-[#4FD1C5] transition flex items-center gap-1 text-[10px]"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-3.5 text-xs text-[#38BDF8] font-mono overflow-x-auto whitespace-pre leading-relaxed">
              {code}
            </pre>
          </div>
        );
      }

      return (
        <span key={pIdx} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </span>
      );
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
      <div className="w-full max-w-2xl bg-[#0A1322] border-l border-[#23426A] flex flex-col h-full shadow-2xl animate-slide-left text-[#F8FAFC]">
        
        {/* 1. Header Bar */}
        <div className="h-16 px-4 sm:px-6 bg-[#0E1D33] border-b border-[#23426A] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 animate-pulse text-[#4FD1C5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-[#F8FAFC] flex items-center gap-2">
                <span>Ask Khalil AI</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#4FD1C5]/15 text-[#4FD1C5] border border-[#4FD1C5]/30">
                  TUTOR
                </span>
              </h2>
              <p className="text-[11px] text-[#94A3B8] truncate max-w-xs sm:max-w-md">
                {lessonTitle ? `Lesson: ${lessonTitle}` : courseTitle || 'Dynamic AI Learning Tutor'}
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center space-x-2">
            {/* Level Selector */}
            <div className="hidden sm:flex items-center bg-[#0A1322] rounded-xl border border-[#23426A] p-0.5 text-[11px] font-semibold">
              {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setExplanationLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    explanationLevel === lvl
                      ? 'bg-[#4FD1C5] text-[#0A1322] font-black shadow-sm'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Conversation History Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                className="p-2 text-[#CBD5E1] hover:text-[#4FD1C5] hover:bg-[#132742] rounded-xl transition flex items-center gap-1 text-xs font-semibold"
                title="Chat History"
              >
                <Layers className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </button>

              {showHistoryDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-[#102342] border border-[#23426A] rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#23426A] text-[11px] font-bold text-[#94A3B8]">
                    <span>Conversations</span>
                    <button
                      onClick={handleStartNewChat}
                      className="text-[#4FD1C5] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> New
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {conversations.length > 0 ? (
                      conversations.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => loadConversation(c.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition cursor-pointer ${
                            activeConversationId === c.id
                              ? 'bg-[#1A365D] text-[#4FD1C5] font-bold'
                              : 'text-[#CBD5E1] hover:bg-[#132742]'
                          }`}
                        >
                          <span className="truncate flex-1 pr-2">{c.title || 'Chat'}</span>
                          <button
                            onClick={(e) => handleDeleteConversation(c.id, e)}
                            className="text-[#94A3B8] hover:text-[#EF4444] transition p-1"
                            title="Delete Chat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-[#94A3B8]">No past chats.</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* New Chat Button */}
            <button
              onClick={handleStartNewChat}
              className="p-2 text-[#CBD5E1] hover:text-[#4FD1C5] hover:bg-[#132742] rounded-xl transition"
              title="Start New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#132742] rounded-xl transition"
              title="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Dynamic Smart Action Chips Bar */}
        <div className="px-4 py-2.5 bg-[#0E1D33]/60 border-b border-[#23426A] flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
          {[
            { label: 'Explain this lesson', prompt: `Explain the key concepts of "${lessonTitle || 'this lesson'}" step by step.`, icon: Sparkles },
            { label: 'Summarize lesson', prompt: `Summarize "${lessonTitle || 'this lesson'}" concisely with main takeaways.`, icon: FileText },
            { label: 'Quiz me on this', prompt: `Quiz me on "${lessonTitle || 'this lesson'}". Give me one question to test my understanding, and wait for my answer.`, icon: HelpCircle },
            { label: 'Real-world example', prompt: `Give me a practical real-world industry analogy and example for "${lessonTitle || 'this topic'}".`, icon: Lightbulb },
            { label: 'Debug code / error', action: () => setShowCodeInput(!showCodeInput), icon: Terminal },
            { label: 'What to study next?', prompt: `What should I study next based on my current course progress?`, icon: Compass },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  if (item.action) item.action();
                  else if (item.prompt) handleSendMessage(item.prompt);
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#132742] hover:bg-[#1A365D] border border-[#23426A] hover:border-[#4FD1C5]/40 text-[#CBD5E1] hover:text-[#F8FAFC] transition whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 shadow-sm"
              >
                <Icon className="w-3.5 h-3.5 text-[#4FD1C5]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-[#132742] border border-[#23426A] text-[#4FD1C5] mx-auto flex items-center justify-center shadow-xl">
                <Sparkles className="w-8 h-8 animate-pulse text-[#4FD1C5]" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-base font-extrabold text-[#F8FAFC]">Hi! I'm your Khalil AI Tutor.</h3>
                <p className="text-xs text-[#CBD5E1] leading-relaxed">
                  Ask me anything about {lessonTitle ? `"${lessonTitle}"` : 'your course'}, request real-world analogies, paste errors or code to troubleshoot, or ask me to quiz you!
                </p>
              </div>

              {/* Starter Quick Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto pt-2 text-left">
                {[
                  { title: 'Explain this lesson', desc: 'Step-by-step breakdown adapted to your level', prompt: `Explain "${lessonTitle || 'this lesson'}" clearly.` },
                  { title: 'Quiz my knowledge', desc: 'Answer interactive questions from lesson content', prompt: `Quiz me on "${lessonTitle || 'this lesson'}".` },
                  { title: 'Summarize key points', desc: 'Actionable takeaways and terminology', prompt: `Summarize "${lessonTitle || 'this lesson'}" with key takeaways.` },
                  { title: 'Debug an error', desc: 'Paste code or stack traces for instant diagnosis', action: () => setShowCodeInput(true) },
                ].map((card, cIdx) => (
                  <button
                    key={cIdx}
                    onClick={() => {
                      if (card.action) card.action();
                      else if (card.prompt) handleSendMessage(card.prompt);
                    }}
                    className="p-3.5 bg-[#102342] hover:bg-[#132742] border border-[#23426A] hover:border-[#4FD1C5]/50 rounded-2xl transition space-y-1 group"
                  >
                    <div className="text-xs font-bold text-[#F8FAFC] group-hover:text-[#4FD1C5] transition flex items-center justify-between">
                      <span>{card.title}</span>
                      <Sparkles className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#4FD1C5]" />
                    </div>
                    <div className="text-[11px] text-[#94A3B8] leading-tight">{card.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, mIdx) => {
              const isUser = msg.role === 'USER';
              return (
                <div
                  key={msg.id || mIdx}
                  className={`flex flex-col space-y-1 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center space-x-1.5 px-1 text-[10px] text-[#94A3B8] font-semibold">
                    <span>{isUser ? 'You' : 'Ask Khalil AI'}</span>
                    <span>•</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed relative shadow-md ${
                      isUser
                        ? 'bg-[#1A365D] text-[#F8FAFC] rounded-tr-sm border border-[#2B4C7E]'
                        : 'bg-[#102342] text-[#F8FAFC] rounded-tl-sm border border-[#23426A]'
                    }`}
                  >
                    <div className="text-[#F8FAFC]">{renderMessageContent(msg.content)}</div>

                    {!isUser && (
                      <div className="flex items-center justify-end space-x-3 pt-2 mt-2 border-t border-[#23426A]/50 text-[11px] text-[#94A3B8]">
                        <button
                          onClick={() => copyToClipboard(msg.content, mIdx)}
                          className="hover:text-[#4FD1C5] transition flex items-center gap-1"
                          title="Copy Answer"
                        >
                          {copiedIndex === mIdx ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                              <span className="text-[#22C55E]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex items-start space-x-3 p-4 bg-[#102342] border border-[#23426A] rounded-2xl max-w-xs animate-slide-up">
              <RefreshCw className="w-4 h-4 text-[#4FD1C5] animate-spin flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#CBD5E1] font-medium animate-pulse">
                Analyzing lesson context & thinking...
              </div>
            </div>
          )}

          {/* Honest Error State with Retry */}
          {error && (
            <div className="p-4 bg-[#EF4444]/15 border border-[#EF4444]/40 rounded-2xl text-xs text-[#EF4444] flex items-center justify-between gap-3 animate-slide-up">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{error}</span>
              </div>
              <button
                onClick={handleRetry}
                className="px-3 py-1.5 bg-[#EF4444] text-white font-bold rounded-xl text-xs hover:bg-[#DC2626] transition flex-shrink-0 flex items-center gap-1 shadow-sm"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. Optional Code / Error Expander */}
        {showCodeInput && (
          <div className="p-4 bg-[#0E1D33] border-t border-[#23426A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-[#4FD1C5]" />
                <span>Paste Code / Error for Diagnosis</span>
              </span>
              <button
                onClick={() => setShowCodeInput(false)}
                className="text-[11px] text-[#94A3B8] hover:text-[#F8FAFC]"
              >
                Hide
              </button>
            </div>

            <textarea
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Paste code snippet, Dockerfile, or Kubernetes YAML here..."
              rows={3}
              className="w-full font-mono p-3 bg-[#070E1A] border border-[#23426A] focus:border-[#4FD1C5] rounded-xl text-xs text-[#38BDF8] placeholder-[#94A3B8] focus:outline-none resize-none leading-relaxed"
            />

            <textarea
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="Paste error output or stack trace here (optional)..."
              rows={2}
              className="w-full font-mono p-3 bg-[#070E1A] border border-[#23426A] focus:border-[#4FD1C5] rounded-xl text-xs text-[#EF4444] placeholder-[#94A3B8] focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {/* 5. Input Area */}
        <div className="p-4 bg-[#0E1D33] border-t border-[#23426A] flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2"
          >
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  lessonTitle
                    ? `Ask about "${lessonTitle}" or type any question...`
                    : 'Ask your AI tutor anything...'
                }
                rows={1}
                className="w-full pl-4 pr-10 py-3 bg-[#070E1A] border border-[#23426A] focus:border-[#4FD1C5] rounded-2xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none transition resize-none max-h-32"
                disabled={sending}
              />

              <button
                type="button"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className={`absolute right-3 top-3 transition ${
                  showCodeInput ? 'text-[#4FD1C5]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
                title="Attach Code / Error Log"
              >
                <Code2 className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={sending || (!inputMessage.trim() && !codeSnippet.trim() && !errorMessage.trim())}
              className="p-3 bg-[#4FD1C5] hover:bg-[#38B2AC] disabled:opacity-40 text-[#0A1322] rounded-2xl transition shadow-lg shadow-[#4FD1C5]/20 flex-shrink-0 font-bold"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

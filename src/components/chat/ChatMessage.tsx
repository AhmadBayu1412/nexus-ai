'use client';

/**
 * ChatMessage Component
 *
 * Premium chat bubble with:
 * - Framer Motion entrance animation
 * - Glowing bot avatar (assistant) / user badge
 * - Rich markdown with syntax highlighted code blocks
 * - Reasoning/thinking block display
 * - Message action bar: copy, thumbs up/down, regenerate, instruct
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Bot,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  PencilLine,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import type { ChatMessage as ChatMessageType, MessageFeedback } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onInstruct?: (instruction: string) => void;
  onFeedback?: (feedback: MessageFeedback) => void;
  onCopy?: (text: string) => void;
  canRegenerate?: boolean;
}

const MESSAGE_VARIANTS = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 350,
      damping: 30,
      duration: 0.3,
    },
  },
};

function CopyButton({ code, onCopy }: { code: string; onCopy?: (text: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.(code);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      onCopy?.(code);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
        'text-xs font-medium',
        'transition-all duration-200',
        'focus-ring btn-press',
        copied
          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
          : 'bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:bg-slate-600/60 hover:text-white'
      )}
      aria-label={copied ? 'Code copied' : 'Copy code'}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

/* Assistant avatar — teal gradient */
function AssistantAvatar() {
  return (
    <div className="relative flex-shrink-0">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)',
        }}
      >
        <Bot className="w-4 h-4 text-white" strokeWidth={1.5} />
      </div>
      <span
        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#F2EFE6] animate-pulse"
      />
    </div>
  );
}

/* User avatar — sage gradient to distinguish from assistant */
function UserAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg, #5C7A5E 0%, #4a6649 100%)',
      }}
    >
      <User className="w-4 h-4 text-white/90" strokeWidth={1.5} />
    </div>
  );
}

/* Thinking indicator dots — teal/sage palette */
function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mt-3 flex items-center gap-2.5 px-4 py-3 rounded-xl w-fit"
      style={{
        background: 'rgba(44, 42, 38, 0.90)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(44, 42, 38, 0.12)',
      }}
    >
      <div className="relative shrink-0">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10"/>
            <path d="M12 12 12 6"/>
            <path d="M12 12 16 14"/>
            <circle cx="18" cy="6" r="3"/>
            <path d="M18 3v6"/>
          </svg>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="thinking-dot w-1.5 h-1.5 rounded-full" style={{ background: '#4A6B7C' }}/>
        <span className="thinking-dot w-1.5 h-1.5 rounded-full" style={{ background: '#5C7A5E' }}/>
        <span className="thinking-dot w-1.5 h-1.5 rounded-full" style={{ background: '#4A6B7C' }}/>
      </div>
      <span className="text-sm font-medium text-gradient">AI is thinking</span>
      <span style={{ color: '#9E9B94' }}>...</span>
    </motion.div>
  );
}

interface MessageActionBarProps {
  content: string;
  feedback?: MessageFeedback;
  onCopy: () => void;
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  onRegenerate: () => void;
  onInstruct: () => void;
  canRegenerate: boolean;
}

function MessageActionBar({
  feedback,
  onCopy,
  onThumbsUp,
  onThumbsDown,
  onRegenerate,
  onInstruct,
  canRegenerate,
}: MessageActionBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.2 }}
      className="flex items-center gap-1 mt-2 flex-wrap"
    >
      {/* Copy */}
      <button
        onClick={onCopy}
        className="action-btn"
        title="Copy"
        aria-label="Copy message"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      {/* Thumbs Up */}
      <button
        onClick={onThumbsUp}
        className={cn('action-btn', feedback?.type === 'like' && 'action-btn-active')}
        title="Good response"
        aria-label="Mark as good response"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>

      {/* Thumbs Down */}
      <button
        onClick={onThumbsDown}
        className={cn('action-btn', feedback?.type === 'dislike' && 'action-btn-active')}
        title="Bad response"
        aria-label="Mark as bad response"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>

      {/* Regenerate */}
      {canRegenerate && (
        <button
          onClick={onRegenerate}
          className="action-btn"
          title="Regenerate response"
          aria-label="Regenerate response"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Instruct */}
      <button
        onClick={onInstruct}
        className="action-btn"
        title="Give instructions"
        aria-label="Give AI instructions about this response"
      >
        <PencilLine className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

interface InstructPopupProps {
  onSubmit: (instruction: string) => void;
  onClose: () => void;
}

function InstructPopup({ onSubmit, onClose }: InstructPopupProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="instruct-popup mt-2"
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5" style={{ color: '#4A6B7C' }} />
        <span className="text-xs font-medium" style={{ color: '#4A6B7C' }}>Give AI instructions</span>
        <button
          onClick={onClose}
          className="ml-auto p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') onClose();
        }}
        placeholder="e.g., Make it shorter, use different examples..."
        rows={2}
        className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none transition-colors"
        style={{
          background: 'rgba(44, 42, 38, 0.80)',
          border: '1px solid rgba(44, 42, 38, 0.14)',
          color: 'var(--text-primary)',
        }}
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="px-3 py-1.5 rounded-lg text-xs text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors btn-press"
          style={{
            background: '#4A6B7C',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3d5a69'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#4A6B7C'; }}
        >
          Send
        </button>
      </div>
    </motion.div>
  );
}

interface ReasoningBlockProps {
  reasoning: string;
}

function ReasoningBlock({ reasoning }: ReasoningBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="reasoning-block mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
        style={{
          border: '1px solid rgba(74,107,124,0.18)',
          background: 'rgba(74,107,124,0.06)',
        }}
      >
        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#4A6B7C' }} />
        <span className="text-xs font-medium" style={{ color: '#4A6B7C' }}>Thinking</span>
        <span className="text-xs ml-auto flex items-center gap-1" style={{ color: '#9E9B94' }}>
          {isOpen ? (
            <>
              <span>Hide</span>
              <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              <span>Show</span>
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2 px-3 pb-2">
              <p className="text-xs font-mono leading-relaxed whitespace-pre-wrap" style={{ color: '#9E9B94' }}>
                {reasoning}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChatMessage({
  message,
  isStreaming = false,
  onRegenerate,
  onInstruct,
  onFeedback,
  onCopy,
  canRegenerate = false,
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  const [copied, setCopied] = useState(false);
  const [showInstruct, setShowInstruct] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      onCopy?.(message.content);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [message.content, onCopy]);

  const handleThumbsUp = useCallback(() => {
    onFeedback?.({ type: 'like', timestamp: Date.now() });
  }, [onFeedback]);

  const handleThumbsDown = useCallback(() => {
    onFeedback?.({ type: 'dislike', timestamp: Date.now() });
  }, [onFeedback]);

  const handleRegenerate = useCallback(() => {
    onRegenerate?.();
  }, [onRegenerate]);

  const handleInstructOpen = useCallback(() => {
    setShowInstruct(true);
  }, []);

  const handleInstructSubmit = useCallback(
    (instruction: string) => {
      setShowInstruct(false);
      onInstruct?.(instruction);
    },
    [onInstruct]
  );

  const showActionBar = !isUser && !isStreaming && message.content.length > 0;

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial={false}
      animate="visible"
      className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && <AssistantAvatar />}

      <div
        className={cn(
          'max-w-[80%] md:max-w-[70%] flex flex-col gap-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {isUser ? (
          <>
            {/* User bubble — deep teal solid */}
            <div
              className="px-4 py-3 rounded-2xl rounded-tr-sm relative overflow-hidden"
              style={{
                background: 'var(--user-bubble-bg)',
              }}
            >
              <div
                className="absolute inset-0 opacity-10 rounded-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)',
                }}
              />
              <p className="relative whitespace-pre-wrap break-words leading-relaxed" style={{ color: 'var(--user-bubble-text)' }}>
                {message.content}
              </p>
              {isStreaming && (
                <span className="relative ml-2 inline-block w-1 h-4 bg-white/70 rounded animate-pulse align-middle" />
              )}
            </div>
          </>
        ) : (
          <>
            {/* Assistant bubble — warm white surface */}
            <div
              className="
                px-4 py-3
                rounded-2xl rounded-tl-sm
                glass
                shadow-md
                relative
              "
            >
              {/* Reasoning block (if available) */}
              {message.reasoning && <ReasoningBlock reasoning={message.reasoning} />}

              {/* Markdown content */}
              <div className="markdown-content relative">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      const codeString = String(children).replace(/\n$/, '');

                      if (isInline) {
                        return (
                          <code
                            className="px-1.5 py-0.5 rounded-md text-[0.875em] font-mono"
                            style={{
                              background: 'rgba(138,90,59,0.10)',
                              border: '1px solid rgba(138,90,59,0.18)',
                              color: '#8A5A3B',
                            }}
                            {...props}
                          >
                            {children}
                          </code>
                        );
                      }

                      return (
                        <div className="my-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(44,42,38,0.08)' }}>
                          <div
                            className="flex items-center justify-between px-4 py-2.5"
                            style={{ background: 'rgba(44,42,38,0.95)', borderBottom: '1px solid rgba(44,42,38,0.08)' }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 shadow-sm" />
                              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 shadow-sm" />
                              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 shadow-sm" />
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              {language || 'code'}
                            </span>
                            <CopyButton code={codeString} />
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={language || 'text'}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              padding: '1rem 1.25rem',
                              background: 'rgba(1, 4, 9, 0.95)',
                              fontSize: '0.8125rem',
                              lineHeight: '1.65',
                              borderRadius: 0,
                            }}
                            codeTagProps={{
                              style: {
                                fontFamily:
                                  "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                              },
                            }}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      );
                    },
                    script: () => null,
                    iframe: () => null,
                    object: () => null,
                    embed: () => null,
                  }}
                >
                  {message.content}
                </ReactMarkdown>

                {/* Streaming cursor */}
                <AnimatePresence mode="wait">
                  {isStreaming && message.content.length === 0 && (
                    <motion.span
                      key="cursor"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="ml-0.5 inline-block w-1 h-4 rounded animate-pulse align-text-bottom"
                      style={{ background: '#4A6B7C', opacity: 0.8 }}
                    />
                  )}
                </AnimatePresence>

                {/* Copied confirmation */}
                <AnimatePresence>
                  {copied && !isStreaming && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-md pointer-events-none"
                      style={{
                        background: 'rgba(74,107,124,0.12)',
                        border: '1px solid rgba(74,107,124,0.22)',
                        color: '#4A6B7C',
                        fontSize: '0.75rem',
                        animation: 'fade-in 150ms ease-out',
                      }}
                    >
                      <Check className="w-3 h-3" />
                      Copied
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action bar */}
              {showActionBar && (
                <>
                  <MessageActionBar
                    content={message.content}
                    feedback={message.feedback}
                    onCopy={handleCopy}
                    onThumbsUp={handleThumbsUp}
                    onThumbsDown={handleThumbsDown}
                    onRegenerate={handleRegenerate}
                    onInstruct={handleInstructOpen}
                    canRegenerate={canRegenerate}
                  />

                  {/* Instruct popup */}
                  <AnimatePresence>
                    {showInstruct && (
                      <InstructPopup
                        onSubmit={handleInstructSubmit}
                        onClose={() => setShowInstruct(false)}
                      />
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </>
        )}

        {/* User avatar on right */}
        {isUser && <UserAvatar />}
      </div>
    </motion.div>
  );
}

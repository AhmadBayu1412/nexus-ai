'use client';

/**
 * ChatSidebar Component
 *
 * Displays chat history in a sidebar.
 * Nexus AI warm-neutral aesthetic with glass styling,
 * collapsible on mobile (hamburger menu).
 */

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, MessageSquare, Menu, X, Trash2, Bot, LayoutGrid, Sparkles, Code, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/components/providers/AuthProvider';
import { SmartButton } from '@/components/ui/SmartButton';
import { useToast } from '@/components/ui/Toast';
import type { ChatListItem } from '@/types/chat';
import { cn } from '@/lib/utils';

/** Cooldown between consecutive "Chat baru" clicks (ms) */
const NEW_CHAT_COOLDOWN_MS = 3000;

interface ChatSidebarProps {
  chats: ChatListItem[];
  activeChatId?: string;
  onNewChat?: () => void;
  onDeleteChat?: (chatId: string) => void;
}

function formatDate(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  if (days < 30) return `${Math.floor(days / 7)} minggu lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick?: () => void;
}

function NavItem({ icon, label, active, badge, onClick }: NavItemProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
      )}
      style={{
        color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.65)',
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 150ms cubic-bezier(0.4,0,0.2,1), color 150ms cubic-bezier(0.4,0,0.2,1)',
      }}
      whileHover={shouldReduceMotion ? {} : { scale: 1.01, filter: 'brightness(1.12)' }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
      transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
    >
      <span style={{ opacity: active ? 1 : 0.75 }}>{icon}</span>
      <span className="flex-1 text-left font-medium">{label}</span>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
          style={{ background: 'rgba(92,122,94,0.85)', color: '#ffffff' }}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

interface ComingSoonNavItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  featureName?: string;
}

function ComingSoonNavItem({ icon, label, badge, featureName }: ComingSoonNavItemProps) {
  const [isError, setIsError] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { toast } = useToast();

  const handleClick = () => {
    if (isError) return;
    setIsError(true);
    toast({
      message: `\u26a0\ufe0f ${featureName ?? label} belum tersedia. Segera hadir!`,
      type: 'error',
      duration: 3000,
    });
    setTimeout(() => setIsError(false), 1800);
  };

  return (
    <motion.button
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
      )}
      style={{
        color: isError ? '#fca5a5' : 'rgba(255,255,255,0.65)',
        background: isError ? 'rgba(239,68,68,0.12)' : 'transparent',
        border: isError ? '1px solid rgba(239,68,68,0.25)' : '1px solid transparent',
        cursor: 'pointer',
        transition: 'background 200ms cubic-bezier(0.4,0,0.2,1), color 200ms cubic-bezier(0.4,0,0.2,1), border-color 200ms cubic-bezier(0.4,0,0.2,1)',
      }}
      animate={isError ? { x: shouldReduceMotion ? 0 : [0, -6, 6, -4, 4, -2, 2, 0] } : { x: 0 }}
      transition={isError ? { duration: 0.4, ease: 'easeInOut' } : { duration: 0.12, ease: [0.2, 0, 0, 1] }}
      whileTap={shouldReduceMotion || isError ? {} : { scale: 0.97 }}
      aria-label={`${label} — belum tersedia`}
    >
      <span style={{ opacity: isError ? 1 : 0.75 }}>{icon}</span>
      <span className="flex-1 text-left font-medium">{label}</span>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
          style={{
            background: isError ? 'rgba(239,68,68,0.25)' : 'rgba(92,122,94,0.85)',
            color: isError ? '#fca5a5' : '#ffffff',
            transition: 'background 200ms ease, color 200ms ease',
          }}>
          {badge}
        </span>
      )}
    </motion.button>
  );
}

export function ChatSidebar({ chats, activeChatId, onNewChat, onDeleteChat }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { getIdToken } = useAuth();
  const { toast } = useToast();
  const lastNewChatClickRef = useRef<number>(0);

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      // ── Optimistic removal ─────────────────────────────────────────────────
      // Remove from UI immediately so the user sees instant feedback.
      onDeleteChat?.(chatId);
      // If user is currently viewing this chat, redirect away at once.
      if (pathname === `/chat/${chatId}`) router.push('/chat');

      // Show confirmation toast right away
      toast({ message: '🗑️ Chat berhasil dihapus.', type: 'success', duration: 2500 });

      // ── Background API call ───────────────────────────────────────────────
      try {
        const token = await getIdToken();
        const response = await fetch(`/api/chats/${chatId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          toast({ message: '⚠️ Gagal menghapus chat dari server. Coba refresh halaman.', type: 'error', duration: 4000 });
        }
      } catch {
        toast({ message: '⚠️ Gagal menghapus chat. Periksa koneksimu.', type: 'error', duration: 4000 });
      }
    },
    [getIdToken, onDeleteChat, pathname, router, toast]
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 right-4 z-50 md:hidden p-2.5 rounded-xl border border-white/[0.07] shadow-lg hover:shadow-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
        style={{ background: 'rgba(44, 42, 38, 0.92)', backdropFilter: 'blur(16px)', color: 'var(--text-secondary)', cursor: 'pointer' }}
        aria-label="Toggle sidebar"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Menu className="w-5 h-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 flex flex-col h-dvh overflow-hidden',
          'w-[260px] transition-transform duration-300 ease-in-out md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        {/* Header */}
        <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)' }}>
              <Bot className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold" style={{ color: '#ffffff' }}>Nexus AI</span>
          </div>

          {/* Nav — tanpa "Chat baru" duplikat */}
          <nav className="space-y-0.5 mb-3">
            <NavItem
              icon={<MessageSquare className="w-4 h-4" />}
              label="Obrolan"
              active={pathname.startsWith('/chat')}
              onClick={() => { router.push('/chat'); setIsOpen(false); }}
            />
            <ComingSoonNavItem icon={<LayoutGrid className="w-4 h-4" />} label="Proyek" featureName="Fitur Proyek" />
            <ComingSoonNavItem icon={<Sparkles className="w-4 h-4" />} label="Artefak" featureName="Fitur Artefak" />
            <ComingSoonNavItem icon={<Code className="w-4 h-4" />} label="Kode" badge="Tingkatkan" featureName="Fitur Kode" />
            <ComingSoonNavItem icon={<SlidersHorizontal className="w-4 h-4" />} label="Sesuaikan" featureName="Fitur Sesuaikan" />
          </nav>

          {/* Chat baru SmartButton — dengan spam protection + empty chat guard */}
          <SmartButton
            onClick={async () => {
              // ── Spam protection ────────────────────────────────────────────
              const now = Date.now();
              const elapsed = now - lastNewChatClickRef.current;
              if (elapsed < NEW_CHAT_COOLDOWN_MS && lastNewChatClickRef.current !== 0) {
                const remaining = Math.ceil((NEW_CHAT_COOLDOWN_MS - elapsed) / 1000);
                toast({
                  message: `⏳ Terlalu cepat! Tunggu ${remaining} detik sebelum membuat chat baru.`,
                  type: 'error',
                  duration: 2500,
                });
                throw new Error('spam-protection');
              }

              // ── Delegate to page-level handler ────────────────────────────
              // handleNewChat may throw 'already-on-empty-chat' if user is
              // already in an empty chat (id === 'new' or 0 messages).
              try {
                lastNewChatClickRef.current = now;
                onNewChat?.();
                setIsOpen(false);
              } catch (err) {
                const msg = err instanceof Error ? err.message : '';
                if (msg === 'already-on-empty-chat') {
                  toast({
                    message: '💬 Kamu sudah berada di chat kosong. Ketik pesan dulu!',
                    type: 'info',
                    duration: 3000,
                  });
                }
                // Re-throw so SmartButton transitions to error/shake state
                throw err;
              }
            }}
            idleLabel="Chat baru"
            loadingLabel="Memuat..."
            successLabel="Chat dibuat!"
            errorLabel="Sudah di chat baru!"
            idleIcon={<Plus className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
            variant="sidebar"
            successResetMs={1200}
            errorResetMs={2000}
            className="w-full justify-start gap-2"
          />
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
          {chats.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Belum ada percakapan.<br />Mulai chat baru!
              </p>
            </div>
          ) : (
            <nav className="space-y-0.5">
              {chats.map((chat) => {
                const isActive = activeChatId ? chat.id === activeChatId : pathname === `/chat/${chat.id}`;
                return (
                  <div key={chat.id} className="group relative">
                    <Link
                      href={`/chat/${chat.id}`}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                        isActive ? 'border-l-2' : 'hover:bg-white/[0.05]'
                      )}
                      style={isActive
                        ? { background: 'rgba(74,107,124,0.18)', color: '#ffffff', borderLeftColor: '#4A6B7C', paddingLeft: '10px' }
                        : { color: 'rgba(255,255,255,0.70)' }
                      }
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate leading-tight">{chat.title || 'Percakapan baru'}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.42)' }}>{formatDate(chat.updatedAt)}</p>
                      </div>
                    </Link>
                    {/* Trash button — single click deletes immediately */}
                    <motion.button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteChat(chat.id); }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg"
                      style={{ cursor: 'pointer' }}
                      aria-label="Hapus chat"
                      title="Hapus chat"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ opacity: 1, scale: 1.08, color: '#f87171', backgroundColor: 'rgba(239,68,68,0.12)' }}
                      whileTap={{ scale: 0.88 }}
                      transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
                    </motion.button>
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Nexus AI adalah AI dan bisa keliru.
          </p>
        </div>
      </aside>
    </>
  );
}

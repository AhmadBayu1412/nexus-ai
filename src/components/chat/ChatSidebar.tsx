'use client';

/**
 * ChatSidebar Component
 *
 * Displays chat history in a sidebar.
 * Nexus AI warm-neutral aesthetic with glass styling,
 * collapsible on mobile (hamburger menu).
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, MessageSquare, Menu, X, Trash2, Bot, LayoutGrid, Sparkles, Code, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import type { ChatListItem } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  chats: ChatListItem[];
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
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150"
      style={{
        color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.65)',
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
      }}
    >
      <span style={{ opacity: active ? 1 : 0.75 }}>{icon}</span>
      <span className="flex-1 text-left font-medium">{label}</span>
      {badge && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
          style={{
            background: 'rgba(92,122,94,0.85)',
            color: '#ffffff',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function ChatSidebar({ chats, onNewChat, onDeleteChat }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { getIdToken } = useAuth();

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      if (deleteConfirm !== chatId) {
        setDeleteConfirm(chatId);
        setTimeout(() => setDeleteConfirm(null), 3000);
        return;
      }

      try {
        const token = await getIdToken();
        const response = await fetch(`/api/chats/${chatId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          setDeleteConfirm(null);
          onDeleteChat?.(chatId);
          if (pathname === `/chat/${chatId}`) {
            router.push('/chat');
          }
        }
      } catch (error) {
        console.error('Failed to delete chat:', error);
      }
    },
    [deleteConfirm, getIdToken, onDeleteChat, pathname, router]
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 right-4 z-50 md:hidden p-2.5 rounded-xl border border-white/[0.07] shadow-lg hover:shadow-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
        style={{
          background: 'rgba(44, 42, 38, 0.92)',
          backdropFilter: 'blur(16px)',
          color: 'var(--text-secondary)',
        }}
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-40 flex flex-col h-dvh overflow-hidden',
          'w-[260px] transition-transform duration-300 ease-in-out md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
        }}
      >
        {/* Header */}
        <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-4 px-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4A6B7C 0%, #3d5a69 100%)' }}
            >
              <Bot className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-sm font-semibold" style={{ color: '#ffffff' }}>Nexus AI</span>
          </div>

          {/* Navigation items */}
          <nav className="space-y-0.5 mb-3">
            <NavItem icon={<Plus className="w-4 h-4" />} label="Chat baru" onClick={() => { onNewChat?.(); setIsOpen(false); }} />
            <NavItem icon={<MessageSquare className="w-4 h-4" />} label="Obrolan" active />
            <NavItem icon={<LayoutGrid className="w-4 h-4" />} label="Proyek" />
            <NavItem icon={<Sparkles className="w-4 h-4" />} label="Artefak" />
            <NavItem icon={<Code className="w-4 h-4" />} label="Kode" badge="Tingkatkan" />
            <NavItem icon={<SlidersHorizontal className="w-4 h-4" />} label="Sesuaikan" />
          </nav>

          {/* New Chat button */}
          <button
            onClick={() => {
              onNewChat?.();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              color: 'rgba(255,255,255,0.75)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
            }}
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span>Chat baru</span>
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
          {chats.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Belum ada percakapan.
                <br />
                Mulai chat baru!
              </p>
            </div>
          ) : (
            <nav className="space-y-0.5">
              {chats.map((chat) => {
                const isActive = pathname === `/chat/${chat.id}`;
                const isConfirmDelete = deleteConfirm === chat.id;

                return (
                  <div key={chat.id} className="group relative">
                    <Link
                      href={`/chat/${chat.id}`}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                        isActive
                          ? 'border-l-2'
                          : 'hover:bg-white/[0.05]'
                      )}
                      style={
                        isActive
                          ? {
                              background: 'rgba(74,107,124,0.18)',
                              color: '#ffffff',
                              borderLeftColor: '#4A6B7C',
                              paddingLeft: '10px',
                            }
                          : { color: 'rgba(255,255,255,0.70)' }
                      }
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-50" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate leading-tight">
                          {chat.title || 'Percakapan baru'}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.42)' }}>
                          {formatDate(chat.updatedAt)}
                        </p>
                      </div>
                    </Link>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      className={cn(
                        'absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all'
                      )}
                      style={
                        isConfirmDelete
                          ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', opacity: 1 }
                          : { opacity: 0, color: 'rgba(255,255,255,0.40)' }
                      }
                      aria-label={isConfirmDelete ? 'Konfirmasi hapus' : 'Hapus chat'}
                      title={isConfirmDelete ? 'Klik lagi untuk konfirmasi' : 'Hapus'}
                      onMouseEnter={(e) => {
                        if (!isConfirmDelete) {
                          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                          (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isConfirmDelete) {
                          (e.currentTarget as HTMLButtonElement).style.opacity = '0';
                          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.40)';
                          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        }
                      }}
                    >
                      {isConfirmDelete ? (
                        <div className="flex items-center gap-1">
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-medium">Hapus?</span>
                        </div>
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
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

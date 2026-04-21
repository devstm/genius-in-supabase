'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Source = {
  filename: string
  source: string
  similarity: number
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

const STARTER_QUESTIONS = [
  { label: 'Setup Database Webhooks', icon: '⚡', q: 'How do I set up database webhooks in Supabase?' },
  { label: 'RLS Policy Examples', icon: '🔒', q: 'Show me Row Level Security policy examples.' },
  { label: 'Realtime Subscriptions', icon: '📡', q: 'How do I subscribe to realtime changes?' },
  { label: 'Auth with OAuth', icon: '🔑', q: 'How do I configure OAuth providers for authentication?' },
]

const PINNED_LINKS = [
  { label: 'Database', href: 'https://supabase.com/docs/guides/database' },
  { label: 'Auth', href: 'https://supabase.com/docs/guides/auth' },
  { label: 'Storage', href: 'https://supabase.com/docs/guides/storage' },
  { label: 'Edge Functions', href: 'https://supabase.com/docs/guides/functions' },
]

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isChat = messages.length > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Global Cmd+K / Ctrl+K shortcut to focus input
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function submit(question?: string) {
    const q = (question ?? input).trim()
    if (!q || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()

      setMessages((prev) => [
        ...prev,
        res.ok
          ? { role: 'assistant', content: data.answer, sources: data.sources }
          : { role: 'assistant', content: `Error: ${data.error ?? 'Something went wrong.'}` },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="mesh-bg flex h-screen overflow-hidden text-zinc-100">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden shrink-0 border-r border-white/5 flex flex-col bg-white/[0.02]"
          >
            <div className="px-4 pt-5 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-lg">⚡</span>
                <span className="font-semibold text-sm tracking-tight">Supabase Docs</span>
              </div>
            </div>

            <div className="px-3 pt-4 pb-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-1 mb-2">
                Pinned Docs
              </p>
              {PINNED_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-500/60 shrink-0" />
                  {link.label}
                </a>
              ))}
            </div>

            <div className="px-3 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-1 mb-2">
                Recent
              </p>
              {messages.filter((m) => m.role === 'user').slice(-4).reverse().map((m, i) => (
                <div
                  key={i}
                  className="px-2 py-1.5 rounded-lg text-xs text-zinc-500 truncate hover:text-zinc-300 hover:bg-white/5 transition-colors cursor-default"
                >
                  {m.content}
                </div>
              ))}
              {messages.filter((m) => m.role === 'user').length === 0 && (
                <p className="px-2 text-xs text-zinc-700">No conversations yet.</p>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main panel ──────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/5 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            title="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect y="3" width="16" height="1.5" rx="0.75" />
              <rect y="7.25" width="16" height="1.5" rx="0.75" />
              <rect y="11.5" width="16" height="1.5" rx="0.75" />
            </svg>
          </button>
          <span className="text-sm font-medium text-zinc-400">Supabase Docs Assistant</span>
          {isChat && (
            <button
              onClick={() => setMessages([])}
              className="ml-auto text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              New chat
            </button>
          )}
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!isChat ? (
              /* ── Empty / Hero state ── */
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center min-h-full px-6 py-20"
              >
                <div className="mb-3 flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-2xl">
                  ⚡
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 mb-2 text-center">
                  What can I help you build?
                </h1>
                <p className="text-zinc-500 text-sm mb-10 text-center max-w-sm">
                  Ask anything about Supabase. Answers are grounded in the official documentation.
                </p>

                {/* Starter question cards */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {STARTER_QUESTIONS.map((sq) => (
                    <motion.button
                      key={sq.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => submit(sq.q)}
                      className="flex flex-col items-start gap-1.5 px-4 py-3.5 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.07] hover:border-emerald-500/25 transition-all text-left group"
                    >
                      <span className="text-lg">{sq.icon}</span>
                      <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors leading-snug">
                        {sq.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* ── Chat state ── */
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-6 space-y-5 max-w-3xl mx-auto w-full"
              >
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-2xl w-full ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-[9px] text-emerald-400">⚡</span>
                          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Assistant</span>
                        </div>
                      )}

                      <div
                        className={
                          msg.role === 'user'
                            ? 'bg-white/8 border border-white/10 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-zinc-200 max-w-lg'
                            : 'bg-white/[0.04] border border-white/6 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-zinc-300 w-full leading-relaxed'
                        }
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>

                      {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {msg.sources.map((s, j) => (
                            <a
                              key={j}
                              href={s.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 bg-white/4 hover:bg-white/8 border border-white/6 hover:border-emerald-500/30 px-2.5 py-1 rounded-full transition-all"
                            >
                              <span className="text-emerald-500/70 font-mono">[{j + 1}]</span>
                              {s.filename}
                              <span className="text-zinc-700">{(s.similarity * 100).toFixed(0)}%</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/6 rounded-2xl rounded-tl-sm px-4 py-3">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-emerald-500/60"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                          />
                        ))}
                      </span>
                      <span className="text-xs text-zinc-600">Thinking</span>
                    </div>
                  </motion.div>
                )}

                <div ref={bottomRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Input bar ─────────────────────────────────────── */}
        <div className="shrink-0 border-t border-white/5 px-4 py-4">
          <div className="max-w-3xl mx-auto flex gap-2 items-center">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about Supabase…"
                disabled={loading}
                className="input-glow w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 pr-20 text-sm text-zinc-200 placeholder-zinc-600 transition-all disabled:opacity-40"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600">
                ⌘K
              </kbd>
            </div>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => submit()}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/8 disabled:text-zinc-600 text-white px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
            >
              Send
            </motion.button>
          </div>
        </div>

      </div>
    </div>
  )
}

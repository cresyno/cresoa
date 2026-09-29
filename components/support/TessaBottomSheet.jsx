'use client'

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

// Set > 0 to restore past messages when the sheet opens (was .limit(0) = off).
const HISTORY_LIMIT = 0;

const DEFAULT_SUGGESTIONS = [
  "Who's on my team?",
  'What did I sell today?',
  'How do I invite a member?',
  'What can you help with?',
];

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */

let _id = 0;
const uid = () => `m${Date.now()}-${_id++}`;
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const ICONS = {
  mic: (
    <>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" />,
  arrowUp: (
    <>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  chevronDown: <polyline points="6 9 12 15 18 9" />,
  retry: (
    <>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" />
    </>
  ),
};

const Icon = ({ name, size = 20, sw = 2 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICONS[name]}
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Tessa orb — rainbow ring spins only while Tessa is thinking        */
/* ------------------------------------------------------------------ */

function TessaOrb({ size = 36, spinning = false }) {
  const ring = Math.max(2, Math.round(size * 0.07));
  return (
    <div
      className={`tsa-orb ${spinning ? 'is-spin' : ''}`}
      style={{ '--s': `${size}px`, '--ring': `${ring}px` }}
      aria-hidden="true"
    >
      <div className="tsa-orb-core">
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3z" />
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Light markdown for AI answers (bold, code, lists, headings)        */
/* ------------------------------------------------------------------ */

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`'))
      return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function RichText({ text }) {
  // Hide a dangling "**" while text is still being revealed
  const t = ((text.match(/\*\*/g) || []).length % 2)
    ? text.replace(/\*\*(?!.*\*\*)/s, '')
    : text;

  const blocks = [];
  let list = null;
  t.split('\n').forEach((line) => {
    const ul = line.match(/^\s*[-*•]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    const h = line.match(/^#{1,4}\s+(.*)/);
    if (ul || ol) {
      const type = ul ? 'ul' : 'ol';
      if (!list || list.type !== type) {
        list = { type, items: [] };
        blocks.push(list);
      }
      list.items.push((ul || ol)[1]);
    } else {
      list = null;
      if (h) blocks.push({ type: 'p', text: `**${h[1]}**` });
      else if (line.trim()) blocks.push({ type: 'p', text: line });
    }
  });

  return (
    <div className="tsa-rich">
      {blocks.map((b, i) => {
        if (b.type === 'p') return <p key={i}>{inline(b.text)}</p>;
        const Tag = b.type;
        return (
          <Tag key={i}>
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </Tag>
        );
      })}
    </div>
  );
}

/* Word-by-word reveal for fresh answers (skipped for reduced motion) */
function useReveal(text, active, onTick) {
  const [n, setN] = useState(active ? 0 : text.length);
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    if (!active) {
      setN(text.length);
      return;
    }
    let raf;
    let start;
    const total = clamp(text.length * 9, 500, 1800);
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / total, 1);
      setN(p >= 1 ? text.length : Math.floor(text.length * p));
      tickRef.current?.();
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, active]);

  let end = n;
  while (end < text.length && !/\s/.test(text[end])) end++;
  return text.slice(0, end);
}

/* ------------------------------------------------------------------ */
/*  Message row                                                        */
/* ------------------------------------------------------------------ */

function MessageRow({ msg, isStart, isEnd, onRetry, onTick }) {
  const isUser = msg.role === 'user';
  const shown = useReveal(msg.text, !!msg.animate, onTick);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className={`tsa-row ${isUser ? 'tsa-row--user' : ''} ${isStart ? 'is-start' : ''}`}>
      {!isUser && <div className="tsa-av">{isStart && <TessaOrb size={28} />}</div>}
      <div className="tsa-col">
        <div
          className={[
            'tsa-bub',
            isUser ? 'tsa-bub--user' : 'tsa-bub--ai',
            msg.error ? 'tsa-bub--error' : '',
            isStart ? 'is-start' : '',
          ].join(' ')}
        >
          {isUser ? <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span> : <RichText text={shown} />}
        </div>

        {isEnd && (
          <div className="tsa-meta">
            <time>{fmtTime(msg.ts)}</time>
            {msg.error ? (
              <button type="button" onClick={() => onRetry(msg)}>
                <Icon name="retry" size={13} /> Retry
              </button>
            ) : (
              !isUser && (
                <button type="button" onClick={copy}>
                  <Icon name={copied ? 'check' : 'copy'} size={13} /> {copied ? 'Copied' : 'Copy'}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function TessaBottomSheet({
  isOpen,
  onClose,
  businessId,
  suggestions = DEFAULT_SUGGESTIONS,
  pageContext, // optional: e.g. "team" — sent to the API as page_context
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [notice, setNotice] = useState('');
  const [showJump, setShowJump] = useState(false);

  // sheet state
  const [mounted, setMounted] = useState(isOpen);
  const [entered, setEntered] = useState(false);
  const [snap, setSnap] = useState('half');
  const [dragHeight, setDragHeight] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [vv, setVv] = useState({ h: 800, top: 0 });

  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);
  const stick = useRef(true);
  const drag = useRef(null);
  const sendRef = useRef(null);
  const loadingRef = useRef(false);
  const reqId = useRef(0);
  const newConvoRef = useRef(false);
  const noticeTimer = useRef(null);
  const coarse = useRef(false);

  const setLoading = (v) => {
    loadingRef.current = v;
    setIsLoading(v);
  };

  const flash = useCallback((text) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3200);
  }, []);

  /* ---------- mount / unmount with enter + exit animation ---------- */
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setSnap('half');
      setDragHeight(null);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
      return () => cancelAnimationFrame(r);
    }
    setEntered(false);
    recognitionRef.current?.abort?.();
    const t = setTimeout(() => setMounted(false), 400);
    return () => clearTimeout(t);
  }, [isOpen]);

  /* ---------- lock page scroll ---------- */
  useEffect(() => {
    document.body.style.overflow = mounted ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted]);

  /* ---------- follow the visual viewport (keyboard-safe) ---------- */
  useEffect(() => {
    if (!mounted) return;
    const vp = window.visualViewport;
    const update = () =>
      setVv({
        h: Math.round(vp?.height ?? window.innerHeight),
        top: Math.round(vp?.offsetTop ?? 0),
      });
    update();
    vp?.addEventListener('resize', update);
    vp?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vp?.removeEventListener('resize', update);
      vp?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [mounted]);

  /* ---------- Esc to close ---------- */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /* ---------- optional history restore ---------- */
  useEffect(() => {
    if (!isOpen || !businessId || HISTORY_LIMIT <= 0) return;
    if (newConvoRef.current || messages.length > 0) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select('sender_type, message, created_at')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(HISTORY_LIMIT);
        if (error || !data?.length) return;
        setMessages(
          data.reverse().map((m) => ({
            id: uid(),
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            text: m.message,
            ts: new Date(m.created_at).getTime() || Date.now(),
          }))
        );
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, businessId]);

  /* ---------- scroll handling ---------- */
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = dist < 80;
    setShowJump(dist > 220);
  };

  const onTick = useCallback(() => {
    if (stick.current) scrollToBottom(false);
  }, [scrollToBottom]);

  useEffect(() => {
    if (stick.current) scrollToBottom(true);
  }, [messages, isLoading, scrollToBottom]);

  /* ---------- composer auto-grow ---------- */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [input, isRecording, mounted]);

  /* ---------- send ---------- */
  const send = useCallback(
    async (raw, { retry = false } = {}) => {
      const text = (raw ?? '').trim();
      if (!text || loadingRef.current) return;

      stick.current = true;
      if (!retry) setMessages((p) => [...p, { id: uid(), role: 'user', text, ts: Date.now() }]);
      setInput('');
      setLoading(true);
      const myReq = ++reqId.current;
      const animate = !prefersReducedMotion();

      const pushAi = (extra) =>
        setMessages((p) => [...p, { id: uid(), role: 'assistant', ts: Date.now(), ...extra }]);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch('/api/support/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            message: text,
            business_id: businessId,
            new_conversation: newConvoRef.current,
            ...(pageContext ? { page_context: pageContext } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (myReq !== reqId.current) return;
        if (data.answer) pushAi({ text: data.answer, animate });
        else
          pushAi({
            text: "Tessa didn't return an answer. Tap Retry to ask again.",
            error: true,
            retryText: text,
          });
        newConvoRef.current = false;
      } catch {
        if (myReq === reqId.current)
          pushAi({
            text: "Couldn't reach Tessa. Check your connection, then tap Retry.",
            error: true,
            retryText: text,
          });
      } finally {
        if (myReq === reqId.current) setLoading(false);
      }
    },
    [businessId, pageContext]
  );
  sendRef.current = send;

  const retry = (msg) => {
    setMessages((p) => p.filter((m) => m.id !== msg.id));
    send(msg.retryText, { retry: true });
  };

  const newChat = () => {
    reqId.current++;
    setLoading(false);
    setMessages([]);
    setInput('');
    setInterim('');
    newConvoRef.current = true;
    stick.current = true;
  };

  /* ---------- voice ---------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    coarse.current = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSpeechSupported(true);

    const rec = new SR();
    rec.lang = 'en-US'; // more reliable than en-NG on many Android browsers
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setIsRecording(true);
    rec.onend = () => {
      setIsRecording(false);
      setInterim('');
    };
    rec.onerror = (e) => {
      setIsRecording(false);
      setInterim('');
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed')
        flash('Microphone is blocked. Allow it in your browser settings.');
      else if (e.error === 'no-speech') flash("Didn't catch that. Tap the mic and try again.");
      else if (e.error !== 'aborted') flash('Voice input failed. Type your message instead.');
    };
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join('');
      setInterim(text);
      if (e.results[e.results.length - 1].isFinal && text.trim()) sendRef.current?.(text.trim());
    };
    recognitionRef.current = rec;
    return () => rec.abort?.();
  }, [flash]);

  const toggleRecording = () => {
    const rec = recognitionRef.current;
    if (!rec) return flash('Voice input is not supported here. Type your message instead.');
    if (isRecording) rec.stop();
    else {
      setInput('');
      try {
        rec.start();
      } catch {}
    }
  };

  /* ---------- sheet geometry + dragging ---------- */
  const fullH = Math.round(vv.h * 0.94);
  const halfH = Math.min(Math.round(vv.h * 0.62), fullH);
  const height = dragHeight ?? (snap === 'full' ? fullH : halfH);

  const onGrabDown = (e) => {
    if (e.target.closest('button')) return;
    drag.current = {
      startY: e.clientY,
      startH: height,
      h: height,
      lastY: e.clientY,
      lastT: performance.now(),
      v: 0,
      moved: false,
      onHandle: !!e.target.closest('.tsa-handle'),
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };

  const onGrabMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.startY - e.clientY;
    if (Math.abs(dy) > 4) d.moved = true;
    const now = performance.now();
    d.v = (d.lastY - e.clientY) / Math.max(now - d.lastT, 1); // px/ms, up = positive
    d.lastY = e.clientY;
    d.lastT = now;
    d.h = clamp(d.startH + dy, 80, fullH);
    setDragHeight(d.h);
  };

  const onGrabUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    setDragHeight(null);
    if (!d.moved) {
      if (d.onHandle) setSnap((s) => (s === 'full' ? 'half' : 'full'));
      return;
    }
    const projected = d.h + d.v * 160;
    if (projected < halfH * 0.62) return onClose?.();
    setSnap(Math.abs(projected - fullH) < Math.abs(projected - halfH) ? 'full' : 'half');
  };

  /* ---------- composer ---------- */
  const hasText = input.trim().length > 0;
  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !coarse.current) {
      e.preventDefault();
      send(input);
    }
  };

  if (!mounted) return null;

  const isEmpty = messages.length === 0;

  return (
    <div
      className={`tsa-root ${entered ? 'is-in' : ''}`}
      style={{ top: vv.top, height: vv.h }}
    >
      <div className="tsa-backdrop" onClick={onClose} />

      <div
        className={`tsa-sheet ${dragging ? 'is-dragging' : ''}`}
        style={{ height }}
        role="dialog"
        aria-modal="true"
        aria-label="Tessa AI assistant"
      >
        {/* Drag zone: handle + header */}
        <div
          className="tsa-grab"
          onPointerDown={onGrabDown}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabUp}
          onPointerCancel={onGrabUp}
        >
          <div className="tsa-handle">
            <i />
          </div>
          <header className="tsa-head">
            <TessaOrb size={38} spinning={isLoading} />
            <div className="tsa-who">
              <div className="tsa-title">Tessa</div>
              <div className="tsa-status">
                <span className={`tsa-dot ${isLoading ? 'is-busy' : ''}`} />
                {isLoading ? 'Thinking…' : 'Online'}
              </div>
            </div>
            <button type="button" className="tsa-pill" onClick={newChat} aria-label="Start a new chat">
              <Icon name="edit" size={15} /> New chat
            </button>
            <button type="button" className="tsa-iconbtn" onClick={onClose} aria-label="Close">
              <Icon name="close" size={18} />
            </button>
          </header>
        </div>

        {/* Conversation */}
        <div className="tsa-body">
          <div
            className="tsa-scroll"
            ref={scrollRef}
            onScroll={onScroll}
            role="log"
            aria-live="polite"
          >
            {isEmpty && !isLoading ? (
              <div className="tsa-empty">
                <TessaOrb size={60} />
                <h2>Hi, I'm Tessa</h2>
                <p>Ask me anything about your business.</p>
                <div className="tsa-try">Try asking</div>
                <div className="tsa-chips">
                  {suggestions.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      className="tsa-chip"
                      style={{ '--i': i }}
                      onClick={() => send(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <MessageRow
                    key={m.id}
                    msg={m}
                    isStart={messages[i - 1]?.role !== m.role}
                    isEnd={messages[i + 1]?.role !== m.role}
                    onRetry={retry}
                    onTick={onTick}
                  />
                ))}
                {isLoading && (
                  <div className="tsa-row is-start">
                    <div className="tsa-av">
                      <TessaOrb size={28} />
                    </div>
                    <div className="tsa-bub tsa-bub--ai is-start tsa-typing" aria-label="Tessa is typing">
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {showJump && (
            <button
              type="button"
              className="tsa-jump"
              onClick={() => {
                stick.current = true;
                scrollToBottom(true);
              }}
              aria-label="Jump to latest message"
            >
              <Icon name="chevronDown" size={18} />
            </button>
          )}
        </div>

        {/* Composer */}
        <div className="tsa-composer">
          {notice && (
            <div className="tsa-notice" role="status">
              {notice}
            </div>
          )}
          <div className={`tsa-field ${isRecording ? 'is-rec' : ''}`}>
            {isRecording ? (
              <div className="tsa-rec">
                <span className="tsa-wave">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} style={{ animationDelay: `${i * 0.12}s` }} />
                  ))}
                </span>
                <span className="tsa-rec-text">{interim || 'Listening…'}</span>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                className="tsa-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                onFocus={() => setSnap('full')}
                placeholder="Message Tessa"
                aria-label="Message Tessa"
              />
            )}

            {isRecording ? (
              <button type="button" className="tsa-action tsa-action--stop" onClick={toggleRecording} aria-label="Stop recording">
                <Icon name="stop" size={18} />
              </button>
            ) : hasText || !speechSupported ? (
              <button
                type="button"
                className="tsa-action tsa-action--send"
                onClick={() => send(input)}
                disabled={!hasText || isLoading}
                aria-label="Send message"
              >
                <Icon name="arrowUp" size={20} sw={2.6} />
              </button>
            ) : (
              <button type="button" className="tsa-action tsa-action--mic" onClick={toggleRecording} disabled={isLoading} aria-label="Voice input">
                <Icon name="mic" size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{CSS}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles (theme comes from your existing CSS variables)              */
/* ------------------------------------------------------------------ */

const CSS = `
.tsa-root{
  --navy:var(--color-primary,#0F2A4A);
  --gold:var(--color-accent,#C9A227);
  --card:var(--color-card,#fff);
  --bg:var(--color-bg,#F5F5F2);
  --text:var(--color-text,#14202E);
  --muted:var(--color-text-muted,#6B7686);
  --line:var(--color-border,#E3E1DA);
  --danger:var(--color-danger,#D9534F);
  --ease:cubic-bezier(.22,1,.36,1);
  position:fixed;left:0;right:0;z-index:999;overflow:hidden;font-family:inherit;
}
.tsa-root button{font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.tsa-root button:focus-visible,.tsa-root textarea:focus-visible{outline:2px solid var(--gold);outline-offset:2px}

.tsa-backdrop{position:absolute;inset:0;background:rgba(6,14,28,.5);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;transition:opacity .3s ease}
.tsa-root.is-in .tsa-backdrop{opacity:1}

.tsa-sheet{
  position:absolute;left:0;right:0;bottom:0;margin:0 auto;width:100%;max-width:640px;
  background:var(--card);color:var(--text);
  border-radius:24px 24px 0 0;box-shadow:0 -12px 48px rgba(6,14,28,.3);
  display:flex;flex-direction:column;overflow:hidden;
  transform:translateY(100%);
  transition:transform .4s var(--ease),height .32s var(--ease);
}
.tsa-root.is-in .tsa-sheet{transform:translateY(0)}
.tsa-sheet.is-dragging{transition:transform .4s var(--ease)}

/* drag zone + header */
.tsa-grab{flex-shrink:0;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab}
.tsa-handle{display:flex;justify-content:center;padding:10px 0 6px}
.tsa-handle i{width:44px;height:5px;border-radius:3px;background:color-mix(in srgb,var(--muted) 40%,transparent)}
.tsa-head{display:flex;align-items:center;gap:12px;padding:4px 14px 12px 16px;border-bottom:1px solid var(--line)}
.tsa-who{flex:1;min-width:0}
.tsa-title{font-family:var(--font-display,inherit);font-weight:700;font-size:1.05rem;line-height:1.2}
.tsa-status{display:flex;align-items:center;gap:6px;font-size:.75rem;color:var(--muted);margin-top:2px}
.tsa-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;transition:background .2s}
.tsa-dot.is-busy{background:var(--gold)}
.tsa-pill{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 13px 0 11px;border-radius:17px;border:1px solid var(--line);background:transparent;color:var(--text);font-size:.8rem;font-weight:600;transition:background .15s}
.tsa-pill:active{background:color-mix(in srgb,var(--muted) 14%,transparent)}
.tsa-iconbtn{width:36px;height:36px;border-radius:50%;border:0;background:color-mix(in srgb,var(--muted) 13%,transparent);color:var(--text);display:grid;place-items:center}

/* orb */
.tsa-orb{position:relative;width:var(--s);height:var(--s);flex-shrink:0;border-radius:50%}
.tsa-orb::before{content:'';position:absolute;inset:0;border-radius:50%;background:conic-gradient(#ff5f6d,#ffc371,#d6e85a,#4fd1c5,#5b8def,#b06bff,#ff5f6d)}
.tsa-orb.is-spin::before{animation:tsa-spin 1.3s linear infinite}
.tsa-orb-core{position:absolute;inset:var(--ring);border-radius:50%;background:var(--navy);color:var(--gold);display:grid;place-items:center}

/* body */
.tsa-body{position:relative;flex:1;min-height:0;background:var(--bg)}
.tsa-scroll{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:14px 14px 10px;display:flex;flex-direction:column}

/* empty state */
.tsa-empty{margin:auto;width:100%;display:flex;flex-direction:column;align-items:center;text-align:center;padding:8px 4px}
.tsa-empty h2{margin:14px 0 4px;font-family:var(--font-display,inherit);font-size:1.4rem;font-weight:700;line-height:1.2}
.tsa-empty p{margin:0;color:var(--muted);font-size:.92rem}
.tsa-try{margin:22px 0 10px;font-size:.8rem;color:var(--muted)}
.tsa-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.tsa-chip{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:10px 15px;font-size:.87rem;line-height:1.2;transition:transform .15s,border-color .15s;animation:tsa-rise .55s var(--ease) both;animation-delay:calc(var(--i) * 70ms + 200ms)}
.tsa-chip:hover{border-color:var(--gold)}
.tsa-chip:active{transform:scale(.96)}

/* messages */
.tsa-row{display:flex;gap:8px;margin-top:3px;animation:tsa-in .3s var(--ease)}
.tsa-row.is-start{margin-top:14px}
.tsa-row:first-child{margin-top:0}
.tsa-row--user{justify-content:flex-end}
.tsa-av{width:28px;flex-shrink:0}
.tsa-col{display:flex;flex-direction:column;max-width:84%;min-width:0}
.tsa-row--user .tsa-col{align-items:flex-end}
.tsa-bub{padding:10px 14px;font-size:.94rem;line-height:1.5;border-radius:18px;word-break:break-word;overflow-wrap:anywhere}
.tsa-bub--ai{background:var(--card);border:1px solid var(--line)}
.tsa-bub--ai.is-start{border-top-left-radius:6px}
.tsa-bub--user{background:var(--navy);color:#fff}
.tsa-bub--user.is-start{border-top-right-radius:6px}
.tsa-bub--error{background:color-mix(in srgb,var(--danger) 8%,var(--card));border-color:color-mix(in srgb,var(--danger) 38%,var(--line))}
.tsa-meta{display:flex;align-items:center;gap:12px;margin:5px 4px 0;font-size:.72rem;color:var(--muted)}
.tsa-meta button{display:inline-flex;align-items:center;gap:4px;border:0;background:none;color:var(--muted);padding:2px 0;font-size:.72rem;font-weight:600}
.tsa-meta button:active{color:var(--text)}

.tsa-rich p{margin:0}
.tsa-rich p+p,.tsa-rich p+ul,.tsa-rich p+ol,.tsa-rich ul+p,.tsa-rich ol+p{margin-top:8px}
.tsa-rich ul,.tsa-rich ol{margin:0;padding-left:1.2rem}
.tsa-rich li+li{margin-top:4px}
.tsa-rich strong{font-weight:650}
.tsa-rich code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.86em;background:color-mix(in srgb,var(--muted) 16%,transparent);padding:1px 6px;border-radius:6px}

.tsa-typing{display:flex;align-items:center;gap:5px;padding:15px 16px}
.tsa-typing i{width:7px;height:7px;border-radius:50%;background:var(--muted);animation:tsa-bounce 1.2s infinite ease-in-out}
.tsa-typing i:nth-child(2){animation-delay:.15s}
.tsa-typing i:nth-child(3){animation-delay:.3s}

.tsa-jump{position:absolute;right:14px;bottom:10px;width:38px;height:38px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);display:grid;place-items:center;box-shadow:0 4px 16px rgba(6,14,28,.18);animation:tsa-pop .2s var(--ease)}

/* composer */
.tsa-composer{position:relative;flex-shrink:0;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:var(--card);border-top:1px solid var(--line)}
.tsa-field{display:flex;align-items:flex-end;gap:6px;background:var(--bg);border:1px solid var(--line);border-radius:26px;padding:5px 5px 5px 16px;transition:border-color .2s,box-shadow .2s,background .2s}
.tsa-field:focus-within{border-color:var(--gold);box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 24%,transparent)}
.tsa-field.is-rec{border-color:var(--danger);background:color-mix(in srgb,var(--danger) 7%,var(--bg));box-shadow:none}
.tsa-input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:1rem;line-height:1.4;resize:none;padding:9px 0;max-height:120px}
.tsa-input::placeholder{color:var(--muted)}
.tsa-action{flex-shrink:0;width:40px;height:40px;border-radius:50%;border:0;display:grid;place-items:center;transition:transform .15s,background .2s,color .2s}
.tsa-action:active:not(:disabled){transform:scale(.9)}
.tsa-action--send{background:var(--navy);color:var(--gold)}
.tsa-action--send:disabled{background:color-mix(in srgb,var(--muted) 20%,transparent);color:var(--muted);cursor:default}
.tsa-action--mic{background:transparent;color:var(--muted)}
.tsa-action--mic:active{background:color-mix(in srgb,var(--muted) 15%,transparent)}
.tsa-action--stop{background:var(--danger);color:#fff}

.tsa-rec{flex:1;min-width:0;display:flex;align-items:center;gap:12px;min-height:40px;color:var(--danger);font-weight:600;font-size:.93rem}
.tsa-rec-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tsa-wave{display:inline-flex;align-items:center;gap:3px;height:20px;flex-shrink:0}
.tsa-wave i{width:3px;height:100%;border-radius:2px;background:currentColor;animation:tsa-wave 1s ease-in-out infinite}

.tsa-notice{position:absolute;left:12px;right:12px;bottom:calc(100% + 8px);background:var(--navy);color:#fff;border-radius:12px;padding:10px 14px;font-size:.83rem;line-height:1.35;box-shadow:0 8px 24px rgba(6,14,28,.3);animation:tsa-pop .22s var(--ease)}

/* motion */
@keyframes tsa-spin{to{transform:rotate(360deg)}}
@keyframes tsa-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes tsa-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes tsa-pop{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
@keyframes tsa-bounce{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-5px);opacity:1}}
@keyframes tsa-wave{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}

@media (prefers-reduced-motion:reduce){
  .tsa-root *,.tsa-root *::before{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
}
`;

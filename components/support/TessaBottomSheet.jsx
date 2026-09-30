'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TessaLogo from './TessaLogo';

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

// Set > 0 to restore past messages when the sheet opens (was .limit(0) = off).
const HISTORY_LIMIT = 0;

// icon: users | doc | box | chart | sparkle | plus
const DEFAULT_SUGGESTIONS = [
  { icon: 'doc', label: 'Create an invoice', prompt: 'How do I create an invoice?' },
  { icon: 'box', label: 'Track my stock', prompt: 'How do I track my stock?' },
  { icon: 'users', label: 'Invite a team member', prompt: 'How do I invite a team member?' },
  { icon: 'chart', label: 'See my reports', prompt: 'What reports can I run?' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _id = 0;
const uid = () => `m${Date.now()}-${_id++}`;
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const normSugg = (s) =>
  typeof s === 'string'
    ? { icon: 'sparkle', label: s, prompt: s }
    : { icon: 'sparkle', ...s, prompt: s.prompt || s.label };

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
  alert: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  chart: (
    <>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </>
  ),
  doc: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  box: (
    <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  sparkle: <path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" />,
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
    {ICONS[name] || ICONS.sparkle}
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Brand marks                                                        */
/* ------------------------------------------------------------------ */

// Rainbow ring + navy disc + your logo. Ring spins while Tessa is thinking.
function TessaOrb({ size = 40, ring = 2, spinning = false }) {
  return (
    <div
      className={`tsa-orb ${spinning ? 'is-spin' : ''}`}
      style={{ '--s': `${size}px`, '--ring': `${ring}px` }}
      aria-hidden="true"
    >
      <div className="tsa-orb-core">
        <TessaLogo size={Math.round(size * 0.56)} />
      </div>
    </div>
  );
}

// Quiet version used next to answers.
function LogoBadge({ size = 22 }) {
  return (
    <span className="tsa-badge" style={{ '--s': `${size}px` }} aria-hidden="true">
      <TessaLogo size={Math.round(size * 0.66)} />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Markdown: inline                                                   */
/* ------------------------------------------------------------------ */

const INLINE_RE =
  /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\s][^*\n]*?\*)/g;
const SAFE_HREF = /^(https?:|mailto:|tel:|\/)/i;

function inline(text, depth = 0) {
  if (!text) return null;
  return text.split(INLINE_RE).map((part, i) => {
    if (!part) return null;
    if (part.length > 4 && /^(\*\*|__).+(\*\*|__)$/.test(part)) {
      const inner = part.slice(2, -2);
      return <strong key={i}>{depth < 2 ? inline(inner, depth + 1) : inner}</strong>;
    }
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`'))
      return <code key={i}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      return SAFE_HREF.test(link[2]) ? (
        <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      ) : (
        link[1]
      );
    }
    if (part.length > 2 && /^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

/* ------------------------------------------------------------------ */
/*  Markdown: blocks (headings, lists, tables, quotes, code, rules)    */
/*  Tolerant on purpose: handles tables with blank lines between rows  */
/* ------------------------------------------------------------------ */

const LIST_RE = /^(\s*)([-*•+]|\d+[.)])\s+(.*)$/;
const SEP_CELL = /^:?-+:?$/;
const isHr = (l) => /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);
const isTableLine = (l) => {
  const t = l.trim();
  return t.startsWith('|') && t.indexOf('|', 1) > 0;
};
const splitRow = (l) => {
  let s = l.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
};
const isSepRow = (r) => r.length > 0 && r.every((c) => SEP_CELL.test(c));
const startsBlock = (l) =>
  /^\s*```/.test(l) ||
  /^#{1,6}\s/.test(l) ||
  /^\s*>/.test(l) ||
  isHr(l) ||
  LIST_RE.test(l) ||
  isTableLine(l);

function parseBlocks(src) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    // fenced code
    if (/^\s*```/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }

    // table
    if (isTableLine(line)) {
      const rows = [];
      let j = i;
      while (j < lines.length) {
        if (isTableLine(lines[j])) {
          rows.push(splitRow(lines[j]));
          j++;
        } else if (!lines[j].trim()) {
          let k = j;
          while (k < lines.length && !lines[k].trim()) k++;
          if (k < lines.length && isTableLine(lines[k])) j = k;
          else break;
        } else break;
      }
      i = j;
      if (rows.length < 2) {
        blocks.push({ type: 'p', lines: [rows[0].join(' ')] });
        continue;
      }
      let align = [];
      let body = rows.slice(1);
      if (isSepRow(rows[1])) {
        align = rows[1].map((c) =>
          c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left'
        );
        body = rows.slice(2);
      }
      body = body.filter((r) => !isSepRow(r));
      const head = rows[0];
      const cols = Math.max(head.length, ...body.map((r) => r.length));
      blocks.push({ type: 'table', head, body, align, cols });
      continue;
    }

    // heading
    const hm = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (hm) {
      blocks.push({ type: 'h', level: hm[1].length, text: hm[2] });
      i++;
      continue;
    }

    // rule
    if (isHr(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // quote
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push({ type: 'quote', text: buf.join('\n') });
      continue;
    }

    // list (nested by indent, tolerates blank lines between items)
    if (LIST_RE.test(line)) {
      const items = [];
      let j = i;
      while (j < lines.length) {
        const m = lines[j].match(LIST_RE);
        if (m && !isHr(lines[j])) {
          items.push({
            indent: m[1].replace(/\t/g, '  ').length,
            ordered: /\d/.test(m[2]),
            num: parseInt(m[2], 10),
            text: m[3],
          });
          j++;
        } else if (lines[j].trim() && /^\s{2,}\S/.test(lines[j]) && items.length && !isTableLine(lines[j])) {
          items[items.length - 1].text += ' ' + lines[j].trim();
          j++;
        } else if (!lines[j].trim()) {
          let k = j;
          while (k < lines.length && !lines[k].trim()) k++;
          if (k < lines.length && LIST_RE.test(lines[k]) && !isHr(lines[k])) j = k;
          else break;
        } else break;
      }
      i = j;
      blocks.push({ type: 'list', nodes: buildTree(items) });
      continue;
    }

    // paragraph
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) buf.push(lines[i++]);
    blocks.push({ type: 'p', lines: buf });
  }
  return blocks;
}

function buildTree(items) {
  const root = { children: [] };
  const stack = [{ indent: -1, node: root }];
  items.forEach((it) => {
    while (stack.length > 1 && stack[stack.length - 1].indent >= it.indent) stack.pop();
    const node = { ...it, children: [] };
    stack[stack.length - 1].node.children.push(node);
    stack.push({ indent: it.indent, node });
  });
  return root.children;
}

function ListView({ nodes }) {
  const ordered = nodes[0].ordered;
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag start={ordered && nodes[0].num > 1 ? nodes[0].num : undefined}>
      {nodes.map((n, i) => (
        <li key={i}>
          {inline(n.text)}
          {n.children.length > 0 && <ListView nodes={n.children} />}
        </li>
      ))}
    </Tag>
  );
}

function Blocks({ blocks, fresh }) {
  return blocks.map((b, i) => {
    const anim = fresh
      ? { className: 'tsa-blk', style: { '--d': `${Math.min(i * 70, 700)}ms` } }
      : {};
    switch (b.type) {
      case 'h':
        return (
          <h4 key={i} className={`tsa-h ${anim.className || ''}`} style={anim.style} data-l={Math.min(b.level, 3)}>
            {inline(b.text)}
          </h4>
        );
      case 'hr':
        return <hr key={i} className={anim.className} style={anim.style} />;
      case 'code':
        return (
          <pre key={i} className={anim.className} style={anim.style}>
            <code>{b.text}</code>
          </pre>
        );
      case 'quote':
        return (
          <blockquote key={i} className={anim.className} style={anim.style}>
            <Blocks blocks={parseBlocks(b.text)} />
          </blockquote>
        );
      case 'list':
        return (
          <div key={i} className={`tsa-list ${anim.className || ''}`} style={anim.style}>
            <ListView nodes={b.nodes} />
          </div>
        );
      case 'table':
        return (
          <div key={i} className={`tsa-tablewrap ${anim.className || ''}`} style={anim.style}>
            <table>
              <thead>
                <tr>
                  {Array.from({ length: b.cols }).map((_, c) => (
                    <th key={c} style={{ textAlign: b.align[c] || 'left' }}>
                      {inline(b.head[c] ?? '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.body.map((r, ri) => (
                  <tr key={ri}>
                    {Array.from({ length: b.cols }).map((_, c) => (
                      <td key={c} style={{ textAlign: b.align[c] || 'left' }}>
                        {inline(r[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return (
          <p key={i} className={anim.className} style={anim.style}>
            {b.lines.map((l, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {inline(l.trim())}
              </span>
            ))}
          </p>
        );
    }
  });
}

function RichText({ text, fresh }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className="tsa-rich">
      <Blocks blocks={blocks} fresh={fresh} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Message row                                                        */
/* ------------------------------------------------------------------ */

function MessageRow({ msg, isStart, isEnd, onRetry }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div
      data-mid={msg.id}
      className={[
        'tsa-row',
        isUser ? 'tsa-row--user' : 'tsa-row--ai',
        isStart ? 'is-start' : '',
        msg.fresh ? 'is-fresh' : '',
      ].join(' ')}
    >
      {!isUser && isStart && (
        <div className="tsa-sender">
          <LogoBadge size={22} />
          <span>Tessa</span>
        </div>
      )}

      {isUser ? (
        <div className={`tsa-bub ${isStart ? 'is-start' : ''}`}>{msg.text}</div>
      ) : msg.error ? (
        <div className="tsa-err" role="alert">
          <Icon name="alert" size={18} />
          <div>
            <p>{msg.text}</p>
            <button type="button" onClick={() => onRetry(msg)}>
              <Icon name="retry" size={14} /> Retry
            </button>
          </div>
        </div>
      ) : (
        <RichText text={msg.text} fresh={msg.animate} />
      )}

      {isEnd && !msg.error && (
        <div className="tsa-meta">
          <time>{fmtTime(msg.ts)}</time>
          {!isUser && (
            <button type="button" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={13} /> {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      )}
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
  pageContext, // optional: sent to the API as page_context
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [notice, setNotice] = useState('');
  const [showJump, setShowJump] = useState(false);

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

  /* ---------- enter / exit ---------- */
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

  useEffect(() => {
    document.body.style.overflow = mounted ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted]);

  /* ---------- keyboard-safe viewport ---------- */
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /* ---------- optional history ---------- */
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

  /* ---------- clear "fresh" flags so animations don't replay on reopen ---------- */
  useEffect(() => {
    if (!messages.some((m) => m.fresh)) return;
    const t = setTimeout(
      () => setMessages((p) => p.map((m) => (m.fresh ? { ...m, fresh: false, animate: false } : m))),
      1800
    );
    return () => clearTimeout(t);
  }, [messages]);

  /* ---------- scrolling ---------- */
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

  // Long answers: land at the START of the reply, not the end. Short ones: stick to bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    if (last?.role === 'assistant' && last.fresh && stick.current) {
      const node = el.querySelector(`[data-mid="${last.id}"]`);
      if (node && node.offsetHeight > el.clientHeight * 0.75) {
        el.scrollTo({ top: Math.max(node.offsetTop - 12, 0), behavior: 'smooth' });
        stick.current = false;
        return;
      }
    }
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
      if (!retry)
        setMessages((p) => [...p, { id: uid(), role: 'user', text, ts: Date.now(), fresh: true }]);
      setInput('');
      setLoading(true);
      const myReq = ++reqId.current;
      const animate = !prefersReducedMotion();

      const pushAi = (extra) =>
        setMessages((p) => [
          ...p,
          { id: uid(), role: 'assistant', ts: Date.now(), fresh: true, ...extra },
        ]);

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
  const halfH = Math.min(Math.round(vv.h * 0.66), fullH);
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
    d.v = (d.lastY - e.clientY) / Math.max(now - d.lastT, 1);
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
  const suggs = suggestions.map(normSugg);

  return (
    <div className={`tsa-root ${entered ? 'is-in' : ''}`} style={{ top: vv.top, height: vv.h }}>
      <div className="tsa-backdrop" onClick={onClose} />

      <div
        className={`tsa-sheet ${dragging ? 'is-dragging' : ''}`}
        style={{ height }}
        role="dialog"
        aria-modal="true"
        aria-label="Tessa AI assistant"
      >
        {/* Brand header (also the drag zone) */}
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
            <TessaOrb size={42} ring={2} spinning={isLoading} />
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
          <div className="tsa-scroll" ref={scrollRef} onScroll={onScroll} role="log" aria-live="polite">
            {isEmpty && !isLoading ? (
              <div className="tsa-empty">
                <TessaOrb size={68} ring={3} />
                <h2>Hi, I'm Tessa</h2>
                <p>Your support assistant. Ask how to do anything in your workspace.</p>
                <div className="tsa-suggs">
                  {suggs.map((s, i) => (
                    <button
                      key={s.label}
                      type="button"
                      className="tsa-sugg"
                      style={{ '--i': i }}
                      onClick={() => send(s.prompt)}
                    >
                      <span className="tsa-sugg-ic">
                        <Icon name={s.icon} size={18} />
                      </span>
                      <span className="tsa-sugg-t">{s.label}</span>
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
                  />
                ))}
                {isLoading && (
                  <div className="tsa-row tsa-row--ai is-start" aria-label="Tessa is thinking">
                    <div className="tsa-sender">
                      <LogoBadge size={22} />
                      <span>Tessa</span>
                    </div>
                    <div className="tsa-skel">
                      <i style={{ width: '92%' }} />
                      <i style={{ width: '76%' }} />
                      <i style={{ width: '48%' }} />
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
                <Icon name="arrowUp" size={20} sw={2.8} />
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
/*  Styles — brand colours are fixed (from your logo); surface, text   */
/*  and border colours come from your existing CSS variables.          */
/* ------------------------------------------------------------------ */

const CSS = `
.tsa-root{
  --navy:#0F2B4A;
  --navy-hi:#173C63;
  --gold:#D9A72E;
  --gold-hi:#F0C75E;
  --gold-ink:#96700F;
  --gold-grad:linear-gradient(135deg,#D9A72E,#F0C75E);
  --card:var(--color-card,#FFFFFF);
  --bg:var(--color-bg,#F6F3EC);
  --text:var(--color-text,#14202E);
  --muted:var(--color-text-muted,#66707E);
  --line:var(--color-border,#E4E0D6);
  --danger:var(--color-danger,#D9534F);
  --display:var(--font-display,Georgia,'Times New Roman',serif);
  --ease:cubic-bezier(.22,1,.36,1);
  position:fixed;left:0;right:0;z-index:999;overflow:hidden;font-family:inherit;
}
.tsa-root button{font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.tsa-root button:focus-visible,.tsa-root textarea:focus-visible,.tsa-root a:focus-visible{outline:2px solid var(--gold);outline-offset:2px}

.tsa-backdrop{position:absolute;inset:0;background:rgba(6,14,28,.55);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;transition:opacity .3s ease}
.tsa-root.is-in .tsa-backdrop{opacity:1}

.tsa-sheet{
  position:absolute;left:0;right:0;bottom:0;margin:0 auto;width:100%;max-width:640px;
  background:var(--bg);color:var(--text);
  border-radius:28px 28px 0 0;box-shadow:0 -14px 50px rgba(6,14,28,.35);
  display:flex;flex-direction:column;overflow:hidden;
  transform:translateY(100%);
  transition:transform .4s var(--ease),height .32s var(--ease);
}
.tsa-root.is-in .tsa-sheet{transform:translateY(0)}
.tsa-sheet.is-dragging{transition:transform .4s var(--ease)}

/* ---------- header ---------- */
.tsa-grab{flex-shrink:0;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;background:linear-gradient(180deg,var(--navy-hi),var(--navy));color:#fff}
.tsa-grab::after{content:'';display:block;height:2px;background:linear-gradient(90deg,transparent,var(--gold) 18%,var(--gold-hi) 50%,var(--gold) 82%,transparent)}
.tsa-handle{display:flex;justify-content:center;padding:10px 0 4px}
.tsa-handle i{width:44px;height:5px;border-radius:3px;background:rgba(255,255,255,.28)}
.tsa-head{display:flex;align-items:center;gap:12px;padding:6px 14px 14px 16px}
.tsa-who{flex:1;min-width:0}
.tsa-title{font-family:var(--display);font-weight:700;font-size:1.18rem;line-height:1.15;letter-spacing:.2px}
.tsa-status{display:flex;align-items:center;gap:6px;font-size:.76rem;color:rgba(255,255,255,.68);margin-top:3px}
.tsa-dot{width:7px;height:7px;border-radius:50%;background:#34d399;transition:background .2s}
.tsa-dot.is-busy{background:var(--gold-hi)}
.tsa-pill{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 14px 0 12px;border-radius:18px;border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.08);color:#fff;font-size:.82rem;font-weight:600;transition:background .15s}
.tsa-pill:active{background:rgba(255,255,255,.18)}
.tsa-iconbtn{width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.13);color:#fff;display:grid;place-items:center}
.tsa-iconbtn:active{background:rgba(255,255,255,.24)}

/* ---------- brand marks ---------- */
.tsa-orb{position:relative;width:var(--s);height:var(--s);flex-shrink:0;border-radius:50%}
.tsa-orb::before{content:'';position:absolute;inset:0;border-radius:50%;background:conic-gradient(#ff5f6d,#ffc371,#d6e85a,#4fd1c5,#5b8def,#b06bff,#ff5f6d)}
.tsa-orb.is-spin::before{animation:tsa-spin 1.3s linear infinite}
.tsa-orb-core{position:absolute;inset:var(--ring);border-radius:50%;background:var(--navy);display:grid;place-items:center}
.tsa-badge{width:var(--s);height:var(--s);border-radius:50%;background:var(--navy);display:inline-grid;place-items:center;flex-shrink:0;box-shadow:0 0 0 1.5px var(--gold)}

/* ---------- body ---------- */
.tsa-body{position:relative;flex:1;min-height:0;background:var(--bg)}
.tsa-scroll{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:18px 16px 12px;display:flex;flex-direction:column}

/* empty state */
.tsa-empty{margin:auto;width:100%;max-width:440px;display:flex;flex-direction:column;align-items:center;text-align:center;padding:4px 0}
.tsa-empty h2{margin:14px 0 4px;font-family:var(--display);font-size:1.55rem;font-weight:700;line-height:1.15}
.tsa-empty p{margin:0;color:var(--muted);font-size:.9rem;line-height:1.45;max-width:30ch}
.tsa-suggs{margin-top:22px;width:100%;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tsa-sugg{display:flex;flex-direction:column;align-items:flex-start;gap:10px;text-align:left;padding:13px 14px;border-radius:18px;border:1px solid var(--line);background:var(--card);color:var(--text);transition:transform .15s,border-color .15s,box-shadow .15s;animation:tsa-rise .55s var(--ease) both;animation-delay:calc(var(--i) * 80ms + 150ms)}
.tsa-sugg:hover{border-color:var(--gold)}
.tsa-sugg:active{transform:scale(.97)}
.tsa-sugg-ic{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--gold) 17%,transparent);color:var(--gold-ink)}
.tsa-sugg-t{font-size:.9rem;font-weight:600;line-height:1.25}

/* rows */
.tsa-row{display:flex;flex-direction:column;margin-top:6px}
.tsa-row.is-start{margin-top:22px}
.tsa-row:first-child{margin-top:0}
.tsa-row--user{align-items:flex-end}
.tsa-row--user.is-fresh{animation:tsa-in .3s var(--ease)}
.tsa-sender{display:flex;align-items:center;gap:8px;margin-bottom:9px;font-size:.82rem;font-weight:700}

.tsa-bub{max-width:82%;padding:11px 16px;border-radius:20px;background:var(--navy);color:#fff;font-size:.95rem;line-height:1.5;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere}
.tsa-bub.is-start{border-top-right-radius:7px}

.tsa-meta{display:flex;align-items:center;gap:12px;margin:6px 2px 0;font-size:.72rem;color:var(--muted)}
.tsa-row--user .tsa-meta{justify-content:flex-end}
.tsa-meta button{display:inline-flex;align-items:center;gap:4px;border:0;background:none;color:var(--muted);padding:2px 0;font-size:.72rem;font-weight:600}
.tsa-meta button:active{color:var(--text)}

.tsa-err{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:color-mix(in srgb,var(--danger) 9%,var(--card));border:1px solid color-mix(in srgb,var(--danger) 35%,var(--line));color:var(--text);font-size:.9rem;line-height:1.45}
.tsa-err svg{color:var(--danger);flex-shrink:0;margin-top:2px}
.tsa-err p{margin:0}
.tsa-err button{margin-top:8px;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:16px;border:1px solid color-mix(in srgb,var(--danger) 45%,var(--line));background:var(--card);color:var(--text);font-size:.8rem;font-weight:600}

/* loading skeleton */
.tsa-skel{display:flex;flex-direction:column;gap:10px;padding:2px 0}
.tsa-skel i{display:block;height:12px;border-radius:6px;background:linear-gradient(90deg,var(--line) 25%,color-mix(in srgb,var(--gold) 34%,var(--line)) 50%,var(--line) 75%);background-size:200% 100%;animation:tsa-shimmer 1.4s linear infinite}

/* ---------- rich text ---------- */
.tsa-rich{font-size:.95rem;line-height:1.62;color:var(--text);min-width:0;overflow-wrap:anywhere}
.tsa-rich>*+*{margin-top:12px}
.tsa-rich p{margin:0}
.tsa-rich strong{font-weight:650}
.tsa-rich a{color:var(--gold-ink);font-weight:600;text-decoration:underline;text-underline-offset:2px}
.tsa-rich code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.84em;background:color-mix(in srgb,var(--muted) 15%,transparent);padding:1px 6px;border-radius:6px}
.tsa-h{margin:0;font-family:var(--display);font-weight:700;line-height:1.25}
.tsa-h[data-l="1"]{font-size:1.2rem}
.tsa-h[data-l="2"]{font-size:1.1rem}
.tsa-h[data-l="3"]{font-size:1.02rem}
.tsa-rich>.tsa-h{margin-top:18px}
.tsa-rich>.tsa-h:first-child{margin-top:0}
.tsa-list ul,.tsa-list ol{margin:0;padding-left:1.3rem}
.tsa-list li+li{margin-top:6px}
.tsa-list li>ul,.tsa-list li>ol{margin-top:6px}
.tsa-list li::marker{color:var(--gold-ink);font-weight:700}
.tsa-rich blockquote{margin:0;padding:2px 0 2px 14px;border-left:3px solid var(--gold);color:var(--muted)}
.tsa-rich hr{border:0;height:1px;background:var(--line);margin:16px 0}
.tsa-rich pre{margin:0;padding:12px 14px;border-radius:14px;background:#11161D;color:#E8EDF3;overflow-x:auto;font-size:.82rem;line-height:1.55}
.tsa-rich pre code{background:none;padding:0;font-size:inherit;color:inherit}

/* tables */
.tsa-tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:16px;background:var(--card);-webkit-overflow-scrolling:touch}
.tsa-tablewrap table{width:100%;border-collapse:collapse;font-size:.86rem;line-height:1.45}
.tsa-tablewrap th{padding:11px 14px;text-align:left;font-weight:700;font-size:.8rem;color:#fff;background:var(--navy);white-space:nowrap}
.tsa-tablewrap td{padding:11px 14px;vertical-align:top;border-top:1px solid var(--line)}
.tsa-tablewrap tbody tr:first-child td{border-top:0}
.tsa-tablewrap td:first-child{font-weight:650;min-width:6.5rem}
.tsa-tablewrap tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--gold) 6%,transparent)}

/* fresh answers: blocks cascade in */
.tsa-blk{animation:tsa-in .45s var(--ease) both;animation-delay:var(--d,0ms)}

.tsa-jump{position:absolute;right:14px;bottom:10px;width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--card);color:var(--text);display:grid;place-items:center;box-shadow:0 6px 18px rgba(6,14,28,.2);animation:tsa-pop .2s var(--ease)}

/* ---------- composer ---------- */
.tsa-composer{position:relative;flex-shrink:0;padding:8px 12px calc(10px + env(safe-area-inset-bottom));background:var(--bg)}
.tsa-field{display:flex;align-items:flex-end;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:28px;padding:5px 5px 5px 18px;box-shadow:0 4px 16px rgba(15,43,74,.08);transition:border-color .2s,box-shadow .2s,background .2s}
.tsa-field:focus-within{border-color:var(--gold);box-shadow:0 0 0 3px color-mix(in srgb,var(--gold) 26%,transparent),0 4px 16px rgba(15,43,74,.08)}
.tsa-field.is-rec{border-color:var(--danger);background:color-mix(in srgb,var(--danger) 7%,var(--card));box-shadow:none}
.tsa-input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:1rem;line-height:1.4;resize:none;padding:10px 0;max-height:120px}
.tsa-input::placeholder{color:var(--muted)}
.tsa-action{flex-shrink:0;width:42px;height:42px;border-radius:50%;border:0;display:grid;place-items:center;transition:transform .15s,background .2s,color .2s,opacity .2s}
.tsa-action:active:not(:disabled){transform:scale(.9)}
.tsa-action--send{background:var(--gold-grad);color:var(--navy);box-shadow:0 3px 10px color-mix(in srgb,var(--gold) 45%,transparent)}
.tsa-action--send:disabled{background:color-mix(in srgb,var(--muted) 18%,transparent);color:var(--muted);box-shadow:none;cursor:default}
.tsa-action--mic{background:transparent;color:var(--muted)}
.tsa-action--mic:active{background:color-mix(in srgb,var(--muted) 15%,transparent)}
.tsa-action--stop{background:var(--danger);color:#fff}

.tsa-rec{flex:1;min-width:0;display:flex;align-items:center;gap:12px;min-height:42px;color:var(--danger);font-weight:600;font-size:.93rem}
.tsa-rec-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tsa-wave{display:inline-flex;align-items:center;gap:3px;height:20px;flex-shrink:0}
.tsa-wave i{width:3px;height:100%;border-radius:2px;background:currentColor;animation:tsa-wave 1s ease-in-out infinite}

.tsa-notice{position:absolute;left:12px;right:12px;bottom:calc(100% + 6px);background:var(--navy);color:#fff;border-radius:12px;padding:10px 14px;font-size:.83rem;line-height:1.35;box-shadow:0 8px 24px rgba(6,14,28,.3);animation:tsa-pop .22s var(--ease)}

/* ---------- motion ---------- */
@keyframes tsa-spin{to{transform:rotate(360deg)}}
@keyframes tsa-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes tsa-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes tsa-pop{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
@keyframes tsa-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
@keyframes tsa-wave{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}

@media (prefers-reduced-motion:reduce){
  .tsa-root *,.tsa-root *::before{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
}
`;

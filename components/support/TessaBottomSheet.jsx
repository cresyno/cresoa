'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import TessaLogo from './TessaLogo';

const HISTORY_LIMIT = 0;
const DEFAULT_SUGGESTIONS = [
  { label: 'How do I create an invoice?', prompt: 'How do I create an invoice?' },
  { label: 'How do I track my stock?', prompt: 'How do I track my stock?' },
  { label: 'How do I invite a team member?', prompt: 'How do I invite a team member?' },
  { label: 'What reports can I run?', prompt: 'What reports can I run?' },
];

let _id = 0;
const uid = () => `m${Date.now()}-${_id++}`;
const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const normSugg = (s) => typeof s === 'string' ? { label: s, prompt: s } : { ...s, prompt: s.prompt || s.label };

const ICONS = {
  mic: (<><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></>),
  stop: <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />,
  arrowUp: (<><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>),
  close: (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
  alert: (<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>),
  copy: (<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>),
  check: <polyline points="20 6 9 17 4 12" />,
  image: (<><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>),
  refresh: (<><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>),
};

const Icon = ({ name, size = 20, sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[name]}</svg>
);

function TessaOrb({ size = 40, spinning = false }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#0B2C5E', border: '2px solid #FDB515', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: spinning ? 0.7 : 1, transition: 'opacity 0.3s ease', flexShrink: 0 }} aria-hidden="true">
      <TessaLogo size={Math.round(size * 0.55)} variant="white" />
    </div>
  );
}

/* Markdown Parsing Logic (Unchanged) */
const INLINE_RE = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\s][^*\n]*?\*)/g;
const SAFE_HREF = /^(https?:|mailto:|tel:|\/)/i;
function inline(text, depth = 0) {
  if (!text) return null;
  return text.split(INLINE_RE).map((part, i) => {
    if (!part) return null;
    if (part.length > 4 && /^(\*\*|__).+(\*\*|__)$/.test(part)) return <strong key={i}>{depth < 2 ? inline(part.slice(2, -2), depth + 1) : part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) return SAFE_HREF.test(link[2]) ? <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a> : link[1];
    if (part.length > 2 && /^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}
const LIST_RE = /^(\s*)([-*•+]|\d+[.)])\s+(.*)$/;
const SEP_CELL = /^:?-+:?$/;
const isHr = (l) => /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);
const isTableLine = (l) => { const t = l.trim(); return t.startsWith('|') && t.indexOf('|', 1) > 0; };
const splitRow = (l) => { let s = l.trim(); if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|')) s = s.slice(0, -1); return s.split('|').map((c) => c.trim()); };
const isSepRow = (r) => r.length > 0 && r.every((c) => SEP_CELL.test(c));
const startsBlock = (l) => /^\s*```/.test(l) || /^#{1,6}\s/.test(l) || /^\s*>/.test(l) || isHr(l) || LIST_RE.test(l) || isTableLine(l);
function parseBlocks(src) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n'); const blocks = []; let i = 0;
  while (i < lines.length) {
    const line = lines[i]; if (!line.trim()) { i++; continue; }
    if (/^\s*```/.test(line)) { const buf = []; i++; while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]); i++; blocks.push({ type: 'code', text: buf.join('\n') }); continue; }
    if (isTableLine(line)) {
      const rows = []; let j = i;
      while (j < lines.length) {
        if (isTableLine(lines[j])) { rows.push(splitRow(lines[j])); j++; } else if (!lines[j].trim()) { let k = j; while (k < lines.length && !lines[k].trim()) k++; if (k < lines.length && isTableLine(lines[k])) j = k; else break; } else break;
      }
      i = j; if (rows.length < 2) { blocks.push({ type: 'p', lines: [rows[0].join(' ')] }); continue; }
      let align = []; let body = rows.slice(1);
      if (isSepRow(rows[1])) { align = rows[1].map((c) => c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left'); body = rows.slice(2); }
      body = body.filter((r) => !isSepRow(r)); const head = rows[0]; const cols = Math.max(head.length, ...body.map((r) => r.length)); blocks.push({ type: 'table', head, body, align, cols }); continue;
    }
    const hm = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/); if (hm) { blocks.push({ type: 'h', level: hm[1].length, text: hm[2] }); i++; continue; }
    if (isHr(line)) { blocks.push({ type: 'hr' }); i++; continue; }
    if (/^\s*>/.test(line)) { const buf = []; while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, '')); blocks.push({ type: 'quote', text: buf.join('\n') }); continue; }
    if (LIST_RE.test(line)) {
      const items = []; let j = i;
      while (j < lines.length) {
        const m = lines[j].match(LIST_RE);
        if (m && !isHr(lines[j])) { items.push({ indent: m[1].replace(/\t/g, '  ').length, ordered: /\d/.test(m[2]), num: parseInt(m[2], 10), text: m[3] }); j++; }
        else if (lines[j].trim() && /^\s{2,}\S/.test(lines[j]) && items.length && !isTableLine(lines[j])) { items[items.length - 1].text += ' ' + lines[j].trim(); j++; }
        else if (!lines[j].trim()) { let k = j; while (k < lines.length && !lines[k].trim()) k++; if (k < lines.length && LIST_RE.test(lines[k]) && !isHr(lines[k])) j = k; else break; } else break;
      }
      i = j; blocks.push({ type: 'list', nodes: buildTree(items) }); continue;
    }
    const buf = [line]; i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) buf.push(lines[i++]); blocks.push({ type: 'p', lines: buf });
  }
  return blocks;
}
function buildTree(items) {
  const root = { children: [] }; const stack = [{ indent: -1, node: root }];
  items.forEach((it) => { while (stack.length > 1 && stack[stack.length - 1].indent >= it.indent) stack.pop(); const node = { ...it, children: [] }; stack[stack.length - 1].node.children.push(node); stack.push({ indent: it.indent, node }); });
  return root.children;
}
function ListView({ nodes }) {
  const ordered = nodes[0].ordered; const Tag = ordered ? 'ol' : 'ul';
  return (<Tag start={ordered && nodes[0].num > 1 ? nodes[0].num : undefined}>{nodes.map((n, i) => (<li key={i}>{inline(n.text)}{n.children.length > 0 && <ListView nodes={n.children} />}</li>))}</Tag>);
}
function Blocks({ blocks }) {
  return blocks.map((b, i) => {
    switch (b.type) {
      case 'h': return <h4 key={i} className="tsa-h" data-l={Math.min(b.level, 3)}>{inline(b.text)}</h4>;
      case 'hr': return <hr key={i} />;
      case 'code': return <pre key={i}><code>{b.text}</code></pre>;
      case 'quote': return <blockquote key={i}><Blocks blocks={parseBlocks(b.text)} /></blockquote>;
      case 'list': return <div key={i} className="tsa-list"><ListView nodes={b.nodes} /></div>;
      case 'table': return (<div key={i} className="tsa-tablewrap"><table><thead><tr>{Array.from({ length: b.cols }).map((_, c) => <th key={c} style={{ textAlign: b.align[c] || 'left' }}>{inline(b.head[c] ?? '')}</th>)}</tr></thead><tbody>{b.body.map((r, ri) => (<tr key={ri}>{Array.from({ length: b.cols }).map((_, c) => <td key={c} style={{ textAlign: b.align[c] || 'left' }}>{inline(r[c] ?? '')}</td>)}</tr>))}</tbody></table></div>);
      default: return (<p key={i}>{b.lines.map((l, li) => (<span key={li}>{li > 0 && <br />}{inline(l.trim())}</span>))}</p>);
    }
  });
}
function RichText({ text }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (<div className="tsa-rich"><Blocks blocks={blocks} /></div>);
}

/* ------------------------------------------------------------------ */
/*  PREMIUM MESSAGE ROW                                                */
/* ------------------------------------------------------------------ */
function MessageRow({ msg, isUser, isLast, onRetry }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(msg.text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {} };

  if (isUser) {
    return (
      <div className="tsa-row tsa-row--user">
        <div className="tsa-bubble-user">
          {msg.imageUrl && (<img src={msg.imageUrl} alt="Attachment" className="tsa-msg-image" />)}
          {msg.text && <span>{msg.text}</span>}
        </div>
      </div>
    );
  }

  if (msg.error) {
    return (
      <div className="tsa-row tsa-row--ai">
        <div className="tsa-err" role="alert">
          <Icon name="alert" size={18} />
          <div><p>{msg.text}</p><button type="button" onClick={() => onRetry(msg)}>Retry</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="tsa-row tsa-row--ai">
      <div className="tsa-ai-content">
        {msg.text ? <RichText text={msg.text} /> : (
          <div className="tsa-thinking">
            <span className="tsa-thinking-dot" />
            <span className="tsa-thinking-dot" />
            <span className="tsa-thinking-dot" />
          </div>
        )}
      </div>
      
      {/* Inline Actions (Only show if there is text and it's not currently streaming) */}
      {msg.text && !msg.fresh && (
        <div className="tsa-actions-bar">
          <button type="button" onClick={copy} className="tsa-action-btn" title="Copy">
            <Icon name={copied ? 'check' : 'copy'} size={14} />
          </button>
          {isLast && (
            <button type="button" onClick={() => onRetry(msg)} className="tsa-action-btn" title="Regenerate">
              <Icon name="refresh" size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TessaBottomSheet({ isOpen, onClose, businessId, suggestions = DEFAULT_SUGGESTIONS, pageContext }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interim, setInterim] = useState('');
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
  const fileInputRef = useRef(null);
  const stick = useRef(true);
  const drag = useRef(null);
  const sendRef = useRef(null);
  const loadingRef = useRef(false);
  const reqId = useRef(0);
  const newConvoRef = useRef(false);
  const noticeTimer = useRef(null);
  const coarse = useRef(false);
  const abortControllerRef = useRef(null);
  const briefingLoaded = useRef(false);

  const setLoading = (v) => { loadingRef.current = v; setIsLoading(v); };
  const flash = useCallback((text) => { setNotice(text); clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''), 3200); }, []);

  useEffect(() => {
    if (isOpen) {
      setMounted(true); setSnap('half'); setDragHeight(null);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
      return () => cancelAnimationFrame(r);
    }
    setEntered(false); recognitionRef.current?.abort?.();
    const t = setTimeout(() => setMounted(false), 400); return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => { document.body.style.overflow = mounted ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const vp = window.visualViewport;
    const update = () => setVv({ h: Math.round(vp?.height ?? window.innerHeight), top: Math.round(vp?.offsetTop ?? 0) });
    update(); vp?.addEventListener('resize', update); vp?.addEventListener('scroll', update); window.addEventListener('resize', update);
    return () => { vp?.removeEventListener('resize', update); vp?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [mounted]);

  useEffect(() => { if (!isOpen) return; const onKey = (e) => e.key === 'Escape' && onClose?.(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !businessId || HISTORY_LIMIT <= 0) return;
    if (newConvoRef.current || messages.length > 0) return;
    (async () => {
      try {
        const { data, error } = await supabase.from('support_messages').select('sender_type, message, created_at').eq('business_id', businessId).order('created_at', { ascending: false }).limit(HISTORY_LIMIT);
        if (error || !data?.length) return;
        setMessages(data.reverse().map((m) => ({ id: uid(), role: m.sender_type === 'user' ? 'user' : 'assistant', text: m.message, ts: new Date(m.created_at).getTime() || Date.now() })));
      } catch {}
    })();
  }, [isOpen, businessId]);

  useEffect(() => {
    if (isOpen && messages.length === 0 && !briefingLoaded.current && businessId) {
      briefingLoaded.current = true;
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('/api/support/briefing', {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ business_id: businessId })
          });
          const data = await res.json();
          if (data.text) setMessages([{ id: uid(), role: 'assistant', text: data.text, ts: Date.now(), fresh: true }]);
        } catch (e) {}
      })();
    }
  }, [isOpen, messages.length, businessId]);

  useEffect(() => { if (!messages.some((m) => m.fresh)) return; const t = setTimeout(() => setMessages((p) => p.map((m) => (m.fresh ? { ...m, fresh: false } : m))), 1800); return () => clearTimeout(t); }, [messages]);

  const scrollToBottom = useCallback((smooth = false) => { const el = scrollRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }, []);
  const onScroll = () => { const el = scrollRef.current; if (!el) return; const dist = el.scrollHeight - el.scrollTop - el.clientHeight; stick.current = dist < 80; setShowJump(dist > 220); };

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    if (stick.current) scrollToBottom(true);
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => { const el = textareaRef.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }, [input, isRecording, selectedImage, mounted]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) return flash('Please select an image file.');
    if (file.size > 5 * 1024 * 1024) return flash('Image must be < 5MB.');
    const previewUrl = URL.createObjectURL(file); setSelectedImage({ file, previewUrl }); e.target.value = null;
  };

  const removeImage = () => { if (selectedImage?.previewUrl) URL.revokeObjectURL(selectedImage.previewUrl); setSelectedImage(null); };
  const stopGeneration = () => { if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; setLoading(false); } };

  const send = useCallback(async (raw, { retry = false } = {}) => {
    const text = (raw ?? '').trim(); const imageToSend = selectedImage?.file;
    if ((!text && !imageToSend) || loadingRef.current) return;
    stick.current = true;
    
    let base64Image = null;
    if (imageToSend) { try { base64Image = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(imageToSend); }); } catch (e) {} }

    const userMsg = { id: uid(), role: 'user', text, ts: Date.now(), fresh: true };
    if (base64Image) userMsg.imageUrl = base64Image; 
    if (!retry) setMessages((p) => [...p, userMsg]);
    
    setInput(''); removeImage(); setLoading(true); const myReq = ++reqId.current;
    const aiMsgId = uid();
    setMessages((p) => [...p, { id: aiMsgId, role: 'assistant', text: '', ts: Date.now(), fresh: true }]);
    abortControllerRef.current = new AbortController();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          message: text || (base64Image ? 'Analyze this image' : ''),
          image: base64Image, business_id: businessId, new_conversation: newConvoRef.current,
          ...(pageContext ? { page_context: pageContext } : {}),
        }),
        signal: abortControllerRef.current.signal,
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
         const data = await res.json(); if (myReq !== reqId.current) return;
         setMessages((p) => p.map(m => m.id === aiMsgId ? { ...m, text: data.answer } : m)); newConvoRef.current = false; return;
      }

      if (!res.body) throw new Error('No readable stream');
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let currentText = '';

      while (true) {
        const { done, value } = await reader.read(); if (done) break; if (myReq !== reqId.current) { reader.cancel(); return; }
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('event: ')) {
             const eventType = line.slice(7); const nextLine = lines[i + 1];
             if (nextLine && nextLine.startsWith('data: ')) {
                try {
                   const data = JSON.parse(nextLine.slice(6));
                   if (eventType === 'text') { currentText += data; setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: currentText } : m)); }
                   else if (eventType === 'pending') { setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: data.text } : m)); }
                   else if (eventType === 'error') { setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: data, error: true } : m)); }
                   i++;
                } catch (e) {}
             }
          }
        }
      }
      newConvoRef.current = false;
    } catch (err) {
      if (err.name === 'AbortError') { /* User stopped */ } else if (myReq === reqId.current) { setMessages((p) => p.map(m => m.id === aiMsgId ? { ...m, text: "Connection lost.", error: true } : m)); }
    } finally { if (myReq === reqId.current) setLoading(false); abortControllerRef.current = null; }
  }, [businessId, pageContext, selectedImage]);
  sendRef.current = send;

  const retry = (msg) => { setMessages((p) => p.filter((m) => m.id !== msg.id)); send(msg.retryText || msg.text, { retry: true }); };
  const newChat = () => { reqId.current++; stopGeneration(); setMessages([]); setInput(''); removeImage(); setInterim(''); newConvoRef.current = true; stick.current = true; briefingLoaded.current = true; };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    coarse.current = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    const rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1;
    rec.onstart = () => setIsRecording(true); rec.onend = () => { setIsRecording(false); setInterim(''); };
    rec.onerror = (e) => { setIsRecording(false); setInterim(''); if (e.error === 'not-allowed') flash('Mic blocked.'); else if (e.error === 'no-speech') flash("Didn't catch that."); else if (e.error !== 'aborted') flash('Voice failed.'); };
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join('');
      setInterim(text);
      if (e.results[e.results.length - 1].isFinal && text.trim()) sendRef.current?.(text.trim());
    };
    recognitionRef.current = rec; return () => rec.abort?.();
  }, [flash]);

  const toggleRecording = () => { const rec = recognitionRef.current; if (!rec) return flash('Voice not supported.'); if (isRecording) rec.stop(); else { setInput(''); try { rec.start(); } catch {} } };

  const fullH = Math.round(vv.h * 0.94); const halfH = Math.min(Math.round(vv.h * 0.66), fullH); const height = dragHeight ?? (snap === 'full' ? fullH : halfH);

  const onGrabDown = (e) => { if (e.target.closest('button')) return; drag.current = { startY: e.clientY, startH: height, h: height, lastY: e.clientY, lastT: performance.now(), v: 0, moved: false, onHandle: !!e.target.closest('.tsa-handle') }; e.currentTarget.setPointerCapture?.(e.pointerId); setDragging(true); };
  const onGrabMove = (e) => { const d = drag.current; if (!d) return; const dy = d.startY - e.clientY; if (Math.abs(dy) > 4) d.moved = true; const now = performance.now(); d.v = (d.lastY - e.clientY) / Math.max(now - d.lastT, 1); d.lastY = e.clientY; d.lastT = now; d.h = clamp(d.startH + dy, 80, fullH); setDragHeight(d.h); };
  const onGrabUp = () => { const d = drag.current; drag.current = null; setDragging(false); if (!d) return; setDragHeight(null); if (!d.moved) { if (d.onHandle) setSnap((s) => (s === 'full' ? 'half' : 'full')); return; } const projected = d.h + d.v * 160; if (projected < halfH * 0.62) return onClose?.(); setSnap(Math.abs(projected - fullH) < Math.abs(projected - halfH) ? 'full' : 'half'); };

  const hasText = input.trim().length > 0; const hasImage = !!selectedImage; const canSend = (hasText || hasImage) && !isLoading;
  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !coarse.current) { e.preventDefault(); if (canSend) send(input); } };

  if (!mounted) return null;
  const isEmpty = messages.length === 0;

  return (
    <div className={`tsa-root ${entered ? 'is-in' : ''}`} style={{ top: vv.top, height: vv.h }}>
      <div className="tsa-backdrop" onClick={onClose} />
      <div className={`tsa-sheet ${dragging ? 'is-dragging' : ''}`} style={{ height }} role="dialog" aria-modal="true">
        
        <div className="tsa-grab" onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={onGrabUp}>
          <div className="tsa-handle"><i /></div>
          <header className="tsa-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <TessaOrb size={38} spinning={isLoading} />
              <div><div className="tsa-title">Tessa</div><div className="tsa-status">{isLoading ? 'Thinking...' : 'Online'}</div></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {!isEmpty && <button type="button" className="tsa-text-btn" onClick={newChat}>New Chat</button>}
              <button type="button" className="tsa-icon-btn" onClick={onClose}><Icon name="close" size={20} /></button>
            </div>
          </header>
        </div>

        <div className="tsa-body">
          <div className="tsa-scroll" ref={scrollRef} onScroll={onScroll} role="log">
            {isEmpty && !isLoading ? (
              <div className="tsa-empty">
                <TessaOrb size={64} />
                <h2>How can I help you today?</h2>
                <div className="tsa-suggs">
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" className="tsa-sugg" onClick={() => send(s.prompt || s.label)}>
                      {s.label}
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
                    isUser={m.role === 'user'} 
                    isLast={i === messages.length - 1} 
                    onRetry={retry} 
                  />
                ))}
              </>
            )}
          </div>
          {showJump && (
            <button type="button" className="tsa-jump" onClick={() => { stick.current = true; scrollToBottom(true); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
          )}
        </div>

        <div className="tsa-composer">
          {notice && <div className="tsa-notice">{notice}</div>}
          {selectedImage && (
            <div className="tsa-image-preview-wrap">
              <div className="tsa-image-preview">
                <img src={selectedImage.previewUrl} alt="Preview" />
                <button type="button" className="tsa-image-remove" onClick={removeImage}><Icon name="close" size={12} sw={3} /></button>
              </div>
            </div>
          )}
          
          <div className={`tsa-field ${isRecording ? 'is-rec' : ''}`}>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
            
            <button type="button" className="tsa-action tsa-action--attach" onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Upload image">
              <Icon name="image" size={20} />
            </button>
            
            {isRecording ? (
              <div className="tsa-rec"><span style={{ fontWeight: 600, color: '#EF4444' }}>{interim || 'Listening...'}</span></div>
            ) : (
              <textarea ref={textareaRef} className="tsa-input" rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} onFocus={() => setSnap('full')} placeholder="Ask Tessa anything..." disabled={isLoading} />
            )}

            {isRecording ? (
              <button type="button" className="tsa-action tsa-action--stop" onClick={toggleRecording}><Icon name="stop" size={16} /></button>
            ) : isLoading ? (
              <button type="button" className="tsa-action tsa-action--send is-active" onClick={stopGeneration} title="Stop generating"><Icon name="stop" size={20} /></button>
            ) : (
              <button type="button" className={`tsa-action tsa-action--send ${canSend ? 'is-active' : ''}`} onClick={() => send(input)} disabled={!canSend}><Icon name="arrowUp" size={20} sw={2.5} /></button>
            )}
          </div>
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.tsa-root { --tsa-bg: #FFFFFF; --tsa-text: #111827; --tsa-text-muted: #6B7280; --tsa-border: #E5E7EB; --tsa-user-bubble-bg: #F3F4F6; --tsa-user-bubble-text: #111827; --tsa-input-bg: #F9FAFB; --tsa-overlay: rgba(0, 0, 0, 0.5); --tsa-brand-navy: #0B2C5E; --tsa-brand-gold: #FDB515; position: fixed; left: 0; right: 0; z-index: 999; overflow: hidden; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.dark .tsa-root, [data-theme="dark"] .tsa-root, html.dark .tsa-root { --tsa-bg: #1A1A1A; --tsa-text: #EDEDED; --tsa-text-muted: #9CA3AF; --tsa-border: #333333; --tsa-user-bubble-bg: #2D2D2D; --tsa-user-bubble-text: #EDEDED; --tsa-input-bg: #2D2D2D; --tsa-overlay: rgba(0, 0, 0, 0.8); }
.tsa-root button { font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; border: none; background: none; outline: none; }
.tsa-backdrop { position: absolute; inset: 0; background: var(--tsa-overlay); opacity: 0; transition: opacity 0.3s ease; }
.tsa-root.is-in .tsa-backdrop { opacity: 1; }
.tsa-sheet { position: absolute; left: 0; right: 0; bottom: 0; margin: 0 auto; width: 100%; max-width: 640px; background: var(--tsa-bg); color: var(--tsa-text); border-radius: 20px 20px 0 0; box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15); display: flex; flex-direction: column; overflow: hidden; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), height 0.3s ease; }
.tsa-root.is-in .tsa-sheet { transform: translateY(0); }
.tsa-sheet.is-dragging { transition: transform 0.3s ease; }
.tsa-grab { flex-shrink: 0; touch-action: none; user-select: none; background: var(--tsa-bg); border-bottom: 1px solid var(--tsa-border); }
.tsa-handle { display: flex; justify-content: center; padding: 12px 0 6px; }
.tsa-handle i { width: 36px; height: 4px; border-radius: 2px; background: var(--tsa-border); }
.tsa-head { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px 16px; }
.tsa-title { font-weight: 700; font-size: 1.1rem; letter-spacing: -0.01em; }
.tsa-status { font-size: 0.78rem; color: var(--tsa-brand-navy); font-weight: 600; margin-top: 2px; }
.dark .tsa-status, [data-theme="dark"] .tsa-status { color: var(--tsa-brand-gold); }
.tsa-text-btn { color: var(--tsa-text-muted); font-size: 0.85rem; font-weight: 600; padding: 8px; }
.tsa-text-btn:active { color: var(--tsa-text); }
.tsa-icon-btn { width: 36px; height: 36px; border-radius: 50%; background: var(--tsa-user-bubble-bg); display: flex; align-items: center; justify-content: center; color: var(--tsa-text); }
.tsa-icon-btn:active { opacity: 0.7; }
.tsa-body { position: relative; flex: 1; min-height: 0; background: var(--tsa-bg); }
.tsa-scroll { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 16px 16px 32px; display: flex; flex-direction: column; gap: 24px; }
.tsa-empty { margin: auto; width: 100%; max-width: 600px; display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 20px; }
.tsa-empty h2 { margin: 16px 0 24px; font-size: 1.4rem; font-weight: 600; color: var(--tsa-text); }
.tsa-suggs { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.tsa-sugg { width: 100%; text-align: left; padding: 14px 16px; border-radius: 12px; background: var(--tsa-input-bg); border: 1px solid var(--tsa-border); color: var(--tsa-text); font-size: 0.9rem; font-weight: 500; transition: background 0.15s, border-color 0.15s; }
.tsa-sugg:hover { border-color: var(--tsa-text-muted); }

/* CHAT ROWS */
.tsa-row { display: flex; flex-direction: column; width: 100%; }
.tsa-row--user { align-items: flex-end; }
.tsa-row--ai { align-items: flex-start; }

/* USER BUBBLE */
.tsa-bubble-user { max-width: 85%; padding: 10px 16px; border-radius: 18px; background: var(--tsa-user-bubble-bg); color: var(--tsa-user-bubble-text); font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap; word-break: break-word; display: flex; flex-direction: column; gap: 8px; }
.tsa-msg-image { max-width: 100%; max-height: 250px; border-radius: 12px; object-fit: cover; display: block; }

/* AI CONTENT */
.tsa-ai-content { width: 100%; max-width: 100%; display: flex; flex-direction: column; }
.tsa-thinking { display: flex; gap: 4px; align-items: center; height: 24px; }
.tsa-thinking-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--tsa-text-muted); animation: tsa-bounce 1.4s infinite ease-in-out both; }
.tsa-thinking-dot:nth-child(2) { animation-delay: 0.2s; }
.tsa-thinking-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes tsa-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

/* ACTIONS BAR */
.tsa-actions-bar { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.tsa-action-btn { color: var(--tsa-text-muted); display: flex; align-items: center; justify-content: center; transition: color 0.2s; }
.tsa-action-btn:hover { color: var(--tsa-text); }

/* ERROR */
.tsa-err { display: flex; gap: 10px; padding: 12px 16px; border-radius: 12px; background: #FEF2F2; border: 1px solid #FECACA; max-width: 90%; }
.tsa-err svg { color: #EF4444; flex-shrink: 0; }
.tsa-err p { margin: 0; font-size: 0.9rem; color: #991B1B; }
.tsa-err button { margin-top: 8px; color: #991B1B; font-weight: 700; font-size: 0.85rem; padding: 0; }

/* RICH TEXT */
.tsa-rich { min-width: 0; overflow-wrap: anywhere; font-size: 0.95rem; line-height: 1.7; color: var(--tsa-text); }
.tsa-rich > * + * { margin-top: 12px; }
.tsa-rich p { margin: 0; }
.tsa-rich strong { font-weight: 700; }
.tsa-rich a { color: var(--tsa-brand-navy); font-weight: 600; text-decoration: underline; }
.dark .tsa-rich a, [data-theme="dark"] .tsa-rich a { color: var(--tsa-brand-gold); }
.tsa-rich code { background: var(--tsa-input-bg); padding: 2px 6px; border-radius: 6px; font-size: 0.85em; font-family: monospace; }
.tsa-h { margin: 0; font-weight: 700; color: var(--tsa-text); }
.tsa-h[data-l="1"] { font-size: 1.15rem; } .tsa-h[data-l="2"] { font-size: 1.05rem; } .tsa-h[data-l="3"] { font-size: 0.95rem; }
.tsa-rich blockquote { margin: 0; padding: 2px 0 2px 12px; border-left: 3px solid var(--tsa-border); color: var(--tsa-text-muted); }
.tsa-rich pre { margin: 0; padding: 12px; border-radius: 8px; background: var(--tsa-input-bg); overflow-x: auto; font-size: 0.85rem; }
.tsa-list ul, .tsa-list ol { margin: 0; padding-left: 1.2rem; }
.tsa-list li::marker { color: var(--tsa-brand-navy); }
.dark .tsa-list li::marker, [data-theme="dark"] .tsa-list li::marker { color: var(--tsa-brand-gold); }

/* TABLE */
.tsa-tablewrap { overflow-x: auto; border-radius: 8px; border: 1px solid var(--tsa-border); }
.tsa-tablewrap table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.tsa-tablewrap th { padding: 10px; background: var(--tsa-input-bg); text-align: left; border-bottom: 1px solid var(--tsa-border); color: var(--tsa-text); font-weight: 600; }
.tsa-tablewrap td { padding: 10px; border-bottom: 1px solid var(--tsa-border); }
.tsa-tablewrap td:first-child { font-weight: 600; white-space: nowrap; }

/* JUMP BUTTON */
.tsa-jump { position: absolute; right: 16px; bottom: 16px; width: 36px; height: 36px; border-radius: 50%; background: var(--tsa-bg); color: var(--tsa-text); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); border: 1px solid var(--tsa-border); }

/* COMPOSER */
.tsa-composer { flex-shrink: 0; padding: 12px 16px calc(16px + env(safe-area-inset-bottom)); background: var(--tsa-bg); }
.tsa-field { display: flex; align-items: flex-end; gap: 8px; background: var(--tsa-input-bg); border-radius: 24px; padding: 6px; border: 1px solid transparent; transition: border-color 0.2s, box-shadow 0.2s; min-height: 52px; box-sizing: border-box; box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
.tsa-field:focus-within { border-color: var(--tsa-text-muted); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.tsa-field.is-rec { border-color: #EF4444; }

.tsa-input { flex: 1; min-width: 0; border: 0; outline: none !important; box-shadow: none !important; background: transparent; color: var(--tsa-text); font-size: 16px; line-height: 1.4; resize: none; padding: 10px 8px 10px 4px; max-height: 120px; font-family: inherit; }
.tsa-input::placeholder { color: var(--tsa-text-muted); }

.tsa-action { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: transform 0.1s, background 0.2s; margin-bottom: 2px; }
.tsa-action:active { transform: scale(0.92); }
.tsa-action--attach { background: transparent; color: var(--tsa-text-muted); margin-left: 2px; }
.tsa-action--attach:hover { color: var(--tsa-text); }
.tsa-action--send { background: transparent; color: var(--tsa-text-muted); transition: all 0.2s; }
.tsa-action--send.is-active { background: var(--tsa-brand-navy); color: #fff; }
.dark .tsa-action--send.is-active, [data-theme="dark"] .tsa-action--send.is-active { background: var(--tsa-brand-gold); color: #000; }
.tsa-action--send:disabled { cursor: default; }
.tsa-action--stop { background: #EF4444; color: #fff; }
.tsa-rec { flex: 1; display: flex; align-items: center; min-height: 40px; padding-left: 12px; font-size: 0.9rem; }
.tsa-notice { position: absolute; left: 16px; right: 16px; bottom: calc(100% + 8px); background: var(--tsa-brand-navy); color: #fff; border-radius: 8px; padding: 10px 14px; font-size: 0.85rem; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

/* IMAGE PREVIEW */
.tsa-image-preview-wrap { padding-bottom: 12px; display: flex; }
.tsa-image-preview { position: relative; display: inline-flex; border-radius: 12px; overflow: hidden; border: 1px solid var(--tsa-border); background: var(--tsa-input-bg); }
.tsa-image-preview img { width: 64px; height: 64px; object-fit: cover; display: block; }
.tsa-image-remove { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); transition: background 0.2s; }
.tsa-image-remove:active { background: rgba(0,0,0,0.9); }

@media (prefers-reduced-motion: reduce) { .tsa-root * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; } }
`;

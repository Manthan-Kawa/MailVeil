import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Inbox, Clock, CheckCircle2, Download, Upload, X, ChevronRight,
  MessageSquare, FileText, User, Calendar, Hash, Send, AlertTriangle,
  Filter, Search, Mail, ShieldCheck, Star, ArrowRight, ShieldAlert,
  Lock, Trash2,
} from 'lucide-react';
import { useTickets, type Ticket, type TicketAttachment, type TicketStatus } from '@/contexts/TicketContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface UserRequestsPageProps {
  onNavigate: (id: string) => void;
}

/* ── Helpers ──────────────────────────────────────────────────── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTimeAgo(iso?: string): string {
  if (!iso) return 'recently';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadAttachment(data: string, name: string) {
  const a = document.createElement('a');
  a.href = data;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

import { SlideIn } from '@/components/SlideIn';

function fileToAttachment(file: File): Promise<TicketAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ name: file.name, data: reader.result as string, type: file.type, size: file.size });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Prepares, copies rich formatted body, auto-downloads the PDF report, and launches Gmail */
function sendEmailToUser(ticket: Ticket, analystComment?: string, analystReport?: TicketAttachment | null) {
  const comment = analystComment || ticket.analystComment || 'The security investigation for your submitted suspicious email report has concluded.';
  const reportObj = analystReport || ticket.analystReport;
  const reportInfo = reportObj
    ? `\nAttached Investigation Report: ${reportObj.name}\n(Available for instant download in your Mailveil Check Status portal)`
    : '';

  if (reportObj?.data) {
    try {
      downloadAttachment(reportObj.data, reportObj.name);
    } catch { /* ignore */ }
  }

  const subject = `[MAILVEIL SOC] Investigation Report: ${ticket.id}`;

  const bodyText = `Dear User,

The Security Operations Center (SOC) team has analyzed your suspicious email submission (${ticket.id}).

==================================================
CASE SUMMARY:
• Case Number  : ${ticket.id}
• Submitted At : ${formatDate(ticket.submittedAt)}
• Status       : ANALYZED & RESOLVED
${ticket.emlFile ? `• Original File: ${ticket.emlFile.name}` : ''}
==================================================

ANALYST INVESTIGATION FINDINGS:
${comment}
${reportInfo}

SECURITY RECOMMENDATION:
Please log in to your Mailveil portal under "Check Status" to view telemetry details.

Regards,
MAILVEIL Cyber Defense Operations
Security Operations Center (SOC)`;

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ticket.userEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  window.open(gmailUrl, '_blank');
}

/* ── Status Badge ─────────────────────────────────────────────── */
function StatusBadge({ status }: { status: TicketStatus }) {
  switch (status) {
    case 'resolved':
    case 'closed':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc' }}
        >
          <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
        </span>
      );
    case 'analyzed':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
        >
          <CheckCircle2 className="w-2.5 h-2.5" /> Analyzed
        </span>
      );
    case 'in_review':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
          style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee' }}
        >
          <Clock className="w-2.5 h-2.5 animate-spin" /> In Investigation
        </span>
      );
    case 'pending':
    default:
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
        >
          <Clock className="w-2.5 h-2.5 animate-pulse" /> Pending
        </span>
      );
  }
}

/* ── Detail Modal ─────────────────────────────────────────────── */
interface ModalProps {
  ticket: Ticket;
  onClose: () => void;
  onRespond: (
    id: string,
    data: {
      analystComment: string;
      analystReport: TicketAttachment | null;
      status: TicketStatus;
      verdict?: string;
      threatScore?: number;
      recommendedAction?: string;
      remediationTaken?: string;
    }
  ) => void;
}

function TicketModal({ ticket, onClose, onRespond }: ModalProps) {
  const { addTicketMessage } = useTickets();
  const { currentUser } = useAuth();
  const { isDark } = useTheme();

  const [analystComment, setAnalystComment] = useState(ticket.analystComment ?? '');
  const [reportFile, setReportFile] = useState<TicketAttachment | null>(ticket.analystReport ?? null);
  const [status, setStatus] = useState<TicketStatus>(ticket.status === 'pending' ? 'in_review' : ticket.status);

  const [sendEmail, setSendEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const reportFileRef = useRef<HTMLInputElement>(null);

  const statusTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [statusIndicatorStyle, setStatusIndicatorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const currentTabEl = statusTabRefs.current[status];
      if (currentTabEl) {
        setStatusIndicatorStyle({
          left: currentTabEl.offsetLeft,
          top: currentTabEl.offsetTop,
          width: currentTabEl.offsetWidth,
          height: currentTabEl.offsetHeight,
          opacity: 1,
        });
      } else {
        setStatusIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [status]);

  // Synchronize status whenever ticket prop updates
  useEffect(() => {
    if (ticket.status === 'resolved' || ticket.userAcknowledged) {
      setStatus('resolved');
    } else if (ticket.status === 'in_review') {
      setStatus('in_review');
    } else if (ticket.status === 'analyzed') {
      setStatus('analyzed');
    } else if (ticket.status === 'pending') {
      setStatus('in_review');
    }
  }, [ticket.status, ticket.userAcknowledged]);

  const handleReportFile = useCallback(async (file: File) => {
    const att = await fileToAttachment(file);
    setReportFile(att);
  }, []);

  async function handleSend() {
    if (status !== 'in_review' && status !== 'resolved' && !analystComment.trim()) {
      setError('Please write an investigation comment.');
      return;
    }
    setError('');
    setSending(true);
    await new Promise((r) => setTimeout(r, 600));

    const finalComment = analystComment.trim() || (status === 'in_review' ? (ticket.analystComment || 'Case is actively being investigated by the SOC team.') : ticket.analystComment || '');

    const isUserResolved = ticket.status === 'resolved' || ticket.userAcknowledged;
    const effectiveStatus: TicketStatus = (status === 'resolved' && !isUserResolved) ? 'analyzed' : status;

    // Save in portal store & Supabase
    onRespond(ticket.id, {
      analystComment: finalComment,
      analystReport: reportFile,
      status: effectiveStatus,
    });

    if (sendEmail && status === 'analyzed') {
      sendEmailToUser(ticket, finalComment, reportFile);
    }

    setSending(false);
    setSent(true);
    setTimeout(onClose, 1200);
  }

  const handleSendChatMessage = () => {
    if (!chatMessage.trim()) return;
    addTicketMessage(ticket.id, {
      sender: 'analyst',
      senderEmail: currentUser?.email || 'sentinelx.analyst@gmail.com',
      senderName: 'SOC Analyst',
      message: chatMessage.trim(),
    });
    setChatMessage('');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{
        background: isDark ? 'rgba(0,0,0,0.82)' : 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl overflow-hidden animate-slide-up flex flex-col my-auto max-h-[calc(100vh-3rem)]"
        style={{
          background: isDark ? 'linear-gradient(145deg, #0d1118, #0a0c14)' : '#ffffff',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
          boxShadow: isDark ? '0 32px 80px rgba(0,0,0,0.85)' : '0 25px 60px -15px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 shrink-0"
          style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: status === 'resolved' || status === 'analyzed'
                  ? 'rgba(168,85,247,0.15)'
                  : status === 'in_review'
                  ? 'rgba(6,182,212,0.15)'
                  : 'rgba(245,158,11,0.15)',
                border: status === 'resolved' || status === 'analyzed'
                  ? '1px solid rgba(168,85,247,0.3)'
                  : status === 'in_review'
                  ? '1px solid rgba(6,182,212,0.3)'
                  : '1px solid rgba(245,158,11,0.3)',
              }}
            >
              <Inbox className={`w-5 h-5 ${status === 'resolved' || status === 'analyzed' ? 'text-purple-400' : status === 'in_review' ? 'text-cyan-400' : 'text-amber-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-black text-slate-900 dark:text-white font-mono">{ticket.id}</p>
                <StatusBadge status={status} />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-0.5">
                <span>Submitted {formatDate(ticket.submittedAt)}</span>
                <span className="hidden sm:inline"> • </span>
                <span className="block sm:inline truncate mt-0.5 sm:mt-0 font-mono sm:font-sans">
                  From: {ticket.userEmail}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendEmailToUser(ticket, analystComment, reportFile)}
              title={`Compose email to ${ticket.userEmail}`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 border border-purple-500/30 transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" /> Launch Gmail
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-gray-500 transition-transform duration-150 ease-out active:scale-95 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto overflow-x-hidden scrollbar-thin flex-1 px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 touch-scroll">
          {/* Submission metadata */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-2xl"
            style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0' }}
          >
            {[
              { icon: User, label: 'User Email', value: ticket.userEmail },
              { icon: Hash, label: 'Case ID', value: ticket.id },
              { icon: Calendar, label: 'Submitted', value: formatDate(ticket.submittedAt) },
              { icon: FileText, label: 'Attached File', value: ticket.emlFile?.name ?? 'None' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-slate-400 dark:text-gray-500" />
                  <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-wider">{label}</p>
                </div>
                <p className="text-xs text-slate-800 dark:text-gray-200 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* User Notes */}
          {ticket.userComment && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-500 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> User Provided Notes
              </label>
              <p
                className="text-sm text-slate-800 dark:text-gray-300 leading-relaxed p-3.5 rounded-xl text-xs"
                style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0' }}
              >
                {ticket.userComment}
              </p>
            </div>
          )}

          {/* User Interaction Flags */}
          {ticket.didInteract && (ticket.didInteract.clickedLink || ticket.didInteract.enteredCreds) && (
            <div
              className="p-3 rounded-xl flex items-center gap-2.5"
              style={{ background: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.08)', border: isDark ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
              <div>
                <p className="text-xs text-red-700 dark:text-red-300 font-bold">High Risk Interaction Reported by User!</p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  User indicated: {ticket.didInteract.clickedLink ? '• Clicked Embedded Link ' : ''}
                  {ticket.didInteract.enteredCreds ? '• Submitted Credentials / Passwords' : ''}
                </p>
              </div>
            </div>
          )}

          {/* EML download */}
          {ticket.emlFile && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Submitted Email File (.eml)
              </label>
              <button
                onClick={() => downloadAttachment(ticket.emlFile!.data, ticket.emlFile!.name)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-blue-600 dark:text-blue-300 font-semibold transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                style={{ background: 'rgba(59,130,246,0.08)', border: isDark ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.25)' }}
              >
                <Download className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span className="truncate">{ticket.emlFile.name}</span>
                <span className="text-[11px] text-slate-500 dark:text-gray-500 font-normal ml-auto shrink-0">
                  {formatBytes(ticket.emlFile.size)}
                </span>
              </button>
            </div>
          )}

          {/* Analyst response form */}
          <div
            className="space-y-4 pt-3 border-t border-slate-200 dark:border-white/7"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                Analyst Response & Findings
              </p>
              <span className="text-[11px] text-slate-500 dark:text-gray-500 font-mono">Recipient: {ticket.userEmail}</span>
            </div>

            {/* Comment textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                Forensic Analysis & Findings
              </label>
              <textarea
                value={analystComment}
                onChange={(e) => setAnalystComment(e.target.value)}
                rows={4}
                placeholder={`Provide your forensic findings, header analysis, and security advice for ${ticket.userEmail}...`}
                className="w-full text-xs rounded-xl p-3 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none font-mono"
              />
            </div>

            {/* Report file upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                Attach Forensic Report (.pdf / .txt / .json)
              </label>
              <input
                ref={reportFileRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt,.json,.doc,.docx"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await handleReportFile(f);
                }}
              />
              {reportFile ? (
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono"
                  style={{ background: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.1)', border: isDark ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(34,197,94,0.3)', color: isDark ? '#4ade80' : '#15803d' }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate font-semibold">{reportFile.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-gray-500">({formatBytes(reportFile.size)})</span>
                  </div>
                  <button
                    onClick={() => setReportFile(null)}
                    className="text-slate-400 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 ml-2 cursor-pointer transition-transform duration-150 ease-out active:scale-95"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => reportFileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/15 text-xs text-slate-700 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white bg-slate-50/70 dark:bg-transparent transition-transform duration-150 ease-out active:scale-95 font-mono cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-gray-500" />
                  Click to attach analysis dossier or PDF
                </button>
              )}
            </div>

            {/* Status progression buttons */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono font-bold text-slate-600 dark:text-gray-500 uppercase tracking-wider">Set Ticket Status:</p>
              <div className="relative flex gap-2 flex-wrap items-center">
                {/* Smooth sliding indicator pill */}
                <div
                  className="absolute pointer-events-none rounded-lg shadow-sm"
                  style={{
                    transform: `translate3d(${statusIndicatorStyle.left}px, ${statusIndicatorStyle.top}px, 0)`,
                    width: statusIndicatorStyle.width,
                    height: statusIndicatorStyle.height,
                    opacity: statusIndicatorStyle.opacity,
                    background: status === 'analyzed' ? (isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)') : (isDark ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.15)'),
                    border: status === 'analyzed' ? (isDark ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(34,197,94,0.5)') : (isDark ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(6,182,212,0.5)'),
                    transition: 'transform 260ms cubic-bezier(0.25, 1, 0.5, 1), width 260ms cubic-bezier(0.25, 1, 0.5, 1), height 260ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease, background 200ms ease, border 200ms ease',
                    left: 0,
                    top: 0,
                  }}
                />
                {(['in_review', 'analyzed'] as const).map((s) => (
                  <button
                    key={s}
                    ref={(el) => { statusTabRefs.current[s] = el; }}
                    type="button"
                    onClick={() => {
                      setStatus(s);
                      setError('');
                    }}
                    className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors duration-200 capitalize ${status === s
                      ? s === 'analyzed' ? 'text-emerald-700 dark:text-emerald-400' : 'text-cyan-700 dark:text-cyan-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                  >
                    {s === 'in_review' ? 'In Investigation' : 'Analyzed'}
                  </button>
                ))}

                {/* Resolved button — locked for analyst; only user can mark resolved */}
                <div
                  title={
                    ticket.userAcknowledged || ticket.status === 'resolved'
                      ? 'Case confirmed and marked resolved by user.'
                      : 'Locked for analyst: Only the user can confirm resolution and close this case.'
                  }
                  className="inline-flex items-center"
                >
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-not-allowed select-none"
                    style={
                      ticket.userAcknowledged || ticket.status === 'resolved'
                        ? { background: isDark ? 'rgba(168,85,247,0.25)' : 'rgba(168,85,247,0.15)', color: isDark ? '#c084fc' : '#7e22ce', border: isDark ? '1px solid rgba(168,85,247,0.45)' : '1px solid rgba(168,85,247,0.4)' }
                        : { background: isDark ? 'rgba(255,255,255,0.03)' : '#f1f5f9', color: isDark ? '#64748b' : '#64748b', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #cbd5e1', opacity: 0.85 }
                    }
                  >
                    {ticket.userAcknowledged || ticket.status === 'resolved' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>✓ Resolved by User</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-slate-400 dark:text-gray-500" />
                        <span>Resolved</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-400 font-normal">User Only</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Threaded Discussion (Shown while In Review / Pending) OR Review (Shown once Analyzed / Resolved) */}
            {status !== 'analyzed' && status !== 'resolved' && ticket.status !== 'analyzed' && ticket.status !== 'resolved' ? (
              <div className="pt-2 border-t border-white/5 space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Live Ticket Messages
                </p>
                {ticket.threadMessages && ticket.threadMessages.length > 0 && (
                  <div className="flex flex-col space-y-2 max-h-40 overflow-y-auto pr-1">
                    {ticket.threadMessages.map((msg) => {
                      const isAnalyst = msg.sender === 'analyst';
                      return (
                        <div
                          key={msg.id}
                          className={`p-2.5 rounded-xl text-xs max-w-[85%] sm:max-w-[70%] min-w-[180px] ${isAnalyst
                            ? 'ml-auto bg-blue-500/10 text-slate-900 border border-blue-500/25 dark:bg-blue-950/40 dark:border-blue-500/25 dark:text-blue-100'
                            : 'mr-auto bg-purple-500/10 text-slate-900 border border-purple-500/25 dark:bg-purple-950/30 dark:border-purple-500/20 dark:text-purple-100'
                            }`}
                        >
                          <div className={`flex items-center justify-between gap-2 text-[10px] font-mono mb-1 ${isAnalyst ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'
                            }`}>
                            <span className="font-semibold truncate" title={isAnalyst ? '🛡️ You (Analyst)' : `👤 User (${ticket.userEmail})`}>
                              {isAnalyst ? '🛡️ You (Analyst)' : `👤 User (${ticket.userEmail})`}
                            </span>
                            <span className="opacity-70 shrink-0 text-[9px]">{formatDate(msg.timestamp)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="Post quick update in user's ticket thread..."
                    className="flex-1 text-xs rounded-xl px-3 py-2 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 font-mono bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10"
                  />
                  <button
                    type="button"
                    onClick={handleSendChatMessage}
                    disabled={!chatMessage.trim()}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 disabled:opacity-40 font-mono transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                  >
                    Post
                  </button>
                </div>
              </div>
            ) : (
              /* User Review Section (Matching user side) */
              <div className="pt-2 border-t border-slate-200 dark:border-white/5">
                {ticket.userAcknowledged || ticket.status === 'resolved' ? (
                  <div
                    className="p-4 rounded-2xl flex items-center justify-between"
                    style={{ background: isDark ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.1)', border: isDark ? '1px solid rgba(168,85,247,0.25)' : '1px solid rgba(168,85,247,0.3)' }}
                  >
                    <div>
                      <p className="text-xs font-bold text-purple-700 dark:text-purple-300 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Case Resolved by User
                      </p>
                      {ticket.userFeedback ? (
                        <p className="text-xs text-slate-800 dark:text-gray-200 mt-1 italic">"{ticket.userFeedback}"</p>
                      ) : (
                        <p className="text-xs text-slate-600 dark:text-gray-400 mt-1 italic">User acknowledged resolution and marked case complete.</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= (ticket.userRating || 5) ? 'text-amber-400 fill-amber-400' : 'text-gray-700'}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className="p-4 rounded-2xl flex items-center justify-between"
                    style={{ background: isDark ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.08)', border: isDark ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(34,197,94,0.3)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 font-mono">Analysis Published — Awaiting User Review</p>
                        <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-0.5">
                          User review and resolution feedback will appear here once submitted.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dispatch Gmail / Portal Notification Checkbox */}
            {status === 'analyzed' && (
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer select-none transition-all duration-150 border bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:border-purple-500/40">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-400 dark:border-gray-600 text-purple-600 focus:ring-purple-500 bg-white dark:bg-black/40 accent-purple-600 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-gray-200 font-mono">
                      Dispatch findings via Gmail to {ticket.userEmail}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-gray-500 mt-0.5 font-mono">
                    {sendEmail
                      ? 'Pre-composes forensic report in Gmail draft & updates user portal'
                      : 'Saves findings directly to user portal without dispatching email'}
                  </p>
                </div>
              </label>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || sent}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-transform duration-150 ease-out active:scale-95 disabled:opacity-50 font-mono cursor-pointer"
              style={{
                background: sent
                  ? 'linear-gradient(135deg, #059669, #047857)'
                  : status === 'in_review'
                    ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                    : status === 'resolved'
                      ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                      : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: status === 'in_review'
                  ? '0 4px 20px rgba(2,132,199,0.35)'
                  : '0 4px 20px rgba(124,58,237,0.35)',
              }}
            >
              {sent ? (
                <><CheckCircle2 className="w-4 h-4" /> {status === 'in_review' ? 'Case Moved to In Review!' : status === 'resolved' ? 'Ticket Closed & Saved!' : 'Findings Saved & Synced!'}</>
              ) : sending ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Updating…</>
              ) : status === 'in_review' ? (
                <><Clock className="w-4 h-4" /> Update Status to In Review</>
              ) : status === 'resolved' ? (
                <><CheckCircle2 className="w-4 h-4" /> Save Ticket Changes</>
              ) : (
                <><Send className="w-4 h-4" /> {sendEmail ? `Save Findings & Dispatch Email` : 'Save Findings to User Portal'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export function UserRequestsPage({ onNavigate: _onNavigate }: UserRequestsPageProps) {
  const { tickets, respondToTicket, clearAllTickets, deleteTicket } = useTickets();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_review' | 'analyzed' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filterRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [filterIndicatorStyle, setFilterIndicatorStyle] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const el = filterRefs.current[filterStatus];
      if (el) {
        setFilterIndicatorStyle({
          left: el.offsetLeft,
          top: el.offsetTop,
          width: el.offsetWidth,
          height: el.offsetHeight,
          opacity: 1,
        });
      }
    };
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [filterStatus]);

  // Auto-open ticket if directed from notification click
  useEffect(() => {
    const activeId = sessionStorage.getItem('sentinel_active_ticket_id');
    if (activeId && tickets.length > 0) {
      sessionStorage.removeItem('sentinel_active_ticket_id');
      const found = tickets.find((t) => t.id === activeId);
      if (found) {
        setSelectedTicket(found);
      }
    }
  }, [tickets]);

  // Keep modal ticket state updated when new messages or updates arrive
  useEffect(() => {
    if (selectedTicket) {
      const refreshed = tickets.find((t) => t.id === selectedTicket.id);
      if (refreshed && (
        refreshed.status !== selectedTicket.status ||
        (refreshed.threadMessages?.length || 0) !== (selectedTicket.threadMessages?.length || 0) ||
        refreshed.respondedAt !== selectedTicket.respondedAt ||
        refreshed.userAcknowledged !== selectedTicket.userAcknowledged ||
        refreshed.userFeedback !== selectedTicket.userFeedback ||
        refreshed.userRating !== selectedTicket.userRating
      )) {
        setSelectedTicket(refreshed);
      }
    }
  }, [tickets, selectedTicket]);

  const filtered = tickets.filter((t) => {
    const matchesStatus = filterStatus === 'all'
      || t.status === filterStatus
      || (filterStatus === 'resolved' && (t.status === 'resolved' || t.status === 'closed'));
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q
      || t.id.toLowerCase().includes(q)
      || t.userEmail.toLowerCase().includes(q)
      || (t.emlFile?.name && t.emlFile.name.toLowerCase().includes(q))
      || t.userComment.toLowerCase().includes(q)
      || (t.verdict && t.verdict.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const pendingTickets = tickets.filter((t) => t.status === 'pending');
  const pending = pendingTickets.length;
  const inReview = tickets.filter((t) => t.status === 'in_review').length;
  const analyzed = tickets.filter((t) => t.status === 'analyzed').length;
  const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

  // Pending ticket loop switcher for mobile
  const [activePendingIdx, setActivePendingIdx] = useState(0);
  const [pendingFade, setPendingFade] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (pendingTickets.length <= 1) return;
    const interval = setInterval(() => {
      setPendingFade('out');
      setTimeout(() => {
        setActivePendingIdx((prev) => (prev + 1) % pendingTickets.length);
        setPendingFade('in');
      }, 250);
    }, 4500);

    return () => clearInterval(interval);
  }, [pendingTickets.length]);

  const currentPendingTicket = pendingTickets[activePendingIdx % (pendingTickets.length || 1)] || pendingTickets[0];

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all requests from the queue? This will wipe all tickets from local cache and the database.')) {
      await clearAllTickets();
      setToastMessage('All user requests have been purged from the database and local cache.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-10 animate-fade-in">
      {/* Toast banner */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border animate-slide-up"
          style={{ background: '#0f121d', borderColor: 'rgba(168,85,247,0.4)', color: '#e9d5ff' }}
        >
          <Mail className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-xs font-mono font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Page Header (Responsive Mobile + Desktop) ── */}
      <SlideIn delay={0} direction="down">
        {/* Mobile Card Header (Phone only: block md:hidden) */}
        <div className="block md:hidden rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0e101a] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl space-y-4">
          {/* Row 1: Icon + Title + Pending Count Badge */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/10">
                <Inbox className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                User Requests
              </h1>
            </div>

            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)' }}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-500 dark:text-amber-300 font-mono">{pending}</span>
            </div>
          </div>

          {/* Row 2: Subtitle Description */}
          <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
            Investigate suspicious emails reported by end-users, publish forensic verdicts, and provide mitigation instructions.
          </p>

          {/* Row 3: Meta badges (Sandbox, Avg SLA, High Priority) */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
              <div className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs font-medium shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>Sandbox: Active</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-[11px] sm:text-xs text-slate-600 dark:text-gray-400 shrink-0 whitespace-nowrap">
                <span>Avg SLA:</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold">12m</span>
              </div>
            </div>

            <span className="px-2 py-0.5 sm:py-1 rounded bg-rose-500/10 border border-rose-500/25 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 tracking-wider uppercase shrink-0 whitespace-nowrap">
              HIGH PRIORITY
            </span>
          </div>

          {/* Row 4: Pending Case Card with Live Loop Switcher */}
          {currentPendingTicket ? (
            <div
              onClick={() => setSelectedTicket(currentPendingTicket)}
              className="rounded-xl p-3 bg-slate-50 hover:bg-slate-100 dark:bg-[#131625] dark:hover:bg-[#161a2e] border border-slate-200 dark:border-white/10 hover:border-amber-500/40 flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-[0.99] group shadow-inner"
            >
              <div className={`min-w-0 flex-1 space-y-0.5 transition-opacity duration-200 ${pendingFade === 'in' ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-amber-600 dark:text-amber-400 font-mono font-bold text-xs">
                    {currentPendingTicket.id.startsWith('#') ? currentPendingTicket.id : `#${currentPendingTicket.id}`}
                  </span>
                  <span className="text-slate-400 dark:text-gray-500 text-xs">•</span>
                  <span className="text-slate-500 dark:text-gray-400 text-xs font-mono">
                    {formatTimeAgo(currentPendingTicket.submittedAt)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[240px] sm:max-w-xs">
                  {currentPendingTicket.userComment || (currentPendingTicket.emlFile ? currentPendingTicket.emlFile.name : 'Urgent: Suspicious Email Report')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate max-w-[240px] sm:max-w-xs">
                  Reported by: {currentPendingTicket.userEmail || 'user@enterprise.internal'}
                </p>
              </div>

              <div className="w-8 h-8 rounded-xl bg-slate-200/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white flex items-center justify-center shrink-0">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-3 bg-slate-50/60 dark:bg-[#131625]/50 border border-slate-200 dark:border-white/5 text-center text-xs text-slate-500 dark:text-gray-500 font-mono">
              No pending cases in queue · All caught up
            </div>
          )}

          {/* Row 5: Divider */}
          <div className="border-t border-slate-200 dark:border-white/10" />

          {/* Row 6: Clear All Requests Button */}
          {tickets.length > 0 && (
            <button
              onClick={handleClearAll}
              className="w-full py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-transform duration-150 ease-out active:scale-95 shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>Clear All Requests</span>
            </button>
          )}
        </div>

        {/* Desktop Header (PC only: hidden md:flex) */}
        <div className="hidden md:flex !mt-0 items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-violet-500/10 border border-violet-500/25 text-violet-600 dark:text-violet-400"
              >
                <Inbox className="w-4.5 h-4.5" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">User Requests &amp; Triage</h1>
              {pending > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold text-amber-600 dark:text-amber-300 font-mono shrink-0"
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
                >
                  {pending} pending
                </span>
              )}
            </div>
            <p className="text-slate-600 dark:text-gray-400 text-sm">
              Investigate suspicious emails reported by end-users, publish forensic verdicts, and provide mitigation instructions.
            </p>
          </div>

          {tickets.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 transition-transform duration-150 ease-out active:scale-95 cursor-pointer shadow-sm"
              title="Purge all user requests from local cache and remote database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Requests
            </button>
          )}
        </div>
      </SlideIn>

      {/* Stats row */}
      <SlideIn delay={60} direction="up" className="w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
          {[
            {
              label: 'Total In Queue',
              value: tickets.length,
              dotColor: 'bg-[#3b82f6] dark:bg-[#60a5fa] shadow-sm shadow-blue-400/50',
              numColor: 'text-[#2563eb] dark:text-[#60a5fa]',
            },
            {
              label: 'Pending Review',
              value: pending,
              dotColor: 'bg-[#f59e0b] dark:bg-[#fbbf24] shadow-sm shadow-amber-400/50',
              numColor: 'text-[#d97706] dark:text-[#fbbf24]',
            },
            {
              label: 'In Investigation',
              value: inReview,
              dotColor: 'bg-[#06b6d4] dark:bg-[#22d3ee] shadow-sm shadow-cyan-400/50',
              numColor: 'text-[#0891b2] dark:text-[#22d3ee]',
            },
            {
              label: 'Resolved / Closed',
              value: resolved,
              dotColor: 'bg-[#10b981] dark:bg-[#4ade80] shadow-sm shadow-emerald-400/50',
              numColor: 'text-[#059669] dark:text-[#4ade80]',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0c0e18] border border-slate-200 dark:border-white/[0.08] transition-all flex flex-col justify-between min-h-[82px] sm:min-h-[92px]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  {stat.label}
                </span>
                <span className={`w-2 h-2 rounded-full ${stat.dotColor}`} />
              </div>
              <div className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${stat.numColor}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </SlideIn>

      {/* Filter and Search */}
      <SlideIn delay={100} direction="up">
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="relative isolate h-10 flex items-center gap-1 p-1 rounded-xl overflow-x-auto overflow-y-hidden scrollbar-none max-w-full touch-scroll touch-pan-x overscroll-x-contain bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm"
            style={{
              touchAction: 'pan-x',
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorY: 'none',
            }}
          >
            {/* Smooth sliding indicator pill (the purple cube) */}
            <div
              className="absolute z-0 pointer-events-none rounded-lg bg-purple-500/15 dark:bg-purple-500/20 border border-purple-500/35 dark:border-purple-500/40 shadow-sm"
              style={{
                transform: `translate3d(${filterIndicatorStyle.left}px, ${filterIndicatorStyle.top}px, 0)`,
                width: filterIndicatorStyle.width,
                height: filterIndicatorStyle.height,
                opacity: filterIndicatorStyle.opacity,
                transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1), width 300ms cubic-bezier(0.25, 1, 0.5, 1), height 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
                left: 0,
                top: 0,
                zIndex: 0,
              }}
            />

            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 ml-2 mr-1 shrink-0 relative z-10" />
            {(['all', 'pending', 'in_review', 'analyzed', 'resolved'] as const).map((s) => {
              const active = filterStatus === s;
              return (
                <button
                  key={s}
                  ref={(el) => { filterRefs.current[s] = el; }}
                  onClick={() => setFilterStatus(s)}
                  style={{ zIndex: 10 }}
                  className={`relative z-10 h-8 px-3.5 rounded-lg text-xs font-bold capitalize transition-colors duration-200 font-mono shrink-0 whitespace-nowrap cursor-pointer select-none ${active
                    ? 'text-purple-900 dark:text-white font-bold'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
                    }`}
                >
                  {s.replace('_', ' ')}
                </button>
              );
            })}
          </div>

          <div
            className="h-10 flex-1 min-w-[200px] flex items-center gap-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-white border border-slate-200 dark:border-slate-200 shadow-sm"
          >
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by case ID, user email, filename, or verdict..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs text-slate-900 dark:text-slate-900 bg-transparent placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-black dark:text-slate-400 dark:hover:text-black">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </SlideIn>

      {/* Ticket List */}
      <SlideIn delay={140} direction="up">
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-sm"
          >
            <Inbox className="w-12 h-12 text-slate-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800 dark:text-gray-400">No requests found</p>
            <p className="text-xs text-slate-500 dark:text-gray-600 mt-1">No user requests match the active filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="rounded-2xl p-4 transition-all duration-200 hover:scale-[1.005] cursor-pointer group bg-white dark:bg-[#0d1118] border border-slate-200 dark:border-white/[0.07] shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: ticket.status === 'resolved'
                          ? 'rgba(168,85,247,0.12)'
                          : ticket.status === 'analyzed'
                            ? 'rgba(34,197,94,0.12)'
                            : ticket.status === 'in_review'
                              ? 'rgba(6,182,212,0.12)'
                              : 'rgba(245,158,11,0.12)',
                        border: ticket.status === 'resolved'
                          ? '1px solid rgba(168,85,247,0.25)'
                          : ticket.status === 'analyzed'
                            ? '1px solid rgba(34,197,94,0.25)'
                            : ticket.status === 'in_review'
                              ? '1px solid rgba(6,182,212,0.3)'
                              : '1px solid rgba(245,158,11,0.25)',
                      }}
                    >
                      {ticket.status === 'resolved' ? (
                        <CheckCircle2 className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                      ) : ticket.status === 'analyzed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
                      ) : ticket.status === 'in_review' ? (
                        <Clock className="w-5 h-5 text-cyan-500 dark:text-cyan-400 animate-spin" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400 animate-pulse" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">{ticket.id}</span>
                        <StatusBadge status={ticket.status} />
                        {ticket.verdict && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-transparent text-slate-700 dark:text-gray-300">
                            {ticket.verdict}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-slate-500 dark:text-gray-400 font-bold truncate block" title={ticket.userEmail}>
                        {ticket.userEmail}
                      </div>

                      <p className="text-xs text-slate-700 dark:text-gray-300 break-words leading-snug">
                        {ticket.userComment || (ticket.emlFile ? `Attachment: ${ticket.emlFile.name}` : 'No comment')}
                      </p>

                      <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-500 dark:text-gray-500 flex-wrap font-mono">
                        <span className="whitespace-nowrap">Submitted: {formatDate(ticket.submittedAt)}</span>
                        {ticket.emlFile && <span className="truncate max-w-[200px]">• {ticket.emlFile.name}</span>}
                        {ticket.threadMessages && ticket.threadMessages.length > 0 && (
                          <span className="whitespace-nowrap">• {ticket.threadMessages.length} message(s)</span>
                        )}
                        {ticket.userAcknowledged && (
                          <span className="text-purple-600 dark:text-purple-400 font-bold whitespace-nowrap">• User Confirmed Resolved</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile action bar */}
                  <div className="sm:hidden flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete ticket ${ticket.id}?`)) {
                          deleteTicket(ticket.id);
                          setToastMessage(`Deleted ticket ${ticket.id}.`);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 dark:text-gray-500 transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                      title="Delete ticket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors font-mono font-semibold flex items-center gap-1">
                      Investigate →
                    </span>
                  </div>

                  {/* Desktop action bar */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0 self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete ticket ${ticket.id}?`)) {
                          deleteTicket(ticket.id);
                          setToastMessage(`Deleted ticket ${ticket.id}.`);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 dark:text-gray-500 transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                      title="Delete ticket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-violet-600 dark:text-violet-400 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors font-mono">
                      Investigate →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SlideIn>

      {/* Detail Modal */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onRespond={(id, data) => respondToTicket(id, data)}
        />
      )}
    </div>
  );
}

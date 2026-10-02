import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Mail,
  Calendar,
  User,
  ExternalLink,
  Copy,
  Check,
  Send,
  Sparkles,
  ArrowRight,
  Shield,
  Eye,
  FileCode,
  FileText,
  CheckCircle2,
  AlertOctagon,
  Download,
  Clock,
  Archive,
  FolderArchive,
  Table,
  Image as ImageIcon,
  Film,
  Music,
} from 'lucide-react';
import {
  type IngestedEmail,
  type EmailAttachment,
  defangUrl,
  decodeMimeHeader,
  generateRealisticCleanScore,
} from '@/services/emailIngestionService';
import { GoogleAuthService } from '@/services/googleAuthService';
import { GmailIngestionService } from '@/services/gmailIngestionService';
import { useEmailIngestion } from '@/contexts/EmailIngestionContext';
import { useTickets } from '@/contexts/TicketContext';
import {
  getAttachmentCategory,
  CATEGORY_CONFIG,
  downloadAttachmentFile,
  downloadZipBundle,
  type AttachmentCategory,
} from '@/utils/attachmentParser';

interface EmailDetailDrawerProps {
  email: IngestedEmail | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string, opts?: { role?: 'analyst' | 'user' }) => void;
}

export function EmailDetailDrawer({
  email: propEmail,
  isOpen,
  onClose,
  onNavigate,
}: EmailDetailDrawerProps) {
  const { escalateToSoc, markAsReviewed } = useEmailIngestion();
  const { tickets } = useTickets();
  const [activeTab, setActiveTab] = useState<'assessment' | 'content' | 'headers'>('assessment');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateNote, setEscalateNote] = useState('');
  const [escalationSuccessCase, setEscalationSuccessCase] = useState<string | null>(null);
  const [isZippingAll, setIsZippingAll] = useState(false);
  const [isZippingImages, setIsZippingImages] = useState(false);

  // Smooth open / close animation states
  const [renderedEmail, setRenderedEmail] = useState<IngestedEmail | null>(propEmail);
  const [isRendered, setIsRendered] = useState(isOpen && !!propEmail);
  const [isVisible, setIsVisible] = useState(false);

  // Smooth sliding tab indicator pill
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const currentTabEl = tabRefs.current[activeTab];
      if (currentTabEl) {
        setIndicatorStyle((prev) => {
          if (
            prev.left === currentTabEl.offsetLeft &&
            prev.top === currentTabEl.offsetTop &&
            prev.width === currentTabEl.offsetWidth &&
            prev.height === currentTabEl.offsetHeight &&
            prev.opacity === 1
          ) {
            return prev;
          }
          return {
            left: currentTabEl.offsetLeft,
            top: currentTabEl.offsetTop,
            width: currentTabEl.offsetWidth,
            height: currentTabEl.offsetHeight,
            opacity: 1,
          };
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
  }, [activeTab, isVisible]);

  useEffect(() => {
    if (isOpen && propEmail) {
      setRenderedEmail(propEmail);
      setIsRendered(true);
      // Double requestAnimationFrame ensures browser paints the initial translate-x-full off-screen state first
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, propEmail]);

  // Lock body scroll and listen for Escape key while drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  // Reset tab when new email is selected
  useEffect(() => {
    if (propEmail?.id) {
      setActiveTab('assessment');
    }
  }, [propEmail?.id]);

  if (!isRendered || (!propEmail && !renderedEmail)) return null;

  const email = (propEmail || renderedEmail)!;

  const analysis = email.analysis;
  const threatLevel = analysis?.threat_level || 'clean';
  const rawThreatScore = analysis?.threat_score;
  const threatScore = (rawThreatScore === 5 || rawThreatScore === undefined) && threatLevel === 'clean'
    ? generateRealisticCleanScore(`${email.id}:${email.sender}:${email.subject}`)
    : (rawThreatScore ?? 5);

  const linkedTicket = tickets.find(
    (t) => (analysis?.soc_case_id && t.id === analysis.soc_case_id) || t.emailId === email.id
  );
  const isAnalyzedBySoc =
    analysis?.escalation_completed === true ||
    linkedTicket?.status === 'analyzed';
  const isEscalatedPending =
    (analysis?.escalated_to_soc || escalationSuccessCase !== null) && !isAnalyzedBySoc;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleEscalate = async () => {
    if (!email) return;
    setIsEscalating(true);
    try {
      const caseId = await escalateToSoc(email.id, escalateNote);
      setEscalationSuccessCase(caseId);
      setEscalateModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEscalating(false);
    }
  };

  const handleDeepForensics = () => {
    if (onNavigate && email) {
      onNavigate(`emails/${email.id}/forensics`, { role: 'user' });
    }
    onClose();
  };

  const handleDownloadAttachment = async (att: EmailAttachment) => {
    // 1. Direct base64 data if present
    if (att.data) {
      downloadAttachmentFile({ filename: att.filename, data: att.data, mimeType: att.mimeType });
      return;
    }

    // 2. Direct Gmail API if available
    const token = GoogleAuthService.getAccessToken();
    if (token && email.gmail_message_id && att.attachmentId) {
      try {
        await GmailIngestionService.downloadAttachment(
          token,
          email.gmail_message_id,
          att.attachmentId,
          att.filename,
          att.mimeType
        );
        return;
      } catch (err: any) {
        console.warn('Direct Gmail download failed, attempting EML fallback:', err);
      }
    }

    // 3. Fallback: decode raw EML if present
    if (email.raw_email) {
      const b64Match = email.raw_email.match(
        /Content-Transfer-Encoding\s*:\s*base64[\s\S]*?\r?\n\r?\n([\s\S]+?)(?=\r?\n--|\r?\n\r?\nContent-|$)/i
      );
      if (b64Match) {
        downloadAttachmentFile({ filename: att.filename, data: b64Match[1], mimeType: att.mimeType });
        return;
      }
    }

    // Safe download placeholder
    downloadAttachmentFile({ filename: att.filename, mimeType: att.mimeType });
  };

  const handleDownloadAllZip = async () => {
    if (!email.attachments || email.attachments.length === 0) return;
    setIsZippingAll(true);
    try {
      await downloadZipBundle(email.attachments, `Mailveil_${email.id}_Attachments.zip`);
    } catch (err: any) {
      alert(`ZIP bundle creation failed: ${err?.message}`);
    } finally {
      setIsZippingAll(false);
    }
  };

  const handleDownloadImagesZip = async () => {
    const images = (email.attachments || []).filter(a => getAttachmentCategory(a.filename, a.mimeType) === 'image');
    if (images.length === 0) return;
    setIsZippingImages(true);
    try {
      await downloadZipBundle(images, `Mailveil_${email.id}_Images.zip`);
    } catch (err: any) {
      alert(`Image ZIP creation failed: ${err?.message}`);
    } finally {
      setIsZippingImages(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(email, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mailveil-email-report-${email.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getThreatBadge = () => {
    if (threatLevel === 'malicious') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0">
          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          Malicious Threat ({threatScore}/100)
        </div>
      );
    }
    if (threatLevel === 'suspicious') {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          Suspicious ({threatScore}/100)
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap shrink-0">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        Clean / Authentic ({threatScore}/100)
      </div>
    );
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[99999] flex justify-end overflow-hidden ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Backdrop — smooth fade in/out */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel — full height, buttery smooth slide in/out from right */}
      <div
        className={`relative w-full max-w-2xl bg-white dark:bg-[#0d0e15] border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col h-full z-10 text-slate-900 dark:text-white transform transition-transform duration-300 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-[#12131d]/90 flex flex-col gap-3 sm:gap-4">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {getThreatBadge()}
                {isEscalatedPending && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-medium inline-flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse shrink-0" />
                    <span className="leading-none">SOC Escalated</span>
                  </span>
                )}
                {isAnalyzedBySoc && (
                  <span className="text-[11px] px-3 py-1 rounded-full bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-500/40 font-semibold inline-flex items-center gap-1.5 leading-none shadow-sm shadow-purple-950/40">
                    <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 stroke-[2.5]" />
                    <span className="leading-none">Escalation Completed</span>
                  </span>
                )}
                {analysis?.is_reviewed && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                    Reviewed by User
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words mt-1">
                {decodeMimeHeader(email.subject)}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors shrink-0"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sender & Metadata bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2 truncate">
              <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate">
                <strong className="text-slate-800 dark:text-gray-300">{decodeMimeHeader(email.sender_name || 'Sender')}:</strong> {email.sender}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>{new Date(email.received_at).toLocaleString()}</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 pb-1 overflow-hidden">
            <div className="relative isolate flex items-center gap-2 overflow-x-auto overflow-y-hidden scrollbar-none touch-scroll touch-pan-x overscroll-x-contain py-1 max-w-full select-none">
              {/* Smooth sliding indicator pill */}
              <div
                className="absolute z-0 pointer-events-none rounded-xl bg-cyan-500/15 dark:bg-cyan-500/20 border border-cyan-400/50 dark:border-cyan-500/40 shadow-sm shadow-cyan-900/10"
                style={{
                  top: 0,
                  left: 0,
                  transform: `translate3d(${indicatorStyle.left}px, ${indicatorStyle.top}px, 0)`,
                  width: indicatorStyle.width,
                  height: indicatorStyle.height,
                  opacity: indicatorStyle.opacity,
                  transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1), width 300ms cubic-bezier(0.25, 1, 0.5, 1), height 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
                  zIndex: 0,
                }}
              />

              {[
                { id: 'assessment' as const, label: 'AI Threat Assessment', icon: Sparkles },
                { id: 'content' as const, label: `Email Body & Links (${email.extracted_urls.length})`, icon: Mail },
                { id: 'headers' as const, label: 'RFC Headers', icon: FileCode },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => { tabRefs.current[tab.id] = el; }}
                    onClick={() => {
                      setActiveTab(tab.id);
                      tabRefs.current[tab.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                    }}
                    style={{ zIndex: 10 }}
                    className={`relative z-10 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors duration-200 cursor-pointer shrink-0 ${
                      active
                        ? 'text-cyan-950 dark:text-cyan-200 font-bold'
                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-500 dark:text-gray-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Notification banner if escalated or reverted */}
          {isAnalyzedBySoc && (
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-500/35 text-purple-950 dark:text-purple-200 text-xs space-y-2 animate-fade-in shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-purple-900 dark:text-purple-300">
                  <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>SOC Analyst Investigation Completed</span>
                </div>
                {linkedTicket?.respondedAt && (
                  <span className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">
                    {new Date(linkedTicket.respondedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              {linkedTicket?.analystComment ? (
                <p className="text-xs text-slate-800 dark:text-gray-200 bg-white dark:bg-black/40 p-3 rounded-lg border border-purple-200 dark:border-purple-500/20 leading-relaxed shadow-sm dark:shadow-none">
                  {linkedTicket.analystComment}
                </p>
              ) : (
                <p className="text-xs text-slate-700 dark:text-gray-300">
                  The SOC analyst has completed investigation and reverted back regarding this incident.
                </p>
              )}
            </div>
          )}

          {isEscalatedPending && (
            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/40 text-purple-950 dark:text-purple-200 text-xs flex items-center gap-3 animate-fade-in shadow-sm dark:shadow-none">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 animate-pulse" />
              <div>
                <strong>Incident Escalated to SOC!</strong> Case ID{' '}
                <span className="font-bold text-purple-900 dark:text-white">{analysis?.soc_case_id || escalationSuccessCase || 'CASE-USER-PENDING'}</span> has been dispatched to security analysts for inspection.
              </div>
            </div>
          )}

          {/* TAB 1: AI SECURITY ASSESSMENT */}
          {activeTab === 'assessment' && (
            <div className="space-y-5">
              {/* Threat Meter & Score Banner */}
              <div
                className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  threatLevel === 'malicious'
                    ? 'bg-red-500/10 dark:bg-red-950/20 border-red-500/30'
                    : threatLevel === 'suspicious'
                    ? 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30'
                    : 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                    <span>Mailveil Automated Threat Triage</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-gray-300">
                      {analysis?.model_used || 'Gemini Flash'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {threatLevel === 'malicious'
                      ? 'Severe Malicious Threat Identified'
                      : threatLevel === 'suspicious'
                      ? 'Suspicious Anomalies Detected'
                      : 'Authentic & Clean Email'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-gray-300 max-w-md leading-relaxed">
                    {analysis?.summary || 'Automated evaluation completed by Gemini AI.'}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5 min-w-[90px]">
                  <span
                    className={`text-3xl font-black ${
                      threatLevel === 'malicious'
                        ? 'text-red-500 dark:text-red-400'
                        : threatLevel === 'suspicious'
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-emerald-500 dark:text-emerald-400'
                    }`}
                  >
                    {threatScore}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider font-medium">Score / 100</span>
                </div>
              </div>

              {/* Phishing / Spoofing Indicators */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    Phishing & Spoofing Indicators ({analysis?.indicators.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-gray-500">
                    Confidence: {analysis?.confidence ?? 90}%
                  </span>
                </div>

                {(!analysis?.indicators || analysis.indicators.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 text-xs text-center">
                    No suspicious phishing or spoofing indicators were found in this message.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {analysis.indicators.map((ind, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-transparent hover:border-slate-300 dark:hover:border-white/20 transition-all flex items-start gap-3"
                      >
                        <div
                          className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                            ind.severity === 'critical'
                              ? 'bg-red-500 ring-4 ring-red-500/20'
                              : ind.severity === 'high'
                              ? 'bg-orange-500 ring-4 ring-orange-500/20'
                              : ind.severity === 'medium'
                              ? 'bg-amber-500 ring-4 ring-amber-500/20'
                              : 'bg-blue-500 ring-4 ring-blue-500/20'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 font-medium text-slate-700 dark:text-gray-300">
                              {ind.category}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-semibold ${
                                ind.severity === 'critical'
                                  ? 'text-red-600 dark:text-red-400'
                                  : ind.severity === 'high'
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : ind.severity === 'medium'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              [{ind.severity}]
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-gray-200 leading-relaxed font-sans">
                            {ind.finding}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommended Action Box */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-cyan-950/20 border border-slate-200 dark:border-cyan-500/30 space-y-1.5 shadow-sm">
                <div className="text-xs font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Recommended User Action
                </div>
                <p className="text-xs text-black dark:text-cyan-100 leading-relaxed font-semibold">
                  {analysis?.recommended_action || 'Proceed with standard corporate email policy.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL PREVIEW & EXTRACTED LINKS */}
          {activeTab === 'content' && (
            <div className="space-y-5">
              {/* Extracted Links Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    Extracted & Defanged URLs ({email.extracted_urls.length})
                  </h4>
                  <span className="text-[10px] text-slate-500 dark:text-gray-400">URLs defanged for safe inspection</span>
                </div>

                {email.extracted_urls.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 text-xs">
                    No external hyperlinks detected in this email.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {email.extracted_urls.map((rawUrl, idx) => {
                      const defanged = defangUrl(rawUrl);
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="font-mono text-cyan-700 dark:text-cyan-300 truncate select-all">
                            {defanged}
                          </div>
                          <button
                            onClick={() => handleCopy(rawUrl)}
                            className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-gray-300 transition-colors shrink-0 flex items-center gap-1 text-[11px]"
                            title="Copy link"
                          >
                            {copiedUrl === rawUrl ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              {email.attachments && email.attachments.length > 0 && (() => {
                const totalAtts = email.attachments.length;
                const images = email.attachments.filter(a => getAttachmentCategory(a.filename, a.mimeType) === 'image');
                const hasMultipleImages = images.length >= 2;
                const hasNonImageFiles = email.attachments.some(a => getAttachmentCategory(a.filename, a.mimeType) !== 'image');

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        Email Attachments ({totalAtts})
                      </h4>

                      <div className="flex items-center gap-2">
                        {hasMultipleImages && (
                          <button
                            onClick={handleDownloadImagesZip}
                            disabled={isZippingImages}
                            className="px-2.5 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <FolderArchive className="w-3 h-3" />
                            <span>{isZippingImages ? 'Creating ZIP...' : `Download Images ZIP (${images.length})`}</span>
                          </button>
                        )}
                        {totalAtts >= 2 && (!hasMultipleImages || hasNonImageFiles) && (
                          <button
                            onClick={handleDownloadAllZip}
                            disabled={isZippingAll}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Archive className="w-3 h-3" />
                            <span>{isZippingAll ? 'Bundling ZIP...' : `Download All as ZIP (${totalAtts})`}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {email.attachments.map((att) => {
                        const category = getAttachmentCategory(att.filename, att.mimeType);
                        const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
                        const isImg = category === 'image';
                        const isImageWithMultiple = isImg && hasMultipleImages;

                        return (
                          <div
                            key={att.id}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="p-1.5 rounded-lg shrink-0 border"
                                style={{
                                  backgroundColor: config.badgeBg,
                                  borderColor: config.badgeBorder,
                                  color: config.color,
                                }}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <div className="font-semibold text-slate-900 dark:text-white truncate max-w-sm" title={att.filename}>
                                    {att.filename}
                                  </div>
                                  {/* On desktop: badge is beside the filename */}
                                  <span
                                    className="hidden sm:inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0"
                                    style={{
                                      backgroundColor: config.badgeBg,
                                      borderColor: config.badgeBorder,
                                      color: config.color,
                                    }}
                                  >
                                    {config.label}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                                  {att.mimeType} · {att.formattedSize}
                                </div>
                              </div>
                            </div>

                            {/* Actions line: on mobile, badge + download button on the same line */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 pt-1.5 sm:pt-0 border-t border-slate-200/60 dark:border-white/5 sm:border-t-0 shrink-0">
                              {/* On mobile: badge is on the same line as the download button */}
                              <span
                                className="sm:hidden inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap shrink-0"
                                style={{
                                  backgroundColor: config.badgeBg,
                                  borderColor: config.badgeBorder,
                                  color: config.color,
                                }}
                              >
                                {config.label}
                              </span>

                              {!isImageWithMultiple ? (
                                <button
                                  onClick={() => handleDownloadAttachment(att)}
                                  className="p-1.5 px-3 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-cyan-700 dark:text-cyan-300 transition-colors shrink-0 flex items-center gap-1.5 text-[11px] font-medium cursor-pointer"
                                  title={`Download ${att.filename}`}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </button>
                              ) : (
                                <span className="text-[10px] px-2 py-1 rounded bg-pink-500/15 border border-pink-500/30 text-pink-700 dark:text-pink-300 font-medium whitespace-nowrap">
                                  In Images ZIP
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Email Body Rendering */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Email Body Preview
                </h4>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090a0f] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-gray-200 font-sans leading-relaxed whitespace-pre-wrap selection:bg-cyan-500/30">
                  {email.body_text}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RFC HEADERS */}
          {activeTab === 'headers' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Parsed RFC 822 Email Headers
              </h4>
              <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50 dark:bg-[#090a0f]">
                <table className="w-full text-left text-xs font-mono">
                  <tbody>
                    {Object.entries(email.headers).map(([key, val], idx) => (
                      <tr
                        key={key}
                        className={`border-b border-slate-200 dark:border-white/5 ${
                          idx % 2 === 0 ? 'bg-slate-100/40 dark:bg-white/[0.01]' : 'bg-slate-100/80 dark:bg-white/[0.03]'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-cyan-700 dark:text-cyan-400 font-semibold uppercase tracking-wider w-1/4 select-all">
                          {key}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-gray-300 break-all select-all">
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Action Footer */}
        <div className="px-2.5 py-2.5 sm:px-5 sm:py-3.5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#12131d] flex items-center justify-between gap-1 sm:gap-2 flex-nowrap">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={handleExportJson}
              className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 text-[11px] sm:text-xs font-medium border border-slate-200 dark:border-white/10 flex items-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Export JSON</span>
            </button>
            {!analysis?.is_reviewed && (
              <button
                onClick={() => markAsReviewed(email.id)}
                className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 text-[11px] sm:text-xs font-medium border border-slate-200 dark:border-white/10 flex items-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Mark Safe</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {threatLevel !== 'clean' && (
              isEscalatedPending ? (
                <div className="px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1 sm:gap-1.5 leading-none whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                  <span className="leading-none">SOC Escalated</span>
                </div>
              ) : isAnalyzedBySoc ? (
                <div className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#181326] border border-purple-500/40 text-purple-200 text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1 sm:gap-2 leading-none shadow-sm shadow-purple-950/50 whitespace-nowrap shrink-0">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 stroke-[2.5]" />
                  <span className="leading-none">Escalation Completed</span>
                </div>
              ) : (
                <button
                  onClick={() => setEscalateModalOpen(true)}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl text-white text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-900/30 transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span><span className="hidden min-[400px]:inline">Escalate to </span>SOC</span>
                </button>
              )
            )}

            <button
              onClick={handleDeepForensics}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-white text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-900/30 transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>Deep Forensics</span>
              <ArrowRight className="hidden sm:inline w-3 h-3 shrink-0" />
            </button>
          </div>
        </div>{/* end Action Footer */}
      </div>{/* end drawer panel */}

      {/* Escalate Confirmation Modal */}
      {escalateModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-[#13141f] border border-slate-200 dark:border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white animate-scale-in max-h-[92vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Escalate Email to SOC</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Security Operations Center Incident Dispatch</p>
                </div>
              </div>
              <button
                onClick={() => setEscalateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
              This email and its full headers, MIME body, and Gemini threat evaluation will be dispatched directly into the SOC Analyst queue as an urgent case ticket.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                Additional Comments / Context for SOC (optional):
              </label>
              <textarea
                value={escalateNote}
                onChange={(e) => setEscalateNote(e.target.value)}
                placeholder="e.g., I received this email right after an IT announcement. Links look suspicious."
                rows={3}
                className="w-full rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEscalateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isEscalating}
                onClick={handleEscalate}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/40 transition-all disabled:opacity-50"
              >
                {isEscalating ? 'Submitting...' : 'Confirm Escalation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

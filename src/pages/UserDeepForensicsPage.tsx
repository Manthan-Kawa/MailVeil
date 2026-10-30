import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
 ArrowLeft,
 Download,
 ShieldCheck,
 AlertTriangle,
 ShieldAlert,
 Sparkles,
 Server,
 Globe,
 MapPin,
 Share2,
 FileCode,
 FileText,
 CheckCircle2,
 XCircle,
 Copy,
 Check,
 ExternalLink,
 Shield,
 Clock,
 Terminal,
 AlertOctagon,
 RefreshCw,
 Cpu,
 Eye,
 ChevronRight,
 MailSearch,
 FileSearch,
 Network,
 Bell,
} from 'lucide-react';
import {
 EmailForensicsService,
 type DeepForensicsReport,
} from '@/services/emailForensicsService';
import { decodeMimeHeader, EmailIngestionService, DEFAULT_SEED_EMAILS } from '@/services/emailIngestionService';
import { useEmailIngestion } from '@/contexts/EmailIngestionContext';
import { GoogleAuthService } from '@/services/googleAuthService';
import { GmailIngestionService } from '@/services/gmailIngestionService';
import { exportReportAsPDF } from '@/utils/pdfExport';
import { DarkCyberMap } from '@/components/DarkCyberMap';
import { AttackGraphCanvas } from '@/components/AttackGraph';
import { GradientLiveProgressRing } from '@/components/GradientLiveProgressRing';
import { AttachmentForensicsSection } from '@/components/AttachmentForensicsSection';
import { ANALYSIS_STAGES, type AnalysisStage } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { SlideIn } from '@/components/SlideIn';
import { useTheme } from '@/context/ThemeContext';

const ANALYSIS_STEPS = [
 { stage: 'Reconstructing TCP Streams', label: 'Reconstructing TCP streams', detail: 'Reassembling network packet streams and reordering TCP segments' },
 { stage: 'Detecting STARTTLS Negotiations', label: 'Detecting STARTTLS negotiations', detail: 'Scanning SMTP/IMAP/POP3 command channels for cleartext or stripped STARTTLS' },
 { stage: 'Parsing TLS Handshakes', label: 'Parsing TLS handshakes', detail: 'Deconstructing ClientHello, ServerHello, and negotiated cipher suites' },
 { stage: 'Validating X.509 Certificates', label: 'Validating X.509 certificates', detail: 'Inspecting certificate chain, expiration, key length, and signature algorithm' },
 { stage: 'Scoring Cipher Suites', label: 'Scoring cryptographic posture', detail: 'Evaluating forward secrecy, encryption algorithms, and downgrade risks' },
 { stage: 'Correlating Sessions', label: 'Correlating session infrastructure', detail: 'Mapping IP infrastructure and threat intelligence campaign clusters' },
 { stage: 'Preserving Evidence', label: 'Preserving cryptographic evidence', detail: 'Generating SHA-256 session hash and recording immutable audit trail' },
 { stage: 'Generating Report', label: 'Compiling posture assessment report', detail: 'Finalizing posture assessment score and remediation plan' },
] as const;

interface UserDeepForensicsPageProps {
 emailId: string;
 onNavigate: (route: string, opts?: { role?: 'analyst' | 'user' }) => void;
}

export function UserDeepForensicsPage({ emailId, onNavigate }: UserDeepForensicsPageProps) {
 const { currentUser } = useAuth();
 const { emails, selectedEmail } = useEmailIngestion();
 const { isDark } = useTheme();
 const [report, setReport] = useState<DeepForensicsReport | null>(null);
 const [isAnalyzing, setIsAnalyzing] = useState(true);
 const [progressStep, setProgressStep] = useState(0);
 const [activeStage, setActiveStage] = useState<AnalysisStage>('Reconstructing TCP Streams');
 const [copiedText, setCopiedText] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<'all' | 'synthesis' | 'headers' | 'threat-intel' | 'origin' | 'attack-graph' | 'attachments'>('all');
 const reportTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
 const [reportIndicatorStyle, setReportIndicatorStyle] = useState<{
 left: number;
 top: number;
 width: number;
 height: number;
 opacity: number;
 }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

 useLayoutEffect(() => {
 const updateIndicator = () => {
 const currentTabEl = reportTabRefs.current[activeTab];
 if (currentTabEl) {
 setReportIndicatorStyle({
 left: currentTabEl.offsetLeft,
 top: currentTabEl.offsetTop,
 width: currentTabEl.offsetWidth,
 height: currentTabEl.offsetHeight,
 opacity: 1,
 });
 }
 };
 updateIndicator();
 const rafId = requestAnimationFrame(updateIndicator);
 const t1 = setTimeout(updateIndicator, 50);
 const t2 = setTimeout(updateIndicator, 150);
 window.addEventListener('resize', updateIndicator);
 return () => {
 cancelAnimationFrame(rafId);
 clearTimeout(t1);
 clearTimeout(t2);
 window.removeEventListener('resize', updateIndicator);
 };
 }, [activeTab, report, isAnalyzing]);

 const [loadError, setLoadError] = useState<string | null>(null);
 const [retryCount, setRetryCount] = useState(0);

 useEffect(() => {
 let mounted = true;
 setIsAnalyzing(true);
 setLoadError(null);
 setProgressStep(0);
 setActiveStage('Reconstructing TCP Streams');

 // Run API call and step animation concurrently matching EmailAnalyzerPage speed (700ms per step)
 const STEP_MS = 700;
 const TOTAL_STEPS = ANALYSIS_STEPS.length;

 let resolveAnimation!: () => void;
 const animationDone = new Promise<void>((res) => { resolveAnimation = res; });

 let step = 0;
 const interval = setInterval(() => {
 step += 1;
 if (step < TOTAL_STEPS - 1) {
 if (mounted) {
 setProgressStep(step);
 setActiveStage(ANALYSIS_STEPS[step].stage as AnalysisStage);
 }
 } else {
 if (mounted) {
 setProgressStep(TOTAL_STEPS - 1);
 setActiveStage('Generating Report');
 }
 clearInterval(interval);
 resolveAnimation();
 }
 }, STEP_MS);

 async function fetchAndAnimate() {
 try {
 let decodedTargetId = emailId;
 try { decodedTargetId = decodeURIComponent(emailId); } catch { /* ignore */ }

 let activeEmail =
 (selectedEmail && (selectedEmail.id === emailId || selectedEmail.id === decodedTargetId || selectedEmail.gmail_message_id === emailId))
 ? selectedEmail
 : emails.find((e) => e.id === emailId || e.id === decodedTargetId || e.gmail_message_id === emailId)
 || DEFAULT_SEED_EMAILS.find((e) => e.id === emailId || e.id === decodedTargetId || e.gmail_message_id === emailId);

 if (!activeEmail) {
 try {
 const loaded = await EmailIngestionService.getEmails(currentUser?.email || 'user@gmail.com');
 activeEmail = loaded.find((e) => e.id === emailId || e.id === decodedTargetId || e.gmail_message_id === emailId);
 } catch {
 // ignore
 }
 }

 const [data] = await Promise.all([
 EmailForensicsService.getFullForensics(emailId, currentUser?.email || 'user@gmail.com', activeEmail),
 animationDone,
 ]);

 // Short pause on 100% before revealing results, identical to EmailAnalyzerPage (450ms)
 await new Promise((r) => setTimeout(r, 450));

 if (mounted) {
 if (!data) {
 setLoadError('Email message not found in local or synchronized mailboxes.');
 }
 setReport(data);
 setIsAnalyzing(false);
 // Once forensic analysis has completed, clear pending SOC escalation
 EmailIngestionService.removeEscalation(emailId);
 }
 } catch (err: any) {
 clearInterval(interval);
 console.error('Failed to load deep forensics report:', err);
 if (mounted) {
 setLoadError(err?.message || 'An unexpected error occurred during forensic compilation.');
 setIsAnalyzing(false);
 }
 }
 }

 fetchAndAnimate();

 return () => {
 mounted = false;
 clearInterval(interval);
 };
 }, [emailId, currentUser?.email, retryCount]);

 const handleCopy = (text: string, label: string) => {
 navigator.clipboard.writeText(text);
 setCopiedText(label);
 setTimeout(() => setCopiedText(null), 2000);
 };

 const handleExportPdf = () => {
 if (report?.rawAnalysisResult) {
 exportReportAsPDF(report.rawAnalysisResult, {
 reportType: 'forensic',
 deepReport: report,
 });
 }
 };

 const [isDownloadingAttachment, setIsDownloadingAttachment] = useState(false);

 const handleDownloadAttachment = async () => {
 if (!report?.attachmentForensics) return;
 setIsDownloadingAttachment(true);
 try {
 const filename = report.attachmentForensics.filename || 'attachment.pdf';
 const filetype = report.attachmentForensics.filetype || 'application/pdf';

 // Strategy 1: If pre-extracted base64 data exists in attachments (e.g. from EML)
 const attWithData = report.attachmentForensics.allAttachments?.find(
 (a) => a.data && (a.filename.toLowerCase() === filename.toLowerCase() || a.mimeType === filetype)
 ) || report.attachmentForensics.allAttachments?.find((a) => a.data);

 if (attWithData?.data) {
 const bytes = Uint8Array.from(atob(attWithData.data.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
 const blob = new Blob([bytes], { type: attWithData.mimeType || filetype });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 return;
 }

 // Strategy 2: Direct Gmail API download if accessToken & attachmentId exist
 const token = GoogleAuthService.getAccessToken();
 const msgId = report.email?.gmail_message_id || report.attachmentForensics.gmailMessageId;
 const attId = report.attachmentForensics.attachmentId
 || report.attachmentForensics.allAttachments?.find((a) => a.attachmentId)?.attachmentId;

 if (token && msgId && attId) {
 try {
 await GmailIngestionService.downloadAttachment(
 token,
 msgId,
 attId,
 filename,
 filetype
 );
 return;
 } catch (e) {
 console.warn('Direct Gmail download failed, attempting EML fallback:', e);
 }
 }

 // Strategy 3: Decode base64 attachment block from raw EML (exact parity with Analyst side!)
 const rawEml: string = report.rawAnalysisResult?.raw_email || report.email?.raw_email || '';
 const b64Match = rawEml.match(
 /Content-Transfer-Encoding\s*:\s*base64[\s\S]*?\r?\n\r?\n([\s\S]+?)(?=\r?\n--|\r?\n\r?\nContent-|$)/i
 );
 if (b64Match) {
 const b64 = b64Match[1].replace(/\s/g, '');
 const bytes = Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
 const blob = new Blob([bytes], { type: filetype });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 return;
 }

 // Strategy 4: Re-fetch live from Gmail to discover attachmentId or data
 if (token && msgId) {
 const liveAtts = await GmailIngestionService.fetchAttachmentsForMessage(token, msgId);
 const att = liveAtts?.find((a) => a.filename.toLowerCase() === filename.toLowerCase()) || liveAtts?.[0];
 if (att?.attachmentId) {
 await GmailIngestionService.downloadAttachment(token, msgId, att.attachmentId, filename, filetype);
 return;
 } else if (att?.data) {
 const bytes = Uint8Array.from(atob(att.data.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
 const blob = new Blob([bytes], { type: filetype });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 return;
 }
 }

 alert('Could not download attachment data. Please reconnect Gmail or try again.');
 } catch (err: any) {
 console.error('Attachment download failed:', err);
 alert(`Download failed: ${err?.message || 'Could not download attachment'}`);
 } finally {
 setIsDownloadingAttachment(false);
 }
 };

 if (isAnalyzing) {
 const current = ANALYSIS_STEPS[Math.min(progressStep, ANALYSIS_STEPS.length - 1)];
 const progressPercent = Math.round(((progressStep + 1) / ANALYSIS_STEPS.length) * 100);

 return (
 <div className="space-y-6 text-gray-900 dark:text-white pb-20 animate-fade-in" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
 {/* ── Page Header ── */}
 <div>
 <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Deep Forensics</h2>
 <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
 Automated multi-stage forensic analysis and threat intelligence pipeline
 </p>
 </div>

 {/* Workflow indicator */}
 <div
 className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm p-4"
 style={{
 background: isDark ? 'linear-gradient(145deg, #0a0d15, #080b14)' : '#ffffff',
 border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0',
 boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.05)',
 }}
 >
 <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none no-scrollbar touch-scroll pb-1">
 {ANALYSIS_STAGES.map((stage, i) => {
 const isActive = stage === activeStage;
 const isDone = ANALYSIS_STAGES.indexOf(activeStage) > i;
 return (
 <div key={stage} className="flex items-center shrink-0">
 <div
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
 isActive ? (isDark ? 'text-purple-300' : 'text-purple-700') : isDone ? (isDark ? 'text-green-400' : 'text-emerald-700') : (isDark ? 'text-gray-500' : 'text-gray-500')
 }`}
 style={
 isActive
 ? { background: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)', border: isDark ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(139,92,246,0.3)', boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.05)' }
 : isDone
 ? { background: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.1)', border: isDark ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(34,197,94,0.25)' }
 : { background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0' }
 }
 >
 <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-purple-500 animate-pulse' : isDone ? 'bg-green-500' : (isDark ? 'bg-gray-600' : 'bg-slate-300')}`} />
 {stage}
 </div>
 {i < ANALYSIS_STAGES.length - 1 && (
 <ChevronRight className={`w-3.5 h-3.5 mx-1 ${isDone ? (isDark ? 'text-green-500' : 'text-emerald-600') : (isDark ? 'text-gray-700' : 'text-gray-300')}`} />
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Central Analyzing View */}
 <div
 className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm p-8 flex flex-col items-center justify-center py-12 text-center"
 style={{
 background: isDark ? 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)' : '#ffffff',
 border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
 boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.06)',
 }}
 >
 <div className="mb-6">
 <GradientLiveProgressRing
 progress={progressPercent}
 sublabel={`STAGE ${progressStep + 1}/${ANALYSIS_STEPS.length}`}
 />
 </div>

 <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{current.label}</h3>
 <p className="text-xs text-gray-600 dark:text-gray-400 mb-8 max-w-md">{current.detail}</p>

 <div className="w-full max-w-md space-y-2">
 {ANALYSIS_STEPS.map((s, i) => {
 const isDone = i < progressStep;
 const isActive = i === progressStep;
 return (
 <div
 key={s.stage}
 className="flex items-center gap-3 px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl transition-all duration-300"
 style={{
 background: isActive ? (isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)') : isDone ? (isDark ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.06)') : (isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc'),
 border: `1px solid ${isActive ? (isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.3)') : isDone ? (isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.25)') : (isDark ? 'rgba(255,255,255,0.04)' : '#e2e8f0')}`,
 }}
 >
 <div
 className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
 style={{ background: isDone ? (isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.15)') : isActive ? (isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') }}
 >
 {isDone ? (
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-green-400" />
 ) : isActive ? (
 <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
 ) : (
 <div className="w-2 h-2 dark:bg-gray-600 rounded-full" />
 )}
 </div>
 <span className={`text-xs ${isDone ? (isDark ? 'text-gray-400' : 'text-gray-600') : isActive ? (isDark ? 'text-white' : 'text-gray-900') + ' font-semibold' : (isDark ? 'text-gray-600' : 'text-gray-400')}`}>
 {s.stage} — {s.label}
 </span>
 </div>
 );
 })}
 </div>

 <p className="text-[11px] text-gray-500 dark:text-gray-600 mt-6 font-mono">Calling Claude AI… this may take 10-20 seconds</p>
 </div>
 </div>
 );
 }

 if (!report) {
 return (
 <div className="p-8 text-center text-gray-900 dark:text-white space-y-4 max-w-md mx-auto">
 <AlertTriangle className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto" />
 <h2 className="text-lg font-bold text-gray-900 dark:text-white">Email Forensic Dossier Not Found</h2>
 {loadError && (
 <p className="text-xs text-rose-700 dark:text-rose-400/90 font-mono bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark: -rose-500/20 rounded-lg p-2.5">
 {loadError}
 </p>
 )}
 <div className="flex items-center justify-center gap-3 pt-2">
 <button
 onClick={() => {
 setReport(null);
 setIsAnalyzing(true);
 setLoadError(null);
 setRetryCount((c) => c + 1);
 }}
 className="px-4 py-2 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
 >
 <RefreshCw className="w-3.5 h-3.5" />
 Retry Analysis
 </button>
 <button
 onClick={() => onNavigate('emails', { role: 'user' })}
 className="px-4 py-2 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
 >
 Back to Ingested Emails
 </button>
 </div>
 </div>
 );
 }

 const { email, threatLevel, threatScore, confidence, aiSynthesis, headerForensics, threatIntel, origin, attachmentForensics } = report;

 return (
 <div className="space-y-6 text-gray-900 dark:text-white pb-20 animate-fade-in">
 {/* ── Top Header Navigation & Threat Score Card ──────────────────────────── */}
 <SlideIn delay={0} direction="down">
 {/* Mobile View (Phone/Tablet: block md:hidden) matching requested card UI */}
 <div className="block md:hidden p-4 sm:p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm border dark: -white/[0.08] space-y-3">
 {/* Row 1: Badges - Case ID + Time on left, Read-Only Forensic Report on far right */}
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2 min-w-0">
 <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark: -cyan-800/50 font-mono shrink-0">
 {report.caseId}
 </span>
 <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
 {new Date(report.analyzedAt).toLocaleString()}
 </span>
 </div>
 <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark: -purple-800/50 shrink-0">
 Read-Only Forensic Report
 </span>
 </div>

 {/* Row 2: Arrow + Title on same line */}
 <div className="flex items-center gap-2">
 <button
 onClick={() => {
 EmailIngestionService.removeEscalation(emailId);
 onNavigate('emails', { role: 'user' });
 }}
 className="p-1 -ml-1 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white rounded-lg hover: dark:hover: /10 transition-colors shrink-0 cursor-pointer flex items-center justify-center"
 title="Back to Emails"
 >
 <ArrowLeft className="w-5 h-5" />
 </button>
 <h1 className="text-lg font-black text-gray-900 dark:text-white leading-normal break-words flex-1">
 {decodeMimeHeader(email.subject)}
 </h1>
 </div>

 {/* Row 3: From Info */}
 <p className="text-xs text-gray-500 dark:text-gray-400 break-all leading-normal">
 From: <span className="text-gray-800 dark:text-gray-200 font-medium">{email.sender_name ? decodeMimeHeader(email.sender_name) : ''}</span>{' '}
 <span className="font-mono text-gray-500 dark:text-gray-400">{email.sender_name ? `<${email.sender}>` : email.sender}</span>
 </p>

 {/* Row 4: Threat Score & Action Bar */}
 <div className="pt-3 border-t dark: -white/[0.06] flex items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <div>
 <div
 className={`text-xl font-bold font-mono leading-none ${threatLevel === 'malicious'
 ? 'text-red-500 dark:text-red-400'
 : threatLevel === 'suspicious'
 ? 'text-amber-500 dark:text-amber-400'
 : 'text-emerald-600 dark:text-emerald-400'
 }`}
 >
 {threatScore}/100
 </div>
 <div className="text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-mono mt-1 font-semibold leading-none">
 THREAT SCORE
 </div>
 </div>

 <div className="w-px h-8 dark: /15 shrink-0" />

 <div className="flex items-center gap-1.5 shrink-0">
 {threatLevel === 'malicious' ? (
 <>
 <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
 <span className="text-xs font-bold font-mono tracking-wider text-red-500 dark:text-red-400 uppercase">
 MALICIOUS
 </span>
 </>
 ) : threatLevel === 'suspicious' ? (
 <>
 <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
 <span className="text-xs font-bold font-mono tracking-wider text-amber-500 dark:text-amber-400 uppercase">
 SUSPICIOUS
 </span>
 </>
 ) : (
 <>
 <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
 <span className="text-xs font-bold font-mono tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
 CLEAN
 </span>
 </>
 )}
 </div>
 </div>

 <button
 onClick={handleExportPdf}
 className="h-10 px-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-900/20 flex items-center gap-2 transition-transform duration-150 ease-out active:scale-95 cursor-pointer shrink-0"
 title="Download complete forensic PDF dossier"
 >
 <Download className="w-4 h-4" />
 <span>Export PDF</span>
 </button>
 </div>
 </div>

 {/* Laptop / Desktop View (PC/Laptop: hidden md:flex) - original desktop layout */}
 <div className="hidden md:flex p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm dark:border-zinc-800 dark:shadow-xl items-center justify-between gap-4">
 <div className="flex items-center gap-4 min-w-0">
 <button
 onClick={() => {
 EmailIngestionService.removeEscalation(emailId);
 onNavigate('emails', { role: 'user' });
 }}
 className="p-2 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl bg-transparent hover: dark:hover: /10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors shrink-0 flex items-center justify-center cursor-pointer"
 title="Back to Emails"
 >
 <ArrowLeft className="w-5 h-5" />
 </button>

 <div className="min-w-0 space-y-1">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-[11px] font-bold px-2 py-0.5 rounded text-cyan-700 border dark: /10 dark:text-cyan-300 dark: -white/10 font-mono">
 {report.caseId}
 </span>
 <span className="text-[11px] text-gray-500 dark:text-gray-400">
 {new Date(report.analyzedAt).toLocaleString()}
 </span>
 <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border -purple-500/30">
 Read-Only Forensic Report
 </span>
 </div>
 <h1 className="text-xl font-black text-gray-900 dark:text-white truncate max-w-2xl">
 {decodeMimeHeader(email.subject)}
 </h1>
 <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
 From: <span className="text-gray-700 dark:text-gray-200">{decodeMimeHeader(email.sender_name ? `${email.sender_name} <${email.sender}>` : email.sender)}</span>
 </p>
 </div>
 </div>

 {/* Action buttons & threat badge */}
 <div className="flex items-center gap-3 shrink-0">
 <div className="h-11 px-3.5 flex items-center gap-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl /50 dark:border-zinc-800">
 <div className="text-right">
 <div
 className={`text-base font-bold font-mono leading-none ${threatLevel === 'malicious'
 ? 'text-red-500 dark:text-red-400'
 : threatLevel === 'suspicious'
 ? 'text-amber-500 dark:text-amber-400'
 : 'text-emerald-600 dark:text-emerald-400'
 }`}
 >
 {threatScore}/100
 </div>
 <div className="text-[8.5px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-mono mt-1 leading-none">
 THREAT SCORE
 </div>
 </div>
 <div className="w-px h-6 dark: /15" />
 <div className="flex items-center gap-1.5 pl-0.5">
 {threatLevel === 'malicious' ? (
 <>
 <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400" />
 <span className="text-xs font-bold font-mono tracking-wider text-red-500 dark:text-red-400 uppercase">
 MALICIOUS
 </span>
 </>
 ) : threatLevel === 'suspicious' ? (
 <>
 <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
 <span className="text-xs font-bold font-mono tracking-wider text-amber-500 dark:text-amber-400 uppercase">
 SUSPICIOUS
 </span>
 </>
 ) : (
 <>
 <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
 <span className="text-xs font-bold font-mono tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
 CLEAN
 </span>
 </>
 )}
 </div>
 </div>

 <button
 onClick={handleExportPdf}
 className="h-10 px-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
 title="Download complete forensic PDF dossier"
 >
 <Download className="w-4 h-4" />
 Export PDF
 </button>
 </div>
 </div>
 </SlideIn>

 {/* ── Quick Navigation Tabs ─────────────────────────────────────────── */}
 <SlideIn delay={60} direction="up">
 <div className="flex items-center gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm mb-4 overflow-x-auto scrollbar-none select-none max-w-full">
 {[
 { id: 'all', label: 'Complete Forensic Report', icon: Shield },
 { id: 'synthesis', label: 'PCAP Analyzer', icon: MailSearch },
 { id: 'headers', label: 'Crypto Forensics', icon: FileSearch },
 { id: 'threat-intel', label: 'Certificate Vault', icon: ShieldCheck },
 { id: 'origin', label: 'Session Mapping', icon: MapPin },
 { id: 'attack-graph', label: 'Attack Graph', icon: Share2 },
 { id: 'campaigns', label: 'TLS Campaigns', icon: Network },
 { id: 'alerts', label: 'Crypto Alerts', icon: Bell },
 ].map((tab) => {
 const Icon = tab.icon;
 const active = activeTab === tab.id;
 return (
 <button
 key={tab.id}
 type="button"
 onClick={() => setActiveTab(tab.id as any)}
 className={`relative h-9 px-3.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer select-none shrink-0 ${
 active
 ? 'text-white font-bold'
 : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-zinc-800/40'
 }`}
 >
 {active && (
 <motion.div
 layoutId="activeUserDeepForensicsTab"
 className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 shadow-md shadow-blue-500/20"
 transition={{
 type: 'spring',
 stiffness: 450,
 damping: 32,
 }}
 />
 )}
 <span className="relative z-10 flex items-center gap-2">
 <Icon className="w-3.5 h-3.5" />
 {tab.label}
 </span>
 </button>
 );
 })}
 </div>
 </SlideIn>

 {/* ══════════════════════════════════════════════════════════════════════
 SECTION 1: AI SYNTHESIS & RISK NARRATIVE
 ══════════════════════════════════════════════════════════════════════ */}
 {(activeTab === 'all' || activeTab === 'synthesis') && (
 <SlideIn delay={100} direction="up">
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
 <Sparkles className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
 1. Final AI Synthesis & Plain-Language Risk Narrative
 </h2>
 <span className="text-xs text-gray-500 dark:text-gray-500">Confidence: {confidence}%</span>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 {/* Executive Summary & Narrative */}
 <div className="lg:col-span-2 p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm dark:border-zinc-800 dark:shadow-none space-y-4">
 <div>
 <div className="text-[11px] text-cyan-700 dark:text-cyan-400 uppercase tracking-wider font-semibold mb-1">
 Executive AI Summary
 </div>
 <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-sans font-medium">
 {aiSynthesis.executiveSummary}
 </p>
 </div>

 <div className="p-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl /40 border dark: -white/5 space-y-2">
 <div className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
 <Eye className="w-4 h-4" />
 Plain-Language Risk Explanation
 </div>
 <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
 {aiSynthesis.riskNarrative}
 </p>
 </div>
 </div>

 {/* Mitigation Checklist */}
 <div className="p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm dark:border-zinc-800 dark:shadow-none space-y-3">
 <div className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
 <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
 User Mitigation Checklist
 </div>
 <div className="space-y-2.5">
 {aiSynthesis.mitigationChecklist.map((item, idx) => (
 <div
 key={idx}
 className="p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl dark: /[0.03] border dark: -white/5 space-y-1"
 >
 <div className="flex items-center justify-between gap-2">
 <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
 <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
 {item.action}
 </span>
 <span
 className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${item.urgency === 'immediate'
 ? 'bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30'
 : item.urgency === 'recommended'
 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
 : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
 }`}
 >
 {item.urgency}
 </span>
 </div>
 <p className="text-[11px] text-gray-600 dark:text-gray-400 pl-5">{item.reason}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </SlideIn>
 )}

 {/* ══════════════════════════════════════════════════════════════════════
 SECTION 2: HEADER FORENSICS & HOP RELAYS
 ══════════════════════════════════════════════════════════════════════ */}
 {(activeTab === 'all' || activeTab === 'headers') && (
 <SlideIn delay={140} direction="up">
 <div className="space-y-4">
 <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
 <FileCode className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
 2. Header Forensics & Hop-by-Hop Authentication
 </h2>

 {/* Authentication Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
 {[
 { title: 'SPF Verification', val: headerForensics.spf.status, detail: headerForensics.spf.detail },
 { title: 'DKIM Signature', val: headerForensics.dkim.status, detail: headerForensics.dkim.detail },
 { title: 'DMARC Alignment', val: headerForensics.dmarc.status, detail: headerForensics.dmarc.detail },
 {
 title: 'Return-Path Alignment',
 val: headerForensics.isReturnPathAligned ? 'ALIGNED' : 'MISMATCH',
 detail: headerForensics.isReturnPathAligned ? 'Matches From domain' : `Diverts to: ${headerForensics.returnPath}`,
 },
 ].map((auth, i) => {
 const pass = auth.val === 'PASS' || auth.val === 'ALIGNED';
 return (
 <div key={i} className="p-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm dark:border-zinc-800 dark:shadow-none space-y-1.5">
 <div className="text-xs text-gray-500 dark:text-gray-400">{auth.title}</div>
 <div className="flex items-center gap-2">
 {pass ? (
 <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
 ) : (
 <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
 )}
 <span
 className={`text-sm font-black ${pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
 }`}
 >
 {auth.val}
 </span>
 </div>
 <div className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2">{auth.detail}</div>
 </div>
 );
 })}
 </div>

 {/* Hop-by-Hop Relay Route Table */}
 <div className="p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm dark:border-zinc-800 dark:shadow-none space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
 <Server className="w-4 h-4 text-purple-500 dark:text-purple-400" />
 SMTP Relay Route Hop Breakdown
 </h3>
 <span className="text-[11px] text-gray-500 dark:text-gray-500">{headerForensics.hops.length} Network Hops Traced</span>
 </div>

 <div className="overflow-x-auto scrollbar-thin touch-scroll">
 <table className="w-full text-left text-xs min-w-[580px] md:min-w-0">
 <thead>
 <tr className="border-b dark: -white/10 text-gray-500 dark:text-gray-400 uppercase text-[10px]">
 <th className="py-2.5 px-3">Hop</th>
 <th className="py-2.5 px-3">Server IP & Reverse DNS</th>
 <th className="py-2.5 px-3">Location</th>
 <th className="py-2.5 px-3">Latency</th>
 <th className="py-2.5 px-3">Ingress Classification</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-white/5">
 {headerForensics.hops.map((hop) => (
 <tr key={hop.hop} className="hover: dark:hover: /[0.02]">
 <td className="py-3 px-3 font-bold text-cyan-600 dark:text-cyan-400">#{hop.hop}</td>
 <td className="py-3 px-3">
 <div className="font-mono text-gray-900 dark:text-white font-semibold">{hop.ip}</div>
 <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{hop.reverseDns}</div>
 </td>
 <td className="py-3 px-3 text-gray-700 dark:text-gray-300 font-sans">{hop.location}</td>
 <td className="py-3 px-3 text-gray-500 dark:text-gray-400">{hop.delay}</td>
 <td className="py-3 px-3">
 <span
 className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${hop.status === 'malicious'
 ? 'bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30'
 : hop.status === 'suspicious'
 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
 : hop.status === 'internal'
 ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30'
 : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
 }`}
 >
 {hop.status}
 </span>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </SlideIn>
 )}

 {/* ══════════════════════════════════════════════════════════════════════
 SECTION 3: THREAT INTELLIGENCE & REPUTATION
 ══════════════════════════════════════════════════════════════════════ */}
 {(activeTab === 'all' || activeTab === 'threat-intel') && (
 <SlideIn delay={180} direction="up">
 <div className="space-y-4">
 <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
 <Globe className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
 3. Threat Intelligence & External Blacklists
 </h2>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 {/* Reputation Overview */}
 <div className="p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm dark:border-zinc-800 dark:shadow-none space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
 Entity Reputation Assessment
 </h3>

 <div className="space-y-3">
 <div className="p-3.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl /40 border dark: -white/5 flex items-center justify-between">
 <div>
 <div className="text-[11px] text-gray-500 dark:text-gray-400">Sending IP Reputation</div>
 <div className="text-xs font-mono font-bold text-gray-900 dark:text-white">{threatIntel.sendingIp}</div>
 </div>
 <span
 className={`text-xs uppercase font-bold px-2.5 py-1 rounded ${threatIntel.ipReputation === 'malicious'
 ? 'bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30'
 : threatIntel.ipReputation === 'suspicious'
 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
 : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
 }`}
 >
 {threatIntel.ipReputation}
 </span>
 </div>

 <div className="p-3.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl /40 border dark: -white/5 flex items-center justify-between">
 <div>
 <div className="text-[11px] text-gray-500 dark:text-gray-400">Sender Domain Age</div>
 <div className="text-xs font-semibold text-gray-900 dark:text-white">{threatIntel.domain}</div>
 </div>
 <div className="text-right">
 <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-300">
 {threatIntel.domainAgeDays} days
 </span>
 <div className="text-[10px] text-gray-500 dark:text-gray-400">
 {threatIntel.domainAgeDays < 30 ? 'High Risk (<30d)' : 'Established'}
 </div>
 </div>
 </div>
 </div>

 {threatIntel.threatTags.length > 0 && (
 <div className="space-y-1.5 pt-2">
 <div className="text-[11px] text-gray-500 dark:text-gray-400">Threat Classification Tags:</div>
 <div className="flex flex-wrap gap-1.5">
 {threatIntel.threatTags.map((tag, i) => (
 <span
 key={i}
 className="text-[10px] font-medium px-2 py-0.5 rounded text-gray-700 dark: /10 dark:text-gray-200 dark: -white/10"
 >
 {tag}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>

 {/* Blacklists Grid */}
 <div className="lg:col-span-2 p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm dark:border-zinc-800 dark:shadow-none space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
 6-Engine Reputation & Blacklist Scanner
 </h3>
 <span className="text-[10px] text-gray-500 dark:text-gray-500">Live Feeds Queried</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {threatIntel.blacklists.map((bl, i) => {
 const isClean = bl.status === 'clean';
 return (
 <div
 key={i}
 className="p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl /30 border dark: -white/5 flex items-start justify-between gap-3"
 >
 <div className="space-y-0.5">
 <div className="text-xs font-bold text-gray-900 dark:text-white">{bl.engine}</div>
 <div className="text-[11px] text-gray-500 dark:text-gray-400">{bl.detail}</div>
 </div>
 <span
 className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${isClean
 ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
 : bl.status === 'warning'
 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
 : 'bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30'
 }`}
 >
 {bl.status}
 </span>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 </SlideIn>
 )}

 {/* ══════════════════════════════════════════════════════════════════════
 SECTION 4: ORIGIN INVESTIGATION & GEOIP MAP
 ══════════════════════════════════════════════════════════════════════ */}
 {(activeTab === 'all' || activeTab === 'origin') && (
 <SlideIn delay={220} direction="up">
 <div className="space-y-4">
 <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
 <MapPin className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
 4. Origin Investigation & Infrastructure Geolocation
 </h2>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 {/* Telemetry info */}
 <div className="p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm dark:border-zinc-800 dark:shadow-none space-y-4">
 <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
 Physical & Autonomous Origin
 </h3>

 <div className="space-y-3 text-xs">
 <div className="p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl /40 border dark: -white/5">
 <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Originating Public IP</div>
 <div className="font-bold text-cyan-600 dark:text-cyan-300 font-mono text-sm tracking-wide">
 {origin.sendingIp}
 </div>
 </div>

 <div className="p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl /40 border dark: -white/5">
 <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Originating Location</div>
 <div className="font-bold text-gray-900 dark:text-white text-sm">
 {origin.city}, {origin.country}
 </div>
 <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
 Lat: {origin.latitude.toFixed(4)}, Lng: {origin.longitude.toFixed(4)}
 </div>
 </div>

 <div className="p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl /40 border dark: -white/5">
 <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Routing Autonomous System</div>
 <div className="font-bold text-gray-900 dark:text-white truncate">{origin.asn}</div>
 </div>

 <div className="p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 rounded-xl /40 border dark: -white/5">
 <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Hosting Infrastructure</div>
 <div className="font-bold text-gray-900 dark:text-white">{origin.hostingProvider}</div>
 </div>
 </div>
 </div>

 {/* Dark Cyber Map */}
 <div className="lg:col-span-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm dark:border-zinc-800 overflow-hidden ">
 <DarkCyberMap
 markers={[origin.mapMarker]}
 height="320px"
 singlePointerMode={true}
 />
 </div>
 </div>
 </div>
 </SlideIn>
 )}

 {/* ══════════════════════════════════════════════════════════════════════
 SECTION 5: ATTACK GRAPH (INTERACTIVE & READ-ONLY)
 ══════════════════════════════════════════════════════════════════════ */}
 {(activeTab === 'all' || activeTab === 'attack-graph') && (
 <SlideIn delay={260} direction="up">
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
 <Share2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
 5. Interactive Attack Graph Topology (Read-Only)
 </h2>
 <span className="text-[11px] text-gray-500 dark:text-gray-500">Attacker → Relays → Gateway → Target</span>
 </div>

 <div className="lg:bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-sm lg:border lg: dark:lg:border-zinc-800 lg: dark:lg:bg-[#0d0e16] lg:overflow-hidden lg:shadow-none dark:lg:shadow-xl">
 <AttackGraphCanvas
 result={report.rawAnalysisResult}
 height={440}
 showHeader={false}
 />
 </div>
 </div>
 </SlideIn>
 )}

 {/* ══════════════════════════════════════════════════════════════════════
 SECTION 6: ATTACHMENT & PAYLOAD FORENSICS
 ══════════════════════════════════════════════════════════════════════ */}
 {(activeTab === 'all' || activeTab === 'attachments') && (
 <SlideIn delay={300} direction="up">
 <AttachmentForensicsSection
 attachmentForensics={attachmentForensics}
 rawAnalysisResult={report?.rawAnalysisResult}
 email={email}
 sectionTitle="Attachment Forensics & Embedded Payload Analysis"
 sectionPrefix="6."
 />
 </SlideIn>
 )}
 </div>
 );
}

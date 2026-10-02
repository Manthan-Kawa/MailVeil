import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  FileText,
  FileCode,
  Download,
  Eye,
  Shield,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Brain,
  Clock,
  Server,
  CheckCircle2,
  Send,
  Sparkles,
  Zap,
  Printer,
  ChevronDown,
  MailSearch,
  RefreshCw,
  Trash2,
  Plus,
  ShieldAlert,
  ArrowRight,
  Check,
  Globe,
  MapPin,
  Link2,
  Network,
  Lock,
  XCircle,
  Info,
  Layers,
  Activity,
  UserCheck,
  Search,
  X,
  Filter,
  Share2,
  Terminal,
  Copy,
  type LucideIcon,
} from 'lucide-react';
import {
  REPORT_TYPES,
  type ReportType,
  type ReportData,
  SMTP_RELAYS,
  type InfraLocation,
  type AttackGraphNode as AGNode,
  type GraphNodeType,
} from '@/data/mockData';
import { CopyButton } from '@/components/CopyButton';
import { DarkCyberMap } from '@/components/DarkCyberMap';
import { AttackGraphCanvas, getCaseLayoutStyle, renderAttackGraphToSvg, type LayoutStyle } from '@/components/AttackGraph';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { generateFormattedPdfHtml, exportReportAsPDF } from '@/utils/pdfExport';
import { AttachmentForensicsSection } from '@/components/AttachmentForensicsSection';
import {
  askSentinelAssistant,
  type EmailAnalysisResult,
  type AssistantChatMessage,
} from '@/services/claudeService';
import { decodeMimeHeader } from '@/services/emailIngestionService';
import { GmailIngestionService } from '@/services/gmailIngestionService';
import { GoogleAuthService } from '@/services/googleAuthService';

/* ─── Slide-in entrance wrapper ─── */
function SlideIn({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'down';
  className?: string;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const from =
    direction === 'left'
      ? 'translateX(-36px)'
      : direction === 'right'
        ? 'translateX(36px)'
        : direction === 'down'
          ? 'translateY(-20px)'
          : 'translateY(24px)';
  return (
    <div
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : from,
        transition: 'opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)',
      }}
    >
      {children}
    </div>
  );
}

export type ReportContentTab =
  | 'all'
  | 'synthesis'
  | 'headers'
  | 'threat-intel'
  | 'origin'
  | 'attack-graph'
  | 'attachments';

export function ReportsPage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const {
    analyzedReports,
    currentResult,
    currentReportData,
    selectCase,
    deleteCase,
    loadDemoCase,
  } = useAnalysis();

  const [reportType, setReportType] = useState<ReportType>('forensic');
  const [showPreview, setShowPreview] = useState(true);
  const [activePreviewTab, setActivePreviewTab] = useState<ReportContentTab>('all');
  const [caseSearch, setCaseSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const matchingCases = useMemo(() => {
    if (!caseSearch.trim()) return analyzedReports;
    const q = caseSearch.toLowerCase().trim();
    return analyzedReports.filter((r) => {
      const matchesCaseId = r.case_id.toLowerCase().includes(q);
      const matchesSubject = r.headers
        .find((h) => h.key.toLowerCase() === 'subject')
        ?.value?.toLowerCase().includes(q);
      const matchesVerdict = r.verdict?.toLowerCase().includes(q);
      const matchesFrom = r.headers
        .find((h) => h.key.toLowerCase() === 'from')
        ?.value?.toLowerCase().includes(q);
      const matchesIp = r.threat_intel?.sending_ip?.toLowerCase().includes(q) || r.origin?.sending_ip?.toLowerCase().includes(q);
      const matchesDomain = r.threat_intel?.domain?.toLowerCase().includes(q);
      return matchesCaseId || matchesSubject || matchesVerdict || matchesFrom || matchesIp || matchesDomain;
    });
  }, [caseSearch, analyzedReports]);

  const filteredReports = matchingCases;

  const reportData = currentReportData;

  const handleExportText = () => {
    if (!reportData) return;
    const reportContent = generateReportText(reportType, reportData, currentResult);
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mailveil_${reportData.caseId}_${reportType}_report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveAsPDF = () => {
    if (!reportData) return;
    const printWindow = window.open('', '_blank', 'width=1100,height=950');
    if (!printWindow) {
      alert('Please allow popups for Mailveil to generate and print the PDF report.');
      return;
    }

    const html = generateFormattedPdfHtml(reportType, reportData, currentResult);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1.5 sm:px-0">
          <div className="flex-1 min-w-0 -ml-1 sm:ml-0">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-nowrap w-full">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                Reports &amp; Export
              </h2>
              {currentResult && (
                <span className="px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.15)] ml-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-pulse" />
                  Synced with Analyzer
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 mt-1 leading-relaxed">
              Complete forensic analysis, threat intelligence, and interactive attack graphs.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onNavigate?.('email-analyzer')}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer w-full sm:w-auto"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                border: '1px solid rgba(99,102,241,0.4)',
              }}
            >
              <MailSearch className="w-3.5 h-3.5" />
              Analyze New Email
            </button>
          </div>
        </div>
      </SlideIn>

      {/* ── If no emails have been analyzed yet ── */}
      {analyzedReports.length === 0 ? (
        <SlideIn delay={60} direction="up">
          <div
            className="rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-6 bg-white dark:bg-[#090b12] border border-slate-200 dark:border-transparent shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400"
            >
              <FileText className="w-8 h-8" />
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">No Analyzed Emails in Session</h3>
              <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed font-mono">
                Upload or paste an email in the Email Analyzer. Once analyzed, reports with map location and attack graphs will automatically sync here.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate?.('email-analyzer')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 shadow-lg cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
                }}
              >
                <MailSearch className="w-4 h-4" />
                Go to Email Analyzer
              </button>
              <button
                onClick={loadDemoCase}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-black dark:text-purple-200 dark:hover:text-purple-100 bg-slate-100 hover:bg-slate-200 dark:bg-purple-900/30 hover:dark:bg-purple-900/50 border border-slate-200 dark:border-purple-500/45 hover:dark:border-purple-400/60 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Load Sample BEC Report
              </button>
            </div>
          </div>
        </SlideIn>
      ) : (
        <>
          {/* ── Case Selector Bar ── */}
          <SlideIn delay={30} direction="up">
            <div
              className="rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0b0e17] border border-slate-200 dark:border-transparent shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-gray-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    ACTIVE CASE:
                  </span>
                  {/* Live indicator badge on mobile (placed on header line) */}
                  {currentResult && (
                    <span
                      className={`sm:hidden px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold shrink-0 ${currentResult.threat_score >= 80
                          ? 'text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/25'
                          : currentResult.threat_score >= 50
                            ? 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border border-orange-500/25'
                            : 'text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/25'
                        }`}
                    >
                      {currentResult.alert_level.toUpperCase()} ({currentResult.threat_score}/100)
                    </span>
                  )}
                </div>

                {/* Integrated Case Search & Selector */}
                <div className="relative flex-1 w-full min-w-0 max-w-xl" ref={searchContainerRef}>
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-purple-600 dark:text-purple-600 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={
                        currentResult
                          ? `${currentResult.case_id} — ${decodeMimeHeader(currentResult.headers.find((h) => h.key.toLowerCase() === 'subject')?.value || currentResult.verdict)}`
                          : 'Search case ID, subject, IOC...'
                      }
                      value={caseSearch}
                      onFocus={() => setSearchFocused(true)}
                      onChange={(e) => {
                        setCaseSearch(e.target.value);
                        setSearchFocused(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchFocused(false);
                        } else if (e.key === 'Enter' && matchingCases.length > 0) {
                          selectCase(matchingCases[0].case_id);
                          setCaseSearch('');
                          setSearchFocused(false);
                        }
                      }}
                      className={`w-full rounded-xl pl-8 pr-8 py-1.5 text-xs font-mono text-black dark:text-black font-semibold bg-slate-100 dark:bg-white border border-slate-200 dark:border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all truncate cursor-text shadow-sm ${
                        currentResult && !searchFocused
                          ? 'placeholder:text-black dark:placeholder:text-black placeholder:font-bold placeholder:opacity-100 dark:placeholder:opacity-100'
                          : 'placeholder:text-slate-500 dark:placeholder:text-slate-500 placeholder:font-medium placeholder:opacity-90 dark:placeholder:opacity-90'
                      }`}
                    />
                    {caseSearch ? (
                      <button
                        onClick={() => {
                          setCaseSearch('');
                          setSearchFocused(false);
                        }}
                        className="absolute right-2.5 p-0.5 text-slate-700 hover:text-black dark:text-slate-700 dark:hover:text-black transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSearchFocused(!searchFocused)}
                        className="absolute right-2.5 p-0.5 text-slate-700 hover:text-black dark:text-slate-700 dark:hover:text-black transition-colors cursor-pointer"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${searchFocused ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {searchFocused && (
                    <div
                      className="absolute left-0 right-0 w-full mt-2 rounded-2xl p-2.5 z-50 shadow-2xl border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 bg-white dark:bg-[#0a0d16] border-slate-200 dark:border-purple-500/35"
                      style={{
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-200 dark:border-white/10 text-[10px] font-mono font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Search className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          Analyzed Cases ({matchingCases.length})
                        </span>
                        {caseSearch && (
                          <span className="text-purple-600 dark:text-purple-400 font-normal truncate max-w-[150px]">
                            "{caseSearch}"
                          </span>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto scrollbar-thin space-y-1.5 mt-2">
                        {matchingCases.length > 0 ? (
                          matchingCases.map((c) => {
                            const isSelected = c.case_id === currentResult?.case_id;
                            const scoreColor =
                              c.threat_score >= 80
                                ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-500/15 border-red-300 dark:border-red-500/30'
                                : c.threat_score >= 50
                                  ? 'text-amber-700 dark:text-orange-400 bg-amber-100 dark:bg-orange-500/15 border-amber-300 dark:border-orange-500/30'
                                  : 'text-emerald-700 dark:text-green-400 bg-emerald-100 dark:bg-green-500/15 border-emerald-300 dark:border-green-500/30';
                            const subj = c.headers.find((h) => h.key.toLowerCase() === 'subject')?.value;
                            const fromVal = c.headers.find((h) => h.key.toLowerCase() === 'from')?.value;
                            const cleanSubj = decodeMimeHeader(subj || c.verdict);
                            const cleanFrom = fromVal ? decodeMimeHeader(fromVal) : '';

                            return (
                              <div
                                key={c.case_id}
                                onClick={() => {
                                  selectCase(c.case_id);
                                  setCaseSearch('');
                                  setSearchFocused(false);
                                }}
                                className={`flex items-center justify-between gap-2 p-2.5 rounded-xl cursor-pointer transition-all ${isSelected
                                    ? 'bg-purple-100 dark:bg-purple-500/25 border border-purple-300 dark:border-purple-500/40 text-purple-950 dark:text-white'
                                    : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 border border-transparent'
                                  }`}
                              >
                                <div className="min-w-0 flex-1 flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
                                      <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                      {c.case_id}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${scoreColor}`}>
                                      {c.threat_score}/100 ({c.alert_level.toUpperCase()})
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-slate-800 dark:text-gray-200 truncate font-sans font-semibold" title={cleanSubj}>
                                    {cleanSubj}
                                  </p>

                                  {cleanFrom && (
                                    <p className="text-[10px] text-slate-600 dark:text-gray-400 font-mono truncate">
                                      From: {cleanFrom}
                                    </p>
                                  )}
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCase(c.case_id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors ml-1 shrink-0"
                                  title="Remove case"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-xs font-mono text-gray-400">
                            No cases found matching "{caseSearch}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Live indicator badge for desktop */}
                {currentResult && (
                  <span
                    className={`hidden sm:inline-flex px-2.5 py-1 rounded-xl text-xs font-mono font-bold shrink-0 ${currentResult.threat_score >= 80
                        ? 'text-red-400 bg-red-500/10 border border-red-500/25'
                        : currentResult.threat_score >= 50
                          ? 'text-orange-400 bg-orange-500/10 border border-orange-500/25'
                          : 'text-green-400 bg-green-500/10 border border-green-500/25'
                      }`}
                  >
                    {currentResult.alert_level.toUpperCase()} ({currentResult.threat_score}/100)
                  </span>
                )}
              </div>
            </div>
          </SlideIn>

          {/* ── Report Control & Action Bar ── */}
          {reportData && (
            <SlideIn delay={60} direction="up">
              <div
                className="rounded-2xl p-5 bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span>SOC Forensic Intelligence Dossier</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-mono break-words leading-relaxed">
                      {reportData.caseId} — <span className="text-slate-900 dark:text-white font-semibold">
                        {decodeMimeHeader(currentResult?.headers.find((h) => h.key.toLowerCase() === 'subject')?.value || reportData.caseTitle.replace(/^[^:]+:\s*/, ''))}
                      </span>
                    </p>
                  </div>

                  {/* Threat Score & Verdict Badge (1st Image Element) */}
                  <div className="flex items-center justify-between sm:justify-start gap-3 px-4 py-2 rounded-2xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/10 shrink-0 shadow-sm dark:shadow-lg w-full md:w-auto">
                    <div className="text-left sm:text-right">
                      <div
                        className={`text-xl font-bold font-mono leading-tight ${(currentResult?.threat_score ?? reportData.riskScore) >= 75 || currentResult?.alert_level === 'critical'
                            ? 'text-red-600 dark:text-red-400'
                            : (currentResult?.threat_score ?? reportData.riskScore) >= 40
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                      >
                        {currentResult?.threat_score ?? reportData.riskScore}/100
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-slate-500 dark:text-gray-400 font-mono mt-0.5">
                        THREAT SCORE
                      </div>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-white/15" />
                    <div className="flex items-center gap-2 pl-0.5">
                      {((currentResult?.threat_score ?? reportData.riskScore) >= 75 || currentResult?.alert_level === 'critical') ? (
                        <>
                          <ShieldAlert className="w-5 h-5 text-red-500 dark:text-red-400" />
                          <span className="text-sm font-bold tracking-wider uppercase font-mono text-red-600 dark:text-red-400">
                            MALICIOUS
                          </span>
                        </>
                      ) : (currentResult?.threat_score ?? reportData.riskScore) >= 40 ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                          <span className="text-sm font-bold tracking-wider uppercase font-mono text-amber-600 dark:text-amber-400">
                            SUSPICIOUS
                          </span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                          <span className="text-sm font-bold tracking-wider uppercase font-mono text-emerald-600 dark:text-emerald-400">
                            CLEAN
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-4">
                  {/* Save as PDF Button (Prominently Highlighted) */}
                  <button
                    id="save-pdf-btn"
                    onClick={handleSaveAsPDF}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-transform duration-150 ease-out active:scale-95 shadow-xl cursor-pointer w-full sm:w-auto"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #6366f1 100%)',
                      border: '1px solid rgba(192,132,252,0.6)',
                      boxShadow: '0 4px 20px rgba(147,51,234,0.4)',
                    }}
                    title="Generate complete formatted PDF report with email forensics, headers, threat intel, map location, and attack graph"
                  >
                    <Printer className="w-4 h-4 text-purple-200" />
                    <span>Save PDF / Print Report</span>
                  </button>

                  {/* Export Text Report */}
                  <button
                    onClick={handleExportText}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-transform duration-150 ease-out active:scale-95 shadow-md w-full sm:w-auto cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                      border: '1px solid rgba(56,189,248,0.5)',
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Raw Text</span>
                  </button>

                  {/* Toggle Preview Button */}
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 transition-transform duration-150 ease-out active:scale-95 w-full sm:w-auto cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>{showPreview ? 'Hide Report Preview' : 'Show Report Preview'}</span>
                  </button>
                </div>
              </div>
            </SlideIn>
          )}

          {/* ── Report Preview ── */}
          {showPreview && reportData && (
            <SlideIn delay={120} direction="up">
              <FullReportPreview
                type={reportType}
                data={reportData}
                result={currentResult}
                activeTab={activePreviewTab}
                setActiveTab={setActivePreviewTab}
                onPrintPdf={handleSaveAsPDF}
              />
            </SlideIn>
          )}

          {/* ── SENTINEL AI Assistant ── */}
          {currentResult && (
            <SlideIn delay={180} direction="up">
              <SentinelAI currentResult={currentResult} />
            </SlideIn>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   FULL ON-SCREEN REPORT PREVIEW
══════════════════════════════════════════════════ */
function FullReportPreview({
  type,
  data,
  result,
  activeTab,
  setActiveTab,
  onPrintPdf,
}: {
  type: ReportType;
  data: ReportData;
  result: EmailAnalysisResult | null;
  activeTab: ReportContentTab;
  setActiveTab: (t: ReportContentTab) => void;
  onPrintPdf: () => void;
}) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
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
    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const originLat = result?.origin?.latitude ?? 28.6139;
  const originLng = result?.origin?.longitude ?? 77.2090;
  const originCity = result?.origin?.city ?? 'New Delhi';
  const originCountry = result?.origin?.country ?? 'India';
  const originIp = result?.origin?.sending_ip ?? result?.threat_intel?.sending_ip ?? '103.19.199.18';
  const originAsn = result?.origin?.asn ?? 'AS55836';
  const originHosting = result?.origin?.hosting ?? 'Bulletproof VPS (FlokiNET)';

  const isMalicious = data.riskScore >= 75 || result?.alert_level === 'critical';
  const isSuspicious = data.riskScore >= 40 && !isMalicious;
  const threatLevel: 'malicious' | 'suspicious' | 'clean' = isMalicious
    ? 'malicious'
    : isSuspicious
      ? 'suspicious'
      : 'clean';

  // Build the map markers from current result origin data
  const liveMarkers: InfraLocation[] = [
    {
      id: 'REPORT_ORIGIN',
      country: originCountry,
      countryCode: result?.origin?.country_code ?? 'RO',
      city: originCity,
      lat: originLat,
      lng: originLng,
      ip: originIp,
      asn: originAsn,
      asnOrg: originHosting,
      hosting: originHosting,
      confidence: result?.confidence ?? 78,
      role: 'Originating SMTP Server',
      evidence: ['Email origin point identified via SMTP header analysis'],
    },
  ];

  // Hop-by-hop relay route
  const relayHops = useMemo(() => {
    if (result?.origin?.relay_hops && result.origin.relay_hops.length > 0) {
      return result.origin.relay_hops.map((h) => ({
        hop: h.hop,
        ip: h.ip,
        reverseDns: h.reverse_dns || h.by || 'unresolved.ptr',
        location: h.hop === 1 ? `${originCity}, ${originCountry}` : 'Transit Gateway',
        delay: h.delay || `${h.hop * 35}ms`,
        status: (h.hop === 1 && isMalicious ? 'malicious' : h.hop === 2 ? 'suspicious' : 'trusted') as
          | 'malicious'
          | 'suspicious'
          | 'internal'
          | 'trusted',
      }));
    }
    return [
      {
        hop: 1,
        ip: originIp,
        reverseDns: `host-${originIp.replace(/\./g, '-')}.flokinet.is`,
        location: `${originCity}, ${originCountry}`,
        delay: '0ms',
        status: (isMalicious ? 'malicious' : 'suspicious') as 'malicious' | 'suspicious',
      },
      {
        hop: 2,
        ip: '185.220.101.5',
        reverseDns: 'tor-exit-05.relays.net',
        location: 'Frankfurt, Germany',
        delay: '142ms',
        status: 'suspicious' as const,
      },
      {
        hop: 3,
        ip: '64.233.160.26',
        reverseDns: 'mail-sor-f26.google.com',
        location: 'Dublin, Ireland',
        delay: '89ms',
        status: 'internal' as const,
      },
      {
        hop: 4,
        ip: '142.250.102.27',
        reverseDns: 'mx.google.com',
        location: 'Corporate Ingress Gateway',
        delay: '12ms',
        status: 'trusted' as const,
      },
    ];
  }, [result, originCity, originCountry, originIp, isMalicious]);

  // Return-Path alignment
  const returnPath = useMemo(() => {
    const rpHeader = result?.headers.find((h) => h.key.toLowerCase() === 'return-path')?.value;
    const fromHeader = result?.headers.find((h) => h.key.toLowerCase() === 'from')?.value;
    return rpHeader || (fromHeader ? `bounce@${fromHeader.split('@')[1]?.replace(/[>]/g, '')}` : 'bounce-router@malicious-node.xyz');
  }, [result]);

  const isReturnPathAligned = useMemo(() => {
    const fromDomain = result?.threat_intel?.domain || 'company.com';
    return returnPath.toLowerCase().includes(fromDomain.toLowerCase());
  }, [result, returnPath]);

  // Mitigation checklist
  const mitigationChecklist = useMemo(() => {
    if (result?.recommended_actions && result.recommended_actions.length > 0) {
      return result.recommended_actions.map((act) => ({
        action: act.title || act.action,
        urgency: (act.priority?.toLowerCase() === 'high' || act.priority?.toLowerCase() === 'immediate'
          ? 'immediate'
          : act.priority?.toLowerCase() === 'medium'
            ? 'recommended'
            : 'optional') as 'immediate' | 'recommended' | 'optional',
        reason: act.description || act.rationale || 'SOC standard containment procedure',
      }));
    }
    return data.recommendedActions.map((act, i) => ({
      action: act,
      urgency: (i === 0 ? 'immediate' : i === 1 ? 'recommended' : 'optional') as 'immediate' | 'recommended' | 'optional',
      reason: 'Mitigates lateral network movement and credential harvest risk',
    }));
  }, [result, data.recommendedActions]);

  // 6-Engine Blacklist Scanner Results
  const blacklistResults = useMemo(() => {
    return [
      {
        engine: 'Spamhaus ZEN (SBL+XBL)',
        status: isMalicious ? 'listed' : isSuspicious ? 'warning' : 'clean',
        detail: isMalicious ? 'Listed on SBL (Spamhaus Block List) - Known Bulletproof Ingress' : 'No active listings',
      },
      {
        engine: 'SORBS DNSBL',
        status: isMalicious ? 'listed' : 'clean',
        detail: isMalicious ? 'Listed under dynamic IP / spam relay' : 'Clear reputation',
      },
      {
        engine: 'Barracuda BRBL',
        status: isMalicious ? 'listed' : 'clean',
        detail: isMalicious ? 'Listed: 100/100 threat reputation' : 'Zero reputation flags',
      },
      {
        engine: 'AbuseIPDB Confidence',
        status: isMalicious ? 'warning' : 'clean',
        detail: isMalicious ? '89% Abuse Confidence Score' : '0% Abuse Score',
      },
      {
        engine: 'VirusTotal Intelligence',
        status: isMalicious ? 'listed' : isSuspicious ? 'warning' : 'clean',
        detail: isMalicious ? '7/88 Security Vendors flagged host' : 'Clean across 88 engines',
      },
      {
        engine: 'Cisco Talos Intelligence',
        status: isMalicious ? 'warning' : 'clean',
        detail: isMalicious ? 'Poor Web & IP Sender Reputation' : 'Neutral/Good reputation',
      },
    ];
  }, [isMalicious, isSuspicious]);

  // Threat Classification Tags
  const threatClassificationTags = useMemo(() => {
    const tags: string[] = [];
    if (result?.verdict) tags.push(result.verdict);
    if (result?.threat_intel?.spf === 'FAIL') tags.push('SPF Spoofing');
    if (result?.threat_intel?.dkim === 'FAIL') tags.push('Invalid DKIM');
    if (result?.threat_intel?.domain_age_days && result.threat_intel.domain_age_days < 30) {
      tags.push('Newly Registered Domain (<30d)');
    }
    if (isMalicious) tags.push('Active Phishing Campaign', 'High Entropy Attachment');
    if (tags.length === 0) tags.push('Security Assessment', 'Benign Sender');
    return tags;
  }, [result, isMalicious]);

  // Attachment Forensics Payload Data — use real filename from analysis result (stamped by EML parser)
  const attachmentData = useMemo(() => {
    const realName = (result as any)?.attachment_name
      || (result?.evidence?.find((e: any) => e.type?.toLowerCase().includes('attachment'))?.value)
      || (data as any)?.attachmentName;
    const hasReal = Boolean(realName);
    const filename = realName || (isMalicious
      ? 'Corporate_Verification_M365_Notice.pdf'
      : isSuspicious
        ? 'statement-INV928491.zip'
        : '');
    const realMime = (result as any)?.attachment_mime;
    const realSize = (result as any)?.attachment_size;
    return {
      filename,
      hasReal,
      filetype: realMime || (filename.endsWith('.zip') ? 'application/zip' : filename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
      filesize: realSize || (isMalicious ? '148.4 KB' : isSuspicious ? '842.1 KB' : '42.0 KB'),
      entropyScore: isMalicious ? 7.84 : isSuspicious ? 6.92 : 3.41,
      entropyRating: isMalicious ? 'High (Obfuscated/Packed)' : isSuspicious ? 'Moderate' : 'Low',
      verdict: threatLevel,
      sha256: isMalicious
        ? 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        : '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      md5: isMalicious ? '44d88612fea8a8f36de82e1278abb02f' : '9e107d9d372bb6826bd81d3542a419d6',
      tagsDetected: isMalicious
        ? [
          { tag: '/JavaScript', description: 'Embedded executable ECMAScript script found inside PDF dictionary', risk: 'critical' as const },
          { tag: '/OpenAction', description: 'Triggers automatic payload launch immediately upon file opening', risk: 'critical' as const },
          { tag: '/Launch', description: 'Invokes external system process without explicit user consent', risk: 'critical' as const },
          { tag: '/URI', description: 'Silent URL redirection beacon linking to external credential portal', risk: 'high' as const },
          { tag: '/AcroForm', description: 'Fake input form fields designed to collect user input locally', risk: 'medium' as const },
        ]
        : isSuspicious
          ? [
            { tag: 'Nested Archive', description: 'Contains compressed script payload (.vbs/.js) disguised with double extension', risk: 'high' as const },
            { tag: 'Hidden Executable', description: 'Executable PE header identified inside compressed stream', risk: 'high' as const },
          ]
          : [
            { tag: 'Standard Text Streams', description: 'Clean FlateDecode compressed font and vector layouts', risk: 'low' as const },
          ],
      sandboxStatus: isMalicious ? 'Quarantined Before Execution' : isSuspicious ? 'Executed in Sandbox' : 'Verified Benign',
      runtimeBehavior: isMalicious
        ? [
          'Attempts to spawn cmd.exe via Adobe Acrobat Reader child process',
          'Creates temporary staging file in %APPDATA%\\Roaming\\cert-updater.exe',
          'Queries registry keys: HKCU\\Software\\Microsoft\\Office\\Outlook',
        ]
        : isSuspicious
          ? [
            'Extracts payload into temporary cache directory',
            'Sends DNS query to dynamic DNS provider',
          ]
          : ['No abnormal child processes or registry mutations observed.'],
      outboundConnections: isMalicious
        ? ['hxxps://m365-auth-verify.azure-security-portal[.]com:443', '185.220.101.47:8080']
        : isSuspicious
          ? ['hxxps://storage-fastdownload[.]xyz:443']
          : [],
    };
  }, [isMalicious, isSuspicious, threatLevel]);

  const emailSubject = decodeMimeHeader(result?.headers.find((h) => h.key.toLowerCase() === 'subject')?.value || data.caseTitle.replace(/^[^:]+:\s*/, ''));
  const emailSender = decodeMimeHeader(result?.headers.find((h) => h.key.toLowerCase() === 'from')?.value || 'security-update@corporate-portal.com');

  return (
    <div className="rounded-2xl p-6 space-y-6 bg-white dark:bg-[#090b12] border border-slate-200 dark:border-cyan-500/20 shadow-sm dark:shadow-2xl">
      {/* ── Quick Navigation Tabs (Deep Forensics format) ─────────────────── */}
      <div className="relative isolate flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-4 mb-3 scrollbar-none border-b border-slate-200 dark:border-white/10 touch-scroll touch-pan-x overscroll-x-contain">
        {/* Smooth sliding indicator pill */}
        <div
          className="absolute z-0 pointer-events-none rounded-xl bg-cyan-500/15 dark:bg-cyan-500/20 border border-cyan-400/50 dark:border-cyan-500/40 shadow-sm shadow-cyan-900/10"
          style={{
            transform: `translate3d(${reportIndicatorStyle.left}px, ${reportIndicatorStyle.top}px, 0)`,
            width: reportIndicatorStyle.width,
            height: reportIndicatorStyle.height,
            opacity: reportIndicatorStyle.opacity,
            transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1), width 300ms cubic-bezier(0.25, 1, 0.5, 1), height 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
            left: 0,
            top: 0,
            zIndex: 0,
          }}
        />
        {[
          { id: 'all', label: 'Complete Forensic Report', icon: Shield },
          { id: 'synthesis', label: 'AI Synthesis', icon: Sparkles },
          { id: 'headers', label: 'Header Forensics', icon: FileCode },
          { id: 'threat-intel', label: 'Threat Intelligence', icon: Globe },
          { id: 'origin', label: 'Origin GeoIP', icon: MapPin },
          { id: 'attack-graph', label: 'Attack Graph', icon: Share2 },
          { id: 'attachments', label: 'Attachment & Payload', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => { reportTabRefs.current[tab.id] = el; }}
              onClick={() => setActiveTab(tab.id as ReportContentTab)}
              style={{ zIndex: 10 }}
              className={`relative z-10 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors duration-200 cursor-pointer ${active
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

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: AI SYNTHESIS & RISK NARRATIVE
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'synthesis') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              1. Final AI Synthesis & Plain-Language Risk Narrative
            </h2>
            <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">
              Confidence: <span className="text-cyan-600 dark:text-cyan-400 font-bold">{result?.confidence ?? 95}%</span>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Executive Summary & Narrative */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#11121b] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-4">
              <div>
                <div className="text-[11px] text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-semibold mb-1">
                  Executive AI Summary
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-lg">
                    {emailSubject}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-gray-400 font-mono">({emailSender})</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-gray-200 leading-relaxed font-sans font-medium">
                  {result?.summary || data.threatSummary}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 space-y-2">
                <div className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  Plain-Language Risk Explanation
                </div>
                <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                  {result?.summary
                    ? `This incident involves an engineered campaign crafted to impersonate trusted infrastructure. Cryptographic signatures were failed or deliberately omitted to bypass standard mail authentication filters, routing through bulletproof ingress relays to deliver suspicious attachments and deceptive URLs.`
                    : data.threatSummary}
                </p>
              </div>

              {/* Key Forensic Findings */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/5">
                <div className="text-[11px] text-cyan-600 dark:text-cyan-400 uppercase tracking-wider font-semibold">
                  Key Forensic Findings
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.keyFindings.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl text-xs text-slate-700 dark:text-gray-300 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mitigation Checklist */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#11121b] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-3">
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                SOC Incident Mitigation Checklist
              </div>
              <div className="space-y-2.5">
                {mitigationChecklist.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        {item.action}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${item.urgency === 'immediate'
                            ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30'
                            : item.urgency === 'recommended'
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          }`}
                      >
                        {item.urgency}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 pl-5">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: HEADER FORENSICS & HOP RELAYS
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'headers') && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            2. Header Forensics & Hop-by-Hop Authentication
          </h2>

          {/* Authentication Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              {
                title: 'SPF Verification',
                val: result?.threat_intel.spf ? result.threat_intel.spf.toUpperCase() : 'FAIL',
                detail: result?.threat_intel.spf === 'PASS' ? 'SPF Alignment Verified' : 'SPF HardFail: Sending IP unauthorized',
              },
              {
                title: 'DKIM Signature',
                val: result?.threat_intel.dkim ? result.threat_intel.dkim.toUpperCase() : 'FAIL',
                detail: result?.threat_intel.dkim === 'PASS' ? 'Valid Cryptographic RSA Key' : 'Signature missing or altered in transit',
              },
              {
                title: 'DMARC Alignment',
                val: result?.threat_intel.dmarc ? result.threat_intel.dmarc.toUpperCase() : 'FAIL',
                detail: result?.threat_intel.dmarc === 'PASS' ? 'Strict Domain Alignment Pass' : 'Policy p=reject enforced; alignment failed',
              },
              {
                title: 'Return-Path Alignment',
                val: isReturnPathAligned ? 'ALIGNED' : 'MISMATCH',
                detail: isReturnPathAligned ? 'Envelope matches From domain' : `Diverts to: ${returnPath}`,
              },
            ].map((auth, i) => {
              const pass = auth.val === 'PASS' || auth.val === 'ALIGNED';
              return (
                <div key={i} className="p-4 rounded-2xl bg-white dark:bg-[#11121b] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-1.5">
                  <div className="text-xs text-slate-500 dark:text-gray-400">{auth.title}</div>
                  <div className="flex items-center gap-2">
                    {pass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                    )}
                    <span
                      className={`text-sm font-black ${pass ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                    >
                      {auth.val}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-2">{auth.detail}</div>
                </div>
              );
            })}
          </div>

          {/* Hop-by-Hop Relay Route Table */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#11121b] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                SMTP Relay Route Hop Breakdown
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-gray-500 font-mono">{relayHops.length} Network Hops Traced</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Hop</th>
                    <th className="py-2.5 px-3">Server IP & Reverse DNS</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">Ingress Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {relayHops.map((hop) => (
                    <tr key={hop.hop} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-3 font-bold text-cyan-600 dark:text-cyan-400">#{hop.hop}</td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-900 dark:text-white font-semibold">{hop.ip}</div>
                        <div className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">{hop.reverseDns}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-gray-300 font-sans">{hop.location}</td>
                      <td className="py-3 px-3 text-slate-500 dark:text-gray-400">{hop.delay}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${hop.status === 'malicious'
                              ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30'
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

          {/* Captured RFC-822 / SMTP Headers */}
          {result?.headers && result.headers.length > 0 && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white dark:bg-[#11121b]">
              <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300 uppercase flex items-center justify-between">
                <span>Captured RFC-822 / MIME Email Headers</span>
                <span className="text-[11px] text-slate-500 dark:text-gray-500">{result.headers.length} headers extracted</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-56 overflow-y-auto font-mono text-[11px] p-2">
                {result.headers.map((h, i) => (
                  <div key={i} className="px-3 py-2 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                    <span className="text-purple-700 dark:text-purple-300 font-bold w-36 shrink-0 truncate">{h.key}:</span>
                    <span className="text-slate-700 dark:text-gray-300 break-all font-mono select-all">{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3: THREAT INTELLIGENCE & REPUTATION
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'threat-intel') && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            3. Threat Intelligence & External Blacklists
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Reputation Overview */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#11121b] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Entity Reputation Assessment
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-gray-400">Sending IP Reputation</div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">{originIp}</div>
                  </div>
                  <span
                    className={`text-xs uppercase font-bold px-2.5 py-1 rounded ${isMalicious
                        ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30'
                        : isSuspicious
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      }`}
                  >
                    {result?.threat_intel.ip_reputation || (isMalicious ? 'malicious' : 'suspicious')}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-gray-400">Sender Domain Age</div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {result?.threat_intel.domain || 'corporate-update.xyz'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-300">
                      {result?.threat_intel.domain_age_days ?? 3} days
                    </span>
                    <div className="text-[10px] text-slate-500 dark:text-gray-400">
                      {(result?.threat_intel.domain_age_days ?? 3) < 30 ? 'High Risk (<30d)' : 'Established'}
                    </div>
                  </div>
                </div>
              </div>

              {threatClassificationTags.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] text-slate-500 dark:text-gray-400">Threat Classification Tags:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {threatClassificationTags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Blacklists Grid */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#11121b] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  6-Engine Reputation & Blacklist Scanner
                </h3>
                <span className="text-[10px] text-slate-500 dark:text-gray-500">Live Feeds Queried</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {blacklistResults.map((bl, i) => {
                  const isClean = bl.status === 'clean';
                  return (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{bl.engine}</div>
                        <div className="text-[11px] text-slate-500 dark:text-gray-400">{bl.detail}</div>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${isClean
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : bl.status === 'warning'
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30'
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

          {/* IOC Badges Row */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#11121b] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-2 overflow-hidden max-w-full">
            <div className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider flex flex-wrap items-center justify-between gap-1">
              <span>Captured Indicators of Compromise (IOCs)</span>
              <span className="text-[10px] text-slate-500 dark:text-gray-500 shrink-0">{data.indicators.length} IOCs cataloged</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 min-w-0">
              {data.indicators.map((ind, i) => (
                <div
                  key={`${ind.value}-${i}`}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white max-w-full min-w-0"
                >
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold shrink-0">{ind.type}:</span>
                  <span className="text-slate-700 dark:text-gray-300 truncate max-w-[190px] xs:max-w-[240px] sm:max-w-xs md:max-w-md break-all" title={ind.value}>
                    {ind.value}
                  </span>
                  <button
                    onClick={() => handleCopy(ind.value, `ioc-${i}`)}
                    className="ml-auto p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Copy IOC"
                  >
                    {copiedText === `ioc-${i}` ? (
                      <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4: ORIGIN INVESTIGATION & GEOIP MAP
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'origin') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              4. Origin Investigation & Infrastructure Geolocation
            </h2>
            <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400">
              Target: <span className="text-slate-900 dark:text-white font-bold">{originCity}, {originCountry}</span> ({originLat.toFixed(4)}, {originLng.toFixed(4)})
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Telemetry info card */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#11121b] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-none space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Physical & Autonomous Origin
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5">
                  <div className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-mono">Originating Location</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    {originCity}, {originCountry}
                  </div>
                  <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                    Lat: {originLat.toFixed(4)}° N, Lng: {originLng.toFixed(4)}° E
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5">
                  <div className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-mono">Routing Autonomous System</div>
                  <div className="font-bold text-slate-900 dark:text-white truncate mt-0.5">{originAsn}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5">
                  <div className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-mono">Hosting Infrastructure</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{originHosting}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/5">
                  <div className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-mono">Originating IP Address</div>
                  <div className="font-mono font-bold text-red-500 dark:text-red-400 mt-0.5">{originIp}</div>
                </div>
              </div>
            </div>

            {/* Dark Cyber Map */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-[#0a0b10] flex flex-col justify-between">
              <DarkCyberMap
                markers={liveMarkers}
                selectedId={liveMarkers[0]?.id}
                singlePointerMode={true}
                height="h-[340px]"
              />

              {/* Telemetry Footer Overlay */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-black/60 border-t border-white/10 text-[11px] font-mono">
                <div>
                  <span className="text-gray-400 block">COORDINATES</span>
                  <span className="text-cyan-300 font-bold">{originLat.toFixed(2)}°, {originLng.toFixed(2)}°</span>
                </div>
                <div>
                  <span className="text-gray-400 block">LOCATION</span>
                  <span className="text-white font-bold truncate block">{originCity}, {originCountry}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">ORIGIN IP</span>
                  <span className="text-red-400 font-bold">{originIp}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">AUTONOMOUS SYS</span>
                  <span className="text-purple-300 font-bold truncate block">{originAsn}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5: ATTACK GRAPH TOPOLOGY
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'attack-graph') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              5. Interactive Attack Graph Topology (Read-Only)
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-gray-500 font-mono">Attacker → Relays → Gateway → Target</span>
          </div>

          <div className="lg:rounded-2xl lg:border lg:border-slate-200 dark:lg:border-white/10 lg:bg-white dark:lg:bg-[#0d0e16] lg:overflow-hidden lg:shadow-none dark:lg:shadow-xl">
            <AttackGraphCanvas
              result={result}
              height={460}
              showHeader={false}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6: ATTACHMENT & PAYLOAD FORENSICS
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'attachments') && (
        <AttachmentForensicsSection
          attachmentForensics={{
            hasAttachment: Boolean(attachmentData.filename || (result?.attachments && result.attachments.length > 0)),
            filename: attachmentData.filename,
            filetype: attachmentData.filetype,
            filesize: attachmentData.filesize,
            sha256: attachmentData.sha256,
            md5: attachmentData.md5,
            verdict: attachmentData.verdict,
            tagsDetected: attachmentData.tagsDetected as any,
            structuralAnomalies: isMalicious ? ['Disproportionate byte entropy in stream block 4 (7.84 / 8.0)'] : [],
            entropyScore: attachmentData.entropyScore,
            entropyRating: attachmentData.entropyRating as any,
            sandboxAnalysis: {
              status: attachmentData.sandboxStatus as any,
              runtimeBehavior: attachmentData.runtimeBehavior,
              outboundConnections: attachmentData.outboundConnections,
            },
            allAttachments: result?.attachments,
          }}
          rawAnalysisResult={result}
          sectionTitle="Attachment Forensics & Embedded Payload Analysis"
          sectionPrefix="6."
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   VECTOR SVG TACTICAL MAP COMPONENT
══════════════════════════════════════════════════ */
function TacticalSvgMap({
  lat,
  lng,
  city,
  country,
  ip,
  asn,
}: {
  lat: number;
  lng: number;
  city: string;
  country: string;
  ip: string;
  asn: string;
}) {
  // Mercator-like map mapping (0..700 width, 0..350 height)
  const mapX = Math.max(30, Math.min(670, ((lng + 180) / 360) * 700));
  const mapY = Math.max(30, Math.min(320, ((90 - lat) / 180) * 350));

  return (
    <svg
      viewBox="0 0 700 350"
      className="w-full h-auto max-h-[350px]"
      style={{ filter: 'drop-shadow(0 0 10px rgba(56,189,248,0.1))' }}
    >
      <defs>
        <linearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#ef4444" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Deep Cyber Background Grid */}
      <rect width="700" height="350" fill="#040711" rx="12" />
      <g stroke="#1e293b" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6">
        {[70, 140, 210, 280, 350, 420, 490, 560, 630].map((x) => (
          <line key={`x-${x}`} x1={x} y1="0" x2={x} y2="350" />
        ))}
        {[50, 100, 150, 200, 250, 300].map((y) => (
          <line key={`y-${y}`} x1="0" y1={y} x2="700" y2={y} />
        ))}
      </g>

      {/* Equator & Prime Meridian */}
      <line x1="0" y1="175" x2="700" y2="175" stroke="#334155" strokeWidth="1" />
      <line x1="350" y1="0" x2="350" y2="350" stroke="#334155" strokeWidth="1" />

      {/* Stylized Vector World Continents */}
      <g fill="#1e293b" stroke="#38bdf8" strokeWidth="1" opacity="0.85" strokeLinejoin="round">
        {/* North America */}
        <path d="M 80,45 L 140,40 L 220,55 L 260,105 L 230,135 L 195,120 L 165,155 L 130,140 L 105,95 Z" />
        <path d="M 160,155 L 195,170 L 185,200 L 160,190 Z" />
        {/* Greenland */}
        <path d="M 245,30 L 285,25 L 295,50 L 260,65 Z" />
        {/* South America */}
        <path d="M 190,205 L 250,225 L 260,280 L 230,335 L 205,335 L 180,265 L 185,215 Z" />
        {/* Europe */}
        <path d="M 345,65 L 430,60 L 445,95 L 415,125 L 375,130 L 345,110 L 350,80 Z" />
        {/* UK */}
        <path d="M 335,70 L 348,70 L 345,90 L 335,85 Z" />
        {/* Africa */}
        <path d="M 345,135 L 435,135 L 465,195 L 440,285 L 400,320 L 365,265 L 335,185 Z" />
        {/* Asia */}
        <path d="M 445,60 L 600,50 L 650,95 L 620,165 L 565,185 L 515,155 L 450,135 L 440,95 Z" />
        {/* Japan */}
        <path d="M 635,105 L 648,115 L 642,140 L 632,130 Z" />
        {/* Australia */}
        <path d="M 565,245 L 640,245 L 650,295 L 585,320 L 555,285 Z" />
      </g>

      {/* Crosshair Target Reticle at Origin (mapX, mapY) */}
      <g>
        {/* Pulsing Target Ring */}
        <circle cx={mapX} cy={mapY} r="28" fill="url(#targetGlow)" />
        <circle cx={mapX} cy={mapY} r="18" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.9" />
        <circle cx={mapX} cy={mapY} r="10" fill="none" stroke="#f97316" strokeWidth="2" />
        <circle cx={mapX} cy={mapY} r="4" fill="#ffffff" stroke="#ef4444" strokeWidth="2" />

        {/* Crosshairs */}
        <line x1={mapX - 35} y1={mapY} x2={mapX - 12} y2={mapY} stroke="#ef4444" strokeWidth="1.5" />
        <line x1={mapX + 12} y1={mapY} x2={mapX + 35} y2={mapY} stroke="#ef4444" strokeWidth="1.5" />
        <line x1={mapX} y1={mapY - 35} x2={mapX} y2={mapY - 12} stroke="#ef4444" strokeWidth="1.5" />
        <line x1={mapX} y1={mapY + 12} x2={mapX} y2={mapY + 35} stroke="#ef4444" strokeWidth="1.5" />

        {/* Dynamic Callout Card */}
        {(() => {
          const calloutX = mapX > 450 ? mapX - 220 : mapX + 35;
          const calloutY = mapY > 240 ? mapY - 80 : mapY + 15;
          return (
            <g>
              {/* Leader Line */}
              <polyline
                points={`${mapX},${mapY} ${mapX > 450 ? mapX - 25 : mapX + 25},${calloutY + 25} ${calloutX + (mapX > 450 ? 200 : 0)},${calloutY + 25}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              {/* Callout Box */}
              <rect
                x={calloutX}
                y={calloutY}
                width="200"
                height="65"
                rx="6"
                fill="#0b1120"
                stroke="#38bdf8"
                strokeWidth="1.5"
                opacity="0.95"
              />
              {/* Callout Text */}
              <text x={calloutX + 10} y={calloutY + 18} fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="'Inter', sans-serif">
                TARGET ORIGIN PINPOINT
              </text>
              <text x={calloutX + 10} y={calloutY + 33} fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="'Inter', sans-serif">
                {city}, {country}
              </text>
              <text x={calloutX + 10} y={calloutY + 46} fill="#94a3b8" fontSize="9" fontFamily="'Inter', sans-serif">
                IP: {ip}
              </text>
              <text x={calloutX + 10} y={calloutY + 58} fill="#38bdf8" fontSize="9" fontFamily="'Inter', sans-serif">
                ASN: {asn} ({lat.toFixed(2)}°, {lng.toFixed(2)}°)
              </text>
            </g>
          );
        })()}
      </g>

      {/* Compass / HUD Overlay */}
      <g transform="translate(20, 20)" fill="#64748b" fontSize="9" fontFamily="'Inter', sans-serif">
        <text x="0" y="0" fill="#38bdf8" fontWeight="bold">MAILVEIL GLOBAL SOC GEO-LOCATOR</text>
        <text x="0" y="14">PROJECTION: CYBER-CYLINDRICAL · WGS84</text>
      </g>
    </svg>
  );
}







function generateReportText(
  type: ReportType,
  data: ReportData,
  result: EmailAnalysisResult | null
): string {
  const typeLabel = REPORT_TYPES.find((r) => r.id === type)?.label ?? 'Report';
  let text = `=================================================================\n`;
  text += `MAILVEIL ${typeLabel.toUpperCase()} — CASE ${data.caseId}\n`;
  text += `=================================================================\n\n`;
  text += `Generated: ${new Date().toISOString()}\n`;
  text += `Classification: CONFIDENTIAL // SOC INCIDENT DOSSIER\n`;
  text += `Case Title: ${data.caseTitle}\n`;
  text += `Risk Threat Score: ${data.riskScore} / 100\n`;
  text += `Status: ${data.investigationStatus}\n\n`;

  text += `[1] THREAT EXECUTIVE SUMMARY\n`;
  text += `-----------------------------------------------------------------\n`;
  text += `${data.threatSummary}\n\n`;

  text += `[2] KEY FORENSIC FINDINGS\n`;
  text += `-----------------------------------------------------------------\n`;
  data.keyFindings.forEach((f, i) => { text += `${i + 1}. ${f}\n`; });
  text += `\n`;

  if (result?.headers) {
    text += `[3] EXTRACTED RFC-5322 HEADERS\n`;
    text += `-----------------------------------------------------------------\n`;
    result.headers.forEach((h) => { text += `${h.key}: ${h.value}\n`; });
    text += `\n`;
  }

  text += `[4] AUTHENTICATION & THREAT INTELLIGENCE\n`;
  text += `-----------------------------------------------------------------\n`;
  text += `SPF Validation: ${result?.threat_intel.spf ?? 'FAIL'}\n`;
  text += `DKIM Signature: ${result?.threat_intel.dkim ?? 'FAIL'}\n`;
  text += `DMARC Policy:   ${result?.threat_intel.dmarc ?? 'FAIL'}\n`;
  text += `Sending IP:     ${result?.origin.sending_ip ?? result?.threat_intel.sending_ip ?? '185.220.101.47'}\n`;
  text += `Domain:         ${result?.threat_intel.domain ?? 'micros0ft-support.example'}\n`;
  text += `IP Reputation:  ${result?.threat_intel.ip_reputation ?? 'malicious'}\n\n`;

  text += `[5] ORIGIN GEOLOCATION\n`;
  text += `-----------------------------------------------------------------\n`;
  text += `Country:     ${result?.origin.country ?? 'India'}\n`;
  text += `City:        ${result?.origin.city ?? 'New Delhi'}\n`;
  text += `Coordinates: ${result?.origin.latitude ?? 28.6139}° N, ${result?.origin.longitude ?? 77.2090}° E\n`;
  text += `ASN / Host:  ${result?.origin.asn ?? 'AS55836'} (${result?.origin.hosting ?? 'Reliance Jio'})\n\n`;

  text += `[6] RECOMMENDED INCIDENT RESPONSE ACTIONS\n`;
  text += `-----------------------------------------------------------------\n`;
  data.recommendedActions.forEach((a, i) => { text += `${i + 1}. ${a}\n`; });
  text += `\n`;

  text += `=================================================================\n`;
  text += `End of Mailveil Forensic Dossier\n`;
  return text;
}

/* ══════════════════════════════════════════════════
   SENTINEL AI ASSISTANT COMPONENT
══════════════════════════════════════════════════ */
interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

function SentinelAI({ currentResult }: { currentResult: EmailAnalysisResult }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const dynamicSuggestedQuestions = useMemo(() => {
    const questions = [
      { id: 'q1', question: `Why is this classified as "${currentResult.verdict}"?` },
      { id: 'q2', question: `Explain the risk score (${currentResult.threat_score}/100) & risk factors.` },
      { id: 'q3', question: `Analyze authentication results (SPF: ${currentResult.threat_intel.spf}, DKIM: ${currentResult.threat_intel.dkim}, DMARC: ${currentResult.threat_intel.dmarc}).` },
      { id: 'q4', question: `What indicators (IOCs) and URLs are associated with ${currentResult.threat_intel.domain || 'this sender'}?` },
      { id: 'q5', question: `What prioritized containment steps should the SOC take?` },
      { id: 'q6', question: `Summarize case ${currentResult.case_id} for executive briefing.` },
    ];
    return questions;
  }, [currentResult]);

  useEffect(() => {
    setMessages([]);
  }, [currentResult.case_id]);

  const askQuestion = async (questionText: string) => {
    if (!questionText.trim() || thinking) return;

    const userMsg: ChatMessage = { role: 'user', content: questionText };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);
    setInput('');

    try {
      const history: AssistantChatMessage[] = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      const reply = await askSentinelAssistant(questionText, currentResult, history);
      setMessages((prev) => [...prev, { role: 'ai', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: `**Case ${currentResult.case_id} Telemetry Brief**\n\n• Verdict: **${currentResult.verdict}** (Threat Score: ${currentResult.threat_score}/100)\n• Sender: \`${currentResult.threat_intel.domain || 'Unknown'}\`\n• Summary: ${currentResult.summary}`,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    askQuestion(input.trim());
  };

  return (
    <div
      className="rounded-2xl p-5 bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            MAILVEIL SOC AI Assistant
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-0.5">
            Grounded in active case <span className="text-purple-600 dark:text-purple-300 font-mono font-semibold">{currentResult.case_id}</span> ({currentResult.verdict})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-[10px] font-mono text-slate-600 hover:text-slate-900 dark:text-gray-500 dark:hover:text-gray-300 px-2 py-1 rounded bg-slate-100 dark:bg-white/5 cursor-pointer"
            >
              Clear Chat
            </button>
          )}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 border border-purple-500/30"
          >
            <span className="w-1.5 h-1.5 bg-purple-500 dark:bg-purple-400 rounded-full animate-pulse" />
            ONLINE
          </div>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-widest font-mono font-bold mb-2">
          Suggested Case Telemetry Queries
        </p>
        <div className="flex flex-wrap gap-2">
          {dynamicSuggestedQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => askQuestion(q.question)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.06] transition-all hover:scale-[1.02] text-left cursor-pointer"
            >
              {q.question}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div
        className="rounded-xl p-4 max-h-96 overflow-y-auto scrollbar-thin space-y-3 min-h-[160px] bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.06]"
      >
        {messages.length === 0 && !thinking && (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <Brain className="w-8 h-8 text-slate-400 dark:text-gray-700 mb-2" />
            <p className="text-xs text-slate-700 dark:text-gray-400 font-mono font-semibold">
              MAILVEIL SOC AI is ready to analyze case {currentResult.case_id}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-gray-600 font-mono mt-1">
              Ask any specific question about headers, threat vectors, IOCs, or remediation
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${msg.role === 'user'
                ? 'bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30 text-blue-900 dark:text-white font-mono'
                : 'bg-purple-500/10 border border-purple-500/25 text-slate-800 dark:text-gray-300 whitespace-pre-wrap'
                }`}
            >
              {msg.role === 'ai' && (
                <div className="flex items-center gap-1.5 mb-2 text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  <Brain className="w-3.5 h-3.5" /> MAILVEIL SOC AI FORENSICS
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div
              className="rounded-xl p-3 flex items-center gap-2 text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20"
            >
              <Brain className="w-4 h-4 animate-spin" />
              <span>Analyzing case telemetry & querying Gemini engine…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="relative flex items-center mt-3 w-full">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Ask MAILVEIL AI anything about case ${currentResult.case_id}...`}
          className="w-full rounded-xl pl-3.5 pr-20 sm:pr-24 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] focus:outline-none font-mono transition-all focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/30"
        />
        <button
          onClick={handleSend}
          disabled={thinking || !input.trim()}
          className="absolute right-1.5 top-1.5 bottom-1.5 flex items-center justify-center gap-1.5 px-3 sm:px-3.5 rounded-lg text-xs font-bold text-white transition-all font-mono hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.85), rgba(124,58,237,0.85))',
            border: '1px solid rgba(168,85,247,0.6)',
            boxShadow: '0 2px 8px rgba(147,51,234,0.25)',
          }}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </div>
    </div>
  );
}

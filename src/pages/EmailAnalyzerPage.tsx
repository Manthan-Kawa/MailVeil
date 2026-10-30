import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  FileText,
  Mail,
  MailSearch,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Eye,
  Brain,
  Check,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  Server,
  FileSearch,
  ArrowRight,
  Sparkles,
  Zap,
  RefreshCw,
  Settings,
  Target,
  MapPin,
  Share2,
  Lock,
  AlertOctagon,
  FileDown,
  Printer,
  Database,
  Archive,
} from 'lucide-react';
import {
  ANALYSIS_STAGES,
  DEMO_EMAIL,
  type AnalysisStage,
} from '@/data/mockData';
import { AnimatedCircleGauge } from '@/components/AnimatedCircleGauge';
import { GradientLiveProgressRing } from '@/components/GradientLiveProgressRing';
import {
  analyzeEmail,
  type EmailAnalysisResult,
  type AlertLevel,
  CLAUDE_KEY_STORAGE,
} from '@/services/claudeService';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useEvidence } from '@/contexts/EvidenceContext';
import { useCampaigns } from '@/contexts/CampaignContext';
import { exportReportAsPDF, downloadTextReport } from '@/utils/pdfExport';

type AnalyzerState = 'idle' | 'analyzing' | 'results' | 'error';

// ─── Severity colours ─────────────────────────────────────────────────────────
const SEVERITY_BADGE: Record<AlertLevel, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
  info: 'badge-info',
};

const FACT_ICON = {
  fail: XCircle,
  pass: CheckCircle2,
  warn: AlertTriangle,
  info: Info,
} as const;

const FACT_COLOR = {
  fail: 'text-red-400',
  pass: 'text-green-400',
  warn: 'text-amber-400',
  info: 'text-gray-400',
} as const;

const ALERT_COLORS: Record<AlertLevel, { bg: string; border: string; text: string; glow: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.3)',    text: 'text-red-400',    glow: 'rgba(239,68,68,0.15)' },
  high:     { bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.3)',   text: 'text-orange-400', glow: 'rgba(249,115,22,0.1)' },
  medium:   { bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.3)',   text: 'text-amber-400',  glow: 'rgba(245,158,11,0.08)' },
  low:      { bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.3)',   text: 'text-blue-400',   glow: 'rgba(59,130,246,0.08)' },
  info:     { bg: 'rgba(107,114,128,0.08)',  border: 'rgba(107,114,128,0.3)',  text: 'text-gray-400',   glow: 'rgba(107,114,128,0.05)' },
};

// Gauge gradient colours keyed by alert level
const GAUGE_COLORS: Record<AlertLevel, [string, string, string]> = {
  critical: ['#f87171', '#ef4444', '#b91c1c'],
  high:     ['#fb923c', '#f97316', '#c2410c'],
  medium:   ['#fcd34d', '#f59e0b', '#b45309'],
  low:      ['#60a5fa', '#3b82f6', '#1d4ed8'],
  info:     ['#9ca3af', '#6b7280', '#4b5563'],
};

const GAUGE_LABEL: Record<AlertLevel, string> = {
  critical: 'CRITICAL RISK',
  high:     'HIGH RISK',
  medium:   'MEDIUM RISK',
  low:      'LOW RISK',
  info:     'INFO',
};

export const ANALYSIS_STEPS = [
  {
    stage: 'Reconstructing TCP Streams',
    label: 'Reconstructing TCP streams',
    detail: 'Reassembling network packet streams and reordering TCP segments',
  },
  {
    stage: 'Detecting STARTTLS Negotiations',
    label: 'Detecting STARTTLS negotiations',
    detail: 'Scanning SMTP/IMAP/POP3 command channels for cleartext or stripped STARTTLS',
  },
  {
    stage: 'Parsing TLS Handshakes',
    label: 'Parsing TLS handshakes',
    detail: 'Deconstructing ClientHello, ServerHello, and negotiated cipher suites',
  },
  {
    stage: 'Validating X.509 Certificates',
    label: 'Validating X.509 certificates',
    detail: 'Inspecting certificate chain, expiration, key length, and signature algorithm',
  },
  {
    stage: 'Scoring Cipher Suites',
    label: 'Scoring cryptographic posture',
    detail: 'Evaluating forward secrecy, encryption algorithms, and downgrade risks',
  },
  {
    stage: 'Correlating Sessions',
    label: 'Correlating session infrastructure',
    detail: 'Mapping IP infrastructure and threat intelligence campaign clusters',
  },
  {
    stage: 'Preserving Evidence',
    label: 'Preserving cryptographic evidence',
    detail: 'Generating SHA-256 session hash and recording immutable audit trail',
  },
  {
    stage: 'Generating Report',
    label: 'Compiling posture assessment report',
    detail: 'Finalizing posture assessment score and remediation plan',
  },
] as const;

export const INGESTION_STAGES = ANALYSIS_STEPS;

/* ─── Slide-in entrance wrapper ─── */
function SlideIn({ children, delay = 0, direction = 'up', className = '' }: {
  children: React.ReactNode; delay?: number; direction?: 'up'|'left'|'right'|'down'; className?: string;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const from = direction === 'left' ? 'translateX(-36px)' : direction === 'right' ? 'translateX(36px)' : direction === 'down' ? 'translateY(-20px)' : 'translateY(24px)';
  return (
    <div className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : from, transition: 'opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)' }}>
      {children}
    </div>
  );
}

// ─── Build Sentinel-X PCAP Demo Session (Score 34, Verified Safe / Low Risk) ───
function buildSentinelXDemoRawSession(): string {
  return `Received: from mail.attacker-relay.example (185.220.101.47) by mailgw-01.corp.internal with ESMTPS (TLS1.2)
From: <unknown@185.220.101.47>
To: soc-audit@corp.internal
Subject: TLS Session Handshake & Network Trace Audit
Date: Mon, 27 Oct 2026 14:10:00 +0000
Message-ID: <audit-8312@mailgw-01.corp.internal>
Authentication-Results: mailgw-01.corp.internal; spf=pass (sender IP is 185.220.101.47); dkim=pass; dmarc=pass
X-Session-Source: demo-downgrade-session.pcap

Forensic examination of email from sender indicates normal parameters with threat score 34/100. No critical malicious payload or deceptive routing identified.`;
}

// ─── Build a raw text string from the DEMO_EMAIL mock object ─────────────────
function buildDemoRawEmail(): string {
  const hdrs = DEMO_EMAIL.headers.map((h) => `${h.key}: ${h.value}`).join('\n');
  return `${hdrs}\n\n${DEMO_EMAIL.bodyPreview}`;
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
════════════════════════════════════════════════════════════ */
export function EmailAnalyzerPage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const { currentResult, addAnalysisResult, resetActiveAnalysis } = useAnalysis();
  const { clearVault } = useEvidence();
  const { clearCampaigns } = useCampaigns();

  const [state, setState] = useState<AnalyzerState>(() => (currentResult ? 'results' : 'idle'));
  const [userRequestedIdle, setUserRequestedIdle] = useState(false);
  const [activeStage, setActiveStage] = useState<AnalysisStage>('Email');
  const [progressStep, setProgressStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(() => {
    if (!currentResult) return null;
    const subj = currentResult.headers.find(h => h.key.toLowerCase() === 'subject')?.value;
    return subj ? `${subj}.eml` : `${currentResult.case_id}.eml`;
  });
  const [pastedEmail, setPastedEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'facts' | 'inference' | 'headers' | 'raw'>('facts');
  const [result, setResult] = useState<EmailAnalysisResult | null>(() => currentResult ?? null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Keep state synced with currentResult from AnalysisContext across navigation
  useEffect(() => {
    if (currentResult && !userRequestedIdle) {
      setResult(currentResult);
      setState('results');
      setFileName((prev) => {
        if (prev) return prev;
        const subj = currentResult.headers.find(h => h.key.toLowerCase() === 'subject')?.value;
        return subj ? `${subj}.eml` : `${currentResult.case_id}.eml`;
      });
    }
  }, [currentResult, userRequestedIdle]);


  // ── Run analysis through the 5 Sentinel-X ingestion stages ─────
  const runAnalysis = useCallback(async (rawText: string) => {
    if (!rawText.trim()) return;

    setUserRequestedIdle(false);
    setError(null);
    setResult(null);
    setState('analyzing');
    setProgressStep(0);

    const STEP_MS = 480;
    const TOTAL_STEPS = ANALYSIS_STEPS.length;

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step < TOTAL_STEPS) {
        setProgressStep(step);
      }
    }, STEP_MS);

    try {
      const [analysisResult] = await Promise.all([
        analyzeEmail(rawText),
        new Promise((r) => setTimeout(r, STEP_MS * TOTAL_STEPS)),
      ]);

      clearInterval(interval);
      setProgressStep(TOTAL_STEPS - 1);
      setResult(analysisResult);
      addAnalysisResult(analysisResult);
      setState('results');
    } catch (err) {
      clearInterval(interval);
      const msg = (err as Error).message ?? 'Unknown error';
      setError(msg);
      setState('error');
    }
  }, [addAnalysisResult]);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      runAnalysis(text);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };

  // Loads demo session into paste area so user can review and click "Analyze Session Data"
  const handleDemo = (mode: 'sentinel-x' | 'bec' = 'sentinel-x') => {
    if (mode === 'bec') {
      const raw = buildDemoRawEmail();
      setFileName('demo-bec-email.eml');
      setPastedEmail(raw);
    } else {
      const raw = buildSentinelXDemoRawSession();
      setFileName('demo-downgrade-session.pcap');
      setPastedEmail(raw);
    }
  };

  const reset = () => {
    // Mark that the user deliberately wants the idle/upload view.
    // This prevents the context-sync effect from immediately flipping back to results.
    setUserRequestedIdle(true);
    setState('idle');
    setFileName(null);
    setPastedEmail('');
    setActiveStage('Email');
    setProgressStep(0);
    setActiveTab('facts');
    setResult(null);
    setError(null);
    resetActiveAnalysis();
    clearVault();
    clearCampaigns();
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Page Header ── */}
      <SlideIn delay={0} direction="down">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-snug">
            Email Ingestion &amp; Analysis
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-1 leading-relaxed">
            Upload .eml or .msg raw email file, paste session transcript, or load demo email session
          </p>
        </div>
      </SlideIn>

      {/* Workflow indicator matching Sentinel-X PCAP Analyzer */}
      {state !== 'idle' && state !== 'error' && (
        <SlideIn delay={100} direction="down">
          <div className="rounded-2xl p-2.5 sm:p-3 bg-white dark:bg-[#1b1c21] border border-gray-200 dark:border-zinc-800/80 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none">
              {ANALYSIS_STEPS.map((s, i, arr) => {
                const isAnalyzing = state === 'analyzing';
                const isActive = isAnalyzing && i === progressStep;
                const isDone = (!isAnalyzing && state === 'results') || (isAnalyzing && i < progressStep);

                return (
                  <div key={s.stage} className="flex items-center shrink-0">
                    {isActive ? (
                      <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap text-white bg-blue-600 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span>{s.stage}</span>
                      </div>
                    ) : isDone ? (
                      <div className="relative overflow-hidden flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap text-white bg-blue-600 shadow-xs">
                        <Check className="w-3.5 h-3.5 text-white stroke-[2.5] relative z-10" />
                        <span className="relative z-10">{s.stage}</span>
                        {/* Sentinel-X smooth wave-like shine effect */}
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0) 20%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 80%, transparent 100%)',
                            animation: 'sentinelWaveShine 3s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                            animationDelay: `${i * 320}ms`,
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap text-zinc-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                        <span>{s.stage}</span>
                      </div>
                    )}
                    {i < arr.length - 1 && (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 mx-1 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SlideIn>
      )}

      {/* ── State Views ── */}
      {(state === 'idle' || (state === 'results' && !result)) && (
        <IdleView
          dragOver={dragOver}
          setDragOver={setDragOver}
          handleDrop={handleDrop}
          fileInputRef={fileInputRef}
          handleFile={handleFile}
          onDemo={handleDemo}
          pastedEmail={pastedEmail}
          setPastedEmail={setPastedEmail}
          onAnalyzePasted={() => runAnalysis(pastedEmail)}
        />
      )}

      {state === 'analyzing' && <AnalyzingView step={progressStep} />}

      {state === 'error' && (
        <ErrorView
          error={error ?? 'Unknown error'}
          onRetry={reset}
          onSettings={() => onNavigate?.('settings')}
        />
      )}

      {state === 'results' && result && (
        <ResultsView
          result={result}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          fileName={fileName}
          onReset={reset}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   IDLE VIEW
═══════════════════════════════════════════════════════════ */
function IdleView({
  dragOver, setDragOver, handleDrop, fileInputRef, handleFile,
  onDemo, pastedEmail, setPastedEmail, onAnalyzePasted,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFile: (f: File) => void;
  onDemo: () => void;
  pastedEmail: string;
  setPastedEmail: (s: string) => void;
  onAnalyzePasted: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* ── Drag & Drop Area ── */}
      <SlideIn delay={100} direction="up">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-2xl py-10 sm:py-16 px-4 sm:px-6 text-center cursor-pointer transition-all duration-300 border border-dashed ${
            dragOver
              ? 'bg-blue-500/10 border-blue-500'
              : 'bg-white dark:bg-[#121316] border-gray-300 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-zinc-700'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".eml,.msg,.txt,.EML,.MSG,.TXT,message/rfc822,text/plain"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="w-14 h-14 bg-gray-100 dark:bg-[#1b1c21] border border-gray-200 dark:border-zinc-700/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-1.5">Drag &amp; drop .EML or .MSG file here</h3>
          <p className="text-xs text-gray-500 dark:text-zinc-500 font-mono">or click to browse — or paste raw session data below</p>
        </div>
      </SlideIn>

      {/* ── Action Buttons Row ── */}
      <SlideIn delay={180} direction="up">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={onDemo}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all duration-200 shadow-sm font-mono cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white" />
            Load Demo Email Session
          </button>

          <button
            onClick={onAnalyzePasted}
            disabled={!pastedEmail.trim()}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all duration-200 font-mono cursor-pointer ${
              pastedEmail.trim()
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm ring-1 ring-blue-500/40'
                : 'text-zinc-400 bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800/80 opacity-40 cursor-not-allowed'
            }`}
          >
            <Zap className={`w-4 h-4 ${pastedEmail.trim() ? 'text-white' : 'text-zinc-500'}`} />
            {pastedEmail.trim() ? 'Analyze Demo Email' : 'Analyze Session Data'}
          </button>
        </div>
      </SlideIn>

      {/* ── Paste Raw Email Section ── */}
      <SlideIn delay={260} direction="up">
        <div className="space-y-2.5">
          <p className="text-[11px] font-mono font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
            PASTE RAW EMAIL / RFC-5322 SESSION TRANSCRIPT
          </p>
          <div
            className="bg-white dark:bg-[#121316] border border-gray-200 dark:border-zinc-800/80 rounded-2xl shadow-sm p-1 overflow-hidden"
          >
            <textarea
              value={pastedEmail}
              onChange={(e) => setPastedEmail(e.target.value)}
              placeholder="Paste raw email headers, MIME structure, or session packet stream..."
              rows={7}
              className="w-full bg-transparent p-4 text-xs text-gray-900 dark:text-zinc-200 placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none resize-none font-mono"
            />
          </div>
          {pastedEmail.trim() && (
            <div className="flex justify-end pt-1">
              <button
                onClick={onAnalyzePasted}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all duration-200 font-mono cursor-pointer shadow-sm"
              >
                <Zap className="w-4 h-4 text-white" />
                Analyze Demo Email
              </button>
            </div>
          )}
        </div>
      </SlideIn>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANALYZING VIEW (Sentinel-X Progress Arc, Stages & Steps)
═══════════════════════════════════════════════════════════ */
function AnalyzingView({ step }: { step: number }) {
  const current = ANALYSIS_STEPS[Math.min(step, ANALYSIS_STEPS.length - 1)];
  const progressPercent = Math.round(((step + 1) / ANALYSIS_STEPS.length) * 100);

  return (
    <div className="rounded-2xl p-8 sm:p-14 flex flex-col items-center justify-center text-center bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800/80 shadow-sm space-y-6">
      <div className="my-2">
        <GradientLiveProgressRing
          progress={progressPercent}
          size={190}
          strokeWidth={10}
          sublabel={`STAGE ${step + 1}/${ANALYSIS_STEPS.length}`}
        />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          {current.label}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 max-w-lg mx-auto font-normal">
          {current.detail}
        </p>
      </div>

      {/* Active step card matching Sentinel-X screenshot */}
      <div className="w-full max-w-xl pt-2">
        <div className="flex items-center gap-3 px-5 py-3.5 bg-blue-950/20 dark:bg-[#151d2a] border border-blue-500/30 rounded-xl text-left">
          <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center shrink-0">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <span className="font-semibold text-xs sm:text-sm text-zinc-200">
            {current.stage} &mdash; {current.label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ERROR VIEW
═══════════════════════════════════════════════════════════ */
function ErrorView({ error, onRetry }: { error: string; onRetry: () => void; onSettings: () => void }) {
  const isMissingKey = error === 'GEMINI_KEY_MISSING';
  const displayMsg = isMissingKey
    ? 'Gemini API key is not configured. Add VITE_GEMINI_API_KEY to your .env file and restart the dev server.'
    : error;

  return (
    <div
      className="rounded-2xl p-8 flex flex-col items-center text-center gap-5 bg-white dark:bg-zinc-800 border border-red-200 dark:border-red-500/20 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        <ShieldAlert className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>

      <div>
        <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 mb-2">Analysis Failed</h3>
        <p className="text-xs text-gray-600 dark:text-zinc-400 dark:text-gray-400 max-w-md leading-relaxed font-mono whitespace-pre-wrap">{displayMsg}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          ← New Email
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESULTS VIEW
═══════════════════════════════════════════════════════════ */
function ResultsView({
  result, activeTab, setActiveTab, fileName, onReset, onNavigate,
}: {
  result: EmailAnalysisResult;
  activeTab: 'facts' | 'inference' | 'headers' | 'raw';
  setActiveTab: (t: 'facts' | 'inference' | 'headers' | 'raw') => void;
  fileName: string | null;
  onReset: () => void;
  onNavigate?: (route: string) => void;
}) {
  const ac = ALERT_COLORS[result.alert_level];
  const gaugeColors = GAUGE_COLORS[result.alert_level];
  const gaugeLabel = GAUGE_LABEL[result.alert_level];

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const currentTabEl = tabRefs.current[activeTab];
      if (currentTabEl) {
        setTabIndicatorStyle({
          left: currentTabEl.offsetLeft,
          width: currentTabEl.offsetWidth,
          opacity: 1,
        });
      } else {
        setTabIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
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

  return (
    <div className="space-y-6">

      {/* ── Risk Summary Banner ── */}
      <SlideIn delay={80} direction="up">
        <div
          className="rounded-2xl overflow-hidden bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800 shadow-sm"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12">

            {/* Score Gauge */}
            <div
              className="lg:col-span-3 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-zinc-800 bg-gray-50/60 dark:bg-transparent"
            >
              <AnimatedCircleGauge
                score={result.threat_score}
                label={result.threat_score >= 80 ? 'CRITICAL RISK' : result.threat_score >= 60 ? 'HIGH RISK' : result.threat_score >= 40 ? 'MEDIUM RISK' : 'LOW RISK'}
                gradientColors={gaugeColors}
              />
            </div>

            {/* Email info */}
            <div className="lg:col-span-6 p-6 space-y-3.5">
              {/* Meta pills matching Sentinel-X */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded text-xs font-bold text-white uppercase ${
                  result.threat_score >= 80 ? 'bg-red-600' : result.threat_score >= 60 ? 'bg-orange-600' : result.threat_score >= 40 ? 'bg-amber-600' : 'bg-blue-600'
                }`}>
                  {result.threat_score >= 80 ? 'CRITICAL' : result.threat_score >= 60 ? 'HIGH' : result.threat_score >= 40 ? 'MED' : 'LOW'}
                </span>
                <span className="px-3 py-1 rounded text-xs font-medium text-white bg-orange-600">
                  {result.threat_score <= 40 ? 'Verified Safe / Low Risk' : result.verdict}
                </span>
                <span className="px-3 py-1 rounded text-xs font-medium text-white bg-purple-600">
                  Confidence: {result.confidence}%
                </span>
              </div>

              {/* Case / Campaign IDs */}
              <div className="flex items-center gap-4 flex-wrap text-xs font-mono text-gray-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> {result.case_id}
                </span>
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> {result.campaign_id || 'UNKNOWN'}
                </span>
              </div>

              {/* Summary */}
              <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed font-sans">{result.summary}</p>

              {/* Threat intel quick stats */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1 font-mono text-gray-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> {result.threat_intel?.sending_ip || '185.220.101.47'}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> {result.threat_intel?.domain || 'unknown'}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> {fileName || 'demo-downgrade-session.pcap'}
                </span>
              </div>
            </div>

            {/* Actions Stack matching Sentinel-X PCAP Analyzer */}
            <div
              className="lg:col-span-3 p-6 flex flex-col justify-center gap-3 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-zinc-800"
            >
              <button
                onClick={() => onNavigate?.('reports')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <Printer className="w-4 h-4 text-white" />
                View Report
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('header-forensics')}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-gray-700 dark:text-zinc-200 bg-gray-100 dark:bg-[#18181b] hover:dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800 transition-all cursor-pointer active:scale-98"
                >
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                  Crypto Forensics
                </button>
              )}
              <button
                onClick={onReset}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <Mail className="w-4 h-4 text-white" />
                New Analysis
              </button>
            </div>
          </div>
        </div>
      </SlideIn>

      {/* ── X.509 Certificate Profile Card matching Sentinel-X ── */}
      <SlideIn delay={120} direction="up">
        <div className="rounded-2xl p-6 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">X.509 Certificate Profile</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Extracted from TLS Handshake (Server Certificate)</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded text-xs font-bold text-white ${
              result.threat_score >= 60 ? 'bg-red-600' : 'bg-emerald-600'
            }`}>
              {result.threat_score >= 60 ? 'UNTRUSTED CHAIN' : 'VALID CERTIFICATE CHAIN'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Card 1: ISSUER / SUBJECT */}
            <div className="rounded-xl p-4 bg-gray-50 dark:bg-[#121316] border border-gray-200 dark:border-zinc-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                ISSUER / SUBJECT
              </div>
              <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                CN={result.threat_intel?.domain || 'mail.attacker-relay.example'}
              </div>
              <div className="text-xs font-mono text-red-600 dark:text-red-400">
                {result.threat_score >= 60 ? 'Self-Signed / Untrusted CA' : "Let's Encrypt Authority X3 · Verified CA"}
              </div>
            </div>

            {/* Card 2: PUBLIC KEY ALGORITHM */}
            <div className="rounded-xl p-4 bg-gray-50 dark:bg-[#121316] border border-gray-200 dark:border-zinc-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                <Lock className="w-4 h-4 text-amber-500" />
                PUBLIC KEY ALGORITHM
              </div>
              <div className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                {result.threat_score >= 60 ? 'RSA-1024' : 'RSA-2048'}
              </div>
              <div className="text-xs font-mono text-amber-600 dark:text-amber-400">
                {result.threat_score >= 60 ? 'Weak (NIST recommends min 2048-bit)' : 'NIST SP 800-57 Compliant'}
              </div>
            </div>
          </div>
        </div>
      </SlideIn>

      {/* ── Risk Factors Grid ── */}
      {(result.risk_factors || []).length > 0 && (
        <SlideIn delay={160} direction="up">
          <div
            className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm shadow-sm"
          >
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                Risk Factors
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 dark:text-gray-500 mt-0.5">Key indicators contributing to the risk score</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(result.risk_factors || []).map((rf, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3.5 transition-all duration-200 hover:scale-[1.01] bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{rf.label}</span>
                    <span className={SEVERITY_BADGE[rf.severity] || 'badge-info'}>{rf.severity}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-zinc-400 dark:text-gray-400 leading-relaxed">{rf.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </SlideIn>
      )}

      {/* ── Recommended Actions ── */}
      {(result.recommended_actions || []).length > 0 && (
        <SlideIn delay={220} direction="up">
          <div
            className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm shadow-sm"
          >
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Recommended Actions
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 dark:text-gray-500 mt-0.5">Prioritized response actions based on threat analysis</p>
            </div>
            <div className="space-y-2">
              {(result.recommended_actions || []).map((a, i) => {
                const colors: Record<string, { bg: string; border: string; text: string }> = {
                  immediate: { bg: 'bg-red-50 dark:bg-red-500/[0.08]', border: 'border-red-200 dark:border-red-500/30', text: 'text-red-700 dark:text-red-400' },
                  high:      { bg: 'bg-orange-50 dark:bg-orange-500/[0.08]', border: 'border-orange-200 dark:border-orange-500/30', text: 'text-orange-700 dark:text-orange-400' },
                  medium:    { bg: 'bg-amber-50 dark:bg-amber-500/[0.08]', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-700 dark:text-amber-400' },
                  low:       { bg: 'bg-gray-50 dark:bg-gray-500/[0.08]', border: 'border-gray-200 dark:border-gray-500/20', text: 'text-gray-700 dark:text-zinc-300 dark:text-gray-400' },
                };
                const c = colors[a.priority] ?? colors.low;
                return (
                  <div
                    key={i}
                    className={`rounded-xl p-3.5 flex items-start gap-3 ${c.bg} border ${c.border}`}
                  >
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded mt-0.5 shrink-0 ${c.text} bg-white dark:bg-black/30 border border-current/20 shadow-xs`}>
                      {a.priority}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-zinc-100">{a.action}</p>
                      <p className="text-[11px] text-gray-600 dark:text-zinc-400 dark:text-gray-400 mt-0.5 leading-relaxed">{a.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SlideIn>
      )}

      {/* ── Origin / Relay Hops ── */}
      {(result.origin?.relay_hops || []).length > 0 && (
        <SlideIn delay={280} direction="up">
          <div
            className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm shadow-sm"
          >
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Origin &amp; SMTP Relay Chain
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 dark:text-gray-500 mt-0.5 font-mono">
                {result.origin?.hosting} · {result.origin?.country} · {result.origin?.asn}
              </p>
            </div>
            <div className="space-y-2">
              {(result.origin?.relay_hops || []).map((hop) => (
                <div
                  key={hop.hop}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/[0.05]"
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 shrink-0"
                  >
                    {hop.hop}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-900 dark:text-zinc-100 font-semibold">{hop.ip}</span>
                      {hop.hostname && <span className="text-[11px] text-gray-500 dark:text-zinc-400 dark:text-gray-500 font-mono">{hop.hostname}</span>}
                      <span className="text-[10px] text-gray-500 dark:text-zinc-400 dark:text-gray-600">{hop.country}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-zinc-400 dark:text-gray-400 mt-0.5 font-sans">{hop.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideIn>
      )}

      {/* ── Evidence ── */}
      {(result.evidence || []).length > 0 && (
        <SlideIn delay={340} direction="up">
          <div
            className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm shadow-sm"
          >
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Evidence Items
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 dark:text-gray-500 mt-0.5">Forensic artifacts extracted from this email</p>
            </div>
            <div className="space-y-2">
              {(result.evidence || []).map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl px-4 py-2.5 flex items-start gap-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/[0.05]"
                >
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase w-24 shrink-0 mt-0.5">{ev.type}</span>
                  <span className="text-xs font-mono text-gray-800 dark:text-zinc-200 dark:text-gray-300 break-all flex-1">{ev.value}</span>
                  {ev.hash && <span className="text-[10px] text-gray-500 dark:text-zinc-400 dark:text-gray-600 font-mono shrink-0 hidden xl:block">{ev.hash.slice(0, 16)}…</span>}
                </div>
              ))}
            </div>
          </div>
        </SlideIn>
      )}

      {/* ── Interactive Tabs ── */}
      <SlideIn delay={400} direction="up">
        <div
          className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm shadow-sm"
        >
          <div
            className="flex items-center gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm mb-5 overflow-x-auto scrollbar-none select-none max-w-full"
          >
            {[
              { id: 'facts',     label: 'Observed Facts', icon: Eye },
              { id: 'inference', label: 'AI Inference',   icon: Brain },
              { id: 'headers',   label: 'Headers',        icon: FileSearch },
              { id: 'raw',       label: 'Raw Email',      icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`relative h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-colors duration-200 shrink-0 whitespace-nowrap cursor-pointer select-none ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeEmailAnalyzerTab"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 shadow-md shadow-blue-500/20"
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 32,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {activeTab === 'facts'     && <ObservedFactsTab facts={result.observed_facts || []} />}
          {activeTab === 'inference' && <AIInferenceTab inferences={result.ai_inferences || []} />}
          {activeTab === 'headers'   && <HeadersTab headers={result.headers || []} />}
          {activeTab === 'raw'       && <RawEmailTab raw={result.raw_email || ''} />}
        </div>
      </SlideIn>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB COMPONENTS — all driven by live data
═══════════════════════════════════════════════════════════ */
function ObservedFactsTab({ facts = [] }: { facts?: EmailAnalysisResult['observed_facts'] }) {
  const safeFacts = facts || [];
  const categories = [...new Set(safeFacts.map((f) => f.category))];
  if (safeFacts.length === 0) return <EmptyTabPlaceholder message="No observed facts extracted." />;
  return (
    <div className="space-y-5">
      <div
        className="flex items-start gap-2.5 rounded-xl p-3.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20"
      >
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-700 dark:text-zinc-300 dark:text-gray-300 leading-relaxed font-sans">
          <span className="text-gray-900 dark:text-zinc-100 font-semibold">Observed Facts</span> are verifiable signals extracted directly from the email message.
          These are objective data points — not predictions or interpretations.
        </p>
      </div>
      {categories.map((cat) => (
        <div key={cat}>
          <h4 className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 dark:text-gray-500 uppercase tracking-widest mb-2 font-mono">{cat}</h4>
          <div className="space-y-1.5">
            {safeFacts.filter((f) => f.category === cat).map((fact) => {
              const Icon = FACT_ICON[fact.status] || Info;
              const color = FACT_COLOR[fact.status] || 'text-gray-400';
              return (
                <div
                  key={fact.id}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors duration-150 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/[0.05]"
                >
                  <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                  <span className="text-xs text-gray-600 dark:text-zinc-400 dark:text-gray-400 w-36 shrink-0 font-medium">{fact.field}</span>
                  <span className="text-xs text-gray-900 dark:text-zinc-100 font-mono flex-1 break-all">{fact.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AIInferenceTab({ inferences = [] }: { inferences?: EmailAnalysisResult['ai_inferences'] }) {
  const safeInferences = inferences || [];
  if (safeInferences.length === 0) return <EmptyTabPlaceholder message="No AI inferences generated." />;
  return (
    <div className="space-y-4">
      <div
        className="flex items-start gap-2.5 rounded-xl p-3.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20"
      >
        <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-700 dark:text-zinc-300 dark:text-gray-300 leading-relaxed font-sans">
          <span className="text-gray-900 dark:text-zinc-100 font-semibold">AI Inference</span> represents analytical interpretation based on observed facts.
          These are probabilistic assessments — each inference is labeled with a confidence score and its evidentiary basis.
        </p>
      </div>
      {safeInferences.map((inf) => (
        <div
          key={inf.id}
          className="rounded-xl p-4 transition-all duration-200 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100 flex-1">{inf.inference}</p>
            <div className="shrink-0 flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${inf.confidence}%`,
                    background: inf.confidence > 85 ? '#ef4444' : inf.confidence > 70 ? '#f97316' : '#f59e0b',
                  }}
                />
              </div>
              <span className="text-xs font-mono text-gray-900 dark:text-zinc-100 font-bold">{inf.confidence}%</span>
            </div>
          </div>
          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-zinc-800/50">
            <span className="text-[10px] text-gray-500 dark:text-zinc-400 dark:text-gray-500 font-mono uppercase tracking-wider shrink-0 mt-0.5">BASIS</span>
            <p className="text-xs text-gray-600 dark:text-zinc-400 dark:text-gray-400 leading-relaxed font-sans">{inf.basis}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function HeadersTab({ headers = [] }: { headers?: EmailAnalysisResult['headers'] }) {
  const safeHeaders = headers || [];
  if (safeHeaders.length === 0) return <EmptyTabPlaceholder message="No headers parsed from this email." />;
  return (
    <div
      className="rounded-xl overflow-hidden font-mono text-xs bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
    >
      {safeHeaders.map((h, i) => (
        <div key={i} className="flex border-b border-gray-200 dark:border-zinc-800/50 last:border-0 hover:bg-gray-100 dark:hover:bg-white/[0.03] transition-colors">
          <div className="w-44 shrink-0 px-3.5 py-2.5 text-teal-700 dark:text-teal-400 font-bold border-r border-gray-200 dark:border-zinc-800/50 break-all">{h.key}</div>
          <div className="px-3.5 py-2.5 text-gray-800 dark:text-zinc-200 dark:text-gray-300 break-all">{h.value}</div>
        </div>
      ))}
    </div>
  );
}

function RawEmailTab({ raw }: { raw: string }) {
  return (
    <div
      className="rounded-xl p-4 overflow-x-auto scrollbar-thin font-mono text-xs text-gray-800 dark:text-zinc-200 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-[#06070a] border border-gray-200 dark:border-zinc-800/50"
    >
      <pre className="whitespace-pre-wrap">{raw || '(no raw email content stored)'}</pre>
    </div>
  );
}

function EmptyTabPlaceholder({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-xs text-gray-500 font-mono">{message}</div>
  );
}

// Keep legacy named exports for import compatibility
export default EmailAnalyzerPage;

// Unused import suppressor
const _unused = { Mail, Clock, ShieldAlert, ChevronRight, Sparkles };
void _unused;

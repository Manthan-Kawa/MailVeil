import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  FileText,
  Hash,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Database,
  ChevronRight,
  Upload,
  RefreshCw,
  Download,
  Trash2,
  ExternalLink,
  Tag,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { CopyButton } from '@/components/CopyButton';
import { EVIDENCE_LEDGER_WORKFLOW } from '@/data/mockData';
import { useEvidence, type EvidenceVaultItem, type SourceModule } from '@/contexts/EvidenceContext';
import { useAnalysis } from '@/contexts/AnalysisContext';

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
  const from =
    direction === 'left'
      ? 'translateX(-24px)'
      : direction === 'right'
      ? 'translateX(24px)'
      : direction === 'down'
      ? 'translateY(-16px)'
      : 'translateY(16px)';

  return (
    <div
      className={className}
      style={{
        animation: `fadeIn 0.35s ease-out ${delay}ms forwards`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Status Configs ─── */
const INTEGRITY_CONFIG: Record<
  EvidenceVaultItem['integrityStatus'],
  { icon: LucideIcon; color: string; bg: string; border: string; label: string }
> = {
  verified: {
    icon: CheckCircle2,
    color: '#4ade80',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.3)',
    label: 'Verified',
  },
  pending: {
    icon: AlertCircle,
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.3)',
    label: 'Pending',
  },
  invalid: {
    icon: XCircle,
    color: '#f87171',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.3)',
    label: 'Invalid',
  },
};

const SOURCE_LABELS: Record<SourceModule, { label: string; color: string; bg: string; border: string; route: string }> = {
  'email-analyzer': { label: 'Email Analyzer', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', route: 'email-analyzer' },
  'header-forensics': { label: 'Header Forensics', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', route: 'header-forensics' },
  'threat-intelligence': { label: 'Threat Intel', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.25)', route: 'threat-intelligence' },
  'origin-investigation': { label: 'Origin Trace', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', route: 'origin-investigation' },
  'campaigns': { label: 'Campaigns', color: '#ec4899', bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.25)', route: 'campaigns' },
  'alerts': { label: 'Alerts', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', route: 'alerts' },
  'reports': { label: 'Reports', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', route: 'reports' },
  'manual-upload': { label: 'Uploaded', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.25)', route: 'evidence-vault' },
  'ledger-seed': { label: 'Ledger Seed', color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.25)', route: 'evidence-vault' },
};

const WORKFLOW_ICONS: Record<string, LucideIcon> = {
  file: FileText,
  hash: Hash,
  ledger: Database,
  verified: ShieldCheck,
};

function IntegrityPill({ status }: { status: EvidenceVaultItem['integrityStatus'] }) {
  const cfg = INTEGRITY_CONFIG[status] || INTEGRITY_CONFIG.verified;
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono shrink-0"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      <Icon className="w-2.5 h-2.5" style={{ color: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function SourcePill({ source }: { source: SourceModule }) {
  const cfg = SOURCE_LABELS[source] || SOURCE_LABELS['ledger-seed'];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold font-mono tracking-wide shrink-0"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════
   4-BOX IMMUTABLE LEDGER PIPELINE
══════════════════════════════════════════════════ */
function LedgerWorkflow() {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white flex items-center gap-2 font-mono">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          Immutable Forensic Ledger Pipeline
        </h3>
        <span className="text-[10px] font-mono text-gray-500">Cryptographic Chain-of-Custody</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {EVIDENCE_LEDGER_WORKFLOW.map((step, i) => {
          const Icon = WORKFLOW_ICONS[step.icon] ?? FileText;
          return (
            <div key={step.step} className="relative group">
              <div
                className="rounded-xl p-3 h-full flex flex-col justify-between transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center border"
                      style={{
                        background: 'rgba(34,211,238,0.1)',
                        borderColor: 'rgba(34,211,238,0.25)',
                        color: '#22d3ee',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-gray-600">STEP {i + 1}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-0.5 font-mono">{step.step}</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{step.detail}</p>
                </div>
              </div>

              {i < EVIDENCE_LEDGER_WORKFLOW.length - 1 && (
                <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-500/50" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EvidenceVaultPage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const {
    evidenceList,
    verifiedCount,
    totalCount,
    deleteEvidenceItem,
    verifyAllIntegrity,
    exportAllEvidence,
    exportEvidenceItem,
    resetToDefault,
  } = useEvidence();

  const { selectCase } = useAnalysis();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [caseFilter, setCaseFilter] = useState<string>('all');
  const [selected, setSelected] = useState<EvidenceVaultItem | null>(null);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [isVerifyingAll, setIsVerifyingAll] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Distinct case IDs
  const distinctCases = useMemo(() => {
    const set = new Set<string>();
    evidenceList.forEach((e) => {
      if (e.caseId) set.add(e.caseId);
    });
    return Array.from(set).sort();
  }, [evidenceList]);

  // Handle Verify All
  const handleVerifyAll = async () => {
    setIsVerifyingAll(true);
    try {
      const res = await verifyAllIntegrity();
      setNotification(`Verified ${res.total} evidence blocks — ${res.verified} verified.`);
      setTimeout(() => setNotification(null), 4000);
    } catch {
      // ignore
    } finally {
      setIsVerifyingAll(false);
    }
  };

  // Filtered evidence
  const filtered = useMemo(() => {
    return evidenceList.filter((e) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        e.id.toLowerCase().includes(q) ||
        e.filename.toLowerCase().includes(q) ||
        e.caseId.toLowerCase().includes(q) ||
        e.sha256.toLowerCase().includes(q) ||
        e.evidenceType.toLowerCase().includes(q) ||
        e.tags?.some((t) => t.toLowerCase().includes(q)) ||
        (e.content && e.content.toLowerCase().includes(q));

      const matchesSource = sourceFilter === 'all' || e.sourceModule === sourceFilter;
      const matchesCase = caseFilter === 'all' || e.caseId.toLowerCase() === caseFilter.toLowerCase();

      return matchesSearch && matchesSource && matchesCase;
    });
  }, [evidenceList, search, sourceFilter, caseFilter]);

  if (selected) {
    return (
      <EvidenceDetail
        evidence={selected}
        onBack={() => setSelected(null)}
        onNavigate={onNavigate}
        onSelectCase={selectCase}
        onExport={exportEvidenceItem}
        onDelete={(id) => {
          deleteEvidenceItem(id);
          setSelected(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">Evidence Vault</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-green-400 bg-green-500/10 border border-green-500/30">
                {verifiedCount}/{totalCount} VERIFIED
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Forensic chain-of-custody ledger synchronized across all investigation modules
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerifyAll}
              disabled={isVerifyingAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 border border-white/10 hover:text-white transition-all disabled:opacity-50 font-mono"
              title="Verify SHA-256 hashes against ledger"
            >
              <RefreshCw className={`w-3 h-3 text-green-400 ${isVerifyingAll ? 'animate-spin' : ''}`} />
              <span>{isVerifyingAll ? 'Verifying...' : 'Verify All'}</span>
            </button>

            <button
              onClick={exportAllEvidence}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 border border-white/10 hover:text-white transition-all font-mono"
              title="Export all evidence records as JSON"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>Export</span>
            </button>

            <button
              onClick={() => setShowIngestModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all font-mono shadow-sm"
            >
              <Upload className="w-3 h-3" />
              <span>Add Evidence</span>
            </button>
          </div>
        </div>
      </SlideIn>

      {/* Notification Toast */}
      {notification && (
        <div className="p-2.5 rounded-xl text-xs font-mono text-green-300 bg-green-500/10 border border-green-500/30 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* ── 4 Boxed Immutable Ledger Pipeline ── */}
      <SlideIn delay={30} direction="up">
        <LedgerWorkflow />
      </SlideIn>

      {/* ── Search & Filter Toolbar ── */}
      <SlideIn delay={60} direction="up">
        <div
          className="rounded-xl p-3 space-y-2.5"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div
              className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <input
                type="text"
                placeholder="Search by evidence ID, filename, case ID, SHA-256, or payload content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none w-full font-mono"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[10px] text-gray-500 hover:text-gray-300 px-1 font-mono"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Case Selector */}
            <select
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
              className="rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none cursor-pointer bg-white/[0.04] border border-white/[0.08]"
            >
              <option value="all" className="bg-gray-900 text-white">All Cases ({evidenceList.length})</option>
              {distinctCases.map((c) => (
                <option key={c} value={c} className="bg-gray-900 text-cyan-300">
                  {c} ({evidenceList.filter((e) => e.caseId === c).length})
                </option>
              ))}
            </select>
          </div>

          {/* Module Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pt-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'email-analyzer', label: 'Email Analyzer' },
              { id: 'header-forensics', label: 'Headers' },
              { id: 'threat-intelligence', label: 'Threat Intel' },
              { id: 'origin-investigation', label: 'Origin Trace' },
              { id: 'campaigns', label: 'Campaigns' },
              { id: 'reports', label: 'Reports' },
              { id: 'alerts', label: 'Alerts' },
              { id: 'manual-upload', label: 'Uploads' },
            ].map((tab) => {
              const active = sourceFilter === tab.id;
              const count =
                tab.id === 'all'
                  ? evidenceList.length
                  : evidenceList.filter((e) => e.sourceModule === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSourceFilter(tab.id)}
                  className="px-2 py-1 rounded-md text-[11px] font-mono font-medium transition-all shrink-0 flex items-center gap-1"
                  style={
                    active
                      ? {
                          background: 'rgba(34,211,238,0.15)',
                          border: '1px solid rgba(34,211,238,0.4)',
                          color: '#22d3ee',
                        }
                      : {
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          color: '#6b7280',
                        }
                  }
                >
                  <span>{tab.label}</span>
                  <span className="text-[9px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </SlideIn>

      {/* ── Evidence List Table ── */}
      <SlideIn delay={90} direction="up">
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Table Header */}
          <div
            className="grid grid-cols-12 gap-2 px-3.5 sm:px-4 py-2.5 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="col-span-3 sm:col-span-2">Evidence ID</div>
            <div className="col-span-6 sm:col-span-4">Artifact / Filename</div>
            <div className="col-span-2 hidden md:block">Source Module</div>
            <div className="col-span-2 hidden lg:block">SHA-256</div>
            <div className="col-span-3 sm:col-span-2 text-right">Status</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/5">
            {filtered.map((e) => (
              <div
                key={e.id}
                onClick={() => setSelected(e)}
                className="grid grid-cols-12 gap-2 px-3.5 sm:px-4 py-3 cursor-pointer transition-all duration-150 hover:bg-white/[0.03] group items-center"
              >
                {/* ID */}
                <div className="col-span-3 sm:col-span-2 min-w-0">
                  <span className="text-xs font-mono font-bold text-cyan-400 truncate block group-hover:text-cyan-300">
                    {e.id}
                  </span>
                </div>

                {/* Filename & Case */}
                <div className="col-span-6 sm:col-span-4 min-w-0">
                  <span className="text-xs text-white font-medium truncate block">
                    {e.filename}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono block truncate">
                    {e.caseId} • {e.size}
                  </span>
                </div>

                {/* Source */}
                <div className="col-span-2 hidden md:flex items-center">
                  <SourcePill source={e.sourceModule} />
                </div>

                {/* Hash */}
                <div className="col-span-2 hidden lg:flex items-center">
                  <span className="text-[11px] font-mono text-gray-500 truncate" title={e.sha256}>
                    {e.sha256.slice(0, 16)}…
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1.5">
                  <IntegrityPill status={e.integrityStatus} />
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 px-4">
              {evidenceList.length === 0 ? (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">Evidence Vault is Empty</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      No forensic evidence records stored yet. Run an analysis in Email Analyzer, snapshot evidence from investigation modules, or ingest custom artifacts.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setShowIngestModal(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-all font-mono flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Add Evidence
                    </button>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('email-analyzer')}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 border border-white/10 hover:text-white transition-all font-mono flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                        Analyze Email
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Search className="w-6 h-6 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-mono">No evidence records match your filter criteria</p>
                  <button
                    onClick={() => {
                      setSearch('');
                      setSourceFilter('all');
                      setCaseFilter('all');
                    }}
                    className="mt-2 text-xs text-cyan-400 font-mono hover:underline"
                  >
                    Reset filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </SlideIn>

      {/* ── Ingest Evidence Modal ── */}
      {showIngestModal && (
        <IngestEvidenceModal
          onClose={() => setShowIngestModal(false)}
          onSuccess={(item) => {
            setShowIngestModal(false);
            setSelected(item);
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   EVIDENCE DETAIL VIEW
══════════════════════════════════════════════════ */
function EvidenceDetail({
  evidence,
  onBack,
  onNavigate,
  onSelectCase,
  onExport,
  onDelete,
}: {
  evidence: EvidenceVaultItem;
  onBack: () => void;
  onNavigate?: (route: string) => void;
  onSelectCase?: (caseId: string) => void;
  onExport: (id: string, format?: 'raw' | 'json') => void;
  onDelete: (id: string) => void;
}) {
  const { verifyEvidenceIntegrity } = useEvidence();
  const cfg = INTEGRITY_CONFIG[evidence.integrityStatus] || INTEGRITY_CONFIG.verified;
  const sourceCfg = SOURCE_LABELS[evidence.sourceModule] || SOURCE_LABELS['ledger-seed'];

  const [activeTab, setActiveTab] = useState<'overview' | 'payload' | 'ledger'>('overview');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; actualHash: string } | null>(null);

  const handleVerifyNow = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyEvidenceIntegrity(evidence.id);
      setVerifyResult(res);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePivot = () => {
    if (evidence.caseId && onSelectCase) {
      onSelectCase(evidence.caseId);
    }
    if (sourceCfg.route && onNavigate) {
      onNavigate(sourceCfg.route);
    }
  };

  return (
    <div className="space-y-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-white bg-white/5 border border-white/10 transition-all font-mono"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
          <span className="text-xs font-mono font-bold text-cyan-400">{evidence.id}</span>
          <IntegrityPill status={evidence.integrityStatus} />
          <SourcePill source={evidence.sourceModule} />
        </div>

        <div className="flex items-center gap-2">
          {sourceCfg.route !== 'evidence-vault' && onNavigate && (
            <button
              onClick={handlePivot}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all font-mono"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open in {sourceCfg.label}</span>
            </button>
          )}

          <button
            onClick={() => onExport(evidence.id, 'raw')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-300 bg-white/5 border border-white/10 hover:text-white transition-all font-mono"
          >
            <Download className="w-3 h-3 text-cyan-400" />
            <span>Download</span>
          </button>

          {evidence.isCustom && (
            <button
              onClick={() => {
                if (confirm(`Delete evidence record ${evidence.id}?`)) {
                  onDelete(evidence.id);
                }
              }}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 bg-red-500/5 border border-red-500/20 transition-all"
              title="Delete item"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Card ── */}
      <div
        className="rounded-xl p-4"
        style={{
          background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
          border: `1px solid ${cfg.border}`,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
              <h2 className="text-base font-black text-white">{evidence.filename}</h2>
            </div>
            <p className="text-xs text-gray-400 font-mono">
              {evidence.evidenceType} — <span className="text-white font-semibold">{evidence.size}</span> — Case:{' '}
              <span className="text-cyan-300">{evidence.caseId}</span>
            </p>
            {evidence.summary && (
              <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">{evidence.summary}</p>
            )}
          </div>

          <button
            onClick={handleVerifyNow}
            disabled={isVerifying}
            className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 self-start sm:self-auto bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20"
          >
            <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Hashing...' : 'Verify Hash'}</span>
          </button>
        </div>

        {verifyResult && (
          <div
            className={`mt-3 p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
              verifyResult.valid
                ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}
          >
            {verifyResult.valid ? <Check className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
            <span>
              {verifyResult.valid ? 'Cryptographic SHA-256 match verified.' : 'Hash mismatch detected.'}
            </span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {[
          { id: 'overview', label: 'Overview & Hashes' },
          { id: 'payload', label: 'Raw Payload' },
          { id: 'ledger', label: 'Ledger Proof' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                active
                  ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
              Cryptographic Checksum
            </h3>
            <div>
              <span className="text-[10px] text-gray-500 font-mono uppercase">SHA-256 Digest</span>
              <div className="flex items-center gap-2 mt-1 rounded-lg p-2.5 bg-black/40 border border-white/5">
                <span className="text-xs font-mono text-cyan-300 break-all flex-1">{evidence.sha256}</span>
                <CopyButton value={evidence.sha256} />
              </div>
            </div>
            <DetailRow label="Collection Timestamp" value={evidence.timestamp} />
            <DetailRow label="Acquired By" value={evidence.collectedBy} mono={false} />
            <DetailRow label="Associated Case" value={evidence.caseId} />
            <DetailRow label="Payload MIME" value={evidence.mimeType || 'text/plain'} />
          </div>

          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono">
              Classification &amp; Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {evidence.tags?.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/25">
                  #{t}
                </span>
              ))}
            </div>

            {evidence.indicators && evidence.indicators.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] text-gray-500 font-mono uppercase font-bold block">
                  Indicators ({evidence.indicators.length})
                </span>
                {evidence.indicators.map((ind, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded text-xs font-mono bg-white/[0.02] border border-white/5">
                    <span className="text-gray-500">{ind.type}:</span>
                    <span className="text-cyan-300">{ind.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Payload ── */}
      {activeTab === 'payload' && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400">Raw Content Stream</span>
            <CopyButton value={evidence.content || ''} />
          </div>
          <div className="rounded-lg p-3 bg-black/60 border border-white/5 max-h-96 overflow-y-auto font-mono text-xs text-gray-300 whitespace-pre-wrap break-all leading-relaxed select-text">
            {evidence.content || 'No raw content recorded.'}
          </div>
        </div>
      )}

      {/* ── Tab: Ledger ── */}
      {activeTab === 'ledger' && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
            Ledger Proof &amp; Block Chaining
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow label="Block Reference" value={evidence.blockRef} />
            <DetailRow label="Ledger Transaction" value={evidence.ledgerRef} />
            <DetailRow label="Current Block Hash" value={evidence.blockHash} />
            <DetailRow label="Previous Block Hash" value={evidence.prevBlockHash} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`text-white ${mono ? 'font-mono' : ''} truncate text-right`}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   INGEST EVIDENCE MODAL
══════════════════════════════════════════════════ */
function IngestEvidenceModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (item: EvidenceVaultItem) => void;
}) {
  const { saveCustomEvidence } = useEvidence();

  const [filename, setFilename] = useState('');
  const [evidenceType, setEvidenceType] = useState('Email Message (EML)');
  const [caseId, setCaseId] = useState('CASE-2026-0471');
  const [tagsInput, setTagsInput] = useState('Forensic-Upload');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    if (file.name.endsWith('.eml')) setEvidenceType('Email Message (EML)');
    else if (file.name.endsWith('.json')) setEvidenceType('Forensic Report (JSON)');
    else if (file.name.endsWith('.txt')) setEvidenceType('Header Dump (TXT)');
    else setEvidenceType('Custom Artifact');

    const reader = new FileReader();
    reader.onload = (event) => {
      setContent((event.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim() || !content.trim()) {
      alert('Please provide a filename and content payload.');
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      const created = await saveCustomEvidence({
        filename: filename.trim(),
        evidenceType,
        caseId: caseId.trim(),
        tags,
        content,
        summary: summary.trim() || `Manual evidence: ${filename}`,
        sourceModule: 'manual-upload',
      });

      onSuccess(created);
    } catch {
      alert('Failed to save evidence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3.5 pt-[calc(4.75rem+env(safe-area-inset-top,0px))] pb-5 md:p-6 md:py-6 overflow-y-auto bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-lg rounded-xl p-5 space-y-4 my-auto max-h-[calc(100vh-6rem-env(safe-area-inset-top,0px))] md:max-h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden"
        style={{
          background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
          border: '1px solid rgba(34,211,238,0.3)',
        }}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm font-black text-white font-mono">Ingest Forensic Artifact</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xs font-mono">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs font-mono">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-cyan-500/30 hover:border-cyan-500/60 rounded-lg p-3 text-center cursor-pointer bg-cyan-500/5"
          >
            <input ref={fileInputRef} type="file" onChange={handleFileUpload} className="hidden" />
            <Upload className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <span className="text-white text-xs font-semibold block">Click to upload file</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-gray-400 block mb-1">Filename *</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="suspicious_email.eml"
                required
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Case ID</label>
              <input
                type="text"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                placeholder="CASE-2026-0471"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-gray-400 block mb-1">Raw Payload Content *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste email headers, raw message, or JSON here..."
              rows={4}
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg text-white font-bold bg-cyan-600 hover:bg-cyan-500 transition-all font-mono"
            >
              {isSubmitting ? 'Sealing...' : 'Seal in Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

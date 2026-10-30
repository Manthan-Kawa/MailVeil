import { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  User,
  Network,
  FileText,
  Activity,
  StickyNote,
  ArrowLeft,
  Shield,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Crosshair,
  Zap,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import {
  INVESTIGATION_CASES,
  type InvestigationCase,
  type CaseStatus,
  type Severity,
} from '@/data/mockData';

/* ─── Slide-in entrance wrapper (mirrors HeaderForensics) ─── */
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

/* ─── Severity config ─── */
const SEVERITY_STYLES: Record<Severity, { border: string; bg: string; text: string; dot: string; glow: string }> = {
  critical: {
    border: 'rgba(239,68,68,0.4)',
    bg: 'rgba(239,68,68,0.1)',
    text: '#f87171',
    dot: '#ef4444',
    glow: 'none',
  },
  high: {
    border: 'rgba(249,115,22,0.4)',
    bg: 'rgba(249,115,22,0.1)',
    text: '#fb923c',
    dot: '#f97316',
    glow: 'none',
  },
  medium: {
    border: 'rgba(245,158,11,0.35)',
    bg: 'rgba(245,158,11,0.08)',
    text: '#fbbf24',
    dot: '#f59e0b',
    glow: 'none',
  },
  low: {
    border: 'rgba(59,130,246,0.35)',
    bg: 'rgba(59,130,246,0.08)',
    text: '#60a5fa',
    dot: '#3b82f6',
    glow: 'none',
  },
  info: {
    border: 'rgba(156,163,175,0.25)',
    bg: 'rgba(156,163,175,0.06)',
    text: '#9ca3af',
    dot: '#6b7280',
    glow: 'none',
  },
};

const STATUS_CONFIG: Record<CaseStatus, { color: string; bg: string; border: string; label: string; pulse: string }> = {
  open: {
    color: '#f87171',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    label: 'Open',
    pulse: '#ef4444',
  },
  investigating: {
    color: '#fb923c',
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.35)',
    label: 'Investigating',
    pulse: '#f97316',
  },
  contained: {
    color: '#60a5fa',
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.35)',
    label: 'Contained',
    pulse: '#3b82f6',
  },
  resolved: {
    color: '#4ade80',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.35)',
    label: 'Resolved',
    pulse: '#22c55e',
  },
};

const STATUS_ORDER: CaseStatus[] = ['open', 'investigating', 'contained', 'resolved'];

/* ─── Severity badge pill ─── */
function SeverityPill({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {severity}
    </span>
  );
}

/* ─── Status badge pill ─── */
function StatusPill({ status, animate = false }: { status: CaseStatus; animate?: boolean }) {
  const s = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      <span className="relative flex h-2 w-2">
        {animate && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: s.pulse }}
          />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: s.pulse }} />
      </span>
      {s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export function InvestigationsPage() {
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  if (selectedCase) {
    return <CaseDetail caseData={selectedCase} onBack={() => setSelectedCase(null)} />;
  }

  const filtered = INVESTIGATION_CASES.filter((c) => {
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.assignedAnalyst.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || c.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const openCount = INVESTIGATION_CASES.filter((c) => c.status === 'open').length;
  const criticalCount = INVESTIGATION_CASES.filter((c) => c.severity === 'critical').length;

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Page Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Investigations</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Active case management — track, escalate, and resolve threat investigations
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl self-start sm:self-auto"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
            <span className="text-xs font-semibold text-red-600 dark:text-red-300 font-mono">
              {openCount} OPEN CASE{openCount !== 1 ? 'S' : ''}
            </span>
          </div>
        </div>
      </SlideIn>

      {/* ── Stats Row ── */}
      <SlideIn delay={60} direction="up">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Cases', value: INVESTIGATION_CASES.length, icon: FileText, color: '#60a5fa', glow: 'rgba(59,130,246,0.15)' },
            { label: 'Open', value: openCount, icon: AlertTriangle, color: '#f87171', glow: 'rgba(239,68,68,0.15)' },
            { label: 'Critical', value: criticalCount, icon: XCircle, color: '#ef4444', glow: 'rgba(239,68,68,0.2)' },
            { label: 'Resolved', value: INVESTIGATION_CASES.filter(c => c.status === 'resolved').length, icon: CheckCircle2, color: '#4ade80', glow: 'rgba(34,197,94,0.15)' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-500 font-mono uppercase tracking-wider">{stat.label}</span>
                  <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                </div>
                <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
              </div>
            );
          })}
        </div>
      </SlideIn>

      {/* ── Filters ── */}
      <SlideIn delay={120} direction="up">
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div
              className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="text"
                placeholder="Search by case ID, title, or analyst..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full font-mono"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Severity Dropdown */}
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="w-full sm:w-auto appearance-none px-3.5 py-2.5 pr-8 rounded-xl text-xs font-mono font-bold text-gray-200 bg-white/5 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer transition-all shrink-0"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <option value="all" className="bg-[#0b0e17] text-gray-300">All Severity</option>
                  <option value="critical" className="bg-[#0b0e17] text-red-400">Critical</option>
                  <option value="high" className="bg-[#0b0e17] text-orange-400">High</option>
                  <option value="medium" className="bg-[#0b0e17] text-amber-400">Medium</option>
                  <option value="low" className="bg-[#0b0e17] text-green-400">Low</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Status Dropdown */}
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full sm:w-auto appearance-none px-3.5 py-2.5 pr-8 rounded-xl text-xs font-mono font-bold text-gray-200 bg-white/5 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer transition-all shrink-0"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <option value="all" className="bg-[#0b0e17] text-gray-300">All Status</option>
                  <option value="open" className="bg-[#0b0e17] text-red-400">Open</option>
                  <option value="investigating" className="bg-[#0b0e17] text-blue-400">Investigating</option>
                  <option value="contained" className="bg-[#0b0e17] text-amber-400">Contained</option>
                  <option value="resolved" className="bg-[#0b0e17] text-green-400">Resolved</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </SlideIn>

      {/* ── Cases List ── */}
      <SlideIn delay={200} direction="up">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="col-span-2">Case ID</div>
            <div className="col-span-4">Title</div>
            <div className="col-span-1 hidden md:block">Severity</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 hidden lg:block">Threat Type</div>
            <div className="col-span-1 hidden xl:block">Analyst</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/5">
            {filtered.map((c, idx) => (
              <div
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className="grid grid-cols-12 gap-2 px-5 py-3.5 cursor-pointer transition-all duration-150 hover:bg-white/[0.03] group"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <div className="col-span-2 flex items-center gap-2">
                  <Crosshair
                    className="w-3 h-3 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  />
                  <span className="text-xs font-mono font-bold text-cyan-400">{c.id}</span>
                </div>
                <div className="col-span-4 flex items-center">
                  <span className="text-xs text-white font-medium truncate">{c.title}</span>
                </div>
                <div className="col-span-1 hidden md:flex items-center">
                  <SeverityPill severity={c.severity} />
                </div>
                <div className="col-span-2 flex items-center">
                  <StatusPill status={c.status} animate={c.status === 'open' || c.status === 'investigating'} />
                </div>
                <div className="col-span-2 hidden lg:flex items-center">
                  <span className="text-xs text-gray-400 truncate">{c.threatType}</span>
                </div>
                <div className="col-span-1 hidden xl:flex items-center justify-between">
                  <span className="text-xs text-gray-500 truncate">{c.assignedAnalyst}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-mono">No cases match your filters</p>
            </div>
          )}
        </div>
      </SlideIn>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   CASE DETAIL VIEW
══════════════════════════════════════════════════ */
function CaseDetail({ caseData, onBack }: { caseData: InvestigationCase; onBack: () => void }) {
  const [status, setStatus] = useState<CaseStatus>(caseData.status);
  const [notes, setNotes] = useState(caseData.analystNotes);
  const [newNote, setNewNote] = useState('');
  const sev = SEVERITY_STYLES[caseData.severity];

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes([
      ...notes,
      {
        author: 'Kaelen Richter',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        note: newNote.trim(),
      },
    ]);
    setNewNote('');
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Back + Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Cases
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 font-bold">{caseData.id}</span>
            <SeverityPill severity={caseData.severity} />
            <StatusPill status={status} animate={status === 'open' || status === 'investigating'} />
          </div>
        </div>
      </SlideIn>

      {/* ── Case Title Card ── */}
      <SlideIn delay={60} direction="up">
        <div
          className="rounded-2xl p-5"
          style={{
            background: `linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)`,
            border: `1px solid ${sev.border}`,
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-black text-white mb-2">{caseData.title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{caseData.summary}</p>
            </div>
            {/* Status Control */}
            <div
              className="rounded-xl p-4 shrink-0 min-w-[160px]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-3">Status Control</p>
              <div className="flex flex-col gap-1.5">
                {STATUS_ORDER.map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all font-mono"
                      style={
                        active
                          ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                          : {
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              color: '#4b5563',
                            }
                      }
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? cfg.pulse : '#374151' }} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </SlideIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left Column ── */}
        <div className="space-y-5">

          {/* Case Metadata */}
          <SlideIn delay={140} direction="left">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-cyan-400" />
                Case Metadata
              </h3>
              <div className="space-y-0">
                <MetaRow icon={FileText} label="Case ID" value={caseData.id} />
                <MetaRow icon={Clock} label="Created" value={caseData.created} />
                <MetaRow icon={User} label="Assigned" value={caseData.assignedAnalyst} mono={false} />
                <MetaRow icon={Network} label="Threat Type" value={caseData.threatType} mono={false} />
                <MetaRow icon={Zap} label="Campaign" value={caseData.relatedCampaign} />
                <MetaRow icon={Clock} label="Last Updated" value={caseData.lastUpdated} />
                <MetaRow icon={FileText} label="Evidence" value={caseData.relatedEvidence.join(', ')} mono={false} />
              </div>
            </div>
          </SlideIn>

          {/* Activity History */}
          <SlideIn delay={200} direction="left">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-purple-400" />
                Activity History
              </h3>
              <div className="space-y-3">
                {caseData.activityHistory.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="relative mt-1.5 shrink-0">
                      <span
                        className="w-2 h-2 rounded-full block bg-purple-500"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-white font-medium">{a.action}</span>
                      <span className="text-xs text-gray-500"> — {a.actor}</span>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SlideIn>
        </div>

        {/* ── Right Column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Investigation Timeline */}
          <SlideIn delay={160} direction="right">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-cyan-400" />
                Investigation Timeline
              </h3>
              <div className="relative pl-2">
                <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-white/10" />
                <div className="space-y-4">
                  {caseData.timeline.map((t, i) => (
                    <div key={i} className="relative flex gap-4 items-start">
                      <div
                        className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform hover:scale-110"
                        style={
                          i === 0
                            ? {
                                background: 'rgba(239,68,68,0.2)',
                                borderColor: '#ef4444',
                                color: '#f87171',
                              }
                            : i === caseData.timeline.length - 1
                            ? {
                                background: 'rgba(34,197,94,0.2)',
                                borderColor: '#22c55e',
                                color: '#4ade80',
                              }
                            : {
                                background: 'rgba(255,255,255,0.05)',
                                borderColor: 'rgba(255,255,255,0.12)',
                                color: '#6b7280',
                              }
                        }
                      >
                        <span className="text-xs font-bold font-mono">{i + 1}</span>
                      </div>
                      <div
                        className="flex-1 rounded-xl p-3.5 transition-all hover:scale-[1.005]"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <span className="text-xs text-white font-medium">{t.event}</span>
                        <div className="text-[10px] text-gray-500 font-mono mt-1">
                          {t.time} — <span className="text-gray-400">{t.actor}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SlideIn>

          {/* Analyst Notes */}
          <SlideIn delay={240} direction="right">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <StickyNote className="w-4 h-4 text-amber-400" />
                Analyst Notes
              </h3>
              <div className="space-y-3 mb-4">
                {notes.map((n, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3.5 transition-all hover:scale-[1.005]"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white font-bold">{n.author}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{n.note}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  placeholder="Add a note…"
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none font-mono"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                />
                <button
                  onClick={addNote}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 font-mono"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.3))',
                    border: '1px solid rgba(99,102,241,0.4)',
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </SlideIn>
        </div>
      </div>
    </div>
  );
}

/* ─── Meta row (styled to match HeaderForensics panel rows) ─── */
function MetaRow({
  icon: Icon,
  label,
  value,
  mono = true,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-2.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <span className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
        <Icon className="w-3.5 h-3.5 text-purple-400" />
        {label}
      </span>
      <span className={`text-xs text-white text-right break-all ${mono ? 'font-mono' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}

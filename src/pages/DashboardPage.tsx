import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  MailCheck,
  ShieldAlert,
  AlertOctagon,
  Search,
  Target,
  Network,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Lock,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import { type Severity } from '@/data/mockData';
import { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useCampaigns } from '@/contexts/CampaignContext';
import { useEvidence } from '@/contexts/EvidenceContext';
import { useTheme } from '@/context/ThemeContext';

/* ═══════════════════════════════════════════════════════════
   TYPES & LOOKUPS
   ═══════════════════════════════════════════════════════════ */
interface ActivityPoint { hour: string; threats: number; scanned: number; }
interface AttackSlice   { name: string; value: number; color: string; }

const ICON_MAP: Record<string, LucideIcon> = {
  MailCheck,
  ShieldAlert,
  AlertOctagon,
  Search,
  Target,
  Network,
};

function now24h(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ═══════════════════════════════════════════════════════════
   CLEAN SOLID BADGE COMPONENT (Sentinel-X Design System)
   ═══════════════════════════════════════════════════════════ */
function SolidBadge({
  label,
  variant,
}: {
  label: string;
  variant: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'open' | 'investigating' | 'resolved' | 'contained' | string;
}) {
  const textColors: Record<string, string> = {
    critical:      'text-red-600 dark:text-red-400',
    high:          'text-orange-600 dark:text-orange-400',
    medium:        'text-amber-600 dark:text-amber-400',
    low:           'text-emerald-600 dark:text-emerald-400',
    info:          'text-blue-600 dark:text-blue-400',
    open:          'text-red-600 dark:text-red-400',
    investigating: 'text-indigo-600 dark:text-indigo-400',
    resolved:      'text-emerald-600 dark:text-emerald-400',
    contained:     'text-amber-600 dark:text-amber-400',
  };

  const style = textColors[variant.toLowerCase()] || 'text-gray-500 dark:text-gray-400';

  return (
    <span
      className={`inline-flex items-center text-[10px] font-black font-mono uppercase tracking-wider select-none ${style}`}
    >
      {label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANIMATION & ATOMS
   ═══════════════════════════════════════════════════════════ */
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
      ? 'translateX(-24px)'
      : direction === 'right'
      ? 'translateX(24px)'
      : direction === 'down'
      ? 'translateY(-16px)'
      : 'translateY(20px)';
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

/* Tooltip matching Sentinel-X clean aesthetics */
function CleanTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl border border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md">
      <p className="text-gray-500 dark:text-gray-400 font-mono text-[11px] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-semibold flex items-center gap-1.5 text-xs text-gray-900 dark:text-zinc-100">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span>{p.name}:</span>
          <span className="font-mono font-bold">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function LiveNumber({ value, fmt }: { value: number; fmt?: (n: number) => string }) {
  const [disp, setDisp] = useState(0);

  useEffect(() => {
    let animId: number;
    const dur = 750;
    const t0 = performance.now();
    const startVal = 0;
    const targetVal = typeof value === 'number' && !isNaN(value) ? Math.round(value) : 0;

    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisp(Math.round(startVal + (targetVal - startVal) * ease));
      if (p < 1) {
        animId = requestAnimationFrame(tick);
      }
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  return <>{fmt ? fmt(disp) : disp.toLocaleString()}</>;
}

function useElapsed() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return sec;
}

const DEFAULT_RECENT_EMAIL_THREATS = [
  { id: 'SEC-EML-9401', sender: 'ceo-payroll@secure-finance-verify.com', threatType: 'Executive Impersonation / BEC', severity: 'critical', riskScore: 96, status: 'investigating' },
  { id: 'SEC-EML-9402', sender: 'no-reply@auth-microsoft365-login.net', threatType: 'Credential Phishing Portal', severity: 'high', riskScore: 88, status: 'open' },
  { id: 'SEC-EML-9403', sender: 'billing@invoice-payment-gateway.info', threatType: 'Wire Transfer / Invoice Fraud', severity: 'high', riskScore: 82, status: 'open' },
  { id: 'SEC-EML-9404', sender: 'alert@accounts-google-verify.org', threatType: 'SPF/DKIM Spoofed Domain', severity: 'medium', riskScore: 64, status: 'resolved' },
  { id: 'SEC-EML-9405', sender: 'shipping@fast-freight-tracking.biz', threatType: 'Trojan Dropper in PDF', severity: 'high', riskScore: 91, status: 'investigating' },
];

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════════════ */
export function DashboardPage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'24H' | '7D'>('24H');
  const { analyzedReports } = useAnalysis();
  const { campaigns } = useCampaigns();
  const elapsed = useElapsed();

  // Dynamic KPI calculations from active data
  const emailCount = analyzedReports.length;
  const threatCount = analyzedReports.filter(
    (r) =>
      r.threat_score >= 50 ||
      (r.verdict && !r.verdict.toLowerCase().includes('legitimate') && !r.verdict.toLowerCase().includes('benign')) ||
      r.alert_level === 'critical' ||
      r.alert_level === 'high'
  ).length;

  const criticalCount = analyzedReports.filter((r) => r.alert_level === 'critical').length;
  const campaignCount = campaigns.length;

  const KPI_DEFS = useMemo(
    () => [
      {
        label: 'Emails Analyzed',
        val: emailCount > 0 ? emailCount : 14892,
        delta: '+8.2%',
        isUp: true,
        icon: 'MailCheck',
        fmt: (n: number) => Math.round(n).toLocaleString(),
      },
      {
        label: 'Threats Detected',
        val: threatCount > 0 ? threatCount : 1247,
        delta: '+12.4%',
        isUp: true,
        icon: 'ShieldAlert',
        fmt: (n: number) => Math.round(n).toLocaleString(),
      },
      {
        label: 'Critical Vulnerabilities',
        val: criticalCount > 0 ? criticalCount : 38,
        delta: '+3',
        isUp: true,
        icon: 'AlertOctagon',
        fmt: (n: number) => Math.round(n).toLocaleString(),
      },
      {
        label: 'Active Campaigns',
        val: campaignCount > 0 ? campaignCount : 14,
        delta: '+2.1%',
        isUp: true,
        icon: 'Network',
        fmt: (n: number) => Math.round(n).toLocaleString(),
      },
    ],
    [emailCount, threatCount, criticalCount, campaignCount]
  );

  // Activity Area Chart (24H or 7D)
  const activity = useMemo((): ActivityPoint[] => {
    if (activeTab === '7D') {
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const now = new Date();
      const baseScanned = [1420, 1850, 2100, 1950, 2400, 2150, 1800];
      const baseThreats = [110, 160, 190, 140, 220, 180, 130];

      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        const label = i === 6 ? 'Today' : dayLabels[d.getDay()];
        return {
          hour: label,
          threats: emailCount > 0 ? (i === 6 ? threatCount : Math.max(1, Math.round(threatCount * 0.7))) : baseThreats[i],
          scanned: emailCount > 0 ? (i === 6 ? emailCount : Math.max(2, Math.round(emailCount * 0.85))) : baseScanned[i],
        };
      });
    }

    // 24H view
    const defaultHours = [
      { h: '00:00', s: 420, t: 28 }, { h: '02:00', s: 310, t: 19 },
      { h: '04:00', s: 280, t: 14 }, { h: '06:00', s: 510, t: 35 },
      { h: '08:00', s: 980, t: 84 }, { h: '10:00', s: 1420, t: 122 },
      { h: '12:00', s: 1680, t: 145 }, { h: '14:00', s: 1890, t: 168 },
      { h: '16:00', s: 1720, t: 150 }, { h: '18:00', s: 1350, t: 110 },
      { h: '20:00', s: 920, t: 72 }, { h: '22:00', s: 640, t: 48 },
    ];

    return defaultHours.map((pt) => ({
      hour: pt.h,
      scanned: emailCount > 0 ? Math.max(pt.s, Math.round(emailCount * 0.15)) : pt.s,
      threats: threatCount > 0 ? Math.max(pt.t, Math.round(threatCount * 0.12)) : pt.t,
    }));
  }, [activeTab, emailCount, threatCount]);

  // Threat Category Distribution Pie Data
  const threatCategories: AttackSlice[] = useMemo(() => {
    if (analyzedReports.length > 0) {
      const counts: Record<string, number> = {
        'Executive BEC': 0,
        'Credential Phishing': 0,
        'Domain Spoofing': 0,
        'Malware Payload': 0,
        'Invoice Fraud': 0,
      };

      analyzedReports.forEach((r) => {
        const v = (r.verdict || '').toLowerCase();
        if (v.includes('bec') || v.includes('wire') || v.includes('executive')) counts['Executive BEC']++;
        else if (v.includes('phish') || v.includes('credential')) counts['Credential Phishing']++;
        else if (v.includes('spoof') || v.includes('impersonat')) counts['Domain Spoofing']++;
        else if (v.includes('malware') || v.includes('trojan') || v.includes('attachment')) counts['Malware Payload']++;
        else counts['Invoice Fraud']++;
      });

      const colors = ['#3b82f6', '#6366f1', '#f59e0b', '#ef4444', '#10b981'];
      return Object.entries(counts).map(([name, value], i) => ({
        name,
        value: value || 1,
        color: colors[i % colors.length],
      }));
    }

    return [
      { name: 'Executive BEC', value: 42, color: '#3b82f6' },
      { name: 'Credential Phishing', value: 31, color: '#6366f1' },
      { name: 'Domain Spoofing', value: 16, color: '#f59e0b' },
      { name: 'Malware Payload', value: 8, color: '#ef4444' },
      { name: 'Invoice Fraud', value: 3, color: '#10b981' },
    ];
  }, [analyzedReports]);

  return (
    <div className="space-y-4">
      {/* ── 1. Top Bar / Status Header ── */}
      <SlideIn delay={20} direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-2.5">
              <span>Threat Operations Center</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Real-time email forensics, threat intelligence feeds, and automated anomaly telemetry
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm text-gray-600 dark:text-gray-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold font-mono uppercase tracking-wider">LIVE MONITORING</span>
            </div>
          </div>
        </div>
      </SlideIn>

      {/* ── 2. KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {KPI_DEFS.map((kpi, i) => {
          const Icon = ICON_MAP[kpi.icon];

          return (
            <SlideIn key={kpi.label} delay={80 + i * 50} direction="up">
              <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm transition-all duration-200 flex flex-col justify-between h-full overflow-hidden">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Squircle icon container (Sentinel-X signature design) */}
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[#edf5ff] dark:bg-white border border-blue-100 dark:border-white text-blue-600 dark:text-blue-600 shadow-sm transition-colors shrink-0">
                      {Icon && <Icon className="w-5 h-5 stroke-[2.2]" />}
                    </div>
                    {/* Delta percentage indicator */}
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-bold font-mono shrink-0 ${
                        kpi.isUp
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {kpi.isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {kpi.delta}
                    </span>
                  </div>

                  <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight truncate font-mono">
                    <LiveNumber value={typeof kpi.val === 'number' ? kpi.val : 0} fmt={kpi.fmt} />
                  </p>
                </div>

                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-2.5 truncate">
                  {kpi.label}
                </p>
              </div>
            </SlideIn>
          );
        })}
      </div>

      {/* ── 3. Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Email Threat Activity Area Chart */}
        <SlideIn delay={300} direction="left" className="lg:col-span-3">
          <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-zinc-100">
                      Email Ingestion &amp; Threat Telemetry
                    </h2>
                    <motion.span
                      animate={{ opacity: [1, 0.25, 1], scale: [1, 0.97, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black font-mono tracking-wider text-white bg-emerald-500 dark:bg-emerald-500 shadow-sm shadow-emerald-500/30 border border-emerald-400/40 select-none cursor-default"
                    >
                      LIVE
                    </motion.span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {activeTab === '24H' ? '24-hour inbound email telemetry · threat verdict breakdown' : '7-day trend analysis · threat posture history'}
                  </p>
                </div>

                {/* Range Toggle with smooth sliding animation */}
                <div className="relative flex items-center rounded-2xl p-1 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm self-start sm:self-auto select-none">
                  {(['24H', '7D'] as const).map((tab) => {
                    const isSelected = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors duration-200 cursor-pointer select-none ${
                          isSelected
                            ? 'text-white'
                            : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="activeTrafficRangeTab"
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 shadow-md shadow-blue-500/20"
                            transition={{
                              type: 'spring',
                              stiffness: 450,
                              damping: 32,
                            }}
                          />
                        )}
                        <span className="relative z-10">{tab}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs mb-3 font-medium">
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Emails Scanned
                </span>
                <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  Threats Detected
                </span>
              </div>
            </div>

            <div className="w-full h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activity} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#27272a' : '#f1f5f9'} vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: isDark ? '#71717a' : '#94a3b8', fontSize: 11, fontFamily: "'Inter', sans-serif" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#71717a' : '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CleanTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="scanned"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#gradBlue)"
                    name="Emails Scanned"
                    isAnimationActive
                  />
                  <Area
                    type="monotone"
                    dataKey="threats"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#gradIndigo)"
                    name="Threats Detected"
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SlideIn>

        {/* Right: Threat Category Distribution Donut */}
        <SlideIn delay={400} direction="right" className="lg:col-span-2">
          <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-zinc-100">
                  Threat Vectors Breakdown
                </h2>
                <span className="text-xs font-mono text-gray-400 dark:text-zinc-500">SIEM Classification</span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4">
                Distribution across phishing, BEC, spoofing, and malicious payloads
              </p>
            </div>

            <div className="relative w-full h-44 flex items-center justify-center my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={threatCategories}
                    innerRadius={52}
                    outerRadius={74}
                    paddingAngle={3}
                    dataKey="value"
                    stroke={isDark ? '#18181b' : '#ffffff'}
                    strokeWidth={2}
                    isAnimationActive
                  >
                    {threatCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CleanTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-gray-900 dark:text-zinc-100 font-mono">
                  {threatCount > 0 ? threatCount : 1247}
                </span>
                <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                  THREATS
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800/80">
              {threatCategories.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-1 text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-mono font-bold text-gray-900 dark:text-zinc-200">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SlideIn>
      </div>

      {/* ── 4. Recent Detections Table ── */}
      <SlideIn delay={520} direction="up">
        <div className="rounded-2xl p-5 sm:p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-zinc-100">
                Recent Threat Intelligence Detections
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Active phishing campaigns, BEC wire requests, and authenticated spoofing attempts
              </p>
            </div>
            <button
              onClick={() => onNavigate?.('email-analyzer')}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Analyze New Email <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-3.5">Threat ID</th>
                  <th className="py-3 px-3.5">Sender / Domain</th>
                  <th className="py-3 px-3.5">Threat Classification</th>
                  <th className="py-3 px-3.5">Severity</th>
                  <th className="py-3 px-3.5">Risk Score</th>
                  <th className="py-3 px-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-xs">
                {analyzedReports.length > 0 ? (
                  analyzedReports.slice(0, 8).map((r) => {
                    const fromHdr =
                      r.headers?.find((h) => h.key.toLowerCase() === 'from')?.value ||
                      r.threat_intel?.domain ||
                      'unknown@sender.com';
                    const sev = (r.alert_level || 'low') as Severity;
                    const status = r.alert_level === 'critical' ? 'investigating' : r.alert_level === 'high' ? 'open' : 'resolved';

                    return (
                      <tr
                        key={r.case_id}
                        onClick={() => onNavigate?.('email-analyzer')}
                        className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors duration-150"
                      >
                        <td className="py-3.5 px-3.5 font-mono text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap">
                          {r.case_id}
                        </td>
                        <td className="py-3.5 px-3.5 text-gray-900 dark:text-zinc-200 font-medium max-w-[200px] truncate" title={fromHdr}>
                          {fromHdr}
                        </td>
                        <td className="py-3.5 px-3.5 text-gray-600 dark:text-zinc-300 font-medium max-w-[220px] truncate">
                          {r.verdict || 'Suspicious Inbound Message'}
                        </td>
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <SolidBadge label={sev} variant={sev as any} />
                        </td>
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${r.threat_score}%`,
                                  backgroundColor: r.threat_score >= 70 ? '#ef4444' : r.threat_score >= 40 ? '#f59e0b' : '#10b981',
                                }}
                              />
                            </div>
                            <span className="font-mono font-bold text-gray-900 dark:text-zinc-200">
                              {r.threat_score}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                          <SolidBadge label={status} variant={status as any} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  DEFAULT_RECENT_EMAIL_THREATS.map((t) => {
                    const sev = t.severity;
                    const status = t.status.toLowerCase();

                    return (
                      <tr
                        key={t.id}
                        onClick={() => onNavigate?.('email-analyzer')}
                        className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors duration-150"
                      >
                        <td className="py-3.5 px-3.5 font-mono text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap">
                          {t.id}
                        </td>
                        <td className="py-3.5 px-3.5 text-gray-900 dark:text-zinc-200 font-medium max-w-[220px] truncate" title={t.sender}>
                          {t.sender}
                        </td>
                        <td className="py-3.5 px-3.5 text-gray-600 dark:text-zinc-300 font-medium">
                          {t.threatType}
                        </td>
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <SolidBadge label={sev} variant={sev as any} />
                        </td>
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${t.riskScore}%`,
                                  backgroundColor: t.riskScore >= 70 ? '#ef4444' : t.riskScore >= 40 ? '#f59e0b' : '#10b981',
                                }}
                              />
                            </div>
                            <span className="font-mono font-bold text-gray-900 dark:text-zinc-200">
                              {t.riskScore}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                          <SolidBadge label={status} variant={status as any} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SlideIn>
    </div>
  );
}

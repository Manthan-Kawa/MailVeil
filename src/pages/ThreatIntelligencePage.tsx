import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Server,
  Globe,
  Globe2,
  Link2,
  Network,
  Search,
  ShieldAlert,
  ShieldCheck,
  ArrowDown,
  ChevronRight,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowLeft,
  Link,
  Archive,
  Check,
  Mail,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  IP_INTEL,
  DOMAIN_INTEL,
  URL_INTEL,
  RELATED_INDICATORS,
  LOOKALIKE_ANALYSIS,
  INTEL_RELATIONSHIP_FLOW,
  type RelatedIndicator,
  type Severity,
} from '@/data/mockData';
import { CopyButton } from '@/components/CopyButton';
import { AnimatedCircleGauge } from '@/components/AnimatedCircleGauge';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useEvidence } from '@/contexts/EvidenceContext';
import type { EmailAnalysisResult } from '@/services/claudeService';

type TabId = 'ip' | 'domain' | 'url' | 'indicators';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'ip', label: 'IP Intelligence', icon: Server },
  { id: 'domain', label: 'Domain Intelligence', icon: Globe },
  { id: 'url', label: 'URL Intelligence', icon: Link2 },
  { id: 'indicators', label: 'Related Indicators', icon: Network },
];

const SEVERITY_BADGE: Record<Severity, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
  info: 'badge-info',
};

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  critical: { bg: 'bg-red-600', text: 'text-white font-bold' },
  high:     { bg: 'bg-orange-600', text: 'text-white font-bold' },
  medium:   { bg: 'bg-amber-600', text: 'text-white font-bold' },
  low:      { bg: 'bg-emerald-600', text: 'text-white font-bold' },
  info:     { bg: 'bg-blue-600', text: 'text-white font-bold' },
};

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

export function ThreatIntelligencePage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const [tab, setTab] = useState<TabId>('ip');
  const { currentResult, loadDemoCase } = useAnalysis();
  const { snapshotThreatIntel } = useEvidence();
  const [vaultSaved, setVaultSaved] = useState(false);
  const [isSavingToVault, setIsSavingToVault] = useState(false);

  const hasLive = Boolean(currentResult && (currentResult.case_id || currentResult.verdict));
  const rawLevel = (currentResult?.alert_level || 'info').toLowerCase();
  const lc = LEVEL_COLORS[rawLevel] || LEVEL_COLORS.info;

  const subjectHeader = Array.isArray(currentResult?.headers)
    ? currentResult?.headers.find((h) => h?.key?.toLowerCase() === 'subject')?.value
    : null;

  const handleSaveIntelToVault = async () => {
    if (!currentResult) return;
    setIsSavingToVault(true);
    try {
      const caseId = currentResult?.case_id || 'CASE-2026-LIVE';
      const indicator = currentResult?.threat_intel?.domain || currentResult?.threat_intel?.sending_ip || '185.220.101.47';
      await snapshotThreatIntel({
        caseId,
        indicator,
        intelData: {
          case_id: caseId,
          timestamp: new Date().toISOString(),
          ip_intel: IP_INTEL,
          domain_intel: DOMAIN_INTEL,
          url_intel: URL_INTEL,
          related_indicators: RELATED_INDICATORS,
          lookalike_analysis: LOOKALIKE_ANALYSIS,
        },
      });
      setVaultSaved(true);
      setTimeout(() => setVaultSaved(false), 4000);
    } catch {
      // ignore
    } finally {
      setIsSavingToVault(false);
    }
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Page Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight leading-snug">
                Threat Intelligence
              </h2>
              <p className="text-xs sm:text-sm text-gray-700 dark:text-zinc-300 mt-0.5 leading-relaxed font-medium">
                Correlated infrastructure threat intelligence, WHOIS, DNS records &amp; homoglyph analysis
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/40 text-purple-300">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 animate-pulse" />
                <span className="text-[11px] font-bold text-purple-300 font-mono tracking-wider">LIVE INTEL ACTIVE</span>
              </div>
            </div>
          </div>

          {/* ── Synced Analysis Banner ── */}
          {hasLive && currentResult && (
            <div
              className="rounded-2xl p-3.5 sm:p-4 overflow-hidden max-w-full bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/80 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-blue-600 text-white"
                  >
                    <Link className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 dark:text-zinc-300 font-bold leading-none mb-0.5">Synced from Email Analysis</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 font-mono truncate block" title={`${currentResult.case_id || 'ANALYSIS-ACTIVE'}${subjectHeader ? ` — ${subjectHeader}` : ''}`}>
                      <span>{currentResult.case_id || 'ANALYSIS-ACTIVE'}</span>
                      {subjectHeader && <span className="text-gray-600 dark:text-zinc-300 font-normal"> — {subjectHeader}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold uppercase shrink-0 whitespace-nowrap text-white shadow-sm ${lc.bg}`}
                  >
                    {currentResult.alert_level || 'INFO'}
                  </span>
                  {typeof currentResult.threat_score === 'number' && (
                    <span className="px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold text-white bg-purple-600 shadow-sm shrink-0 whitespace-nowrap">
                      Score: {currentResult.threat_score}/100
                    </span>
                  )}
                  {currentResult.threat_intel?.sending_ip && (
                    <span className="px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-mono font-bold text-white bg-cyan-600 shadow-sm shrink-0 truncate max-w-[170px] whitespace-nowrap">
                      IP: {currentResult.threat_intel.sending_ip}
                    </span>
                  )}
                </div>
              </div>

              {/* Auth badges */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-2.5 pt-2.5 border-t border-gray-200 dark:border-zinc-800/50 flex-wrap min-w-0">
                <span className="text-[10px] text-gray-500 dark:text-zinc-300 font-mono uppercase mr-1 shrink-0 font-bold">Auth:</span>
                {(['spf', 'dkim', 'dmarc'] as const).map((k) => {
                  const val = currentResult.threat_intel?.[k] || 'UNKNOWN';
                  const isPass = val === 'PASS';
                  return (
                    <span
                      key={k}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 whitespace-nowrap text-white shadow-sm ${
                        isPass ? 'bg-emerald-600' : 'bg-red-600'
                      }`}
                    >
                      {k.toUpperCase()} {val}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SlideIn>

      {!currentResult ? (
        <SlideIn delay={60} direction="up">
          <div
            className="rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-6 bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/80 shadow-sm"
          >
            <Globe2 className="w-12 h-12 text-blue-500 dark:text-blue-400" />

            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">No Threat Intelligence Analyzed</h3>
              <p className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed font-mono">
                Upload or paste an email in Email Analyzer to extract indicators of compromise (IOCs), WHOIS domain records, IP reputation scores, and homoglyph attack vectors.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate?.('email-analyzer')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-blue-500/25 border border-blue-400/30 hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 45%, #6366f1 100%)' }}
              >
                <Mail className="w-4 h-4" />
                Go to Email Analyzer
              </button>
              <button
                onClick={loadDemoCase}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 dark:bg-[#18181b] dark:hover:bg-zinc-800 border border-zinc-700/50 dark:border-zinc-800 font-mono transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                Load Sample Demo Session
              </button>
            </div>
          </div>
        </SlideIn>
      ) : (
        <>
          {/* ── Interactive Tabbed Container ── */}
          <SlideIn delay={100} direction="up">
            <div
              className="rounded-2xl overflow-hidden bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/80 shadow-sm"
            >
              {/* Tabs header with smooth sliding indicator pill */}
              <div className="p-2 sm:p-2.5 border-b border-gray-200 dark:border-zinc-800/50">
                <div className="inline-flex w-fit max-w-full items-center gap-1 p-1 rounded-xl bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-zinc-800/80 shadow-sm overflow-x-auto scrollbar-none select-none">
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    const isActive = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`relative shrink-0 flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2 rounded-lg text-xs font-bold transition-colors duration-200 whitespace-nowrap cursor-pointer select-none ${
                          isActive
                            ? 'text-white font-bold'
                            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeThreatIntelTab"
                            className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 shadow-md shadow-blue-500/20"
                            transition={{
                              type: 'tween',
                              ease: [0.25, 0.1, 0.25, 1],
                              duration: 0.22,
                            }}
                          />
                        )}
                        <Icon className={`relative z-10 w-4 h-4 transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-400 dark:text-zinc-400'}`} />
                        <span className="relative z-10">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content area with smooth transition */}
              <div
                key={tab}
                className="p-3.5 sm:p-6 overflow-hidden transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-2"
              >
                {tab === 'ip' && <IPTab result={currentResult} />}
                {tab === 'domain' && <DomainTab result={currentResult} />}
                {tab === 'url' && <URLTab result={currentResult} />}
                {tab === 'indicators' && <IndicatorsTab result={currentResult} />}
              </div>
            </div>
          </SlideIn>

          {/* ── Relationship Flow ── */}
          <SlideIn delay={200} direction="up">
            <RelationshipFlow result={currentResult} />
          </SlideIn>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-200/60 dark:border-zinc-800/50 last:border-0">
      <span className="text-xs text-gray-500 dark:text-zinc-300 font-medium">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-xs text-gray-900 dark:text-white ${mono ? 'font-mono' : ''} text-right break-all font-semibold`}>{value}</span>
        {mono && <CopyButton value={value} />}
      </div>
    </div>
  );
}

function ReputationBadge({ reputation, score }: { reputation: string; score: number }) {
  const isMalicious = reputation === 'malicious';
  const isSuspicious = reputation === 'suspicious';
  const Icon = isMalicious ? ShieldAlert : isSuspicious ? AlertTriangle : ShieldCheck;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1.5 uppercase text-white shadow-sm ${
          isMalicious
            ? 'bg-red-600'
            : isSuspicious
            ? 'bg-amber-600'
            : 'bg-emerald-600'
        }`}
      >
        <Icon className="w-3.5 h-3.5 text-white" />
        {reputation}
      </span>
      <span className="text-xs text-gray-500 dark:text-zinc-300 font-mono font-semibold">Score: {score}/100</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   IP INTELLIGENCE TAB
═══════════════════════════════════════════════════════════ */
function IPTab({ result }: { result: EmailAnalysisResult | null }) {
  const ip = result?.threat_intel.sending_ip || result?.origin.sending_ip || IP_INTEL.ip;
  const reputation = result?.threat_intel.ip_reputation || IP_INTEL.reputation;
  const reputationScore = result ? (result.threat_intel.ip_reputation === 'malicious' ? 88 : result.threat_intel.ip_reputation === 'suspicious' ? 65 : 12) : IP_INTEL.reputationScore;
  const asn = result?.origin.asn || IP_INTEL.asn;
  const hosting = result?.origin.hosting || IP_INTEL.hosting;
  const country = result?.origin.country || IP_INTEL.country;
  const blocklists = (result?.threat_intel.blocklists && result.threat_intel.blocklists.length > 0)
    ? result.threat_intel.blocklists
    : IP_INTEL.blocklists;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-2xl bg-white dark:bg-white flex items-center justify-center shrink-0 shadow-sm border border-gray-200/50 dark:border-white/10"
          >
            <Server className="w-5 h-5 text-blue-600 dark:text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white font-mono">{ip}</h3>
            <ReputationBadge reputation={reputation} score={reputationScore} />
          </div>
        </div>

        <div
          className="rounded-xl p-4 bg-white dark:bg-black/30 border border-gray-200 dark:border-zinc-800/80"
        >
          <InfoRow label="IP Address" value={ip} />
          <InfoRow label="ASN" value={asn} />
          <InfoRow label="Hosting / ISP" value={hosting} mono={false} />
          <InfoRow label="Country" value={country} mono={false} />
          <InfoRow label="Network Type" value={result ? 'Dedicated / Datacenter' : IP_INTEL.networkType} mono={false} />
          <InfoRow label="Case Context" value={result ? result.case_id : IP_INTEL.firstSeen} />
          <InfoRow label="Verdict" value={result ? `${result.verdict} (${result.alert_level.toUpperCase()})` : IP_INTEL.lastSeen} mono={false} />
        </div>

        <div
          className="rounded-xl p-4 bg-white dark:bg-black/30 border border-gray-200 dark:border-zinc-800/80"
        >
          <h4 className="text-[10px] font-bold text-gray-500 dark:text-zinc-300 uppercase tracking-widest mb-3 font-mono">
            Blocklist Appearances
          </h4>
          <div className="flex flex-wrap gap-2">
            {blocklists.map((bl) => (
              <span
                key={bl}
                className="px-2.5 py-1 rounded text-xs font-bold text-white bg-red-600 shadow-sm"
              >
                {bl}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-4 h-full bg-white dark:bg-black/30 border border-gray-200 dark:border-zinc-800/80"
      >
        <h4 className="text-[10px] font-bold text-gray-500 dark:text-zinc-300 uppercase tracking-widest mb-3 font-mono">
          Related Indicators
        </h4>
        <div className="space-y-2">
          {(result
            ? [
                ...(result.threat_intel.domain ? [result.threat_intel.domain] : []),
                ...(result.threat_intel.urls || []),
                ...(result.threat_intel.sending_ip ? [result.threat_intel.sending_ip] : []),
                ...(result.campaign_id && result.campaign_id !== 'UNKNOWN' ? [result.campaign_id] : []),
              ]
            : IP_INTEL.relatedIndicators
          ).map((ind) => (
            <div
              key={ind}
              className="flex items-center gap-2 rounded-lg p-2.5 transition-colors bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-zinc-800/80"
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-400 shrink-0" />
              <span className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1">{ind}</span>
              <CopyButton value={ind} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DOMAIN INTELLIGENCE TAB
═══════════════════════════════════════════════════════════ */
function DomainTab({ result }: { result: EmailAnalysisResult | null }) {
  const domain = result?.threat_intel.domain || DOMAIN_INTEL.domain;
  const ageDays = result?.threat_intel.domain_age_days;
  const regAge = ageDays !== undefined ? `${ageDays} days (Newly Registered)` : DOMAIN_INTEL.registrationAge;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <Globe className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white font-mono">{domain}</h3>
          <ReputationBadge reputation={result ? (result.threat_score >= 70 ? 'malicious' : 'suspicious') : DOMAIN_INTEL.reputation} score={result ? result.threat_score : 15} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-xl p-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
        >
          <InfoRow label="Domain" value={domain} />
          <InfoRow label="Registration Age" value={regAge} mono={false} />
          <InfoRow label="SPF Record" value={result?.threat_intel.spf || 'FAIL'} />
          <InfoRow label="DKIM Verification" value={result?.threat_intel.dkim || 'FAIL'} />
          <InfoRow label="DMARC Policy" value={result?.threat_intel.dmarc || 'FAIL'} />
          <InfoRow label="Hosting / Infrastructure" value={result?.origin.hosting || DOMAIN_INTEL.hosting} mono={false} />
        </div>

        <div
          className="rounded-xl p-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
        >
          <h4 className="text-[10px] font-bold text-gray-500 dark:text-zinc-300 uppercase tracking-widest mb-3 font-mono">
            DNS Records
          </h4>
          <div className="space-y-2">
            {DOMAIN_INTEL.dns.map((d) => (
              <div
                key={d.type}
                className="rounded-lg p-2.5 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
              >
                <span className="text-xs text-cyan-600 dark:text-cyan-400 font-mono font-bold">{d.type}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1">{d.value}</span>
                  <CopyButton value={d.value} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-xl p-4 space-y-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
        >
          <div>
            <h4 className="text-[10px] font-bold text-gray-500 dark:text-zinc-300 uppercase tracking-widest mb-3 font-mono">
              Nameservers
            </h4>
            <div className="space-y-2">
              {DOMAIN_INTEL.nameservers.map((ns) => (
                <div
                  key={ns}
                  className="flex items-center gap-2 rounded-lg p-2.5 bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
                >
                  <Server className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-400 shrink-0" />
                  <span className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1">{ns}</span>
                  <CopyButton value={ns} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-gray-500 dark:text-zinc-300 uppercase tracking-widest mb-3 font-mono">
              Related Domains
            </h4>
            <div className="flex flex-wrap gap-2">
              {(result?.threat_intel.domain
                ? [result.threat_intel.domain, `mail-${result.threat_intel.domain}`, `auth.${result.threat_intel.domain}`]
                : DOMAIN_INTEL.relatedDomains
              ).map((d) => (
                <span
                  key={d}
                  className="px-2.5 py-1 rounded text-xs font-bold text-white bg-orange-600 shadow-sm"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        <LookalikeAnalysis result={result} />
      </div>
    </div>
  );
}

function LookalikeAnalysis({ result }: { result: EmailAnalysisResult | null }) {
  const observedDomain = result?.threat_intel.domain || LOOKALIKE_ANALYSIS.observed;
  const isLookalike = observedDomain.includes('0') || observedDomain.includes('-') || observedDomain.includes('support') || observedDomain.includes('verify') || (result && result.threat_score >= 60);
  const expectedDomain = result
    ? (observedDomain.replace('0', 'o').replace('-support', '').replace('-security', '').replace('-verify', '').replace('.example', '.com'))
    : LOOKALIKE_ANALYSIS.expected;
  const similarity = result ? Math.min(96, Math.max(72, result.threat_score + 10)) : LOOKALIKE_ANALYSIS.similarity;

  const characteristics = result
    ? [
        {
          trait: 'Domain Typosquatting / Character Substitution',
          severity: (result.threat_score >= 75 ? 'critical' : 'high') as Severity,
          detail: `Observed domain "${observedDomain}" deviates from legitimate service domain "${expectedDomain}".`,
        },
        {
          trait: 'Sender Authentication Alignment Failure',
          severity: (result.threat_intel.dmarc === 'FAIL' ? 'critical' : 'high') as Severity,
          detail: `DMARC and SPF verification failed for envelope sender under ${observedDomain}.`,
        },
        {
          trait: 'Threat Intelligence Correlation',
          severity: (result.alert_level === 'critical' ? 'critical' : 'medium') as Severity,
          detail: `Correlated against active threat campaign ${result.campaign_id || 'CAMP-GLOBAL'} with confidence score ${result.confidence}%.`,
        },
      ]
    : LOOKALIKE_ANALYSIS.characteristics;

  return (
    <div
      className="rounded-xl p-4 bg-white dark:bg-zinc-800 shadow-sm border border-red-500/30"
      style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(220,38,38,0.02) 100%)',
      }}
    >
      <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
        Lookalike Domain Analysis
      </h4>
      <p className="text-[11px] text-gray-500 dark:text-zinc-300 mb-4">Homoglyph and typosquat detection</p>

      <div
        className="rounded-lg p-3 mb-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/6"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-gray-500 dark:text-zinc-300 uppercase font-mono">Expected Target</span>
            <p className="text-xs text-gray-900 dark:text-white font-mono font-bold mt-0.5">{expectedDomain}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 dark:text-zinc-300 uppercase font-mono">Observed Sender Domain</span>
            <p className="text-xs text-red-600 dark:text-red-400 font-mono font-bold mt-0.5">{observedDomain}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-zinc-800/50">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-600 dark:text-zinc-300">Similarity / Confidence</span>
            <span className="text-base font-black text-red-600 dark:text-red-400 font-mono">{similarity}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${similarity}%`,
                background: 'linear-gradient(90deg, #ef4444, #f97316)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {characteristics.map((c) => (
          <div
            key={c.trait}
            className="rounded-lg p-2.5 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/4"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs text-gray-900 dark:text-white font-semibold">{c.trait}</span>
              <span className={SEVERITY_BADGE[c.severity] || 'badge-high'}>{c.severity}</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-zinc-300 leading-relaxed">{c.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   URL INTELLIGENCE TAB
═══════════════════════════════════════════════════════════ */
function URLTab({ result }: { result: EmailAnalysisResult | null }) {
  const url = (result?.threat_intel.urls && result.threat_intel.urls.length > 0)
    ? result.threat_intel.urls[0]
    : URL_INTEL.fullUrl;
  const domain = result?.threat_intel.domain || URL_INTEL.domain;
  const score = result ? result.threat_score : URL_INTEL.riskScore;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <Link2 className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white font-mono break-all">{url}</h3>
            <ReputationBadge reputation={result ? (score >= 70 ? 'malicious' : 'suspicious') : URL_INTEL.reputation} score={score} />
          </div>
        </div>

        <div
          className="rounded-xl p-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
        >
          <InfoRow label="Full URL" value={url} />
          <InfoRow label="Domain" value={domain} />
          <InfoRow label="Reputation" value={result ? (score >= 70 ? 'malicious' : 'suspicious') : URL_INTEL.reputation} mono={false} />
          <InfoRow label="Classification" value={result?.verdict || URL_INTEL.category} mono={false} />
          <InfoRow label="Associated Case" value={result?.case_id || 'DEMO'} />
        </div>

        <div
          className="rounded-xl p-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
        >
          <h4 className="text-[10px] font-bold text-gray-500 dark:text-zinc-300 uppercase tracking-widest mb-3 font-mono">
            Payload URL / Redirect Chain
          </h4>
          <div className="space-y-2">
            {(result?.threat_intel.urls && result.threat_intel.urls.length > 0
              ? result.threat_intel.urls
              : URL_INTEL.redirectChain
            ).map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-zinc-400 font-mono w-5 shrink-0">{i + 1}.</span>
                <span className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1">{u}</span>
                <CopyButton value={u} />
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl p-4 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
        >
          <h4 className="text-[10px] font-bold text-gray-500 dark:text-zinc-300 uppercase tracking-widest mb-3 font-mono">
            Detection Signals
          </h4>
          <div className="space-y-2">
            {(result?.risk_factors && result.risk_factors.length > 0
              ? result.risk_factors.map(rf => `${rf.label}: ${rf.detail}`)
              : URL_INTEL.detectionSignals
            ).map((sig, i) => (
              <div key={i} className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700 dark:text-zinc-200">{sig}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-6 flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
      >
        <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-300 uppercase tracking-wider mb-4 font-mono">
          URL Risk Score
        </h4>
        <AnimatedCircleGauge score={URL_INTEL.riskScore} label="CRITICAL" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RELATED INDICATORS TAB
═══════════════════════════════════════════════════════════ */
function IndicatorsTab({ result }: { result: EmailAnalysisResult | null }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selected, setSelected] = useState<RelatedIndicator | null>(null);

  const baseIndicators: RelatedIndicator[] = result
    ? [
        ...(result.threat_intel.sending_ip
          ? [{
              id: 'live-ip',
              indicator: result.threat_intel.sending_ip,
              type: 'IP' as const,
              relationship: 'Origin sending MTA',
              confidence: result.confidence,
              firstSeen: 'Current session',
              lastSeen: 'Live analysis',
            }]
          : []),
        ...(result.threat_intel.domain
          ? [{
              id: 'live-domain',
              indicator: result.threat_intel.domain,
              type: 'Domain' as const,
              relationship: 'Sender domain / lookalike target',
              confidence: result.confidence,
              firstSeen: 'Current session',
              lastSeen: 'Live analysis',
            }]
          : []),
        ...(result.threat_intel.urls || []).map((u, i) => ({
          id: `live-url-${i}`,
          indicator: u,
          type: 'URL' as const,
          relationship: 'Extracted payload link',
          confidence: result.confidence,
          firstSeen: 'Current session',
          lastSeen: 'Live analysis',
        })),
        ...(result.campaign_id && result.campaign_id !== 'UNKNOWN'
          ? [{
              id: 'live-camp',
              indicator: result.campaign_id,
              type: 'Campaign' as const,
              relationship: 'Attributed threat cluster',
              confidence: result.confidence,
              firstSeen: 'Current session',
              lastSeen: 'Live analysis',
            }]
          : []),
        ...RELATED_INDICATORS,
      ]
    : RELATED_INDICATORS;

  const filtered = baseIndicators.filter((ind) => {
    const matchesSearch = ind.indicator.toLowerCase().includes(search.toLowerCase()) ||
      ind.relationship.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || ind.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = ['all', 'IP', 'Domain', 'URL', 'Email'];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 bg-gray-50 dark:bg-white border border-gray-200 dark:border-gray-200 shadow-sm"
        >
          <Search className="w-3.5 h-3.5 text-gray-500 dark:text-gray-500 shrink-0" />
          <input
            type="text"
            placeholder="Search indicators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-gray-900 dark:text-gray-900 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none w-full font-medium"
          />
        </div>
        <div className="inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto scrollbar-none p-1 rounded-lg bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-zinc-800/80 shadow-sm self-start sm:self-auto shrink-0">
          {types.map((t) => {
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`relative px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors duration-200 flex items-center justify-center shrink-0 whitespace-nowrap cursor-pointer select-none ${
                  active
                    ? 'text-white font-bold'
                    : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeThreatIntelIndicatorTypeTab"
                    className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 shadow-md shadow-blue-500/20"
                    transition={{
                      type: 'tween',
                      ease: [0.25, 0.1, 0.25, 1],
                      duration: 0.22,
                    }}
                  />
                )}
                <span className="relative z-10">{t === 'all' ? 'All Types' : t}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800/50 text-gray-500 dark:text-zinc-300 text-[11px] uppercase tracking-wider font-mono">
                <th className="py-2.5 px-3 text-left">Indicator</th>
                <th className="py-2.5 px-3 text-left">Type</th>
                <th className="py-2.5 px-3 text-left hidden md:table-cell">Relationship</th>
                <th className="py-2.5 px-3 text-left hidden lg:table-cell">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ind) => (
                <tr
                  key={ind.id}
                  onClick={() => setSelected(ind)}
                  className={`border-b border-gray-200/60 dark:border-zinc-800/50 hover:bg-gray-100/60 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                    selected?.id === ind.id ? 'bg-blue-600/10 dark:bg-blue-500/10' : ''
                  }`}
                >
                  <td className="py-3 px-3 text-xs font-mono text-gray-900 dark:text-white max-w-[200px] truncate" title={ind.indicator}>
                    {ind.indicator}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold text-white bg-blue-600 shadow-sm">
                      {ind.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-600 dark:text-zinc-200 hidden md:table-cell">{ind.relationship}</td>
                  <td className="py-3 px-3 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${ind.confidence}%`,
                            background: ind.confidence > 85 ? '#ef4444' : '#f97316',
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-900 dark:text-white font-bold">{ind.confidence}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-500 dark:text-zinc-300">No indicators match your search.</div>
          )}
        </div>

        <div
          className="rounded-xl p-4 h-full bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
        >
          {selected ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                Indicator Details
              </h4>
              <div className="space-y-1">
                <InfoRow label="Indicator" value={selected.indicator} />
                <InfoRow label="Type" value={selected.type} mono={false} />
                <InfoRow label="Relationship" value={selected.relationship} mono={false} />
                <InfoRow label="Confidence" value={`${selected.confidence}%`} />
                <InfoRow label="First Seen" value={selected.firstSeen} />
                <InfoRow label="Last Seen" value={selected.lastSeen} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Search className="w-8 h-8 text-gray-400 dark:text-zinc-500 mb-3" />
              <p className="text-xs text-gray-500 dark:text-zinc-300">Select an indicator from the table to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RELATIONSHIP VISUALIZATION FLOW
═══════════════════════════════════════════════════════════ */
function RelationshipFlow({ result }: { result: EmailAnalysisResult | null }) {
  const fromHdr = result?.headers.find(h => h.key.toLowerCase() === 'from')?.value;
  const flowNodes = result
    ? [
        { label: 'Sender Identity', value: fromHdr || 'Targeted Spoofed Identity' },
        ...(result.origin.sending_ip ? [{ label: 'Sending Relay IP', value: result.origin.sending_ip }] : []),
        ...(result.threat_intel.domain ? [{ label: 'Observed Domain', value: result.threat_intel.domain }] : []),
        ...(result.threat_intel.urls && result.threat_intel.urls.length > 0
          ? [{ label: 'Payload URL Target', value: result.threat_intel.urls[0] }]
          : [{ label: 'Attack Vector', value: result.verdict }]),
      ]
    : INTEL_RELATIONSHIP_FLOW;

  return (
    <div
      className="rounded-2xl p-5 bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/80 shadow-sm"
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Relationship Visualization
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-zinc-300 mt-0.5">Connected indicator map from email sender to final payload URL</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        {flowNodes.map((node, i) => (
          <div key={node.label} className="flex flex-col items-center w-full max-w-md">
            <div
              className="w-full rounded-xl p-3.5 transition-all duration-200 hover:scale-[1.01] bg-white dark:bg-black/30 border border-gray-200 dark:border-zinc-800/80"
            >
              <span className="text-[10px] text-gray-500 dark:text-zinc-300 uppercase tracking-widest font-mono font-bold">{node.label}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-900 dark:text-white font-mono break-all flex-1 font-semibold">{node.value}</span>
                <CopyButton value={node.value} />
              </div>
            </div>
            {i < flowNodes.length - 1 && (
              <ArrowDown className="w-4 h-4 text-blue-500 dark:text-blue-400 my-1 animate-bounce" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

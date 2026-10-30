import { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  MapPin,
  Server,
  Globe,
  Shield,
  Info,
  AlertTriangle,
  Crosshair,
  Maximize,
  RotateCcw,
  Mail,
  Link2,
  Network,
  Share2,
  FolderSearch,
  Sparkles,
  User,
  FileText,
  Hash,
  Archive,
  Check,
  type LucideIcon,
} from 'lucide-react';
import {
  INFRA_LOCATIONS,
  ORIGIN_CONFIDENCE,
  type InfraLocation,
} from '@/data/mockData';
import { CopyButton } from '@/components/CopyButton';
import { DarkCyberMap } from '@/components/DarkCyberMap';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useEvidence } from '@/contexts/EvidenceContext';
import { ArrowLeft, Link } from 'lucide-react';
import type { EmailAnalysisResult } from '@/services/claudeService';
import { liveGeoLookup } from '@/services/claudeService';
import { resolveGeoLocation, extractOriginatingSenderTelemetry } from '@/utils/geoUtils';

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

const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.35)',   text: 'text-red-600 dark:text-red-400',    glow: 'none' },
  high:     { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.35)',  text: 'text-orange-600 dark:text-orange-400', glow: 'none' },
  medium:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.35)',  text: 'text-amber-600 dark:text-amber-400',  glow: 'none' },
  low:      { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.35)',  text: 'text-blue-600 dark:text-blue-400',   glow: 'none' },
  info:     { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.35)', text: 'text-gray-600 dark:text-zinc-400 dark:text-gray-400',   glow: 'none' },
};

export function OriginInvestigationPage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const { currentResult, loadDemoCase } = useAnalysis();
  const { snapshotOriginTrace } = useEvidence();
  const hasLive = Boolean(currentResult && (currentResult.case_id || currentResult.verdict));
  const rawLevel = (currentResult?.alert_level || 'info').toLowerCase();
  const lc = LEVEL_COLORS[rawLevel] || LEVEL_COLORS.info;
  const subjectHeader = Array.isArray(currentResult?.headers)
    ? currentResult?.headers.find((h) => h?.key?.toLowerCase() === 'subject')?.value
    : null;

  // ── Async live geo state ────────────────────────────────────────────────────
  const [liveMarkers, setLiveMarkers] = useState<InfraLocation[]>(INFRA_LOCATIONS);
  const [selected, setSelected] = useState<InfraLocation | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Derive the originating IP once so we can use it as a dep
  const originIp =
    currentResult?.origin?.sending_ip ||
    currentResult?.threat_intel?.sending_ip ||
    '';

  useEffect(() => {
    if (!currentResult) {
      setLiveMarkers(INFRA_LOCATIONS);
      setSelected(INFRA_LOCATIONS[0]);
      return;
    }

    let cancelled = false;
    setGeoLoading(true);

    // Build markers with live geo lookup for the primary IP
    const buildMarkers = async () => {
      // --- Primary origin marker ---
      const telemetry = extractOriginatingSenderTelemetry(
        currentResult.headers || [],
        originIp
      );
      const resolvedIp = telemetry.sendingIp || originIp;

      // Defaults from static table
      let lat = telemetry.lat;
      let lng = telemetry.lng;
      let city = telemetry.city;
      let country = telemetry.country;
      let countryCode = telemetry.countryCode;
      let asn = telemetry.asn || 'AS-Unknown';
      let asnOrg = telemetry.asnOrg || 'Infrastructure';
      let hosting = telemetry.hosting || 'Hosting Node';

      // Live geo ALWAYS overrides static — this bypasses stale localStorage data
      const live = await liveGeoLookup(resolvedIp);
      if (live && !cancelled) {
        lat = live.lat;
        lng = live.lon;
        city = live.city || live.region || live.country || city;
        country = live.country || country;
        countryCode = live.country_code || countryCode;
        if (live.connection.asn) asn = `AS${live.connection.asn}`;
        if (live.connection.isp || live.connection.org) {
          asnOrg = live.connection.isp || live.connection.org || asnOrg;
          hosting = asnOrg;
        }
      }

      if (cancelled) return;

      const primaryMarker: InfraLocation = {
        id: 'live-origin-relay',
        city,
        country,
        countryCode,
        lat,
        lng,
        ip: resolvedIp,
        asn,
        asnOrg,
        hosting,
        confidence: currentResult.confidence || 88,
        role: 'Isolated Originating Sender (Earliest Received Hop)',
        evidence: [
          `Earliest Received: from line isolated at bottom of MTA chain: ${telemetry.host || 'Origin Relay'}`,
          `Public Originating IP: ${resolvedIp} (internal webmail / loopbacks filtered)`,
          `Geolocated coordinates: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E (${city}, ${country})`,
          `ISP / Network: ${asn} (${asnOrg})`,
          `Domain authentication: SPF=${currentResult.threat_intel?.spf || 'FAIL'}, DMARC=${currentResult.threat_intel?.dmarc || 'FAIL'}`,
          `Attribution confidence: ${currentResult.confidence || 88}% aligned with case ${currentResult.case_id || 'ACTIVE'}`,
        ],
      };

      // --- Relay hop markers (static geo) ---
      const hopMarkers: InfraLocation[] = (currentResult.origin?.relay_hops || []).slice(1).map((hop, i) => {
        const hopGeo = resolveGeoLocation({ country: hop.country, sending_ip: hop.ip });
        return {
          id: `live-hop-${hop.hop || i + 2}`,
          city: hopGeo.city,
          country: hopGeo.country,
          countryCode: hopGeo.countryCode,
          lat: hopGeo.lat,
          lng: hopGeo.lng,
          ip: hop.ip || '198.51.100.25',
          asn: `Hop ${hop.hop || i + 2}`,
          asnOrg: hop.hostname || 'Transit Gateway Node',
          hosting: 'Intermediate Relay Infrastructure',
          confidence: Math.max(45, (currentResult.confidence || 88) - (i + 1) * 12),
          role: `Relay Hop #${hop.hop || i + 2} — ${hop.note || 'Transit Point'}`,
          evidence: [
            `Received header trace: ${hop.hostname || hop.ip}`,
            `Transit node geolocated to ${hopGeo.city}, ${hopGeo.country}`,
          ],
        };
      });

      const markers = hopMarkers.length > 0
        ? [primaryMarker, ...hopMarkers]
        : [primaryMarker, ...INFRA_LOCATIONS.slice(1)];

      setLiveMarkers(markers);
      setSelected(markers[0]);
      setGeoLoading(false);
    };

    buildMarkers().catch(() => setGeoLoading(false));

    return () => { cancelled = true; };
  // Re-run whenever the originating IP changes (not just case_id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResult?.case_id, originIp]);

  const [vaultSaved, setVaultSaved] = useState(false);
  const [isSavingToVault, setIsSavingToVault] = useState(false);

  const handleSaveOriginToVault = async () => {
    setIsSavingToVault(true);
    try {
      const caseId = currentResult?.case_id || 'CASE-2026-0471';
      await snapshotOriginTrace({
        caseId,
        originData: {
          case_id: caseId,
          timestamp: new Date().toISOString(),
          origin: currentResult?.origin || { sending_ip: originIp },
          locations: liveMarkers,
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
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight leading-snug">
                Origin Investigation
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-0.5 leading-relaxed font-medium">
                Geographic infrastructure triangulation, network session routing &amp; origin relay telemetry
              </p>
            </div>
          </div>

          {/* ── Synced Analysis Banner ── */}
          {hasLive && currentResult && (
            <div
              className="bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/80 rounded-2xl shadow-sm p-3.5 sm:p-4 overflow-hidden max-w-full"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <Link className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-600 dark:text-zinc-400 font-bold leading-none mb-0.5">
                      Synced from Email Analysis
                    </p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white font-mono truncate block" title={`${currentResult.case_id || 'ANALYSIS-ACTIVE'}${subjectHeader ? ` — ${subjectHeader}` : ''}`}>
                      <span>{currentResult.case_id || 'ANALYSIS-ACTIVE'}</span>
                      {subjectHeader && <span className="text-gray-600 dark:text-gray-300 font-normal"> — {subjectHeader}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span
                    className="px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold uppercase shrink-0 whitespace-nowrap text-white shadow-sm border border-white/10"
                    style={{
                      background:
                        rawLevel === 'low'
                          ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
                          : rawLevel === 'medium'
                          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                          : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    }}
                  >
                    {currentResult.alert_level?.toUpperCase() || 'CRITICAL'}
                  </span>
                  {typeof currentResult.threat_score === 'number' && (
                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold text-white shadow-sm border border-white/10 shrink-0 whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
                    >
                      Posture Score: {currentResult.threat_score}/100
                    </span>
                  )}
                  {typeof currentResult.confidence === 'number' && (
                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold text-white shadow-sm border border-white/10 shrink-0 whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                    >
                      Confidence: {currentResult.confidence}%
                    </span>
                  )}
                  {(currentResult.origin?.sending_ip || currentResult.threat_intel?.sending_ip) && (
                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold font-mono text-white shadow-sm border border-white/10 shrink-0 whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
                    >
                      IP: {currentResult.origin?.sending_ip || currentResult.threat_intel?.sending_ip}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </SlideIn>

      {!currentResult ? (
        <SlideIn delay={60} direction="up">
          <div
            className="rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-6 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm border dark:border-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <MapPin className="w-12 h-12 text-blue-500 dark:text-blue-400" />

            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 tracking-tight">No Origin Telemetry in Session</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-mono">
                Upload or paste an email in Email Analyzer to inspect its physical server origin, ASN route telemetry, live GeoIP resolution, and bulletproof relay path.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate?.('email-analyzer')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 font-mono cursor-pointer"
              >
                <MapPin className="w-4 h-4" />
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
          {/* ── Top Row: Infrastructure Map (2/3) | Details (1/3) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SlideIn delay={100} direction="left" className="lg:col-span-2">
              <div
                className="rounded-2xl p-5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm border dark:border-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              >
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    Infrastructure Map
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                    Suspected attacker origin relay pointer with real-time live pulse telemetry
                  </p>
                </div>
                <DarkCyberMap
                  markers={liveMarkers}
                  selectedId={selected?.id}
                  singlePointerMode={true}
                  onSelectMarker={(m) => {
                    const found = liveMarkers.find((loc) => loc.id === m.id);
                    if (found) setSelected(found);
                  }}
                  height="h-[300px] sm:h-[420px]"
                />
              </div>
            </SlideIn>

            <SlideIn delay={160} direction="right" className="lg:col-span-1">
              <LocationDetailPanel location={selected} />
            </SlideIn>
          </div>

          {/* ── Horizontal Divider Line ── */}
          <div className="w-full h-px bg-slate-200 dark:bg-zinc-800" />

          {/* ── Bottom Row: Origin Confidence Engine (Full Width) ── */}
          <SlideIn delay={220} direction="up">
            <OriginConfidenceEngine result={currentResult} />
          </SlideIn>
        </>
      )}
    </div>
  );
}

function LocationDetailPanel({ location }: { location: InfraLocation | null }) {
  if (!location) {
    return (
      <div
        className="rounded-2xl p-5 flex flex-col items-center justify-center text-center py-10 h-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm border dark:border-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      >
        <Crosshair className="w-8 h-8 text-gray-400 dark:text-zinc-500 mb-3" />
        <p className="text-xs text-gray-600 dark:text-zinc-400">Select a location on the map to view infrastructure details</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 h-full flex flex-col justify-between bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm border dark:border-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            {location.city}, {location.country}
          </h3>
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-300 mt-1 font-mono">{location.role}</p>
        </div>

        <div className="space-y-1">
          <DetailRow label="Country" value={`${location.country} (${location.countryCode})`} />
          <DetailRow label="City/Region" value={location.city} />
          <DetailRow label="IP Address" value={location.ip} />
          <DetailRow label="ASN" value={`${location.asn} (${location.asnOrg})`} />
          <DetailRow label="Hosting" value={location.hosting} mono={false} />
          <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-200/60 dark:border-zinc-800/50 last:border-0">
            <span className="text-xs text-gray-500 dark:text-zinc-400 dark:text-gray-400 font-medium">Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${location.confidence}%`,
                    background: location.confidence >= 75 ? '#ef4444' : '#f97316',
                  }}
                />
              </div>
              <span className="text-xs font-mono text-gray-900 dark:text-zinc-100 font-bold">{location.confidence}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-zinc-800/50">
        <h4 className="text-[10px] text-gray-500 dark:text-zinc-400 dark:text-gray-400 uppercase tracking-widest font-mono font-bold mb-2.5">
          Supporting Evidence
        </h4>
        <div className="space-y-2">
          {location.evidence.map((e, i) => (
            <div key={i} className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <span className="text-xs text-gray-700 dark:text-zinc-300 dark:text-gray-300 leading-relaxed">{e}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-200/60 dark:border-zinc-800/50 last:border-0">
      <span className="text-xs text-gray-500 dark:text-zinc-400 dark:text-gray-400 font-medium">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-xs text-gray-900 dark:text-zinc-100 ${mono ? 'font-mono' : ''} text-right break-all font-semibold`}>{value}</span>
        {mono && <CopyButton value={value} />}
      </div>
    </div>
  );
}

function OriginConfidenceEngine({ result }: { result: EmailAnalysisResult | null }) {
  const geo = resolveGeoLocation({
    country: result?.origin?.country,
    city: result?.origin?.city,
    sending_ip: result?.origin?.sending_ip || result?.threat_intel?.sending_ip,
    latitude: result?.origin?.latitude,
    longitude: result?.origin?.longitude,
    asn: result?.origin?.asn,
    hosting: result?.origin?.hosting,
  });

  const probableSource = result
    ? `${geo.city}, ${geo.country} (${result.origin?.asn || geo.asn || 'AS-Infrastructure'} — ${result.origin?.hosting || geo.hosting || 'Hosting Node'})`
    : ORIGIN_CONFIDENCE.probableSource;
  const confidence = result ? (result.confidence || 88) : ORIGIN_CONFIDENCE.confidence;

  const signals = result
    ? [
        {
          signal: 'Earliest Received Hop Isolation',
          weight: 35,
          detail: `Originating sender IP ${result.origin?.sending_ip || result.threat_intel?.sending_ip || '185.220.101.47'} isolated from earliest 'Received: from' line at chain bottom (geolocated to ${geo.city}, ${geo.country}; internal loopbacks filtered).`,
        },
        {
          signal: 'Autonomous System Number (ASN)',
          weight: 25,
          detail: `${result.origin?.asn || geo.asn || 'AS200651'} (${result.origin?.hosting || geo.hosting || 'Infrastructure'}) registered to hosting entity.`,
        },
        {
          signal: 'Mail Relay Hop Trace Correlation',
          weight: 25,
          detail: `Reconstructed ${result.origin?.relay_hops?.length || 1} relay hop(s) in Received header timeline.`,
        },
        {
          signal: 'Sender Policy Alignment (SPF/DKIM/DMARC)',
          weight: 15,
          detail: `Authentication verdict: SPF=${result.threat_intel?.spf || 'FAIL'}, DKIM=${result.threat_intel?.dkim || 'FAIL'}, DMARC=${result.threat_intel?.dmarc || 'FAIL'}.`,
        },
      ]
    : ORIGIN_CONFIDENCE.signals;

  return (
    <div
      className="rounded-2xl p-6 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm border dark:border-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          Origin Confidence Engine
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">Probable origin based on supporting telemetry signals</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
        <div
          className="rounded-xl p-4 lg:col-span-1 flex flex-col justify-center bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50"
        >
          <span className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase tracking-widest font-mono font-bold">Probable Source Infrastructure</span>
          <p className="text-sm text-gray-900 dark:text-zinc-100 font-bold mt-1 font-mono">{probableSource}</p>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Confidence</span>
            <div className="flex-1 h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${confidence}%`,
                  background: 'linear-gradient(90deg, #00d2ff, #3b82f6)',
                }}
              />
            </div>
            <span className="text-xs font-bold font-mono text-cyan-600 dark:text-cyan-400">{confidence}%</span>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {signals.map((s) => (
            <div
              key={s.signal}
              className="rounded-xl p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800/50 hover:border-zinc-700/80 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-900 dark:text-zinc-100 font-semibold">{s.signal}</span>
                <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">+{s.weight}%</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex items-start gap-2.5 rounded-xl p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25"
      >
        <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-700 dark:text-zinc-300 leading-relaxed">
          <span className="text-gray-900 dark:text-zinc-100 font-bold">Geographic location is an inference.</span> IP geolocation
          reflects hosting infrastructure location, not physical attacker location. VPNs &amp; proxies mask true origin.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ATTACK GRAPH PAGE — uses shared AttackGraph component
═══════════════════════════════════════════════════════════ */
import { AttackGraphCanvas } from '@/components/AttackGraph';

export function AttackGraphPage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const { currentResult, loadDemoCase } = useAnalysis();
  const hasLive = Boolean(currentResult && (currentResult.case_id || currentResult.verdict));
  const rawLevel = (currentResult?.alert_level || 'info').toLowerCase();
  const lc = LEVEL_COLORS[rawLevel] || LEVEL_COLORS.info;
  const subjectHeader = Array.isArray(currentResult?.headers)
    ? currentResult?.headers.find((h) => h?.key?.toLowerCase() === 'subject')?.value
    : null;

  return (
    <div className="space-y-4" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-zinc-100 tracking-tight leading-snug">Attack Graph</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 mt-0.5 leading-relaxed font-medium">
                Interactive entity correlation network — click any node to inspect details
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0 self-start sm:self-center">
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/40 text-purple-300"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                <span className="text-[11px] font-bold text-purple-300 font-mono tracking-wider">LIVE GRAPH ACTIVE</span>
              </div>
            </div>
          </div>

          {/* ── Synced Analysis Banner ── */}
          {hasLive && currentResult && (
            <div
              className="bg-gray-50 dark:bg-zinc-900/60 border border-gray-200 dark:border-zinc-800/80 rounded-2xl shadow-sm p-3.5 sm:p-4 overflow-hidden max-w-full"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <Link className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-600 dark:text-zinc-400 font-bold leading-none mb-0.5">
                      Synced from Email Analysis
                    </p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white font-mono truncate" title={`${currentResult.case_id || 'ANALYSIS-ACTIVE'}${subjectHeader ? ` — ${subjectHeader}` : ''}`}>
                      <span>{currentResult.case_id || 'ANALYSIS-ACTIVE'}</span>
                      {subjectHeader && <span className="text-gray-600 dark:text-gray-300 font-normal"> — {subjectHeader}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span
                    className="px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold uppercase shrink-0 whitespace-nowrap text-white shadow-sm border border-white/10"
                    style={{
                      background:
                        rawLevel === 'low'
                          ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
                          : rawLevel === 'medium'
                          ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                          : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    }}
                  >
                    {currentResult.alert_level?.toUpperCase() || 'CRITICAL'}
                  </span>
                  {typeof currentResult.threat_score === 'number' && (
                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold text-white shadow-sm border border-white/10 shrink-0 whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
                    >
                      Posture Score: {currentResult.threat_score}/100
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </SlideIn>

      {!currentResult ? (
        <SlideIn delay={60} direction="up">
          <div
            className="rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-6 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-sm border dark:border-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <Share2 className="w-12 h-12 text-blue-500 dark:text-blue-400" />

            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 tracking-tight">No Attack Graph in Session</h3>
              <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-mono">
                Upload or paste an email in Email Analyzer to generate an interactive multi-node attack topology mapping senders, infrastructure, hashes, and associated campaign clusters.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate?.('email-analyzer')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all hover:scale-105 active:scale-95 font-mono cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
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
        <SlideIn delay={100} direction="up">
          <AttackGraphCanvas result={currentResult} onNavigate={onNavigate} height={620} showHeader={true} />
        </SlideIn>
      )}
    </div>
  );
}



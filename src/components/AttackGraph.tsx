/**
 * Shared Attack Graph Component
 * Used by both AttackGraphPage (OriginInvestigationPage) and ReportsPage.
 * Renders the full 11-node ReactFlow topology graph with minimap, legend,
 * node details panel and the same layout engine as the dedicated Attack Graph page.
 */
import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import ReactFlow, {
  Background,
  
  MiniMap,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useTheme } from '@/context/ThemeContext';

/* ── Graph Positions Persistence Helper ─────────────────────────────────── */
export const KEY_GRAPH_POSITIONS_PREFIX = 'sentinel_attack_graph_pos_';

/** Returns user-repositioned node coordinates for a given case ID if available */
export function getStoredGraphPositions(caseId?: string): Record<string, { x: number; y: number }> | null {
  if (!caseId) return null;
  try {
    const raw = localStorage.getItem(`${KEY_GRAPH_POSITIONS_PREFIX}${caseId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

/** Saves user-repositioned node coordinates for a case ID */
export function saveStoredGraphPositions(caseId: string, positions: Record<string, { x: number; y: number }>): void {
  if (!caseId) return;
  try {
    localStorage.setItem(`${KEY_GRAPH_POSITIONS_PREFIX}${caseId}`, JSON.stringify(positions));
  } catch { /* ignore */ }
}

/** Clears customized node coordinates, reverting to default algorithmic layout */
export function clearStoredGraphPositions(caseId?: string): void {
  if (!caseId) return;
  try {
    localStorage.removeItem(`${KEY_GRAPH_POSITIONS_PREFIX}${caseId}`);
  } catch { /* ignore */ }
}
import {
  Mail,
  User,
  Server,
  Globe,
  Link2,
  FileText,
  Hash,
  Network,
  FolderSearch,
  Shield,
  Info,
  type LucideIcon,
} from 'lucide-react';
import type { AttackGraphNode as AGNode, GraphNodeType } from '@/data/mockData';
import { ATTACK_GRAPH_NODES, ATTACK_GRAPH_EDGES } from '@/data/mockData';
import { CopyButton } from '@/components/CopyButton';
import type { EmailAnalysisResult } from '@/services/claudeService';
import { resolveGeoLocation } from '@/utils/geoUtils';

// ── Node colour config (shared palette) ─────────────────────────────────────
export const NODE_CFG: Record<GraphNodeType, {
  icon: LucideIcon; iconColor: string;
  border: string; headerBg: string; label: string;
}> = {
  email: { icon: Mail, iconColor: '#f43f5e', border: '#f43f5e', headerBg: 'rgba(244,63,94,0.15)', label: 'EMAIL' },
  sender: { icon: User, iconColor: '#f97316', border: '#f97316', headerBg: 'rgba(249,115,22,0.15)', label: 'SENDER' },
  domain: { icon: Globe, iconColor: '#3b82f6', border: '#3b82f6', headerBg: 'rgba(59,130,246,0.15)', label: 'DOMAIN' },
  ip: { icon: Server, iconColor: '#eab308', border: '#eab308', headerBg: 'rgba(234,179,8,0.15)', label: 'IP' },
  url: { icon: Link2, iconColor: '#ea580c', border: '#ea580c', headerBg: 'rgba(234,88,12,0.15)', label: 'URL' },
  attachment: { icon: FileText, iconColor: '#14b8a6', border: '#14b8a6', headerBg: 'rgba(20,184,166,0.15)', label: 'ATTACHMENT' },
  hash: { icon: Hash, iconColor: '#2563eb', border: '#2563eb', headerBg: 'rgba(37,99,235,0.15)', label: 'HASH' },
  mailserver: { icon: Server, iconColor: '#8b5cf6', border: '#8b5cf6', headerBg: 'rgba(139,92,246,0.15)', label: 'MAIL SERVER' },
  asn: { icon: Network, iconColor: '#6366f1', border: '#6366f1', headerBg: 'rgba(99,102,241,0.15)', label: 'ASN' },
  campaign: { icon: FolderSearch, iconColor: '#ec4899', border: '#ec4899', headerBg: 'rgba(236,72,153,0.15)', label: 'CAMPAIGN' },
  case: { icon: Shield, iconColor: '#8b5cf6', border: '#8b5cf6', headerBg: 'rgba(139,92,246,0.15)', label: 'CASE' },
};

// ── Custom Node Renderer ─────────────────────────────────────────────────────
function AttackNode({ data, selected }: NodeProps) {
  const nd = data.nodeData as AGNode;
  const cfg = NODE_CFG[nd.type] ?? NODE_CFG.email;
  const Icon = cfg.icon;

  return (
    <div
      style={{
        background: '#18181b',
        border: `1.5px solid ${selected ? '#ffffff' : cfg.border}`,
        borderRadius: '10px',
        width: '215px',
        boxShadow: selected ? '0 0 0 2px rgba(255,255,255,0.4), 0 4px 20px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        cursor: 'grab',
        userSelect: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
    >
      <Handle type="target" position={Position.Left} id="left" style={{ background: cfg.border, width: 8, height: 8, left: -4 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: cfg.border, width: 8, height: 8, right: -4 }} />
      <Handle type="target" position={Position.Top} id="top" style={{ background: cfg.border, width: 8, height: 8, top: -4 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: cfg.border, width: 8, height: 8, bottom: -4 }} />

      {/* Header Bar */}
      <div style={{ background: cfg.headerBg, borderBottom: `1px solid ${cfg.border}60`, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
        <Icon style={{ color: cfg.iconColor, width: 13, height: 13, flexShrink: 0 }} />
        <span style={{ color: cfg.iconColor, fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>
          {cfg.label}
        </span>
      </div>

      {/* Main Label */}
      <div style={{ padding: '7px 10px 4px' }}>
        <div style={{ color: '#ffffff', fontSize: '11px', fontWeight: 700, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {nd.label}
        </div>
      </div>

      {/* Detail Rows (High contrast) */}
      <div style={{ padding: '0 10px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {nd.details.map((d) => (
          <div key={d.key} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 600, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', flexShrink: 0 }}>{d.key}:</span>
            <span style={{ color: '#f3f4f6', fontSize: '10px', fontWeight: 500, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const attackNodeTypes = { attackNode: AttackNode };

// ── Layout Presets ────────────────────────────────────────────────────────────
export type LayoutStyle = 'horizontal' | 'vertical' | 'radial' | 'cascade';
export const LAYOUT_STYLES: LayoutStyle[] = ['horizontal', 'vertical', 'radial', 'cascade'];

const NODE_LAYOUTS: Record<LayoutStyle, Record<string, { x: number; y: number }>> = {
  horizontal: {
    'n-email': { x: 40, y: 60 },
    'n-hash': { x: 40, y: 260 },
    'n-sender': { x: 330, y: 60 },
    'n-mailserver': { x: 330, y: 260 },
    'n-domain': { x: 620, y: 160 },
    'n-ip': { x: 910, y: 60 },
    'n-url-1': { x: 910, y: 260 },
    'n-url-2': { x: 910, y: 440 },
    'n-asn': { x: 1200, y: 60 },
    'n-campaign': { x: 1200, y: 260 },
    'n-case': { x: 1490, y: 160 },
  },
  vertical: {
    'n-email': { x: 80, y: 40 },
    'n-hash': { x: 420, y: 40 },
    'n-sender': { x: 80, y: 230 },
    'n-mailserver': { x: 420, y: 230 },
    'n-domain': { x: 250, y: 420 },
    'n-ip': { x: 80, y: 610 },
    'n-url-1': { x: 420, y: 610 },
    'n-url-2': { x: 740, y: 610 },
    'n-asn': { x: 80, y: 800 },
    'n-campaign': { x: 420, y: 800 },
    'n-case': { x: 250, y: 990 },
  },
  radial: {
    'n-domain': { x: 480, y: 340 },
    'n-email': { x: 480, y: 60 },
    'n-sender': { x: 780, y: 140 },
    'n-ip': { x: 880, y: 340 },
    'n-asn': { x: 780, y: 540 },
    'n-campaign': { x: 480, y: 620 },
    'n-case': { x: 180, y: 540 },
    'n-url-1': { x: 80, y: 340 },
    'n-mailserver': { x: 180, y: 140 },
    'n-hash': { x: 180, y: 60 },
    'n-url-2': { x: 880, y: 540 },
  },
  cascade: {
    'n-email': { x: 40, y: 40 },
    'n-sender': { x: 330, y: 40 },
    'n-domain': { x: 620, y: 40 },
    'n-ip': { x: 910, y: 40 },
    'n-asn': { x: 1200, y: 40 },
    'n-hash': { x: 40, y: 230 },
    'n-mailserver': { x: 330, y: 230 },
    'n-url-1': { x: 620, y: 230 },
    'n-url-2': { x: 910, y: 230 },
    'n-campaign': { x: 1200, y: 230 },
    'n-case': { x: 620, y: 420 },
  },
};

// ── Graph Builder ─────────────────────────────────────────────────────────────
export function buildDynamicAttackGraph(
  result: EmailAnalysisResult | null,
  layoutStyle?: LayoutStyle,
): { nodes: AGNode[]; edges: typeof ATTACK_GRAPH_EDGES } {
  if (!result) {
    return { nodes: ATTACK_GRAPH_NODES, edges: ATTACK_GRAPH_EDGES };
  }

  const subjectHdr = result.headers?.find((h) => h.key.toLowerCase() === 'subject')?.value || 'Suspicious Email';
  const fromHdr = result.headers?.find((h) => h.key.toLowerCase() === 'from')?.value || 'Sender';
  const toHdr = result.headers?.find((h) => h.key.toLowerCase() === 'to')?.value || 'target@corp.example';
  const dateHdr = result.headers?.find((h) => h.key.toLowerCase() === 'date')?.value || new Date().toISOString().slice(0, 10);
  const mailerHdr = result.headers?.find((h) => h.key.toLowerCase() === 'x-mailer')?.value || 'PHPMailer / Automated Agent';

  const domain = result.threat_intel?.domain || 'unknown-domain.example';
  const sendingIp = result.origin?.sending_ip || result.threat_intel?.sending_ip || '185.220.101.47';
  const geo = resolveGeoLocation({
    country: result.origin?.country,
    city: result.origin?.city,
    sending_ip: sendingIp,
    latitude: result.origin?.latitude,
    longitude: result.origin?.longitude,
  });
  const asn = result.origin?.asn || geo.asn || 'AS200651';
  const hosting = result.origin?.hosting || geo.hosting || 'Bulletproof VPS';
  const campaign = result.campaign_id && result.campaign_id !== 'UNKNOWN'
    ? result.campaign_id : 'WIRE-FAUD-247';
  const evidenceHash = result.evidence?.find((e) => e.hash)?.hash
    || 'a0f8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0';
  const urls = result.threat_intel?.urls || [];

  const layout = NODE_LAYOUTS[layoutStyle ?? 'horizontal'];
  const nodes: AGNode[] = [];
  const edges: typeof ATTACK_GRAPH_EDGES = [];

  // Col 0 — Email & Hash
  nodes.push({
    id: 'n-email', type: 'email',
    label: subjectHdr.length > 22 ? `${subjectHdr.slice(0, 22)}...` : subjectHdr,
    sublabel: `Target: ${toHdr.slice(0, 20)} • Score: ${result.threat_score}/100`,
    details: [
      { key: 'Subject', value: subjectHdr },
      { key: 'Recipient', value: toHdr },
      { key: 'Date', value: dateHdr },
      { key: 'Threat Score', value: `${result.threat_score}/100` },
      { key: 'Alert Level', value: result.alert_level.toUpperCase() },
    ], x: layout['n-email'].x, y: layout['n-email'].y
  });

  nodes.push({
    id: 'n-hash', type: 'hash',
    label: `SHA-256: ${evidenceHash.slice(0, 8)}…`,
    sublabel: 'Cryptographic payload ledger hash',
    details: [
      { key: 'Algorithm', value: 'SHA-256' },
      { key: 'Digest', value: `${evidenceHash.slice(0, 22)}...` },
      { key: 'Ledger Ref', value: `BLOCK-${result.case_id.slice(-6)}` },
      { key: 'Integrity', value: 'Verified' },
    ], x: layout['n-hash'].x, y: layout['n-hash'].y
  });

  edges.push({ id: 'e-email-hash', source: 'n-email', target: 'n-hash', label: 'HASHLINK', color: '#6366f1', animated: true });

  // Col 1 — Sender & Mail Server
  nodes.push({
    id: 'n-sender', type: 'sender',
    label: fromHdr.length > 22 ? `${fromHdr.slice(0, 22)}...` : fromHdr,
    sublabel: fromHdr,
    details: [
      { key: 'Address', value: fromHdr },
      { key: 'SPF Auth', value: result.threat_intel?.spf || 'FAIL' },
      { key: 'DKIM Auth', value: result.threat_intel?.dkim || 'FAIL' },
      { key: 'Status', value: result.threat_score > 60 ? 'Untrusted Origin' : 'Verified' },
    ], x: layout['n-sender'].x, y: layout['n-sender'].y
  });

  edges.push({ id: 'e-email-sender', source: 'n-email', target: 'n-sender', label: 'RECEIVES', color: '#f97316', animated: true });

  nodes.push({
    id: 'n-mailserver', type: 'mailserver',
    label: `mx1.${domain.length > 16 ? domain.slice(0, 16) + '...' : domain}`,
    sublabel: `mailer: ${mailerHdr}`,
    details: [
      { key: 'Host', value: `mx1.${domain}` },
      { key: 'Mailer', value: mailerHdr },
      { key: 'IP', value: sendingIp },
      { key: 'Protocol', value: 'SMTP / TLS' },
    ], x: layout['n-mailserver'].x, y: layout['n-mailserver'].y
  });

  // Col 2 — Domain
  nodes.push({
    id: 'n-domain', type: 'domain',
    label: domain.length > 20 ? `${domain.slice(0, 20)}...` : domain,
    sublabel: `age: ${result.threat_intel?.domain_age_days ?? 3}d • DMARC: ${result.threat_intel?.dmarc || 'FAIL'}`,
    details: [
      { key: 'Domain', value: domain },
      { key: 'Age', value: `${result.threat_intel?.domain_age_days ?? 3} days` },
      { key: 'SPF', value: result.threat_intel?.spf || 'FAIL' },
      { key: 'DMARC', value: result.threat_intel?.dmarc || 'FAIL' },
      { key: 'Intent', value: 'Sender Root Entity' },
    ], x: layout['n-domain'].x, y: layout['n-domain'].y
  });

  edges.push({ id: 'e-sender-domain', source: 'n-sender', target: 'n-domain', label: 'RESOLVES', color: '#3b82f6', animated: true });
  edges.push({ id: 'e-domain-mailserver', source: 'n-domain', target: 'n-mailserver', label: 'MX RECORD', color: '#8b5cf6', animated: true });

  // Col 3 — IP & URLs
  nodes.push({
    id: 'n-ip', type: 'ip',
    label: sendingIp,
    sublabel: `location: ${geo.city}, ${geo.country}`,
    details: [
      { key: 'IP', value: sendingIp },
      { key: 'Geolocation', value: `${geo.city}, ${geo.country}` },
      { key: 'Reputation', value: result.threat_intel?.ip_reputation || 'malicious' },
      { key: 'Blocklists', value: `${result.threat_intel?.blocklists?.length || 3} active listings` },
    ], x: layout['n-ip'].x, y: layout['n-ip'].y
  });

  edges.push({ id: 'e-domain-ip', source: 'n-domain', target: 'n-ip', label: 'A-RECORD', color: '#eab308', animated: true });
  edges.push({ id: 'e-mailserver-ip', source: 'n-mailserver', target: 'n-ip', label: 'HOSTED AT', color: '#eab308', animated: true });

  if (urls.length > 0) {
    urls.slice(0, 2).forEach((url, idx) => {
      const urlId = `n-url-${idx + 1}`;
      const urlClean = url.replace(/^https?:\/\//, '');
      nodes.push({
        id: urlId, type: 'url',
        label: urlClean.length > 20 ? `${urlClean.slice(0, 20)}...` : urlClean,
        sublabel: `intent: Credential Capture • risk: ${result.threat_score}/100`,
        details: [
          { key: 'URL', value: url },
          { key: 'Intent', value: 'Credential Theft / Phishing' },
          { key: 'Risk Score', value: `${result.threat_score}/100` },
          { key: 'Hops', value: '3 redirects' },
        ], x: layout[`n-url-${idx + 1}`]?.x ?? (1040 + idx * 200), y: layout[`n-url-${idx + 1}`]?.y ?? (280 + idx * 160)
      });
      edges.push({ id: `e-domain-url-${idx + 1}`, source: 'n-domain', target: urlId, label: 'SERVES', color: '#ef4444', animated: true });
    });
  } else {
    nodes.push({
      id: 'n-url-1', type: 'url',
      label: `${domain}/auth-verify`,
      sublabel: `intent: Phishing Lure • risk: ${result.threat_score}/100`,
      details: [
        { key: 'URL', value: `https://${domain}/auth-verify` },
        { key: 'Intent', value: 'Phishing Landing Page' },
        { key: 'Risk Score', value: `${result.threat_score}/100` },
      ], x: layout['n-url-1'].x, y: layout['n-url-1'].y
    });
    edges.push({ id: 'e-domain-url-1', source: 'n-domain', target: 'n-url-1', label: 'SERVES', color: '#ef4444', animated: true });
  }

  // Col 4 — ASN & Campaign
  nodes.push({
    id: 'n-asn', type: 'asn',
    label: `${asn} — ${hosting.length > 14 ? hosting.slice(0, 14) + '...' : hosting}`,
    sublabel: `provider: ${hosting}`,
    details: [
      { key: 'ASN', value: asn },
      { key: 'Provider', value: hosting },
      { key: 'Abuse Rating', value: 'High' },
      { key: 'Type', value: 'Hosting Infrastructure' },
    ], x: layout['n-asn'].x, y: layout['n-asn'].y
  });

  edges.push({ id: 'e-ip-asn', source: 'n-ip', target: 'n-asn', label: 'BELONGS TO', color: '#a855f7', animated: true });

  nodes.push({
    id: 'n-campaign', type: 'campaign',
    label: campaign,
    sublabel: `confidence: ${result.confidence}% • cluster`,
    details: [
      { key: 'Cluster ID', value: campaign },
      { key: 'Confidence', value: `${result.confidence}%` },
      { key: 'Threat Pattern', value: result.verdict },
      { key: 'Status', value: 'Active SOC Tracking' },
    ], x: layout['n-campaign'].x, y: layout['n-campaign'].y
  });

  edges.push({ id: 'e-asn-campaign', source: 'n-asn', target: 'n-campaign', label: 'HOSTS', color: '#f59e0b', animated: true });
  edges.push({ id: 'e-url-campaign', source: 'n-url-1', target: 'n-campaign', label: 'PART OF', color: '#f59e0b', animated: true });

  // Col 5 — Case
  nodes.push({
    id: 'n-case', type: 'case',
    label: result.case_id,
    sublabel: `Status: Investigating • ${result.alert_level.toUpperCase()}`,
    details: [
      { key: 'Case ID', value: result.case_id },
      { key: 'Status', value: 'Under Active Investigation' },
      { key: 'Verdict', value: result.verdict },
      { key: 'Severity', value: result.alert_level.toUpperCase() },
      { key: 'Threat Score', value: `${result.threat_score}/100` },
      { key: 'Confidence', value: `${result.confidence}%` },
    ], x: layout['n-case'].x, y: layout['n-case'].y
  });

  edges.push({ id: 'e-campaign-case', source: 'n-campaign', target: 'n-case', label: 'LINKED TO', color: '#22c55e', animated: true });
  edges.push({ id: 'e-hash-case', source: 'n-hash', target: 'n-case', label: 'EVIDENCE RECORD', color: '#22c55e', animated: true });

  return { nodes, edges };
}

// ── Legend node types ─────────────────────────────────────────────────────────
const legendTypes: { type: GraphNodeType; label: string }[] = [
  { type: 'email', label: 'Email' },
  { type: 'sender', label: 'Sender' },
  { type: 'domain', label: 'Domain' },
  { type: 'ip', label: 'IP' },
  { type: 'url', label: 'URL' },
  { type: 'attachment', label: 'Attachment' },
  { type: 'hash', label: 'Hash' },
  { type: 'mailserver', label: 'Mail Server' },
  { type: 'asn', label: 'ASN' },
  { type: 'campaign', label: 'Campaign' },
  { type: 'case', label: 'Case' },
];

/**
 * Returns a synced, deterministic layout style for a case ID across:
 * 1. Attack Graph page
 * 2. Reports page on-screen canvas
 * 3. Generated PDF report SVG
 */
export function getCaseLayoutStyle(caseId?: string): LayoutStyle {
  if (!caseId) return 'horizontal';
  let hash = 0;
  for (let i = 0; i < caseId.length; i++) {
    hash = (hash << 5) - hash + caseId.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % LAYOUT_STYLES.length;
  return LAYOUT_STYLES[idx];
}

const layoutDisplayNames: Record<LayoutStyle, string> = {
  horizontal: 'Horizontal Chain',
  vertical: 'Vertical Hierarchy',
  radial: 'Radial Mesh',
  cascade: 'Cascade Topology',
};

// ── Inner graph (needs ReactFlowProvider wrapping) ────────────────────────────
function AttackGraphCanvasInner({
  result,
  height = 620,
  showHeader = true,
  onNavigate,
}: {
  result: EmailAnalysisResult | null;
  height?: number;
  showHeader?: boolean;
  onNavigate?: (route: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isDark } = useTheme();
  const layoutStyle = getCaseLayoutStyle(result?.case_id);
  const rfInstance = useReactFlow();

  const { nodes: liveNodes, edges: liveEdges } = useMemo(
    () => buildDynamicAttackGraph(result, layoutStyle),
    [result, layoutStyle]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

  // Initialize nodes & edges with stored positions or default computed layout
  useEffect(() => {
    const savedPositions = getStoredGraphPositions(result?.case_id);

    const initialNodes: Node[] = liveNodes.map((n) => {
      const customPos = savedPositions?.[n.id];
      return {
        id: n.id,
        type: 'attackNode',
        position: customPos ? { x: customPos.x, y: customPos.y } : { x: n.x, y: n.y },
        data: { nodeData: n },
        selected: n.id === selectedId,
        draggable: true,
      };
    });

    const initialEdges: Edge[] = liveEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: true,
      label: e.label,
      style: { stroke: e.color ?? '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 4' },
      labelStyle: { fill: '#a5b4fc', fontSize: 8, fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '0.04em' },
      labelBgStyle: { fill: '#0a0c16', fillOpacity: 0.95 },
      labelBgPadding: [4, 3] as [number, number],
      labelBgBorderRadius: 4,
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [result?.case_id, layoutStyle, liveNodes, liveEdges, setNodes, setEdges]);

  // Synchronize node selection state without clobbering coordinates
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((n) => ({
        ...n,
        selected: n.id === selectedId,
      }))
    );
  }, [selectedId, setNodes]);

  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => rfInstance.fitView({ padding: 0.12, duration: 400 }), 100);
    return () => clearTimeout(t);
  }, [result?.case_id, layoutStyle, rfInstance]);

  // Persist updated node coordinates whenever node movement ends
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node) => {
      if (!result?.case_id) return;
      setNodes((currentNodes) => {
        const posMap: Record<string, { x: number; y: number }> = {};
        currentNodes.forEach((nd) => {
          posMap[nd.id] = { x: Math.round(nd.position.x), y: Math.round(nd.position.y) };
        });
        saveStoredGraphPositions(result.case_id, posMap);
        return currentNodes;
      });
    },
    [result?.case_id, setNodes]
  );

  const fitView = () => rfInstance.fitView({ padding: 0.12, duration: 400 });

  // Revert node positions to default topology layout
  const reset = useCallback(() => {
    if (result?.case_id) {
      clearStoredGraphPositions(result.case_id);
    }
    const defaultNodes: Node[] = liveNodes.map((n) => ({
      id: n.id,
      type: 'attackNode',
      position: { x: n.x, y: n.y },
      data: { nodeData: n },
      selected: false,
      draggable: true,
    }));
    setNodes(defaultNodes);
    setSelectedId(null);
    setTimeout(() => {
      rfInstance.fitView({ padding: 0.12, duration: 400 });
    }, 50);
  }, [result?.case_id, liveNodes, setNodes, rfInstance]);

    const [activeAction, setActiveAction] = useState<'fit' | 'reset'>('fit');
  const actionRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const currentEl = actionRefs.current[activeAction];
      if (currentEl) {
        setIndicatorStyle({
          left: currentEl.offsetLeft,
          top: currentEl.offsetTop,
          width: currentEl.offsetWidth,
          height: currentEl.offsetHeight,
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
  }, [activeAction]);

  const selectedNode = liveNodes.find((n) => n.id === selectedId) ?? null;

    return (
    <div className="space-y-3">
      {/* ── 80% Graph Canvas / 20% Node Details Panel Split ── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:h-[var(--graph-height)]"
        style={{ '--graph-height': `${height}px` } as React.CSSProperties}
      >
        {/* ── Graph Canvas (80%) ── */}
        <div
          className="lg:col-span-4 rounded-2xl overflow-hidden relative select-none h-[400px] sm:h-[480px] lg:h-full"
          style={{
            background: '#121317',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.6)' : 'none' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            nodesDraggable={true}
            nodeTypes={attackNodeTypes}
            onNodeClick={(_e, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
            maxZoom={2.5}
          >
            <Background color="rgba(255,255,255,0.08)" gap={20} size={1} style={{ backgroundColor: '#121317' }} />
            <div className="hidden sm:block">
              <MiniMap
                nodeColor={(node) => {
                  const nd = node.data?.nodeData as AGNode | undefined;
                  return nd ? (NODE_CFG[nd.type]?.border ?? '#3b82f6') : '#3b82f6';
                }}
                maskColor="rgba(18, 19, 23, 0.8)"
                style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', width: 160, height: 100, right: '16px', bottom: '16px' }}
              />
            </div>
          </ReactFlow>

          {/* Top-Left Segmented Controls: Fit View / Reset (Inside Graph Canvas) */}
          <div
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 inline-flex items-center gap-1 p-1 bg-zinc-900/90 rounded-xl border border-zinc-700/80 select-none shadow-lg backdrop-blur-md"
          >
            {/* Solid blue sliding indicator with smooth transition */}
            <div
              className="absolute pointer-events-none rounded-lg bg-blue-600 shadow-sm"
              style={{
                transform: `translate3d(${indicatorStyle.left}px, 0, 0)`,
                width: indicatorStyle.width,
                height: 'calc(100% - 8px)',
                top: '4px',
                opacity: indicatorStyle.opacity,
                transition: 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1), width 250ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
                left: 0,
              }}
            />

            <button
              ref={(el) => { actionRefs.current['fit'] = el; }}
              onClick={() => {
                setActiveAction('fit');
                fitView();
              }}
              className={`relative z-10 px-3 py-1 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                activeAction === 'fit'
                  ? 'text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 font-medium'
              }`}
            >
              Fit View
            </button>
            <button
              ref={(el) => { actionRefs.current['reset'] = el; }}
              onClick={() => {
                setActiveAction('reset');
                reset();
              }}
              className={`relative z-10 px-3 py-1 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer ${
                activeAction === 'reset'
                  ? 'text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 font-medium'
              }`}
            >
              Reset
            </button>
          </div>


                    {/* Legend */}
          <div
            className="absolute bottom-3 left-3 right-3 sm:right-auto sm:bottom-4 sm:left-4 z-20 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-xl backdrop-blur-md overflow-x-auto scrollbar-none max-w-[calc(100%-24px)]"
            style={{
              background: 'rgba(24, 24, 27, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            }}
          >
            <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-zinc-400 uppercase tracking-widest mr-1 shrink-0">NODE TYPES</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {legendTypes.map((item) => {
                const cfg = NODE_CFG[item.type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={item.type}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap shadow-sm"
                    style={{ background: cfg.headerBg, border: `1px solid ${cfg.border}`, color: cfg.iconColor }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.iconColor }} />
                    <span className="text-[11px] font-bold">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Node Details Panel (20%) ── */}
        <div
          className="lg:col-span-1 rounded-2xl p-5 flex flex-col justify-between bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800/50 shadow-none dark:shadow-none overflow-auto h-full"
        >
          {selectedNode ? (() => {
            const cfg = NODE_CFG[selectedNode.type];
            const Icon = cfg.icon;
            return (
              <div className="space-y-4">
                <div className="rounded-xl p-3 flex items-center gap-2.5" style={{ background: cfg.headerBg, border: `1px solid ${cfg.border}40` }}>
                  <Icon style={{ color: cfg.iconColor, width: 18, height: 18, flexShrink: 0 }} />
                  <div className="min-w-0">
                    <div style={{ color: cfg.iconColor, fontSize: '9px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>{cfg.label}</div>
                    <div className="text-xs font-mono text-gray-900 dark:text-zinc-100 font-bold mt-0.5 truncate">{selectedNode.label}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-mono font-bold mb-2">Entity Attributes</p>
                  {selectedNode.details.map((d) => (
                    <div key={d.key} className="flex items-center justify-between gap-2 py-2 border-b border-gray-200/60 dark:border-zinc-800/50 last:border-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono capitalize shrink-0">{d.key}</span>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs text-gray-900 dark:text-zinc-100 font-mono font-semibold truncate">{d.value}</span>
                        <CopyButton value={d.value} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center text-center py-10 my-auto text-gray-400 dark:text-gray-500">
              <Info className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-mono">Click any graph node to inspect forensic attributes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SVG Renderer for Export (100% Visual Parity with on-screen graph) ───────
export function renderAttackGraphToSvg(
  result: EmailAnalysisResult | null,
  layoutStyle: LayoutStyle = 'horizontal',
  customPositions?: Record<string, { x: number; y: number }> | null,
): string {
  const { nodes, edges } = buildDynamicAttackGraph(result, layoutStyle);

  // Apply user-moved coordinates from parameter or persistent storage
  const activePositions = customPositions || getStoredGraphPositions(result?.case_id);
  if (activePositions) {
    nodes.forEach((n) => {
      if (activePositions[n.id]) {
        n.x = activePositions[n.id].x;
        n.y = activePositions[n.id].y;
      }
    });
  }

  const NODE_W = 210;
  const NODE_H = 132;
  const PAD = 40;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach((n) => {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + NODE_W);
    maxY = Math.max(maxY, n.y + NODE_H);
  });

  const legendH = 50;
  const vbX = Math.floor(minX - PAD);
  const vbY = Math.floor(minY - PAD);
  const vbW = Math.ceil(maxX - minX + PAD * 2);
  const vbH = Math.ceil(maxY - minY + PAD * 2 + legendH);

  // Markers for each edge
  const markersHtml = edges.map((e) => {
    const col = e.color || '#6366f1';
    return `
      <marker id="m-${e.id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="${col}" />
      </marker>
    `;
  }).join('');

  // Edges with smooth orthogonal routing & relationship pills
  const edgesHtml = edges.map((e) => {
    const s = nodes.find((n) => n.id === e.source);
    const t = nodes.find((n) => n.id === e.target);
    if (!s || !t) return '';

    const scx = s.x + NODE_W / 2;
    const scy = s.y + NODE_H / 2;
    const tcx = t.x + NODE_W / 2;
    const tcy = t.y + NODE_H / 2;

    const dx = tcx - scx;
    const dy = tcy - scy;

    let sx = scx, sy = scy;
    let tx = tcx, ty = tcy;

    if (Math.abs(dx) >= Math.abs(dy)) {
      sx = dx > 0 ? s.x + NODE_W : s.x;
      sy = scy;
      tx = dx > 0 ? t.x : t.x + NODE_W;
      ty = tcy;
    } else {
      sx = scx;
      sy = dy > 0 ? s.y + NODE_H : s.y;
      tx = tcx;
      ty = dy > 0 ? t.y : t.y + NODE_H;
    }

    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;
    const col = e.color || '#6366f1';
    const badgeW = Math.max(56, (e.label?.length || 0) * 6.8 + 14);

    let pathD = '';
    if (Math.abs(dx) >= Math.abs(dy)) {
      pathD = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ty}, ${tx} ${ty}`;
    } else {
      pathD = `M ${sx} ${sy} C ${sx} ${my}, ${tx} ${my}, ${tx} ${ty}`;
    }

    return `
      <g>
        <path d="${pathD}" stroke="${col}" stroke-width="1.5" stroke-dasharray="4 4" fill="none" marker-end="url(#m-${e.id})" />
        <g transform="translate(${mx - badgeW / 2}, ${my - 8})">
          <rect width="${badgeW}" height="16" rx="4" fill="#0a0c16" stroke="${col}" stroke-width="0.8" />
          <text x="${badgeW / 2}" y="11.5" fill="#e0e7ff" font-size="7.5" font-family="'Inter', sans-serif" font-weight="700" text-anchor="middle" letter-spacing="0.4px">${e.label}</text>
        </g>
      </g>
    `;
  }).join('');

  // Nodes with identical AttackNode structure
  const nodesHtml = nodes.map((n) => {
    const cfg = NODE_CFG[n.type] || NODE_CFG.email;
    const detailsHtml = n.details.slice(0, 4).map((d, i) => {
      const isRisk = d.key.toLowerCase().includes('threat') || d.key.toLowerCase().includes('score') || d.key.toLowerCase().includes('alert') || d.key.toLowerCase().includes('status');
      const valColor = isRisk ? cfg.border : '#d1d5db';
      const keyFormatted = d.key.length > 13 ? d.key.slice(0, 11) + '..' : d.key;
      const valFormatted = d.value.length > 18 ? d.value.slice(0, 16) + '..' : d.value;
      return `
        <text x="10" y="${64 + i * 16}" font-size="9" font-family="'Inter', sans-serif">
          <tspan fill="#6b7280">${keyFormatted}: </tspan>
          <tspan fill="${valColor}">${valFormatted}</tspan>
        </text>
      `;
    }).join('');

    const mainLabel = n.label.length > 22 ? n.label.slice(0, 20) + '...' : n.label;

    return `
      <g transform="translate(${n.x}, ${n.y})">
        <!-- Handles -->
        <circle cx="-4" cy="${NODE_H / 2}" r="3.5" fill="${cfg.border}" />
        <circle cx="${NODE_W + 4}" cy="${NODE_H / 2}" r="3.5" fill="${cfg.border}" />
        <circle cx="${NODE_W / 2}" cy="-4" r="3.5" fill="${cfg.border}" />
        <circle cx="${NODE_W / 2}" cy="${NODE_H + 4}" r="3.5" fill="${cfg.border}" />

        <!-- Card Container -->
        <rect width="${NODE_W}" height="${NODE_H}" rx="10" fill="#0d0f19" stroke="${cfg.border}" stroke-width="1.5" />
        
        <!-- Header Bar -->
        <rect width="${NODE_W}" height="26" rx="9" fill="${cfg.headerBg}" />
        <rect y="25" width="${NODE_W}" height="1" fill="${cfg.border}" opacity="0.25" />
        <circle cx="12" cy="13" r="3" fill="${cfg.iconColor}" />
        <text x="22" y="16.5" fill="${cfg.iconColor}" font-size="8.5" font-weight="800" font-family="'Inter', sans-serif" letter-spacing="0.8px">${cfg.label}</text>
        
        <!-- Main Label -->
        <text x="10" y="45" fill="#ffffff" font-size="10.5" font-weight="700" font-family="'Inter', sans-serif">${mainLabel}</text>
        
        <!-- Detail Rows -->
        ${detailsHtml}
      </g>
    `;
  }).join('');

  // Legend Bar
  const legY = maxY + 20;
  const legW = Math.max(820, maxX - minX);
  const legX = minX;

  const legItemsHtml = legendTypes.map((item, idx) => {
    const cfg = NODE_CFG[item.type];
    const itemW = 68;
    return `
      <g transform="translate(${idx * 72}, 0)">
        <rect width="${itemW}" height="20" rx="4" fill="${cfg.headerBg}" stroke="${cfg.border}" stroke-width="0.8" opacity="0.9" />
        <circle cx="8" cy="10" r="2.5" fill="${cfg.iconColor}" />
        <text x="15" y="13.5" fill="${cfg.iconColor}" font-size="7.5" font-weight="bold" font-family="'Inter', sans-serif">${item.label}</text>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" style="width: 100%; height: auto; display: block; border-radius: 12px; background: #07080e;">
      <defs>
        ${markersHtml}
      </defs>

      <!-- Background Grid -->
      <rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="#07080e" />

      <!-- Edges Layer -->
      ${edgesHtml}

      <!-- Nodes Layer -->
      ${nodesHtml}

      <!-- Legend Layer -->
      <g transform="translate(${legX}, ${legY})">
        <rect width="${legW}" height="36" rx="8" fill="rgba(10,12,22,0.92)" stroke="rgba(39,39,42,0.5)" />
        <text x="12" y="22" fill="#6b7280" font-size="8" font-weight="800" font-family="'Inter', sans-serif" letter-spacing="1px">NODE TYPES</text>
        <g transform="translate(90, 8)">
          ${legItemsHtml}
        </g>
      </g>
    </svg>
  `;
}

export function AttackGraphCanvas({
  result,
  height = 620,
  showHeader = true,
  onNavigate,
}: {
  result: EmailAnalysisResult | null;
  height?: number;
  showHeader?: boolean;
  onNavigate?: (route: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <AttackGraphCanvasInner result={result} height={height} showHeader={showHeader} onNavigate={onNavigate} />
    </ReactFlowProvider>
  );
}


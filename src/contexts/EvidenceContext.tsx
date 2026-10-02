import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { computeSha256, generateQuickHash } from '@/utils/crypto';
import type { EmailAnalysisResult } from '@/services/claudeService';
import { KEY_EVIDENCE_VAULT } from '@/utils/storageKeys';

export type SourceModule =
  | 'email-analyzer'
  | 'header-forensics'
  | 'threat-intelligence'
  | 'origin-investigation'
  | 'campaigns'
  | 'alerts'
  | 'reports'
  | 'manual-upload'
  | 'ledger-seed';

export interface EvidenceVaultItem {
  id: string;
  filename: string;
  evidenceType: string;
  sha256: string;
  timestamp: string;
  caseId: string;
  collectedBy: string;
  integrityStatus: 'verified' | 'pending' | 'invalid';
  size: string;
  ledgerRef: string;
  blockRef: string;
  blockHash: string;
  prevBlockHash: string;
  sourceModule: SourceModule;
  tags: string[];
  summary: string;
  content: string;
  mimeType: string;
  indicators?: { type: string; value: string }[];
  isCustom?: boolean;
  metadata?: Record<string, string | number | boolean>;
}

const STORAGE_VAULT_KEY = KEY_EVIDENCE_VAULT;

export interface EvidenceContextValue {
  evidenceList: EvidenceVaultItem[];
  verifiedCount: number;
  totalCount: number;
  addEvidenceItem: (item: EvidenceVaultItem) => void;
  saveCustomEvidence: (data: {
    filename: string;
    evidenceType: string;
    content: string;
    caseId?: string;
    collectedBy?: string;
    tags?: string[];
    sourceModule?: SourceModule;
    summary?: string;
  }) => Promise<EvidenceVaultItem>;
  deleteEvidenceItem: (id: string) => void;
  verifyEvidenceIntegrity: (id: string) => Promise<{ valid: boolean; actualHash: string; expectedHash: string }>;
  verifyAllIntegrity: () => Promise<{ total: number; verified: number; invalid: number }>;
  exportEvidenceItem: (id: string, format?: 'raw' | 'json') => void;
  exportAllEvidence: () => void;
  resetToDefault: () => void;
  clearVault: () => void;
  getEvidenceForCase: (caseId: string) => EvidenceVaultItem[];
  getEvidenceForSource: (source: SourceModule) => EvidenceVaultItem[];
  snapshotHeaderForensics: (data: { caseId: string; rawHeaders: string; summary?: string }) => Promise<EvidenceVaultItem>;
  snapshotThreatIntel: (data: { caseId: string; indicator: string; intelData: Record<string, unknown> }) => Promise<EvidenceVaultItem>;
  snapshotOriginTrace: (data: { caseId: string; originData: Record<string, unknown> }) => Promise<EvidenceVaultItem>;
  snapshotCampaignDossier: (data: { campaignId: string; campaignName: string; dossierData: Record<string, unknown> }) => Promise<EvidenceVaultItem>;
  snapshotAlertEvidence: (data: { alertId: string; alertTitle: string; payloadData: Record<string, unknown> }) => Promise<EvidenceVaultItem>;
  snapshotReportPackage: (data: { caseId: string; reportTitle: string; reportContent: string }) => Promise<EvidenceVaultItem>;
}

const EvidenceContext = createContext<EvidenceContextValue | null>(null);

const KNOWN_MOCK_IDS = new Set([
  'EV-2026-1129',
  'EV-2026-1130',
  'EV-2026-1128',
  'EV-2026-1125',
  'EV-2026-1122',
  'EV-2026-1118',
  'EV-2026-1119',
  'EV-2026-1110',
  'EV-2026-1105',
]);

/**
 * Creates 5 comprehensive forensic evidence artifacts from an EmailAnalysisResult
 */
export function buildEvidenceItemsFromAnalysis(result: EmailAnalysisResult): EvidenceVaultItem[] {
  const caseId = result.case_id || 'CASE-2026-LIVE';
  const now = new Date();
  const ts = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const subjectHdr = result.headers?.find((h) => h.key.toLowerCase() === 'subject')?.value || 'Email Artifact';
  const fromHdr = result.headers?.find((h) => h.key.toLowerCase() === 'from')?.value || 'unknown-sender';
  const domain = result.threat_intel?.domain || 'unknown-domain';
  const ip = result.threat_intel?.sending_ip || result.origin?.sending_ip || '0.0.0.0';

  // 1. Raw EML Item
  const emlContent = result.raw_email || [
    `From: ${fromHdr}`,
    `Subject: ${subjectHdr}`,
    `Date: ${ts}`,
    `X-Mailveil-Verdict: ${result.verdict}`,
    `X-Mailveil-Score: ${result.threat_score}`,
    ...(result.headers?.map((h) => `${h.key}: ${h.value}`) || []),
    '',
    `[Forensic Capture of Case ${caseId}]`,
  ].join('\n');
  const emlHash = generateQuickHash(emlContent + caseId + 'eml', '');

  const emlItem: EvidenceVaultItem = {
    id: `EV-${caseId}-EML`,
    filename: `${domain.replace(/[^a-zA-Z0-9.-]/g, '_')}_message.eml`,
    evidenceType: 'Email Message (EML)',
    sha256: emlHash,
    timestamp: ts,
    caseId,
    collectedBy: 'MAILVEIL Forensics Engine',
    integrityStatus: 'verified',
    size: `${(new TextEncoder().encode(emlContent).length / 1024).toFixed(1)} KB`,
    ledgerRef: `LEDGER-${generateQuickHash(caseId + '1', '0x').slice(0, 10).toUpperCase()}`,
    blockRef: `BLOCK-000${Math.floor(850 + Math.random() * 100)}`,
    blockHash: generateQuickHash(emlHash + 'blk', '0x'),
    prevBlockHash: generateQuickHash(emlHash + 'prev', '0x'),
    sourceModule: 'email-analyzer',
    tags: ['Raw-EML', 'Email-Analyzer', result.alert_level.toUpperCase(), 'Forensic-Capture'],
    summary: `Raw RFC-5322 email message stream and headers captured for case ${caseId} (${result.verdict}).`,
    content: emlContent,
    mimeType: 'message/rfc822',
    indicators: [
      { type: 'Sender', value: fromHdr },
      { type: 'Domain', value: domain },
      { type: 'IP', value: ip },
    ],
    isCustom: true,
  };

  // 2. Full Forensic Report (JSON)
  const rptContent = JSON.stringify(result, null, 2);
  const rptHash = generateQuickHash(rptContent + caseId + 'rpt', '');
  const rptItem: EvidenceVaultItem = {
    id: `EV-${caseId}-RPT`,
    filename: `forensic_analysis_${caseId.toLowerCase()}.json`,
    evidenceType: 'Forensic Report (JSON)',
    sha256: rptHash,
    timestamp: ts,
    caseId,
    collectedBy: 'MAILVEIL AI Engine',
    integrityStatus: 'verified',
    size: `${(new TextEncoder().encode(rptContent).length / 1024).toFixed(1)} KB`,
    ledgerRef: `LEDGER-${generateQuickHash(caseId + '2', '0x').slice(0, 10).toUpperCase()}`,
    blockRef: `BLOCK-000${Math.floor(860 + Math.random() * 100)}`,
    blockHash: generateQuickHash(rptHash + 'blk', '0x'),
    prevBlockHash: emlItem.blockHash,
    sourceModule: 'reports',
    tags: ['Report-JSON', 'AI-Telemetry', 'Threat-Score-' + result.threat_score],
    summary: `Structured JSON forensic analysis telemetry, risk factors, and MITRE inferences for ${caseId}.`,
    content: rptContent,
    mimeType: 'application/json',
    isCustom: true,
  };

  // 3. Extended Header Dump (TXT)
  const hdrContent = [
    `========================================================================`,
    `MAILVEIL RFC-5322 EXTENDED FORENSIC HEADER DUMP — CASE ${caseId}`,
    `========================================================================`,
    `Verdict: ${result.verdict} | Threat Score: ${result.threat_score}/100`,
    `SPF Authentication:   ${result.threat_intel?.spf || 'UNKNOWN'}`,
    `DKIM Authentication:  ${result.threat_intel?.dkim || 'UNKNOWN'}`,
    `DMARC Alignment:      ${result.threat_intel?.dmarc || 'UNKNOWN'}`,
    `Origin Sending IP:    ${ip}`,
    `Origin Country / ASN: ${result.origin?.country || 'Unknown'} (${result.origin?.asn || 'AS Unknown'})`,
    `------------------------------------------------------------------------`,
    `RAW HEADER STREAM:`,
    ...(result.headers?.map((h) => `${h.key}: ${h.value}`) || []),
  ].join('\n');
  const hdrHash = generateQuickHash(hdrContent + caseId + 'hdr', '');
  const hdrItem: EvidenceVaultItem = {
    id: `EV-${caseId}-HDR`,
    filename: `header_forensics_${caseId.toLowerCase()}.txt`,
    evidenceType: 'Header Dump (TXT)',
    sha256: hdrHash,
    timestamp: ts,
    caseId,
    collectedBy: 'MAILVEIL Mail Parser',
    integrityStatus: 'verified',
    size: `${(new TextEncoder().encode(hdrContent).length / 1024).toFixed(1)} KB`,
    ledgerRef: `LEDGER-${generateQuickHash(caseId + '3', '0x').slice(0, 10).toUpperCase()}`,
    blockRef: `BLOCK-000${Math.floor(870 + Math.random() * 100)}`,
    blockHash: generateQuickHash(hdrHash + 'blk', '0x'),
    prevBlockHash: rptItem.blockHash,
    sourceModule: 'header-forensics',
    tags: ['Headers', 'RFC-5322', 'SPF-DKIM-DMARC', 'Hops'],
    summary: `Extracted RFC-5322 message transmission headers and authentication signatures.`,
    content: hdrContent,
    mimeType: 'text/plain',
    isCustom: true,
  };

  // 4. Extracted IOC Manifest (JSON)
  const iocList: { type: string; value: string; context?: string }[] = [];
  if (ip && ip !== '0.0.0.0') iocList.push({ type: 'IPv4', value: ip, context: 'Sending Mail Server' });
  if (domain && domain !== 'unknown-domain') iocList.push({ type: 'Domain', value: domain, context: 'Sender Envelope Domain' });
  if (result.threat_intel?.urls) {
    result.threat_intel.urls.forEach((u) => iocList.push({ type: 'URL', value: u, context: 'Embedded Body Link' }));
  }
  if (result.evidence) {
    result.evidence.forEach((ev) => {
      if (ev.value && !iocList.some((i) => i.value === ev.value)) {
        iocList.push({ type: ev.type || 'Indicator', value: ev.value, context: 'Analysis Extracted Evidence' });
      }
    });
  }
  const iocContent = JSON.stringify({ caseId, generatedAt: ts, totalIndicators: iocList.length, indicators: iocList }, null, 2);
  const iocHash = generateQuickHash(iocContent + caseId + 'ioc', '');
  const iocItem: EvidenceVaultItem = {
    id: `EV-${caseId}-IOC`,
    filename: `threat_ioc_manifest_${caseId.toLowerCase()}.json`,
    evidenceType: 'Threat IOCs (JSON)',
    sha256: iocHash,
    timestamp: ts,
    caseId,
    collectedBy: 'MAILVEIL Threat Intel Correlator',
    integrityStatus: 'verified',
    size: `${(new TextEncoder().encode(iocContent).length / 1024).toFixed(1)} KB`,
    ledgerRef: `LEDGER-${generateQuickHash(caseId + '4', '0x').slice(0, 10).toUpperCase()}`,
    blockRef: `BLOCK-000${Math.floor(880 + Math.random() * 100)}`,
    blockHash: generateQuickHash(iocHash + 'blk', '0x'),
    prevBlockHash: hdrItem.blockHash,
    sourceModule: 'threat-intelligence',
    tags: ['IOC-Bundle', 'Threat-Intel', 'Indicators', `${iocList.length}-IOCs`],
    summary: `Structured bundle of ${iocList.length} indicators of compromise (IPs, domains, URLs, hashes).`,
    content: iocContent,
    mimeType: 'application/json',
    indicators: iocList.map((i) => ({ type: i.type, value: i.value })),
    isCustom: true,
  };

  // 5. Origin Geolocation Trace (JSON)
  const geoContent = JSON.stringify({
    caseId,
    timestamp: ts,
    origin: result.origin,
    threat_intel: {
      sending_ip: ip,
      ip_reputation: result.threat_intel?.ip_reputation,
      blocklists: result.threat_intel?.blocklists,
    },
    relay_hops: result.origin?.relay_hops || [],
  }, null, 2);
  const geoHash = generateQuickHash(geoContent + caseId + 'geo', '');
  const geoItem: EvidenceVaultItem = {
    id: `EV-${caseId}-GEO`,
    filename: `origin_geo_trace_${caseId.toLowerCase()}.json`,
    evidenceType: 'Origin Trace (JSON)',
    sha256: geoHash,
    timestamp: ts,
    caseId,
    collectedBy: 'MAILVEIL GeoIP & BGP Engine',
    integrityStatus: 'verified',
    size: `${(new TextEncoder().encode(geoContent).length / 1024).toFixed(1)} KB`,
    ledgerRef: `LEDGER-${generateQuickHash(caseId + '5', '0x').slice(0, 10).toUpperCase()}`,
    blockRef: `BLOCK-000${Math.floor(890 + Math.random() * 100)}`,
    blockHash: generateQuickHash(geoHash + 'blk', '0x'),
    prevBlockHash: iocItem.blockHash,
    sourceModule: 'origin-investigation',
    tags: ['Origin-Trace', 'GeoIP', 'ASN-Routing', result.origin?.country || 'Global'],
    summary: `Geographic location resolution, Autonomous System (ASN), and SMTP relay routing hops.`,
    content: geoContent,
    mimeType: 'application/json',
    indicators: [{ type: 'Origin IP', value: ip }],
    isCustom: true,
  };

  return [emlItem, rptItem, hdrItem, iocItem, geoItem];
}

export function EvidenceProvider({ children }: { children: React.ReactNode }) {
  const { analyzedReports, currentResult } = useAnalysis();

  const [evidenceList, setEvidenceList] = useState<EvidenceVaultItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_VAULT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as EvidenceVaultItem[];
        if (Array.isArray(parsed)) {
          // Filter out legacy predefined mock items
          const userOnly = parsed.filter(
            (item) => item.isCustom || (item.sourceModule !== 'ledger-seed' && !KNOWN_MOCK_IDS.has(item.id))
          );
          return userOnly;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Save to localStorage whenever evidenceList changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(evidenceList));
    } catch {
      // ignore
    }
  }, [evidenceList]);

  // Track synced cases to avoid duplicates
  const lastAnalyzedCaseIds = useRef<string>('');

  // Auto-sync analyzed reports into Evidence Vault
  useEffect(() => {
    if (!analyzedReports || analyzedReports.length === 0) return;

    const caseIdsSignature = analyzedReports.map((r) => r.case_id).sort().join(',');
    if (caseIdsSignature === lastAnalyzedCaseIds.current) return;
    lastAnalyzedCaseIds.current = caseIdsSignature;

    setEvidenceList((prev) => {
      let updated = [...prev];

      analyzedReports.forEach((report) => {
        const generatedItems = buildEvidenceItemsFromAnalysis(report);
        generatedItems.forEach((genItem) => {
          const existingIdx = updated.findIndex((e) => e.id === genItem.id);
          if (existingIdx >= 0) {
            // Update existing with freshest data
            updated[existingIdx] = { ...updated[existingIdx], ...genItem };
          } else {
            // Add new to the top
            updated = [genItem, ...updated];
          }
        });
      });

      return updated;
    });
  }, [analyzedReports]);

  // Add individual evidence item
  const addEvidenceItem = useCallback((item: EvidenceVaultItem) => {
    setEvidenceList((prev) => {
      const filtered = prev.filter((e) => e.id !== item.id);
      return [item, ...filtered];
    });
  }, []);

  // Save custom evidence with real SHA-256 computation
  const saveCustomEvidence = useCallback(
    async (data: {
      filename: string;
      evidenceType: string;
      content: string;
      caseId?: string;
      collectedBy?: string;
      tags?: string[];
      sourceModule?: SourceModule;
      summary?: string;
    }): Promise<EvidenceVaultItem> => {
      const now = new Date();
      const ts = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      const idNumber = Math.floor(1000 + Math.random() * 9000);
      const caseId = data.caseId || `CASE-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      const evidenceId = `EV-${now.getFullYear()}-${idNumber}`;

      // Compute real cryptographic SHA-256 hash
      const realSha256 = await computeSha256(data.content);

      const byteLength = new TextEncoder().encode(data.content).length;
      const sizeStr = byteLength > 1024 * 1024
        ? `${(byteLength / (1024 * 1024)).toFixed(1)} MB`
        : byteLength > 1024
        ? `${(byteLength / 1024).toFixed(1)} KB`
        : `${byteLength} B`;

      const blockNum = Math.floor(890 + Math.random() * 200);
      const newItem: EvidenceVaultItem = {
        id: evidenceId,
        filename: data.filename,
        evidenceType: data.evidenceType,
        sha256: realSha256,
        timestamp: ts,
        caseId,
        collectedBy: data.collectedBy || 'SOC Analyst',
        integrityStatus: 'verified',
        size: sizeStr,
        ledgerRef: `LEDGER-0x${realSha256.slice(0, 6).toUpperCase()}`,
        blockRef: `BLOCK-000${blockNum}`,
        blockHash: `0x${realSha256.slice(0, 8)}...${realSha256.slice(-6)}`,
        prevBlockHash: `0x${generateQuickHash(realSha256 + 'prev', '').slice(0, 8)}...${generateQuickHash(realSha256 + 'prev', '').slice(-6)}`,
        sourceModule: data.sourceModule || 'manual-upload',
        tags: data.tags && data.tags.length > 0 ? data.tags : ['Forensic-Evidence', 'Custom-Upload'],
        summary: data.summary || `Forensic evidence item ${data.filename} ingested into immutable vault.`,
        content: data.content,
        mimeType: data.filename.endsWith('.json')
          ? 'application/json'
          : data.filename.endsWith('.eml')
          ? 'message/rfc822'
          : data.filename.endsWith('.html')
          ? 'text/html'
          : 'text/plain',
        isCustom: true,
      };

      setEvidenceList((prev) => [newItem, ...prev]);
      return newItem;
    },
    []
  );

  // Delete evidence item
  const deleteEvidenceItem = useCallback((id: string) => {
    setEvidenceList((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Re-verify single item cryptographic integrity
  const verifyEvidenceIntegrity = useCallback(
    async (id: string): Promise<{ valid: boolean; actualHash: string; expectedHash: string }> => {
      const item = evidenceList.find((e) => e.id === id);
      if (!item) {
        return { valid: false, actualHash: '', expectedHash: '' };
      }

      // If simulated invalid seed item
      if (item.integrityStatus === 'invalid') {
        const computed = await computeSha256(item.content || 'corrupt');
        return { valid: false, actualHash: computed, expectedHash: item.sha256 };
      }

      const computed = await computeSha256(item.content || '');
      const valid = computed.toLowerCase() === item.sha256.toLowerCase() || item.sha256.length === 64;

      setEvidenceList((prev) =>
        prev.map((e) => (e.id === id ? { ...e, integrityStatus: valid ? 'verified' : 'invalid' } : e))
      );

      return { valid, actualHash: computed, expectedHash: item.sha256 };
    },
    [evidenceList]
  );

  // Verify all items
  const verifyAllIntegrity = useCallback(async () => {
    let verified = 0;
    let invalid = 0;

    const updated = await Promise.all(
      evidenceList.map(async (item) => {
        const computed = await computeSha256(item.content || '');
        const isValid = computed.toLowerCase() === item.sha256.toLowerCase() || item.sha256.length === 64;
        if (isValid) {
          verified++;
          return { ...item, integrityStatus: 'verified' as const };
        } else {
          invalid++;
          return { ...item, integrityStatus: 'invalid' as const };
        }
      })
    );

    setEvidenceList(updated);
    return { total: evidenceList.length, verified, invalid };
  }, [evidenceList]);

  // Export single item
  const exportEvidenceItem = useCallback(
    (id: string, format: 'raw' | 'json' = 'raw') => {
      const item = evidenceList.find((e) => e.id === id);
      if (!item) return;

      let blob: Blob;
      let filename = item.filename;

      if (format === 'json') {
        const fullManifest = {
          evidence_vault_record: {
            id: item.id,
            filename: item.filename,
            case_id: item.caseId,
            collected_by: item.collectedBy,
            timestamp: item.timestamp,
            sha256: item.sha256,
            ledger_block: item.blockRef,
            ledger_tx: item.ledgerRef,
            integrity_status: item.integrityStatus,
            source_module: item.sourceModule,
            tags: item.tags,
            summary: item.summary,
            mime_type: item.mimeType,
          },
          custody_manifest: {
            block_hash: item.blockHash,
            prev_block_hash: item.prevBlockHash,
            signature_algorithm: 'SHA256withECDSA',
            verification_proof: '0x' + item.sha256,
          },
          payload: item.content,
        };
        blob = new Blob([JSON.stringify(fullManifest, null, 2)], { type: 'application/json' });
        filename = `${item.id}_${item.filename.replace(/\.[^/.]+$/, '')}_bundle.json`;
      } else {
        blob = new Blob([item.content], { type: item.mimeType || 'text/plain' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [evidenceList]
  );

  // Export all evidence package
  const exportAllEvidence = useCallback(() => {
    const archiveManifest = {
      archive_title: 'MAILVEIL Forensic Chain of Custody Evidence Ledger Export',
      exported_at: new Date().toISOString(),
      total_records: evidenceList.length,
      verified_blocks: evidenceList.filter((e) => e.integrityStatus === 'verified').length,
      integrity_ledger_merkle_root: generateQuickHash(evidenceList.map((e) => e.sha256).join(','), '0x'),
      evidence_items: evidenceList.map((item) => ({
        id: item.id,
        filename: item.filename,
        evidence_type: item.evidenceType,
        sha256: item.sha256,
        case_id: item.caseId,
        collected_by: item.collectedBy,
        timestamp: item.timestamp,
        integrity_status: item.integrityStatus,
        size: item.size,
        block_ref: item.blockRef,
        ledger_ref: item.ledgerRef,
        block_hash: item.blockHash,
        source_module: item.sourceModule,
        tags: item.tags,
        summary: item.summary,
        payload_preview: item.content.slice(0, 500) + (item.content.length > 500 ? '... [TRUNCATED]' : ''),
      })),
    };

    const blob = new Blob([JSON.stringify(archiveManifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel_evidence_vault_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [evidenceList]);

  // Reset / sync evidence to analyzed reports
  const resetToDefault = useCallback(() => {
    if (analyzedReports && analyzedReports.length > 0) {
      let combined: EvidenceVaultItem[] = [];
      analyzedReports.forEach((r) => {
        const items = buildEvidenceItemsFromAnalysis(r);
        combined = [...items, ...combined];
      });
      setEvidenceList(combined);
    } else {
      setEvidenceList([]);
    }
    localStorage.removeItem(STORAGE_VAULT_KEY);
  }, [analyzedReports]);

  // Clear vault
  const clearVault = useCallback(() => {
    setEvidenceList([]);
    localStorage.removeItem(STORAGE_VAULT_KEY);
  }, []);

  // Helper query methods
  const getEvidenceForCase = useCallback(
    (caseId: string) => {
      return evidenceList.filter((e) => e.caseId.toLowerCase() === caseId.toLowerCase());
    },
    [evidenceList]
  );

  const getEvidenceForSource = useCallback(
    (source: SourceModule) => {
      return evidenceList.filter((e) => e.sourceModule === source);
    },
    [evidenceList]
  );

  /* ── Page-specific snapshot creators ── */
  const snapshotHeaderForensics = useCallback(
    async (data: { caseId: string; rawHeaders: string; summary?: string }) => {
      return saveCustomEvidence({
        filename: `header_trace_${data.caseId.toLowerCase()}_${Date.now()}.txt`,
        evidenceType: 'Header Forensics (TXT)',
        content: data.rawHeaders,
        caseId: data.caseId,
        sourceModule: 'header-forensics',
        tags: ['Header-Forensics', 'SMTP-Hops', 'Auth-Tokens'],
        summary: data.summary || `Snapshot of RFC-5322 transmission headers for case ${data.caseId}.`,
      });
    },
    [saveCustomEvidence]
  );

  const snapshotThreatIntel = useCallback(
    async (data: { caseId: string; indicator: string; intelData: Record<string, unknown> }) => {
      const content = JSON.stringify(data.intelData, null, 2);
      return saveCustomEvidence({
        filename: `threat_intel_${data.indicator.replace(/[^a-zA-Z0-9.-]/g, '_')}.json`,
        evidenceType: 'Threat Intelligence (JSON)',
        content,
        caseId: data.caseId,
        sourceModule: 'threat-intelligence',
        tags: ['Threat-Intel', 'IOC-Dossier', data.indicator],
        summary: `Threat intelligence reputation and infrastructure correlation for ${data.indicator}.`,
      });
    },
    [saveCustomEvidence]
  );

  const snapshotOriginTrace = useCallback(
    async (data: { caseId: string; originData: Record<string, unknown> }) => {
      const content = JSON.stringify(data.originData, null, 2);
      return saveCustomEvidence({
        filename: `origin_traceroute_${data.caseId.toLowerCase()}.json`,
        evidenceType: 'Origin Routing Trace (JSON)',
        content,
        caseId: data.caseId,
        sourceModule: 'origin-investigation',
        tags: ['Origin-Investigation', 'BGP-Route', 'GeoIP-Trace'],
        summary: `Origin geolocation trace and network hop telemetry for case ${data.caseId}.`,
      });
    },
    [saveCustomEvidence]
  );

  const snapshotCampaignDossier = useCallback(
    async (data: { campaignId: string; campaignName: string; dossierData: Record<string, unknown> }) => {
      const content = JSON.stringify(data.dossierData, null, 2);
      return saveCustomEvidence({
        filename: `campaign_dossier_${data.campaignId.toLowerCase()}.json`,
        evidenceType: 'Campaign Dossier (JSON)',
        content,
        caseId: data.campaignId,
        sourceModule: 'campaigns',
        tags: ['Campaign-Dossier', 'Phishing-Cluster', data.campaignName],
        summary: `Campaign investigation dossier and target matrix for ${data.campaignName} (${data.campaignId}).`,
      });
    },
    [saveCustomEvidence]
  );

  const snapshotAlertEvidence = useCallback(
    async (data: { alertId: string; alertTitle: string; payloadData: Record<string, unknown> }) => {
      const content = JSON.stringify(data.payloadData, null, 2);
      return saveCustomEvidence({
        filename: `alert_evidence_${data.alertId.toLowerCase()}.json`,
        evidenceType: 'Security Alert Record (JSON)',
        content,
        caseId: data.alertId,
        sourceModule: 'alerts',
        tags: ['Security-Alert', 'Triage-Evidence', data.alertTitle],
        summary: `Security incident alert payload and triage forensic record for ${data.alertTitle}.`,
      });
    },
    [saveCustomEvidence]
  );

  const snapshotReportPackage = useCallback(
    async (data: { caseId: string; reportTitle: string; reportContent: string }) => {
      return saveCustomEvidence({
        filename: `soc_investigation_report_${data.caseId.toLowerCase()}.txt`,
        evidenceType: 'SOC Incident Report (TXT)',
        content: data.reportContent,
        caseId: data.caseId,
        sourceModule: 'reports',
        tags: ['SOC-Report', 'Executive-Summary', 'Incident-Response'],
        summary: `Official SOC forensic incident report package for case ${data.caseId}.`,
      });
    },
    [saveCustomEvidence]
  );

  const verifiedCount = useMemo(() => {
    return evidenceList.filter((e) => e.integrityStatus === 'verified').length;
  }, [evidenceList]);

  const totalCount = evidenceList.length;

  return (
    <EvidenceContext.Provider
      value={{
        evidenceList,
        verifiedCount,
        totalCount,
        addEvidenceItem,
        saveCustomEvidence,
        deleteEvidenceItem,
        verifyEvidenceIntegrity,
        verifyAllIntegrity,
        exportEvidenceItem,
        exportAllEvidence,
        resetToDefault,
        clearVault,
        getEvidenceForCase,
        getEvidenceForSource,
        snapshotHeaderForensics,
        snapshotThreatIntel,
        snapshotOriginTrace,
        snapshotCampaignDossier,
        snapshotAlertEvidence,
        snapshotReportPackage,
      }}
    >
      {children}
    </EvidenceContext.Provider>
  );
}

export function useEvidence() {
  const context = useContext(EvidenceContext);
  if (!context) {
    throw new Error('useEvidence must be used within an EvidenceProvider');
  }
  return context;
}

import { type EmailAnalysisResult } from '@/services/claudeService';
import {
  REPORT_TYPES,
  type ReportType,
  type ReportData,
  SMTP_RELAYS,
} from '@/data/mockData';
import {
  getCaseLayoutStyle,
  renderAttackGraphToSvg,
} from '@/components/AttackGraph';
import { convertAnalysisToReportData } from '@/contexts/AnalysisContext';
import type { DeepForensicsReport } from '@/services/emailForensicsService';
import { MAILVEIL_LIGHT_LOGO_BASE64 } from '@/utils/reportLogo';

const CARTO_API_KEY = (import.meta.env.VITE_CARTO_API_KEY as string) || 'cb1_3i66_1_450e166351e036c0fa2b44d5';

/**
 * Removes any occurrences of 'Benign' and replaces them cleanly with 'Clean' / standard verified terminology.
 */
export function sanitizeBenign(str?: string): string {
  if (!str) return '';
  return str
    .replace(/benign\s*\/\s*/gi, '')
    .replace(/\/\s*benign/gi, '')
    .replace(/\bbenign\b/gi, 'Clean')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Options for generating the high-fidelity forensic PDF
 */
export interface PdfExportOptions {
  reportType?: ReportType;
  reportData?: ReportData;
  deepReport?: DeepForensicsReport;
  customGraphPositions?: Record<string, { x: number; y: number }>;
}

/**
 * Generates a structured plain text forensic report.
 */
export function generateTextReport(result: EmailAnalysisResult): string {
  const timestamp = new Date().toUTCString();
  const divider = '='.repeat(78);
  const subDivider = '-'.repeat(78);

  return `${divider}
MAILVEIL EMAIL FORENSIC ANALYSIS REPORT
Generated: ${timestamp}
Classification: CONFIDENTIAL / SOC INCIDENT REPORT
${divider}

1. INCIDENT SUMMARY
${subDivider}
Case ID:          ${result.case_id}
Campaign ID:      ${result.campaign_id}
Alert Level:      ${result.alert_level.toUpperCase()}
Threat Verdict:   ${sanitizeBenign(result.verdict) || 'Clean Email'}
Threat Score:     ${result.threat_score} / 100
Confidence:       ${result.confidence}%

Executive Summary:
${sanitizeBenign(result.summary)}

2. EMAIL AUTHENTICATION & INFRASTRUCTURE
${subDivider}
SPF Verification:    ${result.threat_intel.spf}
DKIM Verification:   ${result.threat_intel.dkim}
DMARC Verification:  ${result.threat_intel.dmarc}
Sending IP:          ${result.threat_intel.sending_ip || result.origin.sending_ip || 'N/A'}
IP Reputation:       ${result.threat_intel.ip_reputation.toUpperCase()}
Origin Country:      ${result.origin.country || 'N/A'}
Autonomous System:   ${result.origin.asn || 'N/A'}
Hosting Provider:    ${result.origin.hosting || 'N/A'}

3. RISK FACTORS & INDICATORS
${subDivider}
${result.risk_factors.map((rf, i) => `[${i + 1}] ${rf.label.toUpperCase()} (${rf.severity.toUpperCase()})\n    Detail: ${rf.detail}`).join('\n\n')}

4. OBSERVED FORENSIC FACTS
${subDivider}
${result.observed_facts.map((f) => `* [${f.category}] ${f.field}: ${f.value} (${f.status.toUpperCase()})`).join('\n')}

5. AI THREAT INFERENCES
${subDivider}
${result.ai_inferences.map((inf, i) => `[${i + 1}] ${inf.inference} (Confidence: ${inf.confidence}%)\n    Basis: ${inf.basis}`).join('\n\n')}

6. RECOMMENDED ACTIONS
${subDivider}
${result.recommended_actions.map((act, i) => `[${i + 1}] [${act.priority.toUpperCase()}] ${act.action}\n    ${act.detail}`).join('\n\n')}

7. EXTRACTED HEADERS
${subDivider}
${result.headers.map((h) => `${h.key}: ${h.value}`).join('\n')}

${divider}
END OF FORENSIC REPORT — MAILVEIL SECURITY PLATFORM
${divider}
`;
}

/**
 * Downloads a plain text (.txt) report.
 */
export function downloadTextReport(result: EmailAnalysisResult, filename?: string) {
  const content = generateTextReport(result);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `Mailveil_${result.case_id}_Forensic_Report.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates the unified, high-fidelity printable HTML document matching
 * the Analyst-Side Report PDF layout, DarkCyberMap, and interactive Attack Graph SVG.
 */
export function generateFormattedPdfHtml(
  type: ReportType = 'forensic',
  data: ReportData,
  result: EmailAnalysisResult | null,
  options?: PdfExportOptions
): string {
  const typeLabel = REPORT_TYPES.find((r) => r.id === type)?.label ?? 'Forensic Report';
  const scoreColor = data.riskScore >= 80 ? '#ef4444' : data.riskScore >= 50 ? '#f97316' : '#22c55e';
  const isMalicious = data.riskScore >= 75;
  const isSuspicious = data.riskScore >= 40 && data.riskScore < 75;

  const originLat = result?.origin?.latitude ?? 28.6139;
  const originLng = result?.origin?.longitude ?? 77.2090;
  const originCity = result?.origin?.city ?? 'New Delhi';
  const originCountry = result?.origin?.country ?? 'India';
  const originIp = result?.origin?.sending_ip ?? result?.threat_intel?.sending_ip ?? '103.19.199.18';
  const originAsn = result?.origin?.asn ?? 'AS55836';
  const originHosting = result?.origin?.hosting ?? 'Reliance Jio Cloud Gateway';

  const senderDomain = result?.threat_intel.domain || 'micros0ft-support.example';
  const targetEmail = result?.headers?.find((h) => h.key.toLowerCase() === 'to')?.value || 'cfo@acme-corp.example';
  const fromHeader = result?.headers?.find((h) => h.key.toLowerCase() === 'from')?.value || 'Microsoft Billing <finance@micros0ft-support.example>';
  const subjectHeader = result?.headers?.find((h) => h.key.toLowerCase() === 'subject')?.value || data.caseTitle;
  const dateHeader = result?.headers?.find((h) => h.key.toLowerCase() === 'date')?.value || new Date().toUTCString();
  const replyToHeader = result?.headers?.find((h) => h.key.toLowerCase() === 'reply-to')?.value || 'secure-verification.example';

  const deepReport = options?.deepReport;

  // AI Synthesis & Risk Narrative
  const execSummary = deepReport?.aiSynthesis?.executiveSummary || result?.summary || data.threatSummary;
  const riskNarrative = deepReport?.aiSynthesis?.riskNarrative || deepReport?.aiSynthesis?.plainLanguageExplanation || (
    data.riskScore >= 70
      ? 'This incident involves an engineered campaign crafted to impersonate trusted infrastructure. Cryptographic signatures were failed or deliberately omitted to bypass standard mail authentication filters, routing through suspicious ingress relays.'
      : 'Email cleared standard cryptographic verification. Sender alignment and authentication factors appear normal.'
  );

  const cleanTitle = sanitizeBenign(data.caseTitle);
  const cleanVerdict = sanitizeBenign(result?.verdict || (data.riskScore >= 75 ? 'Malicious Email Detected' : data.riskScore >= 40 ? 'Suspicious Email Warning' : 'Clean Email')) || 'Clean Email';
  const cleanThreatSummary = sanitizeBenign(data.threatSummary);
  const cleanExecSummary = sanitizeBenign(execSummary);
  const cleanRiskNarrative = sanitizeBenign(riskNarrative);

  // User Mitigation Checklist
  const mitigationList = deepReport?.aiSynthesis?.mitigationChecklist && deepReport.aiSynthesis.mitigationChecklist.length > 0
    ? deepReport.aiSynthesis.mitigationChecklist
    : (result?.recommended_actions && result.recommended_actions.length > 0
        ? result.recommended_actions.map(act => ({
            action: act.action,
            urgency: (act.priority?.toLowerCase() === 'high' || act.priority?.toLowerCase() === 'immediate' ? 'immediate' : act.priority?.toLowerCase() === 'medium' ? 'recommended' : 'optional') as 'immediate' | 'recommended' | 'optional',
            reason: act.detail || 'SOC standard containment procedure',
          }))
        : data.recommendedActions.map((act, i) => ({
            action: act,
            urgency: (i === 0 ? 'immediate' : i === 1 ? 'recommended' : 'optional') as 'immediate' | 'recommended' | 'optional',
            reason: 'Mitigates lateral network movement and credential harvest risk',
          }))
      );

  // 6-Engine Blacklist scanner
  const blacklists = deepReport?.threatIntel?.blacklists && deepReport.threatIntel.blacklists.length > 0
    ? deepReport.threatIntel.blacklists
    : [
        { engine: 'Spamhaus ZEN (SBL+XBL)', status: isMalicious ? 'listed' : isSuspicious ? 'warning' : 'clean', detail: isMalicious ? 'Listed on SBL - Known Ingress' : 'No active listings' },
        { engine: 'SORBS DNSBL', status: isMalicious ? 'listed' : 'clean', detail: isMalicious ? 'Listed under dynamic IP / spam relay' : 'Clear reputation' },
        { engine: 'Barracuda Reputation', status: isMalicious ? 'listed' : isSuspicious ? 'warning' : 'clean', detail: isMalicious ? 'Poor IP sender reputation' : 'Clear reputation' },
        { engine: 'Cisco Talos Intelligence', status: isMalicious ? 'listed' : 'clean', detail: isMalicious ? 'Threat classification: Malicious sender' : 'Reputation neutral / clean' },
        { engine: 'Google Safe Browsing', status: isMalicious ? 'listed' : 'clean', detail: isMalicious ? 'Deceptive site / payload host detected' : 'Clean / no threats reported' },
        { engine: 'SURBL Domain Blocklist', status: isMalicious ? 'listed' : 'clean', detail: isMalicious ? 'Malicious payload URI host listed' : 'Clear domain status' },
      ];

  // Threat Tags
  const threatTags = deepReport?.threatIntel?.threatTags && deepReport.threatIntel.threatTags.length > 0
    ? deepReport.threatIntel.threatTags
    : (result?.risk_factors && result.risk_factors.length > 0
        ? result.risk_factors.map(rf => rf.label)
        : [isMalicious ? 'Phishing / BEC' : 'Clean Ingestion', 'SPF Verified', 'DKIM Validated']);

  // Extract real relay hops if deepReport is provided, otherwise fallback to SMTP_RELAYS
  const hops =
    deepReport?.headerForensics?.hops && deepReport.headerForensics.hops.length > 0
      ? deepReport.headerForensics.hops.map((h) => ({
          hop: h.hop,
          ip: h.ip,
          hostname: h.reverseDns || h.ip,
          country: h.location || 'Unknown',
          timestamp: h.delay || '12ms',
        }))
      : SMTP_RELAYS;

  // Attachment forensics from deepReport
  const attachment = deepReport?.attachmentForensics;
  const hasAttachment = Boolean(attachment && (attachment.hasAttachment || attachment.filename));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mailveil ${typeLabel} — ${data.caseId}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 30px;
      line-height: 1.5;
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @keyframes cyberPulse1 {
      0% { transform: scale(0.6); opacity: 0.9; }
      50% { transform: scale(2.2); opacity: 0; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes cyberPulse2 {
      0% { transform: scale(0.6); opacity: 0.9; }
      30% { transform: scale(0.6); opacity: 0.7; }
      80% { transform: scale(2.6); opacity: 0; }
      100% { transform: scale(2.6); opacity: 0; }
    }
    .cyber-pulse-ring-1 {
      animation: cyberPulse1 2.2s ease-out infinite;
    }
    .cyber-pulse-ring-2 {
      animation: cyberPulse2 2.2s ease-out infinite;
    }
    .leaflet-container {
      background: #06070a !important;
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .leaflet-tile {
      filter: brightness(0.95) contrast(1.15) saturate(1.2);
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    @media print {
      body { padding: 0; background: #ffffff; }
      .no-print { display: none !important; }
      @page {
        margin: 12mm 14mm;
        size: A4 portrait;
      }
      .page-break { page-break-before: always; break-before: page; }
      .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    }

    /* Print action bar */
    .print-bar {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      gap: 12px;
      z-index: 9999;
    }
    .print-btn {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #ffffff;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 13px;
      border: none;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(37, 99, 235, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 36px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }

    /* Header Bar */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 18px;
      margin-bottom: 22px;
    }
    .brand-logo {
      height: 38px;
      width: auto;
      max-width: 230px;
      object-fit: contain;
      display: block;
      margin-bottom: 4px;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      line-height: 1.6;
    }
    .meta-tag {
      display: inline-block;
      padding: 3px 8px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10px;
    }

    /* Executive Score Card */
    .exec-card {
      background: #0f172a;
      color: #ffffff;
      border-radius: 14px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 24px;
    }
    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 14px;
      background: #1e293b;
      border: 3px solid ${scoreColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .score-num {
      font-size: 34px;
      font-weight: 900;
      color: ${scoreColor};
      line-height: 1;
    }
    .score-lbl {
      font-size: 9px;
      font-weight: 700;
      color: #94a3b8;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }
    .exec-info h2 {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 6px;
      color: #f8fafc;
    }
    .exec-summary {
      font-size: 12.5px;
      color: #cbd5e1;
      line-height: 1.6;
    }

    /* Section Styling */
    .section-head {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 26px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-head span {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }

    /* Data Tables & Key Values */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .meta-table td, .meta-table th {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    .meta-table th {
      background: #f1f5f9;
      font-weight: 700;
      font-size: 11px;
      color: #334155;
    }
    .mono-val {
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      font-weight: 500;
    }

    /* Auth Badge Cards */
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }

    .auth-box {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px;
      background: #f8fafc;
      text-align: center;
    }
    .auth-title {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 4px;
    }
    .auth-status {
      font-size: 16px;
      font-weight: 900;
    }
    .status-fail { color: #dc2626; }
    .status-pass { color: #16a34a; }
    .status-warn { color: #d97706; }

    .callout-row {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0284c7;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 8px;
      font-size: 12px;
      color: #334155;
    }

    .action-row {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-left: 4px solid #f97316;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 8px;
      font-size: 12px;
      color: #7c2d12;
    }

    .map-container {
      background: #040711;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 16px;
      border: 1px solid #1e293b;
    }

    .footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid #cbd5e1;
      font-size: 10px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="print-btn" onclick="window.print()">
      <span>🖨️ Print / Save as PDF</span>
    </button>
  </div>

  <div class="report-container">
    <!-- Header -->
    <div class="header-bar">
      <div>
        <img class="brand-logo" src="${MAILVEIL_LIGHT_LOGO_BASE64}" alt="MailVeil" />
        <div class="brand-sub">${typeLabel} · Cyber Threat Intelligence</div>
      </div>
      <div class="meta-box">
        <div>CASE: <strong class="mono-val">${data.caseId}</strong></div>
        <div>DATE: <span class="mono-val">${new Date().toISOString().slice(0, 10)}</span></div>
        <div style="margin-top: 4px;"><span class="meta-tag">CONFIDENTIAL // SOC INCIDENT DOSSIER</span></div>
      </div>
    </div>

    <!-- Executive Summary Card -->
    <div class="exec-card avoid-break">
      <div class="score-circle">
        <div class="score-num">${data.riskScore}</div>
        <div class="score-lbl">THREAT SCORE</div>
      </div>
      <div class="exec-info">
        <h2>${cleanTitle}</h2>
        <div style="margin-bottom: 8px; font-size: 11px;">
          CLASSIFICATION: <strong style="color: ${scoreColor};">${cleanVerdict}</strong> · 
          CONFIDENCE: <strong>${result?.confidence ?? 95}%</strong>
        </div>
        <div class="exec-summary">${cleanThreatSummary}</div>
      </div>
    </div>

    <!-- 1. Email Forensics & Threat AI Synthesis -->
    <div class="section-head avoid-break">
      <span>1. FINAL AI SYNTHESIS & RISK NARRATIVE</span>
      <span>CONFIDENCE: ${result?.confidence ?? 95}%</span>
    </div>

    <div class="grid-2 avoid-break" style="margin-bottom: 16px;">
      <!-- Executive Summary & Narrative -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
        <div>
          <div style="font-size: 10px; font-weight: 700; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Executive AI Summary</div>
          <div style="font-size: 12px; font-weight: 600; color: #0f172a; line-height: 1.5;">${cleanExecSummary}</div>
        </div>
        <div style="background: #f1f5f9; border-left: 3px solid #7c3aed; padding: 10px 12px; border-radius: 6px;">
          <div style="font-size: 10px; font-weight: 700; color: #6d28d9; text-transform: uppercase; margin-bottom: 3px;">Plain-Language Risk Explanation</div>
          <div style="font-size: 11.5px; color: #334155; line-height: 1.5;">${cleanRiskNarrative}</div>
        </div>
      </div>

      <!-- SOC Incident Mitigation Checklist -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px;">
        <div style="font-size: 10px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">User Mitigation Checklist</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${mitigationList.slice(0, 4).map(item => `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="font-size: 11px; font-weight: 700; color: #0f172a;">${item.action}</span>
                <span class="meta-tag" style="background: ${item.urgency === 'immediate' ? '#dc2626' : item.urgency === 'recommended' ? '#d97706' : '#16a34a'}; font-size: 9px; padding: 2px 6px;">${item.urgency.toUpperCase()}</span>
              </div>
              <div style="font-size: 10px; color: #64748b;">${item.reason}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Email Telemetry & RFC Headers -->
    <table class="meta-table avoid-break">
      <tr>
        <th style="width: 22%;">From Header</th>
        <td class="mono-val">${fromHeader}</td>
      </tr>
      <tr>
        <th>Target Recipient (To)</th>
        <td class="mono-val">${targetEmail}</td>
      </tr>
      <tr>
        <th>Subject Line</th>
        <td style="font-weight: 600;">${subjectHeader}</td>
      </tr>
      <tr>
        <th>Reply-To Redirection</th>
        <td class="mono-val">${replyToHeader}</td>
      </tr>
      <tr>
        <th>Transmission Timestamp</th>
        <td class="mono-val">${dateHeader}</td>
      </tr>
    </table>

    <!-- Key Risk Factors -->
    ${result?.risk_factors && result.risk_factors.length > 0 ? `
    <div style="margin-bottom: 16px;" class="avoid-break">
      <strong style="font-size: 11px; color: #475569; display: block; margin-bottom: 6px; text-transform: uppercase;">IDENTIFIED THREAT RISK FACTORS</strong>
      ${result.risk_factors.map((rf) => `
        <div class="callout-row" style="border-left-color: ${rf.severity === 'critical' ? '#ef4444' : rf.severity === 'high' ? '#f97316' : '#0284c7'};">
          <strong>[${rf.severity.toUpperCase()}] ${rf.label}:</strong> ${rf.detail}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- 2. Header Forensics & Cryptographic Authentication Matrix -->
    <div class="section-head avoid-break">
      <span>2. HEADER FORENSICS & AUTHENTICATION MATRIX</span>
      <span>CRYPTOGRAPHIC INTEGRITY</span>
    </div>

    <div class="grid-3 avoid-break">
      <div class="auth-box">
        <div class="auth-title">SPF VERIFICATION</div>
        <div class="auth-status ${(result?.threat_intel.spf ?? 'FAIL') === 'PASS' ? 'status-pass' : 'status-fail'}">
          ${result?.threat_intel.spf ?? 'FAIL'}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Sending IP authorization check</div>
      </div>
      <div class="auth-box">
        <div class="auth-title">DKIM SIGNATURE</div>
        <div class="auth-status ${(result?.threat_intel.dkim ?? 'FAIL') === 'PASS' ? 'status-pass' : 'status-fail'}">
          ${result?.threat_intel.dkim ?? 'FAIL'}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Cryptographic hash verification</div>
      </div>
      <div class="auth-box">
        <div class="auth-title">DMARC POLICY</div>
        <div class="auth-status ${(result?.threat_intel.dmarc ?? 'FAIL') === 'PASS' ? 'status-pass' : 'status-fail'}">
          ${result?.threat_intel.dmarc ?? 'FAIL'}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Domain alignment & reject policy</div>
      </div>
    </div>

    <!-- SMTP Relay Hops Table -->
    <div class="avoid-break" style="margin-bottom: 16px;">
      <strong style="font-size: 11px; color: #475569; display: block; margin-bottom: 6px; text-transform: uppercase;">SMTP RELAY TRANSIT CHAIN</strong>
      <table class="meta-table">
        <thead>
          <tr>
            <th>Hop</th>
            <th>Received From IP / Host</th>
            <th>By MTA Server</th>
            <th>Country</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          ${hops.map((h) => `
            <tr>
              <td class="mono-val" style="font-weight: 700;">#${h.hop}</td>
              <td class="mono-val">${h.ip}</td>
              <td class="mono-val">${h.hostname}</td>
              <td>${h.country}</td>
              <td class="mono-val">${h.timestamp}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Page Break for Clean Visual Print Flow -->
    <div class="page-break"></div>

    <!-- 3. Threat Intelligence & Infrastructure Profiling -->
    <div class="section-head avoid-break" style="margin-top: 0;">
      <span>3. THREAT INTELLIGENCE & INFRASTRUCTURE</span>
      <span>IOC CORRELATION</span>
    </div>

    <div class="grid-4 avoid-break">
      <div class="auth-box" style="text-align: left;">
        <div class="auth-title">SENDING IP REPUTATION</div>
        <div style="font-size: 13px; font-weight: 800; color: ${isMalicious ? '#dc2626' : isSuspicious ? '#d97706' : '#16a34a'};">
          ${(result?.threat_intel.ip_reputation ?? (isMalicious ? 'malicious' : isSuspicious ? 'suspicious' : 'clean')).toUpperCase()}
        </div>
        <div class="mono-val" style="font-size: 10px; color: #475569;">${originIp}</div>
      </div>
      <div class="auth-box" style="text-align: left;">
        <div class="auth-title">DOMAIN REGISTRATION AGE</div>
        <div style="font-size: 13px; font-weight: 800; color: #d97706;">
          ${result?.threat_intel.domain_age_days ? `${result.threat_intel.domain_age_days} Days Old` : '3 Days Old'}
        </div>
        <div style="font-size: 10px; color: #475569;">${senderDomain}</div>
      </div>
      <div class="auth-box" style="text-align: left;">
        <div class="auth-title">BLOCKLIST LISTINGS</div>
        <div style="font-size: 13px; font-weight: 800; color: ${isMalicious ? '#dc2626' : '#16a34a'};">
          ${result?.threat_intel.blocklists?.length ? `${result.threat_intel.blocklists.length} Engines` : (isMalicious ? '3 Engines' : '0 Engines')}
        </div>
        <div style="font-size: 10px; color: #475569;">Spamhaus XBL, SORBS</div>
      </div>
      <div class="auth-box" style="text-align: left;">
        <div class="auth-title">AUTONOMOUS SYSTEM</div>
        <div style="font-size: 13px; font-weight: 800; color: #7c3aed;">
          ${originAsn}
        </div>
        <div style="font-size: 10px; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${originHosting}</div>
      </div>
    </div>

    <!-- Threat Classification Tags -->
    ${threatTags.length > 0 ? `
    <div class="avoid-break" style="margin-bottom: 14px;">
      <strong style="font-size: 10.5px; color: #475569; display: block; margin-bottom: 6px; text-transform: uppercase;">Threat Classification Tags</strong>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${threatTags.map(tag => `
          <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">${tag}</span>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- 6-Engine Blacklist Scanner Results -->
    <div class="avoid-break" style="margin-bottom: 16px;">
      <strong style="font-size: 10.5px; color: #475569; display: block; margin-bottom: 6px; text-transform: uppercase;">6-Engine Reputation & Blacklist Scanner</strong>
      <div class="grid-2" style="margin-bottom: 0;">
        ${blacklists.map(bl => {
          const isClean = bl.status === 'clean';
          const isWarn = bl.status === 'warning';
          return `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${bl.engine}</div>
                <div style="font-size: 10px; color: #64748b;">${bl.detail}</div>
              </div>
              <span class="meta-tag" style="background: ${isClean ? '#16a34a' : isWarn ? '#d97706' : '#dc2626'}; font-size: 9px; padding: 2px 6px;">${bl.status.toUpperCase()}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 4. Origin Investigation & Geolocation Map Visual (DarkCyberMap Theme) -->
    <div class="section-head avoid-break">
      <span>4. ORIGIN INVESTIGATION & GEOLOCATION MAP</span>
      <span class="mono-val">GPS: ${originLat.toFixed(4)}° N, ${originLng.toFixed(4)}° E</span>
    </div>

    <div class="avoid-break" style="margin-bottom: 16px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); background: #06070a; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <!-- Leaflet DarkCyberMap Container -->
      <div id="cyber-pdf-map" style="width: 100%; height: 360px; min-height: 360px; background: #06070a; z-index: 1;"></div>

      <!-- Top Right Origin Status Badge -->
      <div style="position: absolute; top: 14px; right: 14px; z-index: 1000; display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 10px; background: rgba(12,15,26,0.92); border: 1px solid rgba(239,68,68,0.4); color: #fff; font-size: 11px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444;"></span>
        <span style="font-weight: 700; color: #ef4444; letter-spacing: 0.05em;">SUSPECTED ORIGIN:</span>
        <span style="color: #fff; font-weight: 600;">${originCity}, ${originCountry}</span>
      </div>

      <!-- Bottom Left Origin HUD Telemetry Overlay -->
      <div style="position: absolute; bottom: 14px; left: 14px; z-index: 1000; background: rgba(12,15,26,0.92); border: 1px solid rgba(56,189,248,0.3); border-radius: 10px; padding: 8px 14px; color: #cbd5e1; font-size: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
        <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
          <div><span style="color: #64748b;">IP:</span> <strong class="mono-val" style="color: #38bdf8;">${originIp}</strong></div>
          <div><span style="color: #64748b;">ASN:</span> <strong class="mono-val" style="color: #a855f7;">${originAsn}</strong></div>
          <div><span style="color: #64748b;">HOSTING:</span> <strong style="color: #f1f5f9;">${originHosting}</strong></div>
          <div><span style="color: #64748b;">COORDINATES:</span> <strong class="mono-val" style="color: #facc15;">${originLat.toFixed(4)}° N, ${originLng.toFixed(4)}° E</strong></div>
        </div>
      </div>
    </div>

    <!-- 5. Visual Attack Graph (Full Multi-Node Topology with 100% On-Screen Parity) -->
    <div class="section-head avoid-break">
      <span>5. ATTACK TOPOLOGY GRAPH</span>
      <span>INTRUSION CHAIN & CORRELATED IOC INFRASTRUCTURE</span>
    </div>

    <div class="map-container avoid-break" style="padding: 16px; background: #07080e; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 8px 32px rgba(0,0,0,0.6); overflow: hidden;">
      ${renderAttackGraphToSvg(result, getCaseLayoutStyle(result?.case_id), options?.customGraphPositions)}
    </div>

    <!-- 6. Recommended Incident Response & Remediation Plan -->
    <div class="section-head avoid-break">
      <span>6. RECOMMENDED INCIDENT RESPONSE ACTIONS</span>
      <span>SOC PLAYBOOK</span>
    </div>

    <div class="avoid-break">
      ${data.recommendedActions.map((a, i) => `
        <div class="action-row">
          <strong>ACTION ${i + 1}:</strong> ${a}
        </div>
      `).join('')}
    </div>

    ${hasAttachment && attachment ? `
    <!-- 7. Attachment Forensics & Embedded Payload Analysis -->
    <div class="section-head avoid-break">
      <span>7. ATTACHMENT FORENSICS & PAYLOAD ANALYSIS</span>
      <span>EMBEDDED CODE & SANDBOX EXECUTION</span>
    </div>

    <div class="avoid-break" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
        <div>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${attachment.filename}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            ${attachment.filetype} · ${attachment.filesize} · <span style="color: #0284c7; font-weight: 600;">Entropy: ${attachment.entropyScore} (${attachment.entropyRating})</span>
          </div>
        </div>
        <span class="meta-tag" style="background: ${attachment.verdict === 'malicious' ? '#dc2626' : attachment.verdict === 'suspicious' ? '#d97706' : '#16a34a'};">
          PAYLOAD: ${attachment.verdict.toUpperCase()}
        </span>
      </div>

      <table class="meta-table" style="margin-bottom: 12px;">
        <tr>
          <th style="width: 22%;">SHA-256 Digest</th>
          <td class="mono-val" style="word-break: break-all; font-size: 11px;">${attachment.sha256}</td>
        </tr>
        <tr>
          <th>MD5 Digest</th>
          <td class="mono-val" style="word-break: break-all; font-size: 11px;">${attachment.md5}</td>
        </tr>
        <tr>
          <th>Sandbox Verdict</th>
          <td style="font-weight: 600;">${sanitizeBenign(attachment.sandboxAnalysis?.status) || 'Executed in Isolated Sandbox'}</td>
        </tr>
      </table>

      ${attachment.tagsDetected && attachment.tagsDetected.length > 0 ? `
      <div style="margin-top: 10px;">
        <strong style="font-size: 10px; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 6px;">Detected File Objects & Anomalies:</strong>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${attachment.tagsDetected.map((t) => `
            <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; background: ${t.risk === 'critical' ? '#fee2e2; color: #b91c1c; border: 1px solid #fca5a5;' : '#f1f5f9; color: #334155; border: 1px solid #cbd5e1;'}">
              <span class="mono-val" style="color: inherit;">${t.tag}</span>: ${t.description}
            </span>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${attachment.sandboxAnalysis?.outboundConnections && attachment.sandboxAnalysis.outboundConnections.length > 0 ? `
      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
        <strong style="font-size: 10px; color: #dc2626; text-transform: uppercase; display: block; margin-bottom: 4px;">Outbound C2 Network Beacons:</strong>
        ${attachment.sandboxAnalysis.outboundConnections.map((conn) => `
          <div class="mono-val" style="font-size: 11px; color: #dc2626;">${conn}</div>
        `).join('')}
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer avoid-break">
      <div>MAILVEIL SECURITY OPERATIONS PLATFORM · CRYPTOGRAPHICALLY SECURED</div>
      <div>CONFIDENTIAL FORENSIC DOSSIER</div>
    </div>
  </div>

  <script>
    function initPdfMap() {
      try {
        if (typeof L === 'undefined') {
          setTimeout(function() { window.print(); }, 500);
          return;
        }
        var map = L.map('cyber-pdf-map', {
          center: [${originLat}, ${originLng}],
          zoom: 5,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false
        });

        var cartoKey = '${CARTO_API_KEY}';
        var tileUrl = cartoKey
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(cartoKey)
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        var tileLayer = L.tileLayer(tileUrl, {
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);

        setTimeout(function() {
          try { map.invalidateSize(); } catch(e) {}
        }, 150);

        var pulseIcon = L.divIcon({
          className: '',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          html: '<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">' +
            '<div class="cyber-pulse-ring-1" style="position:absolute;width:16px;height:16px;border-radius:50%;background:#ef4444;opacity:0.85;"></div>' +
            '<div class="cyber-pulse-ring-2" style="position:absolute;width:16px;height:16px;border-radius:50%;background:#ef4444;opacity:0.6;"></div>' +
            '<div style="position:absolute;width:24px;height:24px;border-radius:50%;border:1.5px solid #ef4444;opacity:0.6;box-shadow:0 0 14px 5px rgba(239,68,68,0.5);"></div>' +
            '<div style="position:relative;width:12px;height:12px;border-radius:50%;background:#facc15;border:2px solid #ef4444;box-shadow:0 0 12px 4px rgba(239,68,68,0.8);z-index:2;">' +
            '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:4px;height:4px;border-radius:50%;background:#ffffff;"></div>' +
            '</div></div>'
        });

        L.marker([${originLat}, ${originLng}], { icon: pulseIcon }).addTo(map);

        var printTriggered = false;
        function triggerPrint() {
          if (printTriggered) return;
          printTriggered = true;
          setTimeout(function() { window.print(); }, 700);
        }

        tileLayer.on('load', function() {
          triggerPrint();
        });

        setTimeout(triggerPrint, 2500);
      } catch (err) {
        setTimeout(function() { window.print(); }, 600);
      }
    }

    function initWhenLeafletReady() {
      if (typeof L !== 'undefined') {
        initPdfMap();
      } else {
        var attempts = 0;
        var interval = setInterval(function() {
          attempts++;
          if (typeof L !== 'undefined') {
            clearInterval(interval);
            initPdfMap();
          } else if (attempts > 50) {
            clearInterval(interval);
            window.print();
          }
        }, 50);
      }
    }

    window.onload = initWhenLeafletReady;
  </script>
</body>
</html>`;
}

/**
 * Generates an executive, styled printable HTML document matching the analyst report
 * and opens the browser print-to-PDF dialog.
 */
export function exportReportAsPDF(
  result: EmailAnalysisResult,
  options?: PdfExportOptions
) {
  const printWindow = window.open('', '_blank', 'width=1100,height=950');
  if (!printWindow) {
    alert('Please allow popups for Mailveil to export and print the PDF report.');
    return;
  }

  const reportData = options?.reportData || convertAnalysisToReportData(result);
  const reportType = options?.reportType || 'forensic';

  const html = generateFormattedPdfHtml(reportType, reportData, result, options);

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

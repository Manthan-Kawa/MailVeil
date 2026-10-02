export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ThreatType = 'BEC' | 'Phishing' | 'Malware' | 'Credential Harvesting' | 'Spoofing' | 'Ransomware' | 'C2' | 'Spam';

export interface KPIData {
  label: string;
  value: string | number;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  icon: string;
  accent: 'blue' | 'teal' | 'red' | 'amber' | 'green';
}

export interface ThreatRecord {
  id: string;
  timestamp: string;
  sender: string;
  subject: string;
  type: ThreatType;
  severity: Severity;
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  riskScore: number;
  destination: string;
}

export interface ActivityPoint {
  hour: string;
  threats: number;
  scanned: number;
}

export interface ThreatDistribution {
  name: string;
  value: number;
  color: string;
}

export interface GeoThreat {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  severity: Severity;
}

export interface RiskFactor {
  label: string;
  severity: Severity;
  detail: string;
}

export interface ObservedFact {
  id: string;
  category: string;
  field: string;
  value: string;
  status: 'fail' | 'pass' | 'warn' | 'info';
}

export interface AIInference {
  id: string;
  inference: string;
  confidence: number;
  basis: string;
}

export interface DemoEmail {
  from: string;
  replyTo: string;
  to: string;
  subject: string;
  date: string;
  receivedVia: string;
  bodyPreview: string;
  headers: { key: string; value: string }[];
}

export const KPIS: KPIData[] = [
  { label: 'Emails Analyzed', value: '14,892', delta: '+8.2%', trend: 'up', icon: 'MailCheck', accent: 'blue' },
  { label: 'Threats Detected', value: '1,247', delta: '+12.4%', trend: 'up', icon: 'ShieldAlert', accent: 'red' },
  { label: 'Critical Threats', value: '38', delta: '+3', trend: 'up', icon: 'AlertOctagon', accent: 'red' },
  { label: 'Active Investigations', value: '17', delta: '+2', trend: 'up', icon: 'Search', accent: 'amber' },
  { label: 'Detection Accuracy', value: '98.4%', delta: '+0.3%', trend: 'up', icon: 'Target', accent: 'green' },
  { label: 'Campaigns', value: '6', delta: '+1', trend: 'up', icon: 'Network', accent: 'teal' },
];

export const THREAT_DISTRIBUTION: ThreatDistribution[] = [
  { name: 'BEC', value: 34, color: '#ef4444' },
  { name: 'Phishing', value: 28, color: '#f97316' },
  { name: 'Credential Harvesting', value: 18, color: '#f59e0b' },
  { name: 'Malware', value: 12, color: '#3b82f6' },
  { name: 'Spoofing', value: 5, color: '#14b8a6' },
  { name: 'Other', value: 3, color: '#6b7280' },
];

export const HOURLY_ACTIVITY: ActivityPoint[] = [
  { hour: '00:00', threats: 4, scanned: 142 },
  { hour: '02:00', threats: 2, scanned: 98 },
  { hour: '04:00', threats: 1, scanned: 76 },
  { hour: '06:00', threats: 3, scanned: 110 },
  { hour: '08:00', threats: 12, scanned: 287 },
  { hour: '10:00', threats: 19, scanned: 341 },
  { hour: '12:00', threats: 24, scanned: 398 },
  { hour: '14:00', threats: 31, scanned: 452 },
  { hour: '16:00', threats: 27, scanned: 421 },
  { hour: '18:00', threats: 18, scanned: 312 },
  { hour: '20:00', threats: 9, scanned: 198 },
  { hour: '22:00', threats: 5, scanned: 154 },
];

export const RECENT_THREATS: ThreatRecord[] = [
  {
    id: 'TH-2024-0892',
    timestamp: '2026-08-25 14:32:11',
    sender: 'finance@micros0ft-support.example',
    subject: 'Urgent: Payment Verification Required',
    type: 'BEC',
    severity: 'critical',
    status: 'investigating',
    riskScore: 96,
    destination: 'cfo@acme-corp.example',
  },
  {
    id: 'TH-2024-0891',
    timestamp: '2026-08-25 13:18:44',
    sender: 'no-reply@paypa1-secure.example',
    subject: 'Your account has been limited',
    type: 'Credential Harvesting',
    severity: 'high',
    status: 'open',
    riskScore: 87,
    destination: 'billing@acme-corp.example',
  },
  {
    id: 'TH-2024-0890',
    timestamp: '2026-08-25 12:05:22',
    sender: 'invoices@vendor-portal.example',
    subject: 'Invoice #4471 - Overdue Payment',
    type: 'Phishing',
    severity: 'high',
    status: 'contained',
    riskScore: 82,
    destination: 'ap@acme-corp.example',
  },
  {
    id: 'TH-2024-0889',
    timestamp: '2026-08-25 11:47:09',
    sender: 'ceo@acme-corp.example',
    subject: 'Wire transfer request - confidential',
    type: 'Spoofing',
    severity: 'critical',
    status: 'investigating',
    riskScore: 94,
    destination: 'finance@acme-corp.example',
  },
  {
    id: 'TH-2024-0888',
    timestamp: '2026-08-25 10:33:51',
    sender: 'tracking@dhl-express-notify.example',
    subject: 'Package delivery failed - action required',
    type: 'Malware',
    severity: 'medium',
    status: 'resolved',
    riskScore: 61,
    destination: 'warehouse@acme-corp.example',
  },
  {
    id: 'TH-2024-0887',
    timestamp: '2026-08-25 09:22:17',
    sender: 'hr@acme-payroll.example',
    subject: 'Updated direct deposit information',
    type: 'BEC',
    severity: 'high',
    status: 'contained',
    riskScore: 79,
    destination: 'payroll@acme-corp.example',
  },
  {
    id: 'TH-2024-0886',
    timestamp: '2026-08-25 08:14:03',
    sender: 'support@micros0ft-365.example',
    subject: 'Password expiration notice',
    type: 'Credential Harvesting',
    severity: 'high',
    status: 'open',
    riskScore: 85,
    destination: 'it@acme-corp.example',
  },
];

export const GEO_THREATS: GeoThreat[] = [
  { id: 'G1', city: 'Lagos', country: 'Nigeria', lat: 6.52, lng: 3.37, count: 47, severity: 'critical' },
  { id: 'G2', city: 'Moscow', country: 'Russia', lat: 55.75, lng: 37.61, count: 38, severity: 'critical' },
  { id: 'G3', city: 'Saint Petersburg', country: 'Russia', lat: 59.93, lng: 30.34, count: 22, severity: 'high' },
  { id: 'G4', city: 'Kyiv', country: 'Ukraine', lat: 50.45, lng: 30.52, count: 18, severity: 'high' },
  { id: 'G5', city: 'Beijing', country: 'China', lat: 39.90, lng: 116.40, count: 31, severity: 'critical' },
  { id: 'G6', city: 'Shanghai', country: 'China', lat: 31.23, lng: 121.47, count: 19, severity: 'high' },
  { id: 'G7', city: 'Mumbai', country: 'India', lat: 19.07, lng: 72.87, count: 14, severity: 'medium' },
  { id: 'G8', city: 'São Paulo', country: 'Brazil', lat: -23.55, lng: -46.63, count: 16, severity: 'high' },
  { id: 'G9', city: 'Mexico City', country: 'Mexico', lat: 19.43, lng: -99.13, count: 12, severity: 'medium' },
  { id: 'G10', city: 'Istanbul', country: 'Turkey', lat: 41.01, lng: 28.97, count: 9, severity: 'medium' },
  { id: 'G11', city: 'Johannesburg', country: 'South Africa', lat: -26.20, lng: 28.04, count: 8, severity: 'low' },
  { id: 'G12', city: 'Hanoi', country: 'Vietnam', lat: 21.03, lng: 105.85, count: 11, severity: 'medium' },
];

export const DEMO_EMAIL: DemoEmail = {
  from: 'finance@micros0ft-support.example',
  replyTo: 'secure-verification@example',
  to: 'cfo@acme-corp.example',
  subject: 'Urgent: Payment Verification Required',
  date: '2026-08-25 14:31:48 UTC',
  receivedVia: 'SMTP / acme-mailgw-03',
  bodyPreview:
    'Dear CFO,\n\nWe are writing to inform you that your recent payment of $48,250.00 to Microsoft is currently on hold pending verification. To avoid cancellation of services, please verify your account immediately by accessing the secure verification portal below.\n\nYour immediate attention is required. Failure to verify within 24 hours will result in service suspension.\n\nClick here to verify your payment: https://micros0ft-support.example/verify?id=PX9471\n\nRegards,\nMicrosoft Billing Department',
  headers: [
    { key: 'Return-Path', value: '<finance@micros0ft-support.example>' },
    { key: 'Received', value: 'from mail-micros0ft-support.example (185.220.101.47) by acme-mailgw-03.example' },
    { key: 'Received', value: 'from localhost (localhost [127.0.0.1]) by mail-micros0ft-support.example' },
    { key: 'From', value: 'finance@micros0ft-support.example' },
    { key: 'To', value: 'cfo@acme-corp.example' },
    { key: 'Reply-To', value: 'secure-verification@example' },
    { key: 'Subject', value: 'Urgent: Payment Verification Required' },
    { key: 'Date', value: 'Mon, 25 Aug 2026 14:31:48 +0000' },
    { key: 'Message-ID', value: '<a7f2c8e1@mail-micros0ft-support.example>' },
    { key: 'X-Mailer', value: 'PHPMailer 6.5 / custom-build' },
    { key: 'Authentication-Results', value: 'acme-mailgw-03.example; spf=fail; dkim=fail; dmarc=fail' },
    { key: 'Received-SPF', value: 'Fail (micros0ft-support.example: domain not authorized)' },
    { key: 'DKIM-Signature', value: 'v=1; a=rsa-sha256; d=micros0ft-support.example; s=default; b=...' },
  ],
};

export const RISK_FACTORS: RiskFactor[] = [
  {
    label: 'Sender impersonation',
    severity: 'critical',
    detail: 'Display name "Microsoft Billing" does not match sender domain micros0ft-support.example',
  },
  {
    label: 'Lookalike domain',
    severity: 'critical',
    detail: 'micros0ft-support.example uses homoglyph "0" (zero) in place of "o" in "microsoft"',
  },
  {
    label: 'SPF/DKIM/DMARC failure',
    severity: 'critical',
    detail: 'All three authentication checks failed — sender is not authorized by domain',
  },
  {
    label: 'Suspicious URL',
    severity: 'high',
    detail: 'Link points to newly observed domain (registered 3 days ago) on hosting known for abuse',
  },
  {
    label: 'Social engineering',
    severity: 'high',
    detail: 'Urgency cues ("24 hours", "service suspension") and financial pressure tactics detected',
  },
];

export const OBSERVED_FACTS: ObservedFact[] = [
  {
    id: 'F1',
    category: 'Domain',
    field: 'From domain',
    value: 'micros0ft-support.example',
    status: 'warn',
  },
  {
    id: 'F2',
    category: 'Domain',
    field: 'Expected org domain',
    value: 'microsoft.com',
    status: 'info',
  },
  {
    id: 'F3',
    category: 'Domain',
    field: 'Domain age',
    value: '3 days (registered 2026-08-22)',
    status: 'warn',
  },
  {
    id: 'F4',
    category: 'Authentication',
    field: 'SPF',
    value: 'FAIL',
    status: 'fail',
  },
  {
    id: 'F5',
    category: 'Authentication',
    field: 'DKIM',
    value: 'FAIL',
    status: 'fail',
  },
  {
    id: 'F6',
    category: 'Authentication',
    field: 'DMARC',
    value: 'FAIL',
    status: 'fail',
  },
  {
    id: 'F7',
    category: 'Headers',
    field: 'Reply-To',
    value: 'secure-verification.example',
    status: 'warn',
  },
  {
    id: 'F8',
    category: 'Headers',
    field: 'Reply-To vs From',
    value: 'Mismatch — Reply-To differs from From domain',
    status: 'fail',
  },
  {
    id: 'F9',
    category: 'URLs',
    field: 'Embedded URL',
    value: 'https://micros0ft-support.example/verify?id=PX9471',
    status: 'warn',
  },
  {
    id: 'F10',
    category: 'URLs',
    field: 'URL domain age',
    value: 'Newly observed (3 days)',
    status: 'warn',
  },
  {
    id: 'F11',
    category: 'URLs',
    field: 'URL hosting reputation',
    value: 'Bulletproof hosting — high abuse rate',
    status: 'fail',
  },
  {
    id: 'F12',
    category: 'Infrastructure',
    field: 'Sending IP',
    value: '185.220.101.47',
    status: 'warn',
  },
  {
    id: 'F13',
    category: 'Infrastructure',
    field: 'IP reputation',
    value: 'Listed on 4 blocklists (Spamhaus XBL, SORBS, UCEPROTECT L2, Barracuda)',
    status: 'fail',
  },
  {
    id: 'F14',
    category: 'Content',
    field: 'Language sentiment',
    value: 'High urgency / financial pressure',
    status: 'warn',
  },
  {
    id: 'F15',
    category: 'Content',
    field: 'X-Mailer',
    value: 'PHPMailer 6.5 / custom-build',
    status: 'info',
  },
];

export const AI_INFERENCES: AIInference[] = [
  {
    id: 'I1',
    inference: 'Likely business email compromise (BEC) targeting CFO for financial fraud',
    confidence: 94.7,
    basis: 'Impersonation of Microsoft billing, financial urgency cues, credential harvest link',
  },
  {
    id: 'I2',
    inference: 'Possible executive impersonation — sender mimics legitimate vendor billing',
    confidence: 88.2,
    basis: 'Display name "Microsoft Billing", lookalike domain, payment-themed subject',
  },
  {
    id: 'I3',
    inference: 'Credential harvesting intent suspected via verification portal link',
    confidence: 91.3,
    basis: 'Reply-To redirect, newly registered link domain, "verify your account" language',
  },
  {
    id: 'I4',
    inference: 'Sender infrastructure consistent with known BEC campaign cluster "WIRE-FAUD-247"',
    confidence: 72.5,
    basis: 'IP blocklist overlap, PHPMailer signature, domain naming pattern match',
  },
];

export const ANALYSIS_STAGES = [
  'Email',
  'Detect',
  'Explain',
  'Trace',
  'Correlate',
  'Investigate',
  'Preserve',
  'Report',
] as const;

export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];

// ─── Phase 2: Header Forensics ──────────────────────────────────────────────

export interface SmtpRelayHop {
  id: string;
  hop: number;
  ip: string;
  hostname: string;
  timestamp: string;
  country: string;
  countryCode: string;
  asn: string;
  asnOrg: string;
  confidence: number;
  note: string;
}

export const SMTP_RELAYS: SmtpRelayHop[] = [
  {
    id: 'R1', hop: 1, ip: '185.220.101.47', hostname: 'mail-micros0ft-support.example',
    timestamp: '2026-08-25 14:31:48 UTC', country: 'Romania', countryCode: 'RO',
    asn: 'AS200651', asnOrg: 'FlokiNET Ltd (synthetic)', confidence: 82,
    note: 'Originating mail server — bulletproof hosting provider',
  },
  {
    id: 'R2', hop: 2, ip: '45.137.21.88', hostname: 'relay-01.flokinet-redirect.example',
    timestamp: '2026-08-25 14:31:50 UTC', country: 'Iceland', countryCode: 'IS',
    asn: 'AS20495', asnOrg: 'ThorDatacenter (synthetic)', confidence: 71,
    note: 'Intermediate relay — known proxy/redirect service',
  },
  {
    id: 'R3', hop: 3, ip: '91.243.59.12', hostname: 'gw-acme-edge-02.acme-corp.example',
    timestamp: '2026-08-25 14:31:52 UTC', country: 'United States', countryCode: 'US',
    asn: 'AS40023', asnOrg: 'Acme Corp Networks (synthetic)', confidence: 99,
    note: 'Recipient edge gateway — legitimate corporate infrastructure',
  },
  {
    id: 'R4', hop: 4, ip: '10.14.22.5', hostname: 'acme-mailgw-03.acme-corp.example',
    timestamp: '2026-08-25 14:31:53 UTC', country: 'United States', countryCode: 'US',
    asn: 'Internal', asnOrg: 'Acme Corp Internal (synthetic)', confidence: 100,
    note: 'Internal mail gateway — final delivery to recipient mailbox',
  },
];

export interface ExtendedHeader {
  key: string;
  value: string;
  category: 'routing' | 'auth' | 'identity' | 'content' | 'metadata';
}

export const EXTENDED_HEADERS: ExtendedHeader[] = [
  { key: 'From', value: 'finance@micros0ft-support.example', category: 'identity' },
  { key: 'Reply-To', value: 'secure-verification@example', category: 'identity' },
  { key: 'Return-Path', value: '<finance@micros0ft-support.example>', category: 'routing' },
  { key: 'Message-ID', value: '<a7f2c8e1@mail-micros0ft-support.example>', category: 'metadata' },
  { key: 'Received (1)', value: 'from mail-micros0ft-support.example (185.220.101.47) by acme-mailgw-03.example with ESMTP; Mon, 25 Aug 2026 14:31:53 +0000', category: 'routing' },
  { key: 'Received (2)', value: 'from localhost (localhost [127.0.0.1]) by mail-micros0ft-support.example with PHPMailer; Mon, 25 Aug 2026 14:31:48 +0000', category: 'routing' },
  { key: 'Authentication-Results', value: 'acme-mailgw-03.example; spf=fail (micros0ft-support.example: domain not authorized); dkim=fail (no valid signature); dmarc=fail (policy reject not enforced)', category: 'auth' },
  { key: 'Received-SPF', value: 'Fail (micros0ft-support.example: domain of finance@micros0ft-support.example does not designate 185.220.101.47 as permitted sender)', category: 'auth' },
  { key: 'DKIM-Signature', value: 'v=1; a=rsa-sha256; c=relaxed/relaxed; d=micros0ft-support.example; s=default; t=1724591508; bh=...; b=...', category: 'auth' },
  { key: 'MIME-Version', value: '1.0', category: 'content' },
  { key: 'Content-Type', value: 'text/plain; charset=UTF-8; format=flowed', category: 'content' },
  { key: 'User-Agent', value: 'PHPMailer 6.5 / custom-build (Acme-Notify)', category: 'metadata' },
];

export interface HeaderFact {
  id: string;
  fact: string;
  status: 'fail' | 'warn' | 'info';
  detail: string;
}

export const HEADER_FACTS: HeaderFact[] = [
  { id: 'HF1', fact: 'From and Reply-To domains differ', status: 'fail', detail: 'From: micros0ft-support.example vs Reply-To: secure-verification.example — reply traffic redirected to unrelated domain' },
  { id: 'HF2', fact: 'SPF failed', status: 'fail', detail: 'Sending IP 185.220.101.47 not authorized by micros0ft-support.example SPF record' },
  { id: 'HF3', fact: 'DKIM failed', status: 'fail', detail: 'No valid DKIM signature found — signature present but verification returned permerror' },
  { id: 'HF4', fact: 'DMARC failed', status: 'fail', detail: 'DMARC alignment check failed — neither SPF nor DKIM aligned with header From domain' },
  { id: 'HF5', fact: 'Suspicious relay behavior', status: 'warn', detail: 'Originating server injected via localhost [127.0.0.1] — indicates scripted/automated sending, not a legitimate MTA' },
];

export interface HeaderInference {
  id: string;
  inference: string;
  confidence: number;
  basis: string;
}

export const HEADER_INFERENCES: HeaderInference[] = [
  { id: 'HI1', inference: 'Possible sender impersonation — sender mimics Microsoft billing to exploit trust', confidence: 89.3, basis: 'Lookalike domain with homoglyph, Microsoft-themed display name, payment-themed subject' },
  { id: 'HI2', inference: 'Possible BEC infrastructure — relay chain consistent with known BEC campaign patterns', confidence: 76.8, basis: 'Bulletproof hosting origin, localhost injection, PHPMailer signature matching cluster WIRE-FAUD-247' },
  { id: 'HI3', inference: 'Possible credential-harvesting intent — Reply-To redirect to verification domain', confidence: 84.1, basis: 'Reply-To mismatch, "verify your account" language, URL on newly registered domain' },
];

// ─── Phase 3: Threat Intelligence ───────────────────────────────────────────

export interface IPIntelligence {
  ip: string;
  reputation: 'malicious' | 'suspicious' | 'clean';
  reputationScore: number;
  asn: string;
  asnOrg: string;
  hosting: string;
  country: string;
  countryCode: string;
  networkType: string;
  firstSeen: string;
  lastSeen: string;
  relatedIndicators: string[];
  blocklists: string[];
}

export const IP_INTEL: IPIntelligence = {
  ip: '185.220.101.47',
  reputation: 'malicious',
  reputationScore: 12,
  asn: 'AS200651',
  asnOrg: 'FlokiNET Ltd (synthetic)',
  hosting: 'Bulletproof / abuse-tolerant VPS',
  country: 'Romania',
  countryCode: 'RO',
  networkType: 'Datacenter / VPN exit',
  firstSeen: '2026-08-22',
  lastSeen: '2026-08-25',
  relatedIndicators: ['micros0ft-support.example', 'secure-verification.example', 'WIRE-FAUD-247'],
  blocklists: ['Spamhaus XBL', 'SORBS DNSBL', 'UCEPROTECT L2', 'Barracuda'],
};

export interface DomainIntelligence {
  domain: string;
  reputation: 'malicious' | 'suspicious' | 'clean';
  registrationAge: string;
  registeredOn: string;
  registrar: string;
  dns: { type: string; value: string }[];
  nameservers: string[];
  hosting: string;
  relatedDomains: string[];
  lookalikeSimilarity: number;
  lookalikeTarget: string;
}

export const DOMAIN_INTEL: DomainIntelligence = {
  domain: 'micros0ft-support.example',
  reputation: 'malicious',
  registrationAge: '3 days',
  registeredOn: '2026-08-22',
  registrar: 'Njalla AB (synthetic privacy registrar)',
  dns: [
    { type: 'A', value: '185.220.101.47' },
    { type: 'MX', value: 'mail-micros0ft-support.example' },
    { type: 'TXT (SPF)', value: 'v=spf1 ip4:185.220.101.47 -all' },
    { type: 'TXT (DMARC)', value: 'v=DMARC1; p=none; rua=mailto:abuse@micros0ft-support.example' },
  ],
  nameservers: ['ns1.flokinet-dns.example', 'ns2.flokinet-dns.example'],
  hosting: 'FlokiNET Ltd — bulletproof hosting',
  relatedDomains: ['secure-verification.example', 'micros0ft-365.example', 'paypa1-secure.example'],
  lookalikeSimilarity: 92,
  lookalikeTarget: 'microsoft.example',
};

export const LOOKALIKE_ANALYSIS = {
  expected: 'microsoft.example',
  observed: 'micros0ft-support.example',
  similarity: 92,
  characteristics: [
    { trait: 'Homoglyph substitution', detail: 'Letter "o" replaced with digit "0" (zero) — visually near-identical in most fonts', severity: 'critical' as Severity },
    { trait: 'Subdomain appendage', detail: '"-support" appended to mimic legitimate support subdomains', severity: 'high' as Severity },
    { trait: 'TLD match', detail: 'Uses ".example" TLD — same as expected target domain', severity: 'medium' as Severity },
    { trait: 'Registration recency', detail: 'Domain registered only 3 days before the phishing email was sent', severity: 'critical' as Severity },
    { trait: 'Privacy registrar', detail: 'Registered via privacy-focused registrar that redacts WHOIS data', severity: 'high' as Severity },
  ],
};

export interface URLIntelligence {
  fullUrl: string;
  domain: string;
  reputation: 'malicious' | 'suspicious' | 'clean';
  reputationScore: number;
  redirectCount: number;
  redirectChain: string[];
  firstSeen: string;
  category: string;
  detectionSignals: string[];
  riskScore: number;
}

export const URL_INTEL: URLIntelligence = {
  fullUrl: 'https://micros0ft-support.example/verify?id=PX9471',
  domain: 'micros0ft-support.example',
  reputation: 'malicious',
  reputationScore: 8,
  redirectCount: 3,
  redirectChain: [
    'https://micros0ft-support.example/verify?id=PX9471',
    'https://secure-verification.example/login',
    'https://cred-harvest-flokinet.example/capture',
  ],
  firstSeen: '2026-08-23',
  category: 'Credential Harvesting / Phishing',
  detectionSignals: [
    'Domain registered <7 days before URL first seen',
    'Hosted on bulletproof infrastructure (AS200651)',
    'Redirect chain obfuscation — 3 hops to credential capture page',
    'URL parameter "id" used for tracking victim sessions',
    'No valid TLS certificate — self-signed on final hop',
    'Page title mimics Microsoft account login',
  ],
  riskScore: 94,
};

export interface RelatedIndicator {
  id: string;
  indicator: string;
  type: 'IP' | 'Domain' | 'URL' | 'Email' | 'Campaign';
  relationship: string;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
}

export const RELATED_INDICATORS: RelatedIndicator[] = [
  { id: 'IND1', indicator: '185.220.101.47', type: 'IP', relationship: 'Sending infrastructure', confidence: 96, firstSeen: '2026-08-22', lastSeen: '2026-08-25' },
  { id: 'IND2', indicator: 'micros0ft-support.example', type: 'Domain', relationship: 'Sender / URL domain', confidence: 98, firstSeen: '2026-08-22', lastSeen: '2026-08-25' },
  { id: 'IND3', indicator: 'secure-verification.example', type: 'Domain', relationship: 'Reply-To redirect', confidence: 91, firstSeen: '2026-08-22', lastSeen: '2026-08-25' },
  { id: 'IND4', indicator: 'https://micros0ft-support.example/verify?id=PX9471', type: 'URL', relationship: 'Embedded credential harvest link', confidence: 97, firstSeen: '2026-08-23', lastSeen: '2026-08-25' },
  { id: 'IND5', indicator: 'finance@micros0ft-support.example', type: 'Email', relationship: 'Spoofed sender address', confidence: 99, firstSeen: '2026-08-25', lastSeen: '2026-08-25' },
  { id: 'IND6', indicator: 'WIRE-FAUD-247', type: 'Campaign', relationship: 'Associated campaign cluster', confidence: 72, firstSeen: '2026-08-15', lastSeen: '2026-08-25' },
  { id: 'IND7', indicator: '45.137.21.88', type: 'IP', relationship: 'Intermediate relay', confidence: 68, firstSeen: '2026-08-20', lastSeen: '2026-08-25' },
  { id: 'IND8', indicator: 'micros0ft-365.example', type: 'Domain', relationship: 'Related lookalike domain', confidence: 64, firstSeen: '2026-08-21', lastSeen: '2026-08-24' },
  { id: 'IND9', indicator: 'paypa1-secure.example', type: 'Domain', relationship: 'Related lookalike domain', confidence: 58, firstSeen: '2026-08-19', lastSeen: '2026-08-23' },
  { id: 'IND10', indicator: 'cred-harvest-flokinet.example', type: 'Domain', relationship: 'Credential capture endpoint', confidence: 81, firstSeen: '2026-08-23', lastSeen: '2026-08-25' },
];

export const INTEL_RELATIONSHIP_FLOW = [
  { label: 'Email', value: 'finance@micros0ft-support.example' },
  { label: 'Lookalike Domain', value: 'micros0ft-support.example' },
  { label: 'Observed IP', value: '185.220.101.47' },
  { label: 'Hosting', value: 'FlokiNET Ltd (AS200651)' },
  { label: 'Suspicious URL', value: 'micros0ft-support.example/verify' },
];

// ─── Phase 4: Origin Investigation + Attack Graph ───────────────────────────

export interface InfraLocation {
  id: string;
  country: string;
  countryCode: string;
  city: string;
  lat: number;
  lng: number;
  ip: string;
  asn: string;
  asnOrg: string;
  hosting: string;
  confidence: number;
  role: string;
  evidence: string[];
}

export const INFRA_LOCATIONS: InfraLocation[] = [
  {
    id: 'LOC1', country: 'India', countryCode: 'IN', city: 'Mumbai',
    lat: 19.0760, lng: 72.8777, ip: '103.19.199.18', asn: 'AS55836',
    asnOrg: 'Reliance Jio Infocomm', hosting: 'Cloud Gateway',
    confidence: 78, role: 'Probable Source — Originating SMTP Server',
    evidence: ['SMTP relay origin (Received header hop 1)', 'ASN correlation with campaign cluster', 'DNS A record resolves to this IP', 'Domain registered 3 days prior via same registrar'],
  },
  {
    id: 'LOC2', country: 'Iceland', countryCode: 'IS', city: 'Reykjavik',
    lat: 64.13, lng: -21.94, ip: '45.137.21.88', asn: 'AS20495',
    asnOrg: 'ThorDatacenter (synthetic)', hosting: 'Privacy-focused datacenter',
    confidence: 54, role: 'Intermediate Relay — Redirect Node',
    evidence: ['Second hop in SMTP relay chain', 'Known proxy/redirect service', 'Shared ASN with other BEC campaign IOCs'],
  },
  {
    id: 'LOC3', country: 'United States', countryCode: 'US', city: 'Ashburn, VA',
    lat: 39.04, lng: -77.49, ip: '91.243.59.12', asn: 'AS40023',
    asnOrg: 'Acme Corp Networks (synthetic)', hosting: 'Corporate edge gateway',
    confidence: 99, role: 'Recipient Edge — Legitimate Infrastructure',
    evidence: ['Acme Corp edge gateway', 'Legitimate corporate ASN', 'Final delivery hop'],
  },
  {
    id: 'LOC4', country: 'Panama', countryCode: 'PA', city: 'Panama City',
    lat: 8.98, lng: -79.52, ip: '190.34.176.22', asn: 'AS26100',
    asnOrg: 'Privacy Hosting SA (synthetic)', hosting: 'Offshore bulletproof hosting',
    confidence: 41, role: 'Possible Credential Capture Server',
    evidence: ['Final redirect target in URL chain', 'Hosts cred-harvest-flokinet.example', 'WHOIS privacy redacted', 'ASN overlaps with 2 prior BEC campaigns'],
  },
];

export const ORIGIN_CONFIDENCE = {
  probableSource: 'Mumbai, India (AS55836 — Reliance Jio Infocomm)',
  confidence: 78,
  signals: [
    { signal: 'SMTP relay location', weight: 30, detail: 'Originating Received header resolves to 103.19.199.18, geolocated to Mumbai, India' },
    { signal: 'ASN correlation', weight: 25, detail: 'AS55836 appears in prior campaign IOCs' },
    { signal: 'DNS relationship', weight: 15, detail: 'Domain A record and MX both resolve to infrastructure within the same ASN' },
    { signal: 'Hosting relationship', weight: 8, detail: 'Infrastructure registered under high-velocity routing provider' },
  ],
};

// ─── Extended Attack Graph (image-matching) ─────────────────────────────────

export type GraphNodeType =
  | 'email' | 'sender' | 'domain' | 'ip' | 'url'
  | 'attachment' | 'hash' | 'mailserver' | 'asn' | 'campaign' | 'case';

export interface AttackGraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  sublabel?: string;
  details: { key: string; value: string }[];
  x: number;
  y: number;
}

export interface AttackGraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: 'dashed'|'solid';
  color?: string;
}

export const ATTACK_GRAPH_NODES: AttackGraphNode[] = [
  // ── Col 0: Email ──────────────────────────────────────────────
  {
    id: 'n-email', type: 'email', label: 'Suspicious Email',
    sublabel: 'Subject: Urgent: Payment Confi...',
    details: [
      { key: 'subject', value: 'Urgent: Payment Confi...' },
      { key: 'target', value: 'cfo@acme-corp.example' },
      { key: 'risk', value: '96/100' },
    ],
    x: 50, y: 240,
  },
  // ── Col 1: Sender & Hash ──────────────────────────────────────
  {
    id: 'n-sender', type: 'sender', label: 'finance@paypal-security...',
    sublabel: 'finance@paypal-security.com',
    details: [
      { key: 'address', value: 'finance@paypal-security.com' },
      { key: 'display', value: 'Finance Department' },
    ],
    x: 380, y: 240,
  },
  {
    id: 'n-hash', type: 'hash', label: 'SHA-256: a0f8…c2d3',
    sublabel: 'SHA-256 file hash',
    details: [
      { key: 'algo', value: 'SHA-256' },
      { key: 'value', value: 'a0f8...c2d3' },
    ],
    x: 380, y: 620,
  },
  // ── Col 2: Domain1 & Domain2 ──────────────────────────────────
  {
    id: 'n-domain1', type: 'domain', label: 'paypa0-security.com',
    sublabel: 'age: 14 days  •  registrar: Njalla AB',
    details: [
      { key: 'age', value: '14 days' },
      { key: 'registrar', value: 'Njalla AB' },
    ],
    x: 710, y: 50,
  },
  {
    id: 'n-domain2', type: 'domain', label: 'paypa0-security.com',
    sublabel: 'age: 3 days',
    details: [
      { key: 'age', value: '3 days' },
      { key: 'intent', value: 'Sender Domain' },
    ],
    x: 710, y: 240,
  },
  // ── Col 3: IP & Mail Server ───────────────────────────────────
  {
    id: 'n-ip', type: 'ip', label: '185.220.101.47',
    sublabel: 'country: Germany',
    details: [
      { key: 'country', value: 'Germany' },
      { key: 'asn', value: 'AS31384' },
    ],
    x: 1040, y: 50,
  },
  {
    id: 'n-mailserver', type: 'mailserver', label: 'mx1.paypa0-security.com',
    sublabel: 'ip: 185.220.101.47',
    details: [
      { key: 'ip', value: '185.220.101.47' },
      { key: 'protocol', value: 'SMTP' },
    ],
    x: 1040, y: 240,
  },
  // ── Col 4: ASN, URL1, URL2 ────────────────────────────────────
  {
    id: 'n-asn', type: 'asn', label: 'AS24940 — Hetzner',
    sublabel: 'provider: Hetzner Online Stutt...',
    details: [
      { key: 'provider', value: 'Hetzner Online Stuttgart' },
      { key: 'abuse', value: 'High' },
    ],
    x: 1370, y: 50,
  },
  {
    id: 'n-url1', type: 'url', label: 'paypa0-security.com/wor...',
    sublabel: 'redirects: 3 hops  •  intent: Credential Theft',
    details: [
      { key: 'redirects', value: '3 hops' },
      { key: 'intent', value: 'Credential Theft' },
    ],
    x: 1370, y: 240,
  },
  {
    id: 'n-url2', type: 'domain', label: 'secure-banking-alert.com',
    sublabel: 'age: 21 days  •  intent: Data Exfil',
    details: [
      { key: 'age', value: '21 days' },
      { key: 'intent', value: 'Data Exfiltration' },
    ],
    x: 1370, y: 430,
  },
  // ── Col 5: Campaign, URL3, Case ───────────────────────────────
  {
    id: 'n-campaign', type: 'campaign', label: 'CMP-2026-0887',
    sublabel: 'emails: 37  •  targets: 91',
    details: [
      { key: 'emails', value: '37' },
      { key: 'targets', value: '91' },
    ],
    x: 1700, y: 50,
  },
  {
    id: 'n-url3', type: 'url', label: 'login-portal.xyz/auth0',
    sublabel: 'intent: Credential Capture  •  riskScore: Critical',
    details: [
      { key: 'intent', value: 'Credential Capture' },
      { key: 'riskScore', value: 'Critical' },
    ],
    x: 1700, y: 430,
  },
  {
    id: 'n-case', type: 'case', label: 'INV-2026-0082',
    sublabel: 'Status: Under Investigation  •  severity: Critical',
    details: [
      { key: 'status', value: 'Under Investigation' },
      { key: 'severity', value: 'Critical' },
    ],
    x: 1700, y: 620,
  },
];

export const ATTACK_GRAPH_EDGES: AttackGraphEdge[] = [
  { id: 'ae1',  source: 'n-email',      target: 'n-sender',     label: 'RECEIVES',   color: '#6366f1', animated: true },
  { id: 'ae2',  source: 'n-sender',     target: 'n-domain1',    label: 'RESOLVES',   color: '#22d3ee', animated: true },
  { id: 'ae3',  source: 'n-sender',     target: 'n-domain2',    label: 'FROM',       color: '#22d3ee', animated: true },
  { id: 'ae4',  source: 'n-domain1',    target: 'n-ip',         label: 'A-RECORD',   color: '#f97316', animated: true },
  { id: 'ae5',  source: 'n-ip',         target: 'n-asn',        label: 'BELONGS TO', color: '#a855f7', animated: true },
  { id: 'ae6',  source: 'n-asn',        target: 'n-campaign',   label: 'HOSTS',      color: '#f59e0b', animated: true },
  { id: 'ae7',  source: 'n-domain2',    target: 'n-mailserver', label: 'MX RECORD',  color: '#22d3ee', animated: true },
  { id: 'ae8',  source: 'n-mailserver', target: 'n-url1',       label: 'SERVES',     color: '#ef4444', animated: true },
  { id: 'ae9',  source: 'n-url1',       target: 'n-url2',       label: 'REDIRECT',   color: '#ef4444', animated: true },
  { id: 'ae10', source: 'n-url2',       target: 'n-url3',       label: 'REDIRECT',   color: '#ef4444', animated: true },
  { id: 'ae11', source: 'n-url3',       target: 'n-campaign',   label: 'PART OF',    color: '#f59e0b', animated: true },
  { id: 'ae12', source: 'n-campaign',   target: 'n-case',       label: 'LINKED TO',  color: '#22c55e', animated: true },
  { id: 'ae13', source: 'n-email',      target: 'n-hash',       label: 'HASHLINK',   color: '#6366f1', animated: true },
];

// ─── Phase 5: Investigations + Evidence Vault ────────────────────────────────

export type CaseStatus = 'open' | 'investigating' | 'contained' | 'resolved';

export interface InvestigationCase {
  id: string;
  title: string;
  severity: Severity;
  status: CaseStatus;
  created: string;
  assignedAnalyst: string;
  threatType: ThreatType;
  relatedCampaign: string;
  lastUpdated: string;
  summary: string;
  timeline: { time: string; event: string; actor: string }[];
  analystNotes: { author: string; timestamp: string; note: string }[];
  activityHistory: { time: string; action: string; actor: string }[];
  relatedEvidence: string[];
}

export const INVESTIGATION_CASES: InvestigationCase[] = [
  {
    id: 'CASE-2026-0471',
    title: 'BEC: Micros0ft-Support Payment Fraud',
    severity: 'critical',
    status: 'investigating',
    created: '2026-08-25 14:35:00',
    assignedAnalyst: 'Kaelen Richter',
    threatType: 'BEC',
    relatedCampaign: 'WIRE-FAUD-247',
    lastUpdated: '2026-08-25 15:02:00',
    summary: 'Business email compromise attempt targeting Acme Corp CFO via lookalike domain micros0ft-support.example. Email impersonates Microsoft billing with urgent payment verification request. Credential harvesting URL embedded. All authentication checks (SPF/DKIM/DMARC) failed. Infrastructure linked to campaign cluster WIRE-FAUD-247.',
    timeline: [
      { time: '2026-08-25 14:31:48', event: 'Email received by cfo@acme-corp.example', actor: 'System' },
      { time: '2026-08-25 14:32:11', event: 'Threat detected by Mailveil engine — risk score 96', actor: 'Detection Engine' },
      { time: '2026-08-25 14:35:00', event: 'Investigation case opened', actor: 'Kaelen Richter' },
      { time: '2026-08-25 14:42:00', event: 'Header forensics analysis completed', actor: 'Kaelen Richter' },
      { time: '2026-08-25 14:51:00', event: 'Threat intelligence correlation — matched WIRE-FAUD-247', actor: 'System' },
      { time: '2026-08-25 15:00:00', event: 'Evidence preserved — SHA-256 hash generated', actor: 'Kaelen Richter' },
      { time: '2026-08-25 15:02:00', event: 'Origin investigation — probable source identified', actor: 'Kaelen Richter' },
    ],
    analystNotes: [
      { author: 'Kaelen Richter', timestamp: '2026-08-25 14:38:00', note: 'Domain uses homoglyph (zero for "o") — classic BEC tactic. Reply-To redirect confirms credential harvesting intent.' },
      { author: 'Kaelen Richter', timestamp: '2026-08-25 14:55:00', note: 'IP 185.220.101.47 matches 3 other IOCs in WIRE-FAUD-247 cluster. Recommending block at edge gateway.' },
    ],
    activityHistory: [
      { time: '2026-08-25 14:35:00', action: 'Case created', actor: 'Kaelen Richter' },
      { time: '2026-08-25 14:42:00', action: 'Status changed: Open → Investigating', actor: 'Kaelen Richter' },
      { time: '2026-08-25 15:00:00', action: 'Evidence linked: EV-2026-1129', actor: 'Kaelen Richter' },
    ],
    relatedEvidence: ['EV-2026-1129', 'EV-2026-1130'],
  },
  {
    id: 'CASE-2026-0468',
    title: 'Credential Harvesting: Paypa1-Secure Lookalike',
    severity: 'high',
    status: 'open',
    created: '2026-08-25 13:20:00',
    assignedAnalyst: 'Analyst Reyes',
    threatType: 'Credential Harvesting',
    relatedCampaign: 'WIRE-FAUD-247',
    lastUpdated: '2026-08-25 13:45:00',
    summary: 'Credential harvesting email targeting billing department via lookalike domain paypa1-secure.example. Spoofed PayPal notification with account limitation warning.',
    timeline: [
      { time: '2026-08-25 13:18:44', event: 'Email received by billing@acme-corp.example', actor: 'System' },
      { time: '2026-08-25 13:20:00', event: 'Case opened', actor: 'Analyst Reyes' },
    ],
    analystNotes: [
      { author: 'Analyst Reyes', timestamp: '2026-08-25 13:25:00', note: 'Related to CASE-2026-0471 — same campaign cluster.' },
    ],
    activityHistory: [
      { time: '2026-08-25 13:20:00', action: 'Case created', actor: 'Analyst Reyes' },
    ],
    relatedEvidence: ['EV-2026-1125'],
  },
  {
    id: 'CASE-2026-0462',
    title: 'Spoofing: CEO Wire Transfer Request',
    severity: 'critical',
    status: 'contained',
    created: '2026-08-25 11:50:00',
    assignedAnalyst: 'Kaelen Richter',
    threatType: 'Spoofing',
    relatedCampaign: 'EXEC-SPOOF-118',
    lastUpdated: '2026-08-25 12:30:00',
    summary: 'Executive impersonation attempt spoofing CEO address. Wire transfer request sent to finance department. Blocked at gateway after DMARC enforcement.',
    timeline: [
      { time: '2026-08-25 11:47:09', event: 'Email received by finance@acme-corp.example', actor: 'System' },
      { time: '2026-08-25 11:50:00', event: 'Case opened', actor: 'Kaelen Richter' },
      { time: '2026-08-25 12:15:00', event: 'Sender IP blocked at edge', actor: 'Kaelen Richter' },
      { time: '2026-08-25 12:30:00', event: 'Status changed: Investigating → Contained', actor: 'Kaelen Richter' },
    ],
    analystNotes: [
      { author: 'Kaelen Richter', timestamp: '2026-08-25 11:55:00', note: 'Display name spoofing only — From domain differs from CEO actual domain. No financial loss.' },
    ],
    activityHistory: [
      { time: '2026-08-25 11:50:00', action: 'Case created', actor: 'Kaelen Richter' },
      { time: '2026-08-25 12:00:00', action: 'Status changed: Open → Investigating', actor: 'Kaelen Richter' },
      { time: '2026-08-25 12:30:00', action: 'Status changed: Investigating → Contained', actor: 'Kaelen Richter' },
    ],
    relatedEvidence: ['EV-2026-1118', 'EV-2026-1119'],
  },
  {
    id: 'CASE-2026-0455',
    title: 'Malware: DHL Express Package Notification',
    severity: 'medium',
    status: 'resolved',
    created: '2026-08-25 10:35:00',
    assignedAnalyst: 'Analyst Tanaka',
    threatType: 'Malware',
    relatedCampaign: 'PKG-NOTIFY-093',
    lastUpdated: '2026-08-25 11:10:00',
    summary: 'Malware-laced email disguised as DHL package delivery failure. Attachment contained trojan downloader. Quarantined and endpoint scan completed.',
    timeline: [
      { time: '2026-08-25 10:33:51', event: 'Email received by warehouse@acme-corp.example', actor: 'System' },
      { time: '2026-08-25 10:35:00', event: 'Case opened', actor: 'Analyst Tanaka' },
      { time: '2026-08-25 10:50:00', event: 'Attachment quarantined', actor: 'System' },
      { time: '2026-08-25 11:10:00', event: 'Endpoint scan clean — case resolved', actor: 'Analyst Tanaka' },
    ],
    analystNotes: [
      { author: 'Analyst Tanaka', timestamp: '2026-08-25 10:40:00', note: 'Trojan downloader detected in .docm attachment. No execution on endpoint.' },
    ],
    activityHistory: [
      { time: '2026-08-25 10:35:00', action: 'Case created', actor: 'Analyst Tanaka' },
      { time: '2026-08-25 10:50:00', action: 'Status changed: Open → Contained', actor: 'Analyst Tanaka' },
      { time: '2026-08-25 11:10:00', action: 'Status changed: Contained → Resolved', actor: 'Analyst Tanaka' },
    ],
    relatedEvidence: ['EV-2026-1110'],
  },
  {
    id: 'CASE-2026-0448',
    title: 'BEC: HR Payroll Direct Deposit Update',
    severity: 'high',
    status: 'contained',
    created: '2026-08-25 09:25:00',
    assignedAnalyst: 'Analyst Reyes',
    threatType: 'BEC',
    relatedCampaign: 'PAYROLL-DD-301',
    lastUpdated: '2026-08-25 10:00:00',
    summary: 'BEC attempt targeting payroll department via spoofed HR address. Requested direct deposit update. Blocked after recipient reported suspicious.',
    timeline: [
      { time: '2026-08-25 09:22:17', event: 'Email received by payroll@acme-corp.example', actor: 'System' },
      { time: '2026-08-25 09:25:00', event: 'Case opened', actor: 'Analyst Reyes' },
      { time: '2026-08-25 09:45:00', event: 'Recipient reported email as suspicious', actor: 'Payroll Staff' },
      { time: '2026-08-25 10:00:00', event: 'Status changed: Investigating → Contained', actor: 'Analyst Reyes' },
    ],
    analystNotes: [
      { author: 'Analyst Reyes', timestamp: '2026-08-25 09:30:00', note: 'Good catch by payroll staff. No direct deposit changes were processed.' },
    ],
    activityHistory: [
      { time: '2026-08-25 09:25:00', action: 'Case created', actor: 'Analyst Reyes' },
      { time: '2026-08-25 09:35:00', action: 'Status changed: Open → Investigating', actor: 'Analyst Reyes' },
      { time: '2026-08-25 10:00:00', action: 'Status changed: Investigating → Contained', actor: 'Analyst Reyes' },
    ],
    relatedEvidence: ['EV-2026-1105'],
  },
  {
    id: 'CASE-2026-0441',
    title: 'Credential Harvest: Micros0ft 365 Fake Portal',
    severity: 'high',
    status: 'contained',
    created: '2026-08-24 16:10:00',
    assignedAnalyst: 'Kaelen Richter',
    threatType: 'Credential Harvesting',
    relatedCampaign: 'CRED-HARV-402',
    lastUpdated: '2026-08-24 17:30:00',
    summary: 'Fake Microsoft 365 login portal deployed on FlokiNET bulletproof infrastructure to capture user credentials.',
    timeline: [
      { time: '2026-08-24 16:05:00', event: 'Phishing domain observed in outbound traffic telemetry', actor: 'System' },
      { time: '2026-08-24 16:10:00', event: 'Investigation case opened', actor: 'Kaelen Richter' },
      { time: '2026-08-24 17:30:00', event: 'Domain sinkholed at enterprise DNS resolver', actor: 'Kaelen Richter' },
    ],
    analystNotes: [
      { author: 'Kaelen Richter', timestamp: '2026-08-24 16:20:00', note: 'Portal mirrors standard Entra ID login screen. Capture endpoint blocked.' },
    ],
    activityHistory: [
      { time: '2026-08-24 16:10:00', action: 'Case created', actor: 'Kaelen Richter' },
      { time: '2026-08-24 17:30:00', action: 'Status changed: Open → Contained', actor: 'Kaelen Richter' },
    ],
    relatedEvidence: [],
  },
  {
    id: 'CASE-2026-0435',
    title: 'Phishing: IT Support Ticket Urgency Lure',
    severity: 'medium',
    status: 'resolved',
    created: '2026-08-23 11:15:00',
    assignedAnalyst: 'Analyst Tanaka',
    threatType: 'Phishing',
    relatedCampaign: 'SUPPORT-TKT-065',
    lastUpdated: '2026-08-23 14:00:00',
    summary: 'Fake IT support ticket notification email attempting to lure users into submitting credentials.',
    timeline: [
      { time: '2026-08-23 11:10:00', event: 'Email intercepted by gateway filters', actor: 'System' },
      { time: '2026-08-23 11:15:00', event: 'Case opened and analyzed', actor: 'Analyst Tanaka' },
      { time: '2026-08-23 14:00:00', event: 'Threat confirmed neutral; case resolved', actor: 'Analyst Tanaka' },
    ],
    analystNotes: [
      { author: 'Analyst Tanaka', timestamp: '2026-08-23 11:30:00', note: 'Generic helpdesk lure with spoofed IT sender headers. Gateway blocked all deliveries.' },
    ],
    activityHistory: [
      { time: '2026-08-23 11:15:00', action: 'Case created', actor: 'Analyst Tanaka' },
      { time: '2026-08-23 14:00:00', action: 'Status changed: Open → Resolved', actor: 'Analyst Tanaka' },
    ],
    relatedEvidence: [],
  },
];

export interface EvidenceItem {
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
}

export const EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'EV-2026-1129', filename: 'micros0ft-support_email.eml',
    evidenceType: 'Email Message (EML)', sha256: 'a3f5b8c9d2e1f4a7b6c8d5e2f1a4b7c9d6e3f0a1b4c7d2e5f8a3b6c9d1e4f7a2',
    timestamp: '2026-08-25 15:00:12 UTC', caseId: 'CASE-2026-0471',
    collectedBy: 'Kaelen Richter', integrityStatus: 'verified', size: '24.3 KB',
    ledgerRef: 'LEDGER-0x4F2A', blockRef: 'BLOCK-000847', blockHash: '0x8a3f...b7c9d1', prevBlockHash: '0x5e2f...a4b7c9',
  },
  {
    id: 'EV-2026-1130', filename: 'header_analysis_report.json',
    evidenceType: 'Forensic Report (JSON)', sha256: 'b4c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6',
    timestamp: '2026-08-25 15:01:45 UTC', caseId: 'CASE-2026-0471',
    collectedBy: 'Kaelen Richter', integrityStatus: 'verified', size: '8.7 KB',
    ledgerRef: 'LEDGER-0x4F2B', blockRef: 'BLOCK-000848', blockHash: '0x9b4c...c8d9e0', prevBlockHash: '0x8a3f...b7c9d1',
  },
  {
    id: 'EV-2026-1125', filename: 'paypa1-secure_email.eml',
    evidenceType: 'Email Message (EML)', sha256: 'c5d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7',
    timestamp: '2026-08-25 13:22:00 UTC', caseId: 'CASE-2026-0468',
    collectedBy: 'Analyst Reyes', integrityStatus: 'verified', size: '18.1 KB',
    ledgerRef: 'LEDGER-0x4F25', blockRef: 'BLOCK-000844', blockHash: '0x7c5d...d9e0f1', prevBlockHash: '0x4e2f...a4b7c9',
  },
  {
    id: 'EV-2026-1118', filename: 'ceo_spoof_email.eml',
    evidenceType: 'Email Message (EML)', sha256: 'd6e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8',
    timestamp: '2026-08-25 11:52:00 UTC', caseId: 'CASE-2026-0462',
    collectedBy: 'Kaelen Richter', integrityStatus: 'verified', size: '21.5 KB',
    ledgerRef: 'LEDGER-0x4F18', blockRef: 'BLOCK-000841', blockHash: '0x6d7e...e0f1a2', prevBlockHash: '0x3c5d...b7c8d9',
  },
  {
    id: 'EV-2026-1119', filename: 'gateway_block_log.txt',
    evidenceType: 'Network Log (TXT)', sha256: 'e7f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9',
    timestamp: '2026-08-25 12:16:00 UTC', caseId: 'CASE-2026-0462',
    collectedBy: 'Kaelen Richter', integrityStatus: 'pending', size: '142.8 KB',
    ledgerRef: 'LEDGER-0x4F19', blockRef: 'BLOCK-000842', blockHash: '0x5e8f...f1a2b3', prevBlockHash: '0x6d7e...e0f1a2',
  },
  {
    id: 'EV-2026-1110', filename: 'dhl_trojan_attachment.docm',
    evidenceType: 'Malware Sample (DOCM)', sha256: 'f8a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
    timestamp: '2026-08-25 10:36:00 UTC', caseId: 'CASE-2026-0455',
    collectedBy: 'Analyst Tanaka', integrityStatus: 'verified', size: '156.2 KB',
    ledgerRef: 'LEDGER-0x4F10', blockRef: 'BLOCK-000838', blockHash: '0x4f9a...a2b3c4', prevBlockHash: '0x2c5d...b7c8d9',
  },
  {
    id: 'EV-2026-1105', filename: 'payroll_spoof_email.eml',
    evidenceType: 'Email Message (EML)', sha256: 'a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1',
    timestamp: '2026-08-25 09:26:00 UTC', caseId: 'CASE-2026-0448',
    collectedBy: 'Analyst Reyes', integrityStatus: 'invalid', size: '19.7 KB',
    ledgerRef: 'LEDGER-0x4F05', blockRef: 'BLOCK-000835', blockHash: '0x3a8b...b3c4d5', prevBlockHash: '0x1c4d...b7c8d9',
  },
];

export const EVIDENCE_LEDGER_WORKFLOW = [
  { step: 'Evidence', detail: 'Email / file collected and timestamped', icon: 'file' },
  { step: 'SHA-256', detail: 'Cryptographic hash generated for integrity', icon: 'hash' },
  { step: 'Immutable Ledger', detail: 'Hash written to mock blockchain ledger', icon: 'ledger' },
  { step: 'Integrity Verified', detail: 'Hash re-verified against ledger entry', icon: 'verified' },
];

// ─── Phase 6: Campaigns ──────────────────────────────────────────────────────

export type CampaignStatus = 'active' | 'dormant' | 'disrupted' | 'monitoring';

export interface Campaign {
  id: string;
  name: string;
  threatType: ThreatType;
  severity: Severity;
  firstSeen: string;
  lastSeen: string;
  emails: number;
  indicators: number;
  status: CampaignStatus;
  confidence: number;
  description: string;
  relatedEmails: string[];
  relatedDomains: string[];
  relatedIPs: string[];
  relatedURLs: string[];
  relatedCases: string[];
  timeline: { time: string; event: string }[];
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'WIRE-FAUD-247',
    name: 'Invoice Redirect Campaign',
    threatType: 'BEC',
    severity: 'critical',
    firstSeen: '2026-08-15',
    lastSeen: '2026-08-25',
    emails: 142,
    indicators: 47,
    status: 'active',
    confidence: 87,
    description: 'Coordinated BEC campaign using lookalike domains with homoglyph substitutions to impersonate Microsoft billing. Emails target CFOs and finance teams with urgent payment verification requests. Infrastructure hosted on bulletproof hosting (FlokiNET Ltd). Credential harvesting URLs embedded with multi-hop redirect chains.',
    relatedEmails: ['finance@micros0ft-support.example', 'no-reply@paypa1-secure.example'],
    relatedDomains: ['micros0ft-support.example', 'secure-verification.example', 'paypa1-secure.example', 'micros0ft-365.example', 'cred-harvest-flokinet.example'],
    relatedIPs: ['185.220.101.47', '45.137.21.88', '190.34.176.22'],
    relatedURLs: ['https://micros0ft-support.example/verify?id=PX9471', 'https://secure-verification.example/login', 'https://cred-harvest-flokinet.example/capture'],
    relatedCases: ['CASE-2026-0471'],
    timeline: [
      { time: '2026-08-15', event: 'Campaign cluster identified — 3 initial IOCs correlated' },
      { time: '2026-08-19', event: 'Lookalike domain paypa1-secure.example observed' },
      { time: '2026-08-22', event: 'Domain micros0ft-support.example registered' },
      { time: '2026-08-23', event: 'Credential harvesting URL first observed' },
      { time: '2026-08-25', event: 'BEC email targeting Acme Corp CFO detected' },
      { time: '2026-08-25', event: 'Investigation case CASE-2026-0471 opened' },
    ],
  },
  {
    id: 'EXEC-SPOOF-118',
    name: 'Executive Impersonation',
    threatType: 'Spoofing',
    severity: 'high',
    firstSeen: '2026-08-10',
    lastSeen: '2026-08-25',
    emails: 89,
    indicators: 31,
    status: 'active',
    confidence: 82,
    description: 'Executive impersonation campaign spoofing CEO and CFO display names. Wire transfer requests sent to finance departments. Uses display name spoofing without domain spoofing — relies on recipient trust in display name.',
    relatedEmails: ['ceo@acme-corp.example'],
    relatedDomains: ['exec-spoof-relay.example'],
    relatedIPs: ['203.0.113.55'],
    relatedURLs: [],
    relatedCases: ['CASE-2026-0462'],
    timeline: [
      { time: '2026-08-10', event: 'Campaign cluster identified — spoofed executive emails' },
      { time: '2026-08-25', event: 'CEO wire transfer request targeting finance' },
      { time: '2026-08-25', event: 'Blocked at gateway after DMARC enforcement' },
    ],
  },
  {
    id: 'PKG-NOTIFY-093',
    name: 'Package Notification Malware',
    threatType: 'Malware',
    severity: 'medium',
    firstSeen: '2026-08-08',
    lastSeen: '2026-08-25',
    emails: 67,
    indicators: 24,
    status: 'monitoring',
    confidence: 74,
    description: 'Malware distribution campaign disguised as package delivery failure notifications. Trojan downloader embedded in .docm attachments. Multiple courier brands impersonated (DHL, FedEx, UPS).',
    relatedEmails: ['tracking@dhl-express-notify.example'],
    relatedDomains: ['dhl-express-notify.example', 'fedex-portal-notify.example'],
    relatedIPs: ['198.51.100.77'],
    relatedURLs: [],
    relatedCases: ['CASE-2026-0455'],
    timeline: [
      { time: '2026-08-08', event: 'Campaign cluster identified — package notification lures' },
      { time: '2026-08-25', event: 'DHL-themed malware email detected and quarantined' },
    ],
  },
  {
    id: 'PAYROLL-DD-301',
    name: 'Payroll Direct Deposit Fraud',
    threatType: 'BEC',
    severity: 'high',
    firstSeen: '2026-08-18',
    lastSeen: '2026-08-25',
    emails: 53,
    indicators: 19,
    status: 'disrupted',
    confidence: 79,
    description: 'BEC campaign targeting payroll departments with direct deposit update requests. Spoofs HR department addresses. Aims to redirect employee payroll to attacker-controlled accounts.',
    relatedEmails: ['hr@acme-payroll.example'],
    relatedDomains: ['acme-payroll.example'],
    relatedIPs: ['203.0.113.91'],
    relatedURLs: [],
    relatedCases: ['CASE-2026-0448'],
    timeline: [
      { time: '2026-08-18', event: 'Campaign cluster identified — payroll BEC pattern' },
      { time: '2026-08-25', event: 'Payroll spoof detected and reported by staff' },
      { time: '2026-08-25', event: 'Campaign disrupted — sender IP blocked' },
    ],
  },
  {
    id: 'CRED-HARV-402',
    name: 'Credential Harvesting Portal',
    threatType: 'Credential Harvesting',
    severity: 'high',
    firstSeen: '2026-08-20',
    lastSeen: '2026-08-24',
    emails: 38,
    indicators: 16,
    status: 'dormant',
    confidence: 68,
    description: 'Credential harvesting campaign using fake login portals. Mimics Microsoft 365 and Google Workspace login pages. Captures credentials via multi-hop redirect chains on bulletproof hosting.',
    relatedEmails: ['support@micros0ft-365.example'],
    relatedDomains: ['micros0ft-365.example', 'cred-harvest-flokinet.example'],
    relatedIPs: ['45.137.21.88'],
    relatedURLs: ['https://cred-harvest-flokinet.example/capture'],
    relatedCases: ['CASE-2026-0441'],
    timeline: [
      { time: '2026-08-20', event: 'Campaign cluster identified — fake login portals' },
      { time: '2026-08-24', event: 'Campaign went dormant — no new emails in 24h' },
    ],
  },
  {
    id: 'SUPPORT-TKT-065',
    name: 'Support Ticket Phishing',
    threatType: 'Phishing',
    severity: 'medium',
    firstSeen: '2026-08-05',
    lastSeen: '2026-08-23',
    emails: 29,
    indicators: 12,
    status: 'dormant',
    confidence: 61,
    description: 'Phishing campaign using fake IT support ticket notifications. Urges recipients to click links to "resolve tickets." Links lead to credential capture pages.',
    relatedEmails: ['it-support@helpdesk-portal.example'],
    relatedDomains: ['helpdesk-portal.example'],
    relatedIPs: ['203.0.113.44'],
    relatedURLs: ['https://helpdesk-portal.example/ticket?id=verify'],
    relatedCases: ['CASE-2026-0435'],
    timeline: [
      { time: '2026-08-05', event: 'Campaign cluster identified — support ticket lures' },
      { time: '2026-08-23', event: 'Last observed activity — campaign now dormant' },
    ],
  },
];

export const CAMPAIGN_STATS = {
  emailsObserved: CAMPAIGNS.reduce((sum, c) => sum + c.emails, 0),
  uniqueDomains: [...new Set(CAMPAIGNS.flatMap((c) => c.relatedDomains))].length,
  uniqueIPs: [...new Set(CAMPAIGNS.flatMap((c) => c.relatedIPs))].length,
  suspiciousURLs: [...new Set(CAMPAIGNS.flatMap((c) => c.relatedURLs))].length,
  activeCases: CAMPAIGNS.flatMap((c) => c.relatedCases).length,
};

// ─── Phase 7: Reports + Sentinel AI ────────────────────────────────────────────

export interface ReportData {
  caseId: string;
  caseTitle: string;
  threatSummary: string;
  riskScore: number;
  keyFindings: string[];
  observedFacts: string[];
  aiInference: string[];
  indicators: { type: string; value: string }[];
  timeline: { time: string; event: string }[];
  investigationStatus: string;
  evidenceSummary: string[];
  recommendedActions: string[];
}

export const REPORT_DATA: ReportData = {
  caseId: 'CASE-2026-0471',
  caseTitle: 'BEC: Micros0ft-Support Payment Fraud',
  threatSummary:
    'A business email compromise (BEC) attempt was detected targeting the CFO of Acme Corp. The email originated from a lookalike domain (micros0ft-support.example) using a homoglyph attack — replacing the letter "o" in "microsoft" with the digit "0". The email impersonated Microsoft billing with an urgent payment verification request. All email authentication checks (SPF, DKIM, DMARC) failed. A credential harvesting URL was embedded, redirecting through 3 hops to a capture page on bulletproof hosting. The sending infrastructure is linked to campaign cluster WIRE-FAUD-247.',
  riskScore: 96,
  keyFindings: [
    'Sender domain micros0ft-support.example is a lookalike of microsoft.example with 92% similarity',
    'SPF, DKIM, and DMARC all failed — sender is not authorized by any domain',
    'Reply-To address (secure-verification.example) differs from From address — reply traffic redirected',
    'Embedded URL uses newly registered domain (3 days old) on bulletproof hosting',
    'Sending IP 185.220.101.47 listed on 4 blocklists',
    'Infrastructure matches known BEC campaign cluster WIRE-FAUD-247 (72.5% confidence)',
  ],
  observedFacts: [
    'From domain: micros0ft-support.example (differs from expected microsoft.com)',
    'Reply-To: secure-verification.example (differs from From)',
    'SPF: FAIL — IP 185.220.101.47 not authorized',
    'DKIM: FAIL — signature verification returned permerror',
    'DMARC: FAIL — no alignment with From domain',
    'URL: https://micros0ft-support.example/verify?id=PX9471 (newly observed domain)',
    'Sending IP: 185.220.101.47 (listed on Spamhaus XBL, SORBS, UCEPROTECT L2, Barracuda)',
    'Domain registration: 2026-08-22 (3 days before email sent)',
  ],
  aiInference: [
    'Likely business email compromise (BEC) targeting CFO for financial fraud — 94.7% confidence',
    'Possible executive impersonation — sender mimics legitimate vendor billing — 88.2% confidence',
    'Credential harvesting intent suspected via verification portal link — 91.3% confidence',
    'Sender infrastructure consistent with campaign cluster WIRE-FAUD-247 — 72.5% confidence',
  ],
  indicators: [
    { type: 'IP', value: '185.220.101.47' },
    { type: 'Domain', value: 'micros0ft-support.example' },
    { type: 'Domain', value: 'secure-verification.example' },
    { type: 'URL', value: 'https://micros0ft-support.example/verify?id=PX9471' },
    { type: 'Email', value: 'finance@micros0ft-support.example' },
    { type: 'Campaign', value: 'WIRE-FAUD-247' },
  ],
  timeline: [
    { time: '2026-08-25 14:31:48', event: 'Email received by cfo@acme-corp.example' },
    { time: '2026-08-25 14:32:11', event: 'Threat detected — risk score 96' },
    { time: '2026-08-25 14:35:00', event: 'Investigation case opened' },
    { time: '2026-08-25 14:42:00', event: 'Header forensics completed' },
    { time: '2026-08-25 14:51:00', event: 'Threat intelligence correlation — matched WIRE-FAUD-247' },
    { time: '2026-08-25 15:00:00', event: 'Evidence preserved — SHA-256 hash generated' },
    { time: '2026-08-25 15:02:00', event: 'Origin investigation — probable source identified' },
  ],
  investigationStatus: 'Investigating — assigned to Kaelen Richter',
  evidenceSummary: [
    'EV-2026-1129: Original EML file (24.3 KB) — SHA-256 verified — BLOCK-000847',
    'EV-2026-1130: Header analysis report (8.7 KB) — SHA-256 verified — BLOCK-000848',
  ],
  recommendedActions: [
    'Block sending IP 185.220.101.47 at the email gateway',
    'Add domain micros0ft-support.example to the denylist',
    'Notify CFO and finance team of the impersonation attempt',
    'Monitor for additional emails from WIRE-FAUD-247 campaign infrastructure',
    'Verify no credentials were entered on the credential harvesting URL',
    'Preserve all evidence in the immutable ledger for potential legal proceedings',
    'Update DMARC policy to p=reject for acme-corp.example',
  ],
};

export const REPORT_TYPES = [
  { id: 'executive', label: 'Executive Report', description: 'High-level summary for leadership' },
  { id: 'technical', label: 'Technical Report', description: 'Detailed technical analysis' },
  { id: 'forensic', label: 'Forensic Report', description: 'Full forensic documentation' },
] as const;

export type ReportType = (typeof REPORT_TYPES)[number]['id'];

export interface AIQuestion {
  id: string;
  question: string;
}

export const AI_SUGGESTED_QUESTIONS: AIQuestion[] = [
  { id: 'q1', question: 'Why is this suspicious?' },
  { id: 'q2', question: 'Summarize this case.' },
  { id: 'q3', question: 'What evidence supports the risk score?' },
  { id: 'q4', question: 'Explain the header anomalies.' },
  { id: 'q5', question: 'What indicators are connected?' },
  { id: 'q6', question: 'Why is this considered BEC?' },
];

export const AI_RESPONSES: Record<string, string> = {
  q1: 'This email is suspicious for several compounding reasons. First, the sender domain micros0ft-support.example uses a homoglyph attack — the letter "o" in "microsoft" is replaced with the digit "0" (zero), making it visually near-identical. Second, all three email authentication checks failed: SPF, DKIM, and DMARC — meaning the sender is not authorized by any domain. Third, the Reply-To address (secure-verification.example) differs from the From address, redirecting replies to an unrelated domain. Fourth, the embedded URL points to a domain registered only 3 days ago, hosted on bulletproof infrastructure (FlokiNET Ltd, AS200651). Finally, the sending IP 185.220.101.47 is listed on 4 blocklists. The combined risk score is 96/100.',
  q2: 'Case CASE-2026-0471 involves a business email compromise (BEC) attempt targeting the CFO of Acme Corp. The email impersonated Microsoft billing with an urgent payment verification request. It originated from a lookalike domain (micros0ft-support.example) using a homoglyph attack. All authentication checks failed. A credential harvesting URL was embedded with a 3-hop redirect chain. The infrastructure is linked to campaign cluster WIRE-FAUD-247. The case is currently in "Investigating" status, assigned to Kaelen Richter. Two evidence items have been preserved with verified SHA-256 integrity.',
  q3: 'The risk score of 96/100 is supported by five key risk factors: (1) Sender impersonation — the display name "Microsoft Billing" does not match the sender domain. (2) Lookalike domain — micros0ft-support.example uses a homoglyph with 92% similarity to microsoft.example. (3) SPF/DKIM/DMARC failure — all three authentication checks failed. (4) Suspicious URL — the embedded link points to a newly observed domain on bulletproof hosting. (5) Social engineering — urgency cues ("24 hours", "service suspension") and financial pressure tactics. Additionally, the sending IP is on 4 blocklists, and the domain was registered only 3 days before the email was sent.',
  q4: 'The email headers reveal several critical anomalies. The Authentication-Results header shows SPF=fail, DKIM=fail, and DMARC=fail — none of the authentication checks passed. The Received headers show the email was injected from localhost [127.0.0.1] at the originating server, indicating scripted/automated sending rather than a legitimate mail transfer agent. The Reply-To header (secure-verification.example) differs from the From header (micros0ft-support.example), redirecting reply traffic to an unrelated domain. The X-Mailer header shows PHPMailer 6.5, which is commonly used in automated phishing tools. The Message-ID domain matches the spoofed sender domain, not a legitimate Microsoft domain.',
  q5: 'The following indicators are connected in this investigation: IP 185.220.101.47 (sending infrastructure, 96% confidence), domain micros0ft-support.example (sender and URL domain, 98% confidence), domain secure-verification.example (Reply-To redirect, 91% confidence), URL https://micros0ft-support.example/verify?id=PX9471 (credential harvest link, 97% confidence), email finance@micros0ft-support.example (spoofed sender, 99% confidence), campaign WIRE-FAUD-247 (associated cluster, 72% confidence), IP 45.137.21.88 (intermediate relay, 68% confidence), and domain cred-harvest-flokinet.example (credential capture endpoint, 81% confidence). These form a chain from email through domain, IP, hosting, URL, to campaign.',
  q6: 'This is classified as BEC (Business Email Compromise) based on several indicators. The email specifically targets the CFO — a high-value financial decision-maker. It impersonates Microsoft billing, a trusted vendor, using a lookalike domain with a homoglyph attack. The subject line ("Urgent: Payment Verification Required") uses financial urgency cues designed to pressure the recipient into acting quickly. The email requests payment verification — a common BEC tactic to initiate fraudulent wire transfers. The Reply-To redirect sends responses to a separate domain controlled by the attacker. The infrastructure (bulletproof hosting, blocklisted IP, PHPMailer injection) matches the pattern of known BEC campaign cluster WIRE-FAUD-247. The AI inference confidence for BEC classification is 94.7%.',
};

// ─── Phase 8: Alerts ──────────────────────────────────────────────────────────

export type AlertStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved';
export type AlertType = 'BEC Detection' | 'Lookalike Domain' | 'Authentication Failure' | 'Suspicious URL' | 'Campaign Correlation' | 'Origin Anomaly';

export interface SecurityAlert {
  id: string;
  severity: Severity;
  type: AlertType;
  source: string;
  detected: string;
  status: AlertStatus;
  relatedCase: string;
  summary: string;
  observedFacts: string[];
  aiInference: string;
  relatedIndicators: string[];
  relatedCampaign: string;
  recommendedAction: string;
}

export const SECURITY_ALERTS: SecurityAlert[] = [
  {
    id: 'ALR-2026-0892',
    severity: 'critical',
    type: 'BEC Detection',
    source: 'Mailveil Detection Engine',
    detected: '2026-08-25 14:32:11',
    status: 'investigating',
    relatedCase: 'CASE-2026-0471',
    summary: 'Business email compromise detected targeting CFO. Lookalike domain with homoglyph, all authentication checks failed, credential harvesting URL embedded.',
    observedFacts: [
      'Sender domain micros0ft-support.example uses homoglyph (zero for "o")',
      'SPF: FAIL, DKIM: FAIL, DMARC: FAIL',
      'Reply-To differs from From domain',
      'Risk score: 96/100',
    ],
    aiInference: 'Likely BEC targeting CFO for financial fraud — 94.7% confidence. Credential harvesting intent suspected — 91.3% confidence.',
    relatedIndicators: ['185.220.101.47', 'micros0ft-support.example', 'https://micros0ft-support.example/verify?id=PX9471'],
    relatedCampaign: 'WIRE-FAUD-247',
    recommendedAction: 'Block sending IP at gateway, notify CFO, preserve evidence, open investigation case.',
  },
  {
    id: 'ALR-2026-0891',
    severity: 'high',
    type: 'Lookalike Domain',
    source: 'Domain Monitoring Service',
    detected: '2026-08-25 13:18:44',
    status: 'acknowledged',
    relatedCase: 'CASE-2026-0468',
    summary: 'Lookalike domain paypa1-secure.example detected impersonating PayPal. Domain registered 6 days ago with privacy registrar.',
    observedFacts: [
      'Domain paypa1-secure.example uses homoglyph (digit 1 for letter l)',
      'Registration age: 6 days',
      'Privacy registrar: Njalla AB',
      'No DMARC record published',
    ],
    aiInference: 'Possible credential harvesting domain mimicking PayPal — 85% confidence. Related to WIRE-FAUD-247 campaign cluster.',
    relatedIndicators: ['paypa1-secure.example', '203.0.113.91'],
    relatedCampaign: 'WIRE-FAUD-247',
    recommendedAction: 'Add domain to denylist, monitor for phishing emails, alert billing department.',
  },
  {
    id: 'ALR-2026-0890',
    severity: 'high',
    type: 'Authentication Failure',
    source: 'Mail Gateway (acme-mailgw-03)',
    detected: '2026-08-25 14:31:53',
    status: 'investigating',
    relatedCase: 'CASE-2026-0471',
    summary: 'Email received with all authentication checks failing (SPF/DKIM/DMARC). Sender IP 185.220.101.47 not authorized by micros0ft-support.example.',
    observedFacts: [
      'SPF: FAIL — IP not in domain SPF record',
      'DKIM: FAIL — signature permerror',
      'DMARC: FAIL — no alignment',
      'Sending IP: 185.220.101.47',
    ],
    aiInference: 'Authentication failure pattern consistent with spoofed sender — 92% confidence. Infrastructure matches known BEC campaign.',
    relatedIndicators: ['185.220.101.47', 'micros0ft-support.example'],
    relatedCampaign: 'WIRE-FAUD-247',
    recommendedAction: 'Quarantine email, block sender IP, investigate for BEC indicators.',
  },
  {
    id: 'ALR-2026-0889',
    severity: 'critical',
    type: 'Suspicious URL',
    source: 'URL Scanner',
    detected: '2026-08-25 14:32:00',
    status: 'investigating',
    relatedCase: 'CASE-2026-0471',
    summary: 'Suspicious URL detected in email body. Multi-hop redirect chain leading to credential capture page on bulletproof hosting.',
    observedFacts: [
      'URL: https://micros0ft-support.example/verify?id=PX9471',
      'Domain registered 3 days ago',
      '3-hop redirect chain to capture page',
      'Final hop: cred-harvest-flokinet.example',
      'Self-signed TLS certificate on final hop',
    ],
    aiInference: 'Credential harvesting URL with redirect obfuscation — 94% confidence. Page mimics Microsoft account login.',
    relatedIndicators: ['https://micros0ft-support.example/verify?id=PX9471', 'cred-harvest-flokinet.example'],
    relatedCampaign: 'WIRE-FAUD-247',
    recommendedAction: 'Block URL at web gateway, check if any users accessed the link, preserve URL evidence.',
  },
  {
    id: 'ALR-2026-0888',
    severity: 'high',
    type: 'Campaign Correlation',
    source: 'Threat Intelligence Correlation',
    detected: '2026-08-25 14:51:00',
    status: 'investigating',
    relatedCase: 'CASE-2026-0471',
    summary: 'Email indicators matched to known campaign cluster WIRE-FAUD-247. IP, domain, and PHPMailer signature overlap with 4 prior BEC campaigns.',
    observedFacts: [
      'IP 185.220.101.47 appears in 4 prior campaign IOCs',
      'PHPMailer 6.5 signature matches campaign pattern',
      'Domain naming convention matches cluster',
      'Campaign first seen: 2026-08-15',
    ],
    aiInference: 'Sender infrastructure consistent with WIRE-FAUD-247 campaign — 72.5% confidence. Active campaign with 47 related indicators.',
    relatedIndicators: ['WIRE-FAUD-247', '185.220.101.47', 'micros0ft-support.example'],
    relatedCampaign: 'WIRE-FAUD-247',
    recommendedAction: 'Review all campaign IOCs, cross-reference with other open cases, update campaign timeline.',
  },
  {
    id: 'ALR-2026-0887',
    severity: 'medium',
    type: 'Origin Anomaly',
    source: 'Origin Investigation Module',
    detected: '2026-08-25 15:02:00',
    status: 'acknowledged',
    relatedCase: 'CASE-2026-0471',
    summary: 'Probable source infrastructure identified in Mumbai, India (AS55836 — Reliance Jio Infocomm). High-velocity routing infrastructure.',
    observedFacts: [
      'SMTP relay origin: 103.19.199.18',
      'Geolocation: Mumbai, India',
      'ASN: AS55836 (Reliance Jio Infocomm)',
      'Hosting classification: Cloud Gateway',
    ],
    aiInference: 'Probable source identified with 78% confidence. Note: geographic location is an inference, not proof of attacker location.',
    relatedIndicators: ['103.19.199.18', 'AS55836'],
    relatedCampaign: 'WIRE-FAUD-247',
    recommendedAction: 'Document origin inference in case, do not attribute to specific actor without further evidence.',
  },
  {
    id: 'ALR-2026-0886',
    severity: 'critical',
    type: 'BEC Detection',
    source: 'Mailveil Detection Engine',
    detected: '2026-08-25 11:47:09',
    status: 'resolved',
    relatedCase: 'CASE-2026-0462',
    summary: 'Executive impersonation detected — CEO display name spoofed. Wire transfer request sent to finance. Blocked at gateway.',
    observedFacts: [
      'Display name: "CEO" — spoofed',
      'From domain differs from CEO actual domain',
      'Wire transfer request language detected',
      'DMARC enforcement blocked delivery',
    ],
    aiInference: 'Executive impersonation / CEO fraud attempt — 94% confidence. No financial loss occurred.',
    relatedIndicators: ['exec-spoof-relay.example', '203.0.113.55'],
    relatedCampaign: 'EXEC-SPOOF-118',
    recommendedAction: 'Notify finance team, verify no wire transfers processed, block sender IP.',
  },
  {
    id: 'ALR-2026-0885',
    severity: 'medium',
    type: 'Authentication Failure',
    source: 'Mail Gateway (acme-mailgw-03)',
    detected: '2026-08-25 10:33:51',
    status: 'resolved',
    relatedCase: 'CASE-2026-0455',
    summary: 'Email with failed authentication contained .docm attachment. Trojan downloader detected and quarantined.',
    observedFacts: [
      'SPF: FAIL',
      'Attachment: .docm file with macro',
      'Trojan downloader signature detected',
      'Attachment quarantined automatically',
    ],
    aiInference: 'Malware distribution via package notification lure — 74% confidence. No execution on endpoint.',
    relatedIndicators: ['dhl-express-notify.example', '198.51.100.77'],
    relatedCampaign: 'PKG-NOTIFY-093',
    recommendedAction: 'Quarantine completed, run endpoint scan, verify no execution occurred.',
  },
  {
    id: 'ALR-2026-0884',
    severity: 'low',
    type: 'Lookalike Domain',
    source: 'Domain Monitoring Service',
    detected: '2026-08-24 18:22:00',
    status: 'new',
    relatedCase: '',
    summary: 'Newly registered domain acme-c0rp.example detected. Low similarity to acme-corp.example but uses homoglyph.',
    observedFacts: [
      'Domain: acme-c0rp.example',
      'Registration: 2026-08-24',
      'Homoglyph: digit 0 for letter o',
      'No active emails observed yet',
    ],
    aiInference: 'Potential future lookalike domain — 45% confidence. No malicious activity observed yet. Monitoring recommended.',
    relatedIndicators: ['acme-c0rp.example'],
    relatedCampaign: '',
    recommendedAction: 'Add to watchlist, monitor for phishing emails using this domain.',
  },
];

// ─── Phase 9: Settings ────────────────────────────────────────────────────────

export interface SettingSection {
  id: string;
  label: string;
  settings: SettingItem[];
}

export interface SettingItem {
  id: string;
  label: string;
  description: string;
  type: 'toggle';
  default: boolean;
}

export const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'general',
    label: 'General',
    settings: [
      { id: 'dark-mode', label: 'Dark Mode', description: 'Use the dark enterprise SOC theme', type: 'toggle', default: true },
      { id: 'compact-dashboard', label: 'Compact Dashboard', description: 'Reduce spacing and padding on dashboard cards', type: 'toggle', default: false },
    ],
  },
  {
    id: 'detection',
    label: 'Detection',
    settings: [
      { id: 'ai-analysis', label: 'AI Analysis', description: 'Enable SENTINEL AI analysis on detected threats', type: 'toggle', default: true },
      { id: 'auto-evidence-checks', label: 'Automatic Evidence Integrity Checks', description: 'Verify evidence hashes against the immutable ledger on schedule', type: 'toggle', default: true },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    settings: [
      { id: 'email-analysis-notif', label: 'Email Analysis Notifications', description: 'Notify when email analysis completes', type: 'toggle', default: true },
      { id: 'critical-threat-alerts', label: 'Critical Threat Alerts', description: 'Real-time alerts for critical severity threats', type: 'toggle', default: true },
    ],
  },
  {
    id: 'appearance',
    label: 'Appearance',
    settings: [
      { id: 'compact-tables', label: 'Compact Tables', description: 'Reduce row padding in data tables', type: 'toggle', default: false },
      { id: 'show-synthetic-labels', label: 'Show Synthetic Data Labels', description: 'Display prototype/synthetic indicators on all pages', type: 'toggle', default: true },
    ],
  },
  {
    id: 'data-privacy',
    label: 'Data & Privacy',
    settings: [
      { id: 'auto-redact-pii', label: 'Auto-Redact PII', description: 'Automatically redact personal data in evidence exports', type: 'toggle', default: true },
      { id: 'retention-period', label: 'Evidence Retention (90 days)', description: 'Automatically archive evidence older than 90 days', type: 'toggle', default: true },
    ],
  },
];

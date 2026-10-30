import {
  LayoutDashboard,
  MailSearch,
  FileSearch,
  Globe2,
  MapPin,
  Share2,
  Network,
  FileText,
  Bell,
  Settings,
  Upload,
  ClipboardList,
  Inbox,
  Lock,
  Mail,
  type LucideIcon,
} from 'lucide-react';

export type NavRole = 'analyst' | 'user' | 'all';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Which roles can see this nav item */
  roles: NavRole[];
}

export const NAV_ITEMS: NavItem[] = [
  // ── Analyst-only ──────────────────────────────────────────────────────────
  { id: 'dashboard',           label: 'Dashboard',          icon: LayoutDashboard, roles: ['analyst'] },
  { id: 'email-analyzer',      label: 'Email Analyzer',     icon: MailSearch,      roles: ['analyst'] },
  { id: 'header-forensics',    label: 'Header Forensics',   icon: FileSearch,      roles: ['analyst'] },
  { id: 'threat-intelligence', label: 'Threat Intelligence',icon: Globe2,          roles: ['analyst'] },
  { id: 'origin-investigation',label: 'Origin Investigation',icon: MapPin,         roles: ['analyst'] },
  { id: 'attack-graph',        label: 'Attack Graph',       icon: Share2,          roles: ['analyst'] },
  { id: 'reports',             label: 'Reports',            icon: FileText,        roles: ['analyst'] },
  { id: 'user-requests',       label: 'User Requests',      icon: Inbox,           roles: ['analyst'] },

  // ── Standard user ─────────────────────────────────────────────────────────
  { id: 'emails',              label: 'Emails',             icon: Mail,            roles: ['user'] },
  { id: 'submit-report',       label: 'Submit Report',      icon: Upload,          roles: ['user'] },
  { id: 'check-status',        label: 'Check Status',       icon: ClipboardList,   roles: ['user'] },

  // ── Shared ────────────────────────────────────────────────────────────────
  { id: 'settings',            label: 'Settings',           icon: Settings,        roles: ['all'] },
];

/** Filter nav items for the given role (excludes 'settings' which is handled separately) */
export function getNavItemsForRole(role: NavRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.id !== 'settings' && (item.roles.includes(role) || item.roles.includes('all'))
  );
}

/** Default landing route per role */
export const DEFAULT_ROUTE: Record<NavRole, string> = {
  analyst: 'dashboard',
  user: 'emails',
  all: 'dashboard',
};

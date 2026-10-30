import { useState, useEffect } from 'react';
import { Sidebar, TopBar } from '@/components/Layout';
import { NAV_ITEMS, DEFAULT_ROUTE } from '@/config/navigation';
import { WelcomePage } from '@/pages/WelcomePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EmailAnalyzerPage } from '@/pages/EmailAnalyzerPage';
import { HeaderForensicsPage } from '@/pages/HeaderForensicsPage';
import { ThreatIntelligencePage } from '@/pages/ThreatIntelligencePage';
import { OriginInvestigationPage, AttackGraphPage } from '@/pages/OriginInvestigationPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SubmitReportPage } from '@/pages/SubmitReportPage';
import { CheckStatusPage } from '@/pages/CheckStatusPage';
import { UserRequestsPage } from '@/pages/UserRequestsPage';
import { EmailsPage } from '@/pages/EmailsPage';
import { UserDeepForensicsPage } from '@/pages/UserDeepForensicsPage';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AnalysisProvider, useAnalysis } from '@/contexts/AnalysisContext';
import { CampaignProvider, useCampaigns } from '@/contexts/CampaignContext';
import { EvidenceProvider, useEvidence } from '@/contexts/EvidenceContext';
import { AuthProvider, useAuth, buildUser, deriveRoleFromEmail, type UserRole } from '@/contexts/AuthContext';
import { TicketProvider, useTickets } from '@/contexts/TicketContext';
import { EmailIngestionProvider } from '@/contexts/EmailIngestionContext';
import { clearAllSentinelStorage, clearEphemeralStorage, KEY_AUTH, KEY_USER, KEY_USER_ROLE, KEY_ACTIVE_CASE } from '@/utils/storageKeys';

function getInitialRoute(role: UserRole | null): string {
  const hash = window.location.hash.replace('#/', '');
  const valid = NAV_ITEMS.some((n) => n.id === hash) || hash.includes('/forensics');
  if (valid) return hash;
  if (role === 'user') return 'emails';
  return 'dashboard';
}

function AppShell() {
  const { currentUser, setCurrentUser, signOut } = useAuth();
  const role = currentUser?.role ?? null;

  const [showWelcome, setShowWelcome] = useState(() => {
    const isAuth = localStorage.getItem(KEY_AUTH) === 'true';
    const user = localStorage.getItem(KEY_USER);
    return !(isAuth && user);
  });
  const [route, setRoute] = useState<string>(() => getInitialRoute(role));
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!showWelcome) {
      window.location.hash = `/${route}`;
      document.body.classList.add('in-app');
    } else {
      document.body.classList.remove('in-app');
    }
    return () => {
      document.body.classList.remove('in-app');
    };
  }, [route, showWelcome]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (NAV_ITEMS.some((n) => n.id === hash) || hash.includes('/forensics')) {
        setShowWelcome(false);
        setRoute(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  /** Unified navigation handler */
  function handleNavigate(id: string, opts?: { role?: UserRole }) {
    setShowWelcome(false);

    const email = localStorage.getItem(KEY_USER) || '';
    const rawRole = opts?.role || (localStorage.getItem(KEY_USER_ROLE) as UserRole) || (email ? deriveRoleFromEmail(email) : 'user');
    const isMasterAnalyst = email.toLowerCase().trim() === 'sentinelx.analyst@gmail.com' || email.toLowerCase().trim() === 'analyst@gmail.com';
    const effectiveRole: UserRole = isMasterAnalyst && rawRole === 'analyst' ? 'analyst' : (email ? deriveRoleFromEmail(email) : 'user');

    const effectiveEmail = email || (effectiveRole === 'analyst' ? 'sentinelx.analyst@gmail.com' : 'demouser1@gmail.com');
    localStorage.setItem(KEY_AUTH, 'true');
    localStorage.setItem(KEY_USER, effectiveEmail);
    localStorage.setItem(KEY_USER_ROLE, effectiveRole);

    // If standard user attempts to access an analyst-only route, redirect to user emails view
    const analystOnlyRoutes = ['dashboard', 'email-analyzer', 'header-forensics', 'threat-intelligence', 'origin-investigation', 'attack-graph', 'reports', 'user-requests'];
    const targetRoute = (id === 'campaigns' || id === 'alerts')
      ? (effectiveRole === 'user' ? 'emails' : 'dashboard')
      : (effectiveRole === 'user' && analystOnlyRoutes.includes(id) ? 'emails' : id);
    setRoute(targetRoute);

    // Only update currentUser if not initialized or if account/role explicitly changed
    if (!currentUser || currentUser.email.toLowerCase() !== effectiveEmail.toLowerCase() || (opts?.role && opts.role !== currentUser.role)) {
      setCurrentUser(buildUser(effectiveEmail, effectiveRole));
    }
  }

  // Show fullscreen welcome page first
  if (showWelcome) {
    return <WelcomePage onNavigate={handleNavigate} />;
  }

  const effectiveNavId = route.includes('/forensics') ? 'emails' : route;
  const activeNav = NAV_ITEMS.find((n) => n.id === route) || (route.includes('/forensics') ? NAV_ITEMS.find((n) => n.id === 'emails') : undefined);

  function renderPage() {
    // Security guard: Standard users can never view analyst-only screens
    const analystOnlyRoutes = ['dashboard', 'email-analyzer', 'header-forensics', 'threat-intelligence', 'origin-investigation', 'attack-graph', 'reports', 'user-requests'];
    if (role === 'user' && analystOnlyRoutes.includes(route)) {
      return <EmailsPage onNavigate={handleNavigate} />;
    }

    if (route.startsWith('emails/') && route.endsWith('/forensics')) {
      const emailId = decodeURIComponent(route.slice('emails/'.length, route.length - '/forensics'.length));
      return <UserDeepForensicsPage emailId={emailId} onNavigate={handleNavigate} />;
    }

    switch (route) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'email-analyzer':
        return (
          <EmailAnalyzerPage
            onNavigate={handleNavigate}
          />
        );
      case 'header-forensics':    return <HeaderForensicsPage onNavigate={handleNavigate} />;
      case 'threat-intelligence': return <ThreatIntelligencePage onNavigate={handleNavigate} />;
      case 'origin-investigation': return <OriginInvestigationPage onNavigate={handleNavigate} />;
      case 'attack-graph':        return <AttackGraphPage onNavigate={handleNavigate} />;
      case 'reports':             return <ReportsPage onNavigate={handleNavigate} />;
      case 'settings':            return <SettingsPage onResetCache={handleResetCache} userRole={role} />;
      case 'emails':              return <EmailsPage onNavigate={handleNavigate} />;
      case 'submit-report':       return <SubmitReportPage onNavigate={handleNavigate} />;
      case 'check-status':        return <CheckStatusPage onNavigate={handleNavigate} />;
      case 'user-requests':       return <UserRequestsPage onNavigate={handleNavigate} />;
      default:                    return role === 'user'
        ? <EmailsPage onNavigate={handleNavigate} />
        : <DashboardPage onNavigate={handleNavigate} />;
    }
  }

  const { clearCases, resetActiveAnalysis } = useAnalysis();
  const { clearCampaigns } = useCampaigns();
  const { clearVault } = useEvidence();
  const { clearAllTickets } = useTickets();

  /**
   * Logout: preserves all persistent data.
   * Only clears auth keys and ephemeral forensic-session keys.
   */
  function handleSignOut() {
    resetActiveAnalysis();
    clearEphemeralStorage();
    try { localStorage.removeItem(KEY_AUTH); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_USER); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_USER_ROLE); } catch { /* ignore */ }
    signOut();
    setShowWelcome(true);
  }

  /**
   * Reset Cache (Settings → Data): wipes EVERYTHING including persistent tier.
   */
  async function handleResetCache() {
    clearCases();
    clearCampaigns();
    clearVault();
    try { await clearAllTickets(); } catch { /* ignore */ }
    clearAllSentinelStorage();
    window.location.reload();
  }

  return (
    <div className="flex locked-h-screen h-screen h-[100dvh] overflow-hidden bg-white dark:bg-black text-gray-900 dark:text-gray-100 transition-colors">
      <Sidebar
        activeId={effectiveNavId}
        onNavigate={(id) => handleNavigate(id)}
        onSignOut={handleSignOut}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden relative z-0">
        <TopBar
          onMenuClick={() => setMobileOpen((prev) => !prev)}
          mobileOpen={mobileOpen}
          activeLabel={route.includes('/forensics') ? 'Deep Forensics Report' : (activeNav?.label ?? 'Dashboard')}
          onNavigate={(id) => handleNavigate(id)}
        />
        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin touch-scroll p-3 sm:p-4 lg:p-5 bg-white dark:bg-black transition-colors">
          <div className="max-w-[1600px] mx-auto animate-fade-in" key={route}>
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    try {
      sessionStorage.removeItem('settings_active_tab');
      localStorage.removeItem(KEY_ACTIVE_CASE);
    } catch { /* ignore */ }
    window.location.hash = '#/dashboard';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08090e] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400 text-2xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-xs text-gray-400 max-w-md mb-6 font-mono">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TicketProvider>
            <EmailIngestionProvider>
              <AnalysisProvider>
                <EvidenceProvider>
                  <CampaignProvider>
                    <AppShell />
                  </CampaignProvider>
                </EvidenceProvider>
              </AnalysisProvider>
            </EmailIngestionProvider>
          </TicketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

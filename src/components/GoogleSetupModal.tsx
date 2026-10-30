import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Key, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { GoogleAuthService } from '@/services/googleAuthService';

interface GoogleSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessConnect: () => void;
}

export function GoogleSetupModal({ isOpen, onClose, onSuccessConnect }: GoogleSetupModalProps) {
  const [clientId, setClientId] = useState<string>(() => GoogleAuthService.getClientId() || '');
  const [error, setError] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = clientId.trim();
    if (!trimmed) {
      setError('Please provide your Google OAuth Client ID.');
      return;
    }

    if (!trimmed.endsWith('.apps.googleusercontent.com') && !trimmed.includes('.googleusercontent.')) {
      setError('Client ID should look like: [id].apps.googleusercontent.com');
      return;
    }

    try {
      setIsConnecting(true);
      GoogleAuthService.setClientId(trimmed);
      onSuccessConnect();
    } catch (err: any) {
      setError(err?.message || 'Failed to save Google Client ID.');
      setIsConnecting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden animate-slide-up flex flex-col max-h-[92vh] overflow-y-auto scrollbar-thin"
        style={{
          background: 'linear-gradient(145deg, #10121d, #0b0c14)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 12.075 17.64 9.767 17.64 9.2z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-snug">Connect Real Google & Gmail</h3>
              <p className="text-xs text-gray-400">OAuth 2.0 Web Client Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSaveAndConnect} className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-200 leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Read-Only & Client-Side Privacy</span>
            </div>
            <p>
              Sentinel-X connects directly to your Gmail account with <strong>read-only access</strong>. No emails are ever deleted, sent, or stored externally.
            </p>
          </div>

          {/* Steps list */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">
              Quick 2-Minute Setup Steps:
            </p>
            <ol className="space-y-2 text-xs text-gray-400 list-decimal list-inside leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5">
              <li>
                Open the{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Google Cloud Console Credentials <ExternalLink className="w-3 h-3 inline" />
                </a>
              </li>
              <li>
                Create an <strong>OAuth 2.0 Client ID</strong> (Type: <em>Web application</em>).
              </li>
              <li>
                Under <strong>Authorized JavaScript origins</strong>, add:
                <code className="block mt-1 px-2 py-1 rounded bg-white/10 text-cyan-300 font-mono text-[11px] w-fit">
                  http://localhost:5173
                </code>
              </li>
              <li>
                Enable the <strong>Gmail API</strong> in the Google Cloud Library.
              </li>
            </ol>
          </div>

          {/* Client ID input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-200 flex items-center justify-between">
              <span>Google OAuth Web Client ID</span>
              <span className="text-[10px] text-gray-500 font-normal">Stored locally</span>
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-black/40 border border-white/15 focus-within:border-blue-500 transition-colors">
              <Key className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g., 123456789-xxxx.apps.googleusercontent.com"
                className="w-full bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none font-mono"
              />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isConnecting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg  flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isConnecting ? 'Opening Google Sign-In...' : 'Save & Sign In with Google'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

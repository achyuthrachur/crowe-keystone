export { isPWAInstalled } from './push-notifications';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let _installPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _installPrompt = e as BeforeInstallPromptEvent;
  });
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return _installPrompt;
}

export async function showInstallPrompt(): Promise<boolean> {
  if (!_installPrompt) return false;
  await _installPrompt.prompt();
  const { outcome } = await _installPrompt.userChoice;
  _installPrompt = null;
  return outcome === 'accepted';
}

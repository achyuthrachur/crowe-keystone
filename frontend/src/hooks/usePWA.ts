'use client';

import { useState, useEffect } from 'react';
import { isPWAInstalled, showInstallPrompt, getInstallPrompt } from '@/lib/pwa';

interface UsePWAResult {
  isInstalled: boolean;
  canInstall: boolean;
  install: () => Promise<boolean>;
}

export function usePWA(): UsePWAResult {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    setIsInstalled(isPWAInstalled());
    setCanInstall(!!getInstallPrompt());

    const handler = () => {
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    const result = await showInstallPrompt();
    if (result) {
      setIsInstalled(true);
      setCanInstall(false);
    }
    return result;
  };

  return { isInstalled, canInstall, install };
}

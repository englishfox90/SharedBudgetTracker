'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Account } from '@/types';

interface AccountContextValue {
  account: Account | null;
  loading: boolean;
  /** Re-fetch the account from the server. */
  refresh: () => Promise<void>;
  /** Replace the cached account (e.g. after a successful PATCH). */
  setAccount: (account: Account | null) => void;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

/**
 * Loads the user's account once and shares it with every tab, instead of each
 * tab fetching /api/accounts on mount.
 */
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/accounts');
      const accounts = await res.json();
      setAccount(Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : null);
    } catch (error) {
      console.error('Error loading account:', error);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ account, loading, refresh, setAccount }), [account, loading, refresh]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return ctx;
}

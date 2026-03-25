import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { ParkingAppVersionOut } from '@/lib/api';
import { getForceUpdateState, type ForceUpdateState } from '@/lib/force-update';

type ForceUpdateContextValue = {
  state: ForceUpdateState;
  setFromServer: (payload: ParkingAppVersionOut) => void;
};

const ForceUpdateContext = createContext<ForceUpdateContextValue | null>(null);

export function ForceUpdateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ForceUpdateState>(() => getForceUpdateState());

  const setFromServer = useCallback((payload: ParkingAppVersionOut) => {
    setState({
      visible: !!payload.force_update,
      currentVersion: payload.current_version ?? null,
      latestVersion: payload.latest_version ?? null,
      storeUrl: payload.store_url ?? null,
      message: payload.message ?? null,
    });
  }, []);

  const value = useMemo<ForceUpdateContextValue>(() => ({ state, setFromServer }), [state, setFromServer]);
  return <ForceUpdateContext.Provider value={value}>{children}</ForceUpdateContext.Provider>;
}

export function useForceUpdate() {
  const ctx = useContext(ForceUpdateContext);
  if (!ctx) throw new Error('useForceUpdate must be used within ForceUpdateProvider');
  return ctx;
}


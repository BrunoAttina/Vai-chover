import { createContext, useContext, useState, type ReactNode } from 'react';
import type { ResolveRegionOutput } from '@vai-chover/shared';

interface RegionContextValue {
  region: ResolveRegionOutput | null;
  setRegion: (region: ResolveRegionOutput | null) => void;
}

const RegionContext = createContext<RegionContextValue>({
  region: null,
  setRegion: () => undefined,
});

/** Município e período atuais, definidos na tela de localização e usados nas seguintes. */
export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegion] = useState<ResolveRegionOutput | null>(null);
  return <RegionContext.Provider value={{ region, setRegion }}>{children}</RegionContext.Provider>;
}

export function useRegionContext(): RegionContextValue {
  return useContext(RegionContext);
}

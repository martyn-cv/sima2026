"use client";
import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { AuthProvider } from "@/lib/auth";
import { PlantaProvider } from "@/lib/planta";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={qc}>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <PlantaProvider>{children}</PlantaProvider>
        </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}

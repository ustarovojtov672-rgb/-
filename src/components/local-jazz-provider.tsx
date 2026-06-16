"use client";

import type { ReactNode } from "react";
import { JazzReactProvider } from "jazz-tools/react";

import { localJazzConfig } from "@/lib/jazz/local";

export function LocalJazzProvider({ children }: { children: ReactNode }) {
  return (
    <JazzReactProvider {...localJazzConfig} fallback={null}>
      {children}
    </JazzReactProvider>
  );
}

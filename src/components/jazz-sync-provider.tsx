"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  JazzBrowserContextManager,
  type JazzContextManagerProps,
} from "jazz-tools/browser";
import { JazzContext } from "jazz-tools/react-core";

import { jazzSyncConfig } from "@/lib/jazz/sync";
import { NutritionAccount } from "@/lib/jazz/schema";

export function JazzSyncProvider({ children }: { children: ReactNode }) {
  const [contextManager] = useState(
    () =>
      new JazzBrowserContextManager<typeof NutritionAccount>({
        authSecretStorageKey: jazzSyncConfig.authSecretStorageKey,
      }),
  );
  const [error, setError] = useState<Error | null>(null);
  const props = useMemo(
    () =>
      ({
        AccountSchema: jazzSyncConfig.AccountSchema,
        defaultProfileName: jazzSyncConfig.defaultProfileName,
        guestMode: jazzSyncConfig.guestMode,
        storage: jazzSyncConfig.storage,
        sync: jazzSyncConfig.sync,
      }) satisfies JazzContextManagerProps<typeof NutritionAccount>,
    [],
  );
  const isReady = useSyncExternalStore(
    useCallback(
      (callback) => contextManager.subscribe(callback),
      [contextManager],
    ),
    () => Boolean(contextManager.getCurrentValue()),
    () => Boolean(contextManager.getCurrentValue()),
  );

  if (typeof window !== "undefined" && contextManager.propsChanged(props)) {
    contextManager.createContext(props).catch((reason: unknown) => {
      const nextError =
        reason instanceof Error ? reason : new Error(String(reason));
      setError(nextError);
      console.error("Error creating Jazz browser context:", nextError);
    });
  }

  useEffect(() => {
    let cancelled = false;

    if (!contextManager.propsChanged(props)) {
      return;
    }

    contextManager.createContext(props).catch((reason: unknown) => {
      if (cancelled) {
        return;
      }

      const nextError =
        reason instanceof Error ? reason : new Error(String(reason));
      setError(nextError);
      console.error("Error creating Jazz browser context:", nextError);
    });

    return () => {
      cancelled = true;
    };
  }, [contextManager, props]);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return;
    }

    return () => contextManager.done();
  }, [contextManager]);

  return (
    <JazzContext.Provider value={contextManager}>
      {isReady ? (
        children
      ) : (
        <JazzSyncBootScreen error={error} peer={jazzSyncConfig.sync.peer} />
      )}
    </JazzContext.Provider>
  );
}

function JazzSyncBootScreen({
  error,
  peer,
}: {
  error: Error | null;
  peer: string;
}) {
  return (
    <main className="min-h-screen bg-[#f8f6f0] text-[#17130f]">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-10">
        <div className="border border-[#d9d2c3] bg-[#fffdf8] p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-normal">
            Подключаю синхронизацию
          </h1>
          <p className="mt-4 text-base leading-7 text-[#5d5549]">
            Приложение подключается к Jazz sync-серверу на{" "}
            <code className="border border-[#d9d2c3] bg-[#f3efe6] px-1.5 py-0.5">
              {peer}
            </code>
            .
          </p>
          <JazzSyncPeerStatus peer={peer} />
          {error ? (
            <div className="mt-5 border border-[#c45f4f] bg-[#fff4f1] p-4 text-sm leading-6 text-[#733126]">
              {error.message}
            </div>
          ) : null}
          <p className="mt-4 text-sm leading-6 text-[#6f6658]">
            Если сервер не доступен, откройте терминал в папке проекта и
            выполните команду:
          </p>
          <pre className="mt-3 overflow-x-auto border border-[#d9d2c3] bg-[#17130f] p-4 text-sm text-[#fffdf8]">
            <code>npm run jazz:sync</code>
          </pre>
        </div>
      </div>
    </main>
  );
}

function JazzSyncPeerStatus({ peer }: { peer: string }) {
  const [status, setStatus] = useState<"checking" | "open" | "closed">(
    "checking",
  );

  useEffect(() => {
    const socket = new WebSocket(peer);
    const timeout = window.setTimeout(() => {
      setStatus("closed");
      socket.close();
    }, 2000);

    socket.addEventListener("open", () => {
      window.clearTimeout(timeout);
      setStatus("open");
      socket.close();
    });

    socket.addEventListener("error", () => {
      window.clearTimeout(timeout);
      setStatus("closed");
    });

    return () => {
      window.clearTimeout(timeout);
      socket.close();
    };
  }, [peer]);

  const label =
    status === "open"
      ? "Сервер доступен, запускаю Jazz."
      : status === "closed"
        ? "Сервер не отвечает."
        : "Проверяю сервер.";

  return (
    <div className="mt-5 border border-[#d9d2c3] bg-[#f3efe6] p-4 text-sm leading-6 text-[#4f473d]">
      {label}
    </div>
  );
}

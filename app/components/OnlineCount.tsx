"use client";

import { useEffect, useState } from "react";

function getSessionId(): string {
  const key = "owcsle_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function OnlineCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();

    const heartbeat = async () => {
      try {
        await fetch("/api/online", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
      } catch {}
    };

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/online");
        const data = await res.json();
        setCount(data.count ?? null);
      } catch {}
    };

    heartbeat();
    fetchCount();

    const interval = setInterval(() => {
      heartbeat();
      fetchCount();
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  if (count === null) return null;

  return (
    <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 font-[family-name:var(--font-ow-esports)]">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      {count} ONLINE
    </span>
  );
}

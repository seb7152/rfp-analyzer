"use client";

import { ReactNode, useEffect, useState } from "react";

/**
 * ClientOnly wrapper - renders nothing on server, renders content on client only
 * This prevents hydration mismatches when using mobile detection
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <>{children}</>;
}

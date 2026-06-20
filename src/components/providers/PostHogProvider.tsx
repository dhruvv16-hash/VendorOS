"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { usePathname } from "next/navigation";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
    
    if (key) {
      posthog.init(key, {
        api_host: host,
        person_profiles: "identified_only",
        capture_pageview: false, // Handle manually to capture Next.js SPA transitions
        loaded: (ph) => {
          if (process.env.NODE_ENV === "development") {
            ph.debug();
          }
        }
      });
    }
  }, []);

  return <PostHogPageviewTracker>{children}</PostHogPageviewTracker>;
}

function PostHogPageviewTracker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && typeof window !== "undefined" && posthog.__loaded) {
      const url = window.origin + pathname + window.location.search;
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname]);

  return <>{children}</>;
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SESSION_CHANGED_EVENT, getSession, hasRole } from "@/lib/auth";

type Options = {
  /** Where to send users who lack the role. Default '/my-learning'. */
  fallback?: string;
  /** Where to send signed-out users. Default '/login'. */
  loginPath?: string;
};

/**
 * Client-side page gate. Pass the roles the page requires (any-of
 * semantics). Returns once the gate has resolved:
 *   - 'allowed'   → render the page
 *   - 'denied'    → user is signed in but lacks the role; redirect fired
 *   - 'anonymous' → user is signed out; redirect to login fired
 *   - 'loading'   → still hydrating; render a skeleton
 *
 * The gate re-runs on the lms:session-changed event so signing out in
 * another tab kicks the user off the protected page.
 */
export function useRequireRole(
  roles: string[],
  opts: Options = {},
): "allowed" | "denied" | "anonymous" | "loading" {
  const router = useRouter();
  const [state, setState] = useState<
    "allowed" | "denied" | "anonymous" | "loading"
  >("loading");

  useEffect(() => {
    function check() {
      if (!getSession()) {
        setState("anonymous");
        router.replace(opts.loginPath ?? "/login");
        return;
      }
      const ok = roles.some((r) => hasRole(r));
      if (!ok) {
        setState("denied");
        router.replace(opts.fallback ?? "/my-learning");
        return;
      }
      setState("allowed");
    }
    check();
    window.addEventListener(SESSION_CHANGED_EVENT, check);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, check);
      window.removeEventListener("storage", check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles.join(","), opts.fallback, opts.loginPath]);

  return state;
}

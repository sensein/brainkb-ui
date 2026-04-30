"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

// Landing page for the backend OAuth callback. The backend redirects here with
//   ?token=<jwt>&redirect=<path>
// or
//   ?error=<message>
// We hand the token to NextAuth's CredentialsProvider ("backend-jwt") so
// useSession() + session.backendToken work across the app.
export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<"pending" | "error">("pending");
  const [message, setMessage] = useState<string>("");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const error = params.get("error");
    if (error) {
      setState("error");
      setMessage(error);
      return;
    }

    const token = params.get("token");
    if (!token) {
      setState("error");
      setMessage("No token in callback URL");
      return;
    }
    const redirectTo = params.get("redirect") || "/";

    (async () => {
      const res = await signIn("backend-jwt", { token, redirect: false });
      if (!res || res.error) {
        setState("error");
        setMessage(res?.error || "Sign-in failed");
        return;
      }
      router.replace(redirectTo);
    })();
  }, [params, router]);

  if (state === "error") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-xl font-semibold text-red-600">Sign-in failed</h1>
        <p className="text-sm text-gray-600 max-w-lg text-center">{message}</p>
        <button
          onClick={() => router.replace("/")}
          className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="flex items-center gap-3 text-gray-600">
        <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-800 animate-spin" />
        <span>Finishing sign-in…</span>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AuthSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      // Store tokens in localStorage for compatibility with existing code
      localStorage.setItem("token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      
      console.log("[AuthSuccess] Tokens stored in localStorage");
      
      // Redirect to home
      router.replace("/home");
    } else {
      console.error("[AuthSuccess] Missing tokens in URL");
      router.replace("/login?error=Authentication failed");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen w-full bg-[#0B0B0E] text-zinc-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-zinc-400">Completing sign in...</p>
      </div>
    </div>
  );
}

"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthCard from "../../../components/AuthCard";
import FormInput from "../../../components/FormInput";
import Button from "../../../components/Button";

function SignupForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  function validate() {
    if (!firstName.trim()) return "First name is required";
    if (!lastName.trim()) return "Last name is required";
    if (!email.trim()) return "Email is required";
    if (!email.includes("@")) return "Please enter a valid email";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (password !== confirm) return "Passwords do not match";
    return null;
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const v = validate();
    setError(v);
    if (v) return;
    setLoading(true);
    try {
      // Call your API endpoint which bypasses email confirmation
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          firstName, 
          lastName, 
          email, 
          password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      // If warning exists but token is present, still proceed
      if (data.warning && data.token) {
        console.warn("Signup warning:", data.warning);
      }

      if (!data.token && !data.user) {
        throw new Error("Signup incomplete - please try logging in");
      }

      // Store token in localStorage for your app
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      // Redirect to home
      window.location.href = "/home";
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    setError(null);
    window.location.href = '/api/auth/google';
  }

  return (
    <AuthCard title="Create account" subtitle="Sign up for Tally">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormInput id="firstName" label="First name" type="text" value={firstName} onChange={setFirstName} placeholder="John" />
        <FormInput id="lastName" label="Last name" type="text" value={lastName} onChange={setLastName} placeholder="Doe" />
        <FormInput id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
        <FormInput id="password" label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
        <FormInput id="confirm" label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat your password" />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button type="submit" disabled={loading || googleLoading}>
          {loading ? "Creating..." : "Create account"}
        </Button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-300"></div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {googleLoading ? "Loading..." : "Sign up with Google"}
        </button> 

        <div className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link className="text-indigo-600 hover:underline" href="/login">
            Sign in
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <AuthCard title="Create account" subtitle="Sign up for Tally">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </AuthCard>
    }>
      <SignupForm />
    </Suspense>
  );
}

"use client";
import React, { useState } from "react";
import Link from "next/link";
import AuthCard from "../../../components/AuthCard";
import FormInput from "../../../components/FormInput";
import Button from "../../../components/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    if (!email.includes("@")) return "Please enter a valid email";
    if (password.length < 6) return "Password must be at least 6 characters";
    return null;
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const v = validate();
    setError(v);
    if (v) return;
    setLoading(true);
    try {
      // Call your API endpoint which handles token storage correctly
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (!data.token) {
        throw new Error("No token returned");
      }

      // Store token in localStorage for your app
      localStorage.setItem("token", data.token);

      // Redirect to home
      window.location.href = "/home";
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to your Tally account">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FormInput id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
        <FormInput id="password" label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button type="submit">{loading ? "Loading..." : "Sign in"}</Button>
  <div className="text-center text-sm text-zinc-500">Don&apos;t have an account? <Link className="text-indigo-600 hover:underline" href="/signup">Sign up</Link></div>
      </form>
    </AuthCard>
  );
}

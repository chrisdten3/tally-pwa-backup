"use client";
import React, { useState } from "react";
import Link from "next/link";
import AuthCard from "../../../components/AuthCard";
import FormInput from "../../../components/FormInput";
import Button from "../../../components/Button";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName, lastName: lastName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Signup failed");
      localStorage.setItem("token", data.token);
      try { localStorage.setItem("user", JSON.stringify(data.user)); } catch {}
      window.location.href = "/profile";
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
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
        <Button type="submit">{loading ? "Creating..." : "Create account"}</Button>
        <div className="text-center text-sm text-zinc-500">Already have an account? <Link className="text-indigo-600 hover:underline" href="/login">Sign in</Link></div>
      </form>
    </AuthCard>
  );
}

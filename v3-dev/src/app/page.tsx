"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  CreditCard,
  BellRing,
  Users,
  BarChart3,
  Wallet,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Database,
  Github,
  X,
} from "lucide-react";
import { supabaseClient } from "../lib/supabase";

// Single-file landing page for Tally
// Drop this into a Next.js / React route and style with TailwindCSS.
// No external design system required; icons via lucide-react, animations via framer-motion.

const features = [
  {
    icon: <CreditCard className="h-6 w-6" aria-hidden />,
    title: "Dues tracking, done right",
    desc: "Know exactly who’s paid, who’s pending, and who needs a nudge—across every club you run.",
  },
  {
    icon: <BellRing className="h-6 w-6" aria-hidden />,
    title: "Auto‑notifications",
    desc: "Smart reminders via email or text that follow up so you don’t have to.",
  },
  {
    icon: <Users className="h-6 w-6" aria-hidden />,
    title: "Roster & attendance",
    desc: "Sync attendance sheets to see engagement and eligibility at a glance.",
  },
  {
    icon: <Wallet className="h-6 w-6" aria-hidden />,
    title: "Payouts & treasury",
    desc: "Track balances per club and move funds to where they need to be, fast.",
  },
  {
    icon: <BarChart3 className="h-6 w-6" aria-hidden />,
    title: "Analytics that matter",
    desc: "Cohort‑level insights on payments, churn risk, and activity trends.",
  },
  {
    icon: <Database className="h-6 w-6" aria-hidden />,
    title: "CRM integrations",
    desc: "Plug into Sheets and popular CRMs so your board stays perfectly in sync.",
  },
];

const tiers = [
  {
    name: "Starter",
    price: "$0",
    blurb: "For new clubs and pilot orgs",
    points: [
      "Up to 100 members",
      "Dues tracking",
      "Basic reminders",
      "CSV/Sheets import",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$49/mo",
    blurb: "For active orgs with multiple events",
    points: [
      "Unlimited members",
      "Automated notifications",
      "Attendance sync",
      "Dashboards & exports",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Campus / Enterprise",
    price: "Custom",
    blurb: "For multi‑club networks and universities",
    points: [
      "SSO & roles",
      "Department‑level reporting",
      "Priority support",
      "Custom integrations",
    ],
    cta: "Talk to us",
    highlight: false,
  },
];

const Section = ({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) => (
  // Add scrollMarginTop so anchored sections account for the sticky header height
  <section
    id={id}
    style={{ scrollMarginTop: "4rem" }}
    className={`mx-auto w-full max-w-7xl px-6 md:px-10 ${className}`}
  >
    {children}
  </section>
);

function SignupModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const emailRef = useRef<HTMLInputElement>(null);
  const [submitted, setSubmitted] = useState(false);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", onKey);
      // focus first field a tick after open
      setTimeout(() => emailRef.current?.focus(), 10);
      // prevent body scroll while open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: replace with your API call (Supabase/Resend/Formspark/etc.)
    // Read form values and show an in-modal success state instead of alert.
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());

    // Attempt to insert into the `intrest_signup` table in Supabase.
    // Table column names used here: first_name, last_name, email, phone, university, created_at
    (async () => {
      try {
        const insertPayload = {
          first_name: data.firstName || null,
          last_name: data.lastName || null,
          email: data.email || null,
          phone: data.phone || null,
          university: data.university || null,
          created_at: new Date().toISOString(),
        };

        const { error } = await supabaseClient.from("waitlist_subscribers").insert([insertPayload]);
        if (error) {
          console.error("Supabase insert error:", error);
          // Optional: show a friendly message. Keep UX consistent and still show success modal
          // only if you want to mask failures; here we surface an alert so user knows.
          alert("Could not submit — please try again later.");
          return;
        }

        setFirstName((data.firstName as string) || "friend");
        setSubmitted(true);
      } catch (err) {
        console.error("Signup error:", err);
        alert("Could not submit — please try again later.");
      }
    })();
  };

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby="signup-title"
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900/95 p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-lg p-2 text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <Image
            src="/tally-icon.png"
            alt="Tally Logo"
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl"
          />
          <h3 id="signup-title" className="text-lg font-semibold tracking-tight">
            Join the Tally updates list
          </h3>
        </div>

        {/* Success state */}
        {submitted ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              <div className="rounded-full bg-emerald-500/10 p-4 text-emerald-400">
                <Sparkles className="h-8 w-8" />
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="text-center"
            >
              <h4 className="text-2xl font-semibold">You're in, {firstName} 🎉</h4>
              <p className="mt-2 text-sm text-neutral-300">Thanks for joining the list — we’ll send invites and product updates soon.</p>
            </motion.div>

            {/* simple confetti pieces */}
            <div className="pointer-events-none absolute inset-0 -z-10 flex items-start justify-center">
              <div className="confetti" aria-hidden>
                <span className="confetti-piece" />
                <span className="confetti-piece" />
                <span className="confetti-piece" />
                <span className="confetti-piece" />
                <span className="confetti-piece" />
                <span className="confetti-piece" />
                <span className="confetti-piece" />
                <span className="confetti-piece" />
                <span className="confetti-piece" />
                <span className="confetti-piece" />
                <span className="confetti-piece" />
                <span className="confetti-piece" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-neutral-300">
              Get product updates and early access invites. We’ll never share your info.
            </p>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-400">First name</label>
            <input
              name="firstName"
              type="text"
              className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-sm outline-none ring-indigo-500/30 focus:ring"
              placeholder="Alex"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Last name <span className="text-neutral-500">(optional)</span></label>
            <input
              name="lastName"
              type="text"
              className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-sm outline-none ring-indigo-500/30 focus:ring"
              placeholder="Kim"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-neutral-400">Email</label>
            <input
              ref={emailRef}
              name="email"
              type="email"
              className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-sm outline-none ring-indigo-500/30 focus:ring"
              placeholder="you@university.edu"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Phone <span className="text-neutral-500">(optional)</span></label>
            <input
              name="phone"
              type="tel"
              className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-sm outline-none ring-indigo-500/30 focus:ring"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">University <span className="text-neutral-500">(optional)</span></label>
            <input
              name="university"
              type="text"
              className="w-full rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-sm outline-none ring-indigo-500/30 focus:ring"
              placeholder="Georgetown University"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-medium text-neutral-900 hover:bg-neutral-200"
            >
              Notify me <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-2 text-center text-xs text-neutral-500">
              By submitting, you agree to receive occasional emails from Tally.
            </p>
          </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function TallyLandingPage() {
  const [signupOpen, setSignupOpen] = useState(false);
  const updatesRef = useRef<HTMLDivElement | null>(null);
    const openSignup = () => {
    // Smooth-scroll to the updates anchor, then open the modal.
    updatesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Open shortly after the scroll starts; tweak delay if desired.
    setTimeout(() => setSignupOpen(true), 250);
  };
  return (
    <div id="top" className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <Section className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
              className="-m-2 rounded-md p-2"
            >
              <Image
                src="/tally-logo-transparent.png" // <-- update this to your logo file name in /public
                alt="Tally Logo"
                width={96}
                height={96}
                className="h-24 w-24 rounded-xl"
              />
            </button>
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="opacity-80 hover:opacity-100">Features</a>
            <a href="#how" className="opacity-80 hover:opacity-100">How it works</a>
            <a href="#faq" className="opacity-80 hover:opacity-100">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="text-sm font-medium text-neutral-300 hover:text-white"
            >
              Log in
            </a>
            <a
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
            >
              Sign up
            </a>
          </div>
        </Section>
      </header>

      {/* Hero */}
      <Section className="relative py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-[-150px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-linear-to-br from-fuchsia-500/20 via-violet-500/10 to-indigo-500/10 blur-3xl" />
        </div>
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl"
            >
              The simplest way to run <span className="bg-linear-to-r from-[#4737FC] to-indigo-400 bg-clip-text text-transparent">club finances</span>.
            </motion.h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-300 md:text-lg">
              Tally keeps dues, attendance, payouts, and communications in one place—so student leaders spend less time chasing payments and more time building community.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                id="get-started"
                href="/signup"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-medium text-neutral-900 hover:bg-neutral-200"
              >
                Try Tally Free →
              </a>
              <button
                onClick={openSignup}
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-5 py-3 font-medium text-white hover:bg-white/10"
              >
                Sign Up for Updates
              </button>
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm text-neutral-400">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> PCI‑aware best practices</div>
              <div className="hidden items-center gap-2 sm:flex"><Github className="h-4 w-4" /> Built by engineers, for orgs</div>
            </div>
          </div>

          {/* Mock screenshot */}
<motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="relative mx-auto w-[340px] rounded-[48px] border-8 border-neutral-800 bg-black shadow-2xl ring-1 ring-white/10">
              <div className="absolute left-1/2 top-0 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-neutral-800" />
              <div className="overflow-hidden rounded-[40px] bg-neutral-950">
                <div className="px-6 pb-8 pt-14">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20 text-xl font-bold text-indigo-400">
                      JD
                    </div>
                    <div>
                      <div className="font-semibold text-white">John Doe</div>
                      <div className="text-sm text-neutral-400">johndoe@gmail.com</div>
                    </div>
                  </div>
                  
                  <div className="mb-4 rounded-xl border border-emerald-500/20 bg-linear-to-br from-emerald-900/30 to-neutral-900/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-white">Club Balance</div>
                      <div className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        +12% this month
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">$847.50</div>
                    <div className="mt-2 flex gap-2">
                      <div className="flex-1 rounded-lg bg-white/5 p-2">
                        <div className="text-[10px] text-neutral-400">Collected</div>
                        <div className="text-xs font-semibold text-white">$1,240</div>
                      </div>
                      <div className="flex-1 rounded-lg bg-white/5 p-2">
                        <div className="text-[10px] text-neutral-400">Spent</div>
                        <div className="text-xs font-semibold text-white">$392.50</div>
                      </div>
                    </div>
                  </div>


                  <div className="mt-6 rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="text-base font-semibold text-white">Recent Activity</div>
                      <button className="text-sm text-indigo-400">View All</button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600/20">
                          <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">Jane Doe</div>
                          <div className="text-xs text-neutral-400">Chess Club · Just now</div>
                        </div>
                        <div className="text-sm font-semibold text-green-400">+$1.00</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/20">
                          <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">Steve Smith</div>
                          <div className="text-xs text-neutral-400">Club Soccer · 2 days ago</div>
                        </div>
                        <div className="text-sm font-semibold text-red-400">-$5.00</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 bg-neutral-900/40 px-6 py-4 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <button className="flex flex-col items-center gap-1 text-indigo-400">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="text-xs font-medium">Home</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-neutral-500">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-xs font-medium">Clubs</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-neutral-500">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="text-xs font-medium">Payout</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-neutral-500">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium">Events</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-neutral-500">
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs font-medium">Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Logos */}
<Section className="py-14">
  <p className="text-center text-sm uppercase tracking-[0.15em] text-neutral-400">
    Trusted by clubs, teams, and student orgs
  </p>

  <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-center gap-x-16 gap-y-10 opacity-90">
    {["georgetownventures", "hoyalytics", "hoyadev"].map((name) => (
      <Image
        key={name}
        src={`/club_logos/${name}.png`}
        alt={`${name} club logo`}
        width={100}
        height={56}
        className="h-14 w-auto object-contain transition-transform duration-300 hover:scale-105"
      />
    ))}
  </div>
</Section>



      {/* Features */}
      <Section id="features" className="py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Everything a treasurer needs</h2>
          <p className="mt-3 text-neutral-300">Purpose‑built workflows that keep your books—and your members—in sync.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-white/10 bg-neutral-900/40 p-6 transition hover:bg-white/5">
              <div className="mb-4 inline-flex rounded-xl bg-white/10 p-3 text-white">{f.icon}</div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-neutral-300">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section id="how" className="py-20">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">From messy spreadsheets to clarity in minutes</h2>
            <ul className="mt-6 space-y-4 text-neutral-300">
              <li className="flex gap-3"><span className="mt-0.5">1.</span> Create your club.</li>
              <li className="flex gap-3"><span className="mt-0.5">2.</span> Set an event, and select who is responsible</li>
              <li className="flex gap-3"><span className="mt-0.5">3.</span> Members choose card, wallet, or bank.*</li>
              <li className="flex gap-3"><span className="mt-0.5">4.</span> Tally auto‑reconciles payments, attendance, and reminders.</li>
            </ul>
            <p className="mt-2 text-xs text-neutral-500">* Payment methods facilitated via Paypal Inc.</p>
          </div>
          <div className="relative rounded-3xl border border-white/10 bg-neutral-900 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { h: "Import members", p: "Map columns and validate emails automatically." },
                { h: "Smart reminders", p: "Gentle nudges that actually get paid." },
                { h: "Attendance sync", p: "Tie activity to eligibility and perks." },
                { h: "One source of truth", p: "Finance, roster, and CRM all aligned." },
              ].map((x) => (
                <div key={x.h} className="rounded-xl border border-white/10 bg-neutral-950 p-4">
                  <h4 className="text-sm font-medium">{x.h}</h4>
                  <p className="mt-1 text-sm text-neutral-400">{x.p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>



      {/* FAQ */}
      <Section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">FAQ</h2>
          <div className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 bg-neutral-900/40">
            {[
              {
                q: "Do you support multiple clubs per user?",
                a: "Absolutely. Tally was designed for leaders in multiple orgs with different roles in each.",
              },
              {
                q: "How easy is setup?",
                a: "A club's balance can be live in seconds.",
              },
              {
                q: "Is Tally secure?",
                a: "Yes - all transcation are powered by Paypal. No financial data is stored on our servers.",
              },
            ].map((item) => (
              <details key={item.q} className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium">
                  {item.q}
                  <span className="ml-4 text-neutral-400 transition group-open:rotate-90">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </summary>
                <p className="mt-3 text-sm text-neutral-300">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <Section className="flex flex-col items-center justify-between gap-6 text-sm text-neutral-400 md:flex-row">
          <div className="flex items-center gap-2 text-neutral-300">
            <Image
              src="/tally-icon.png" // <-- update this to your logo file name in /public
              alt="Tally Logo"
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl"
            />
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-neutral-200">Terms</a>
            <a href="#" className="hover:text-neutral-200">Privacy</a>
            <a href="#" className="hover:text-neutral-200">Contact</a>
          </div>
        </Section>
      </footer>
      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} />
    </div>
  );
}
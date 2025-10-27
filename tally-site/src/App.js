import React from "react";
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
} from "lucide-react";

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

const Section = ({ children, className = "" }) => (
  <section className={`mx-auto w-full max-w-7xl px-6 md:px-10 ${className}`}>{children}</section>
);

export default function TallyLandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
        <Section className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Tally</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#features" className="opacity-80 hover:opacity-100">Features</a>
            <a href="#how" className="opacity-80 hover:opacity-100">How it works</a>
            <a href="#pricing" className="opacity-80 hover:opacity-100">Pricing</a>
            <a href="#faq" className="opacity-80 hover:opacity-100">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="#" className="rounded-xl border border-white/15 px-3 py-1.5 text-sm opacity-90 hover:opacity-100">Log in</a>
            <a
              href="#get-started"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-200"
            >
              Try for free <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Section>
      </header>

      {/* Hero */}
      <Section className="relative py-20 md:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-[-150px] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-violet-500/10 to-indigo-500/10 blur-3xl" />
        </div>
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-6xl"
            >
              The simplest way to run <span className="bg-gradient-to-r from-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">club finances</span>.
            </motion.h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-300 md:text-lg">
              Tally keeps dues, attendance, payouts, and communications in one place—so student leaders spend less time chasing payments and more time building community.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                id="get-started"
                href="#pricing"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-medium text-neutral-900 hover:bg-neutral-200"
              >
                Start free →
              </a>
              <a
                href="#how"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-3 font-medium hover:bg-white/5"
              >
                See how it works
              </a>
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
            <div className="relative rounded-3xl border border-white/10 bg-neutral-900 p-3 shadow-2xl ring-1 ring-white/10">
              <div className="rounded-2xl bg-neutral-950 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="col-span-2 rounded-xl border border-white/10 bg-neutral-900/60 p-4">
                    <div className="mb-3 text-sm text-neutral-400">Dues Dashboard</div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {["Paid", "Pending", "Overdue", "New", "Refunds", "Payouts"].map((label) => (
                        <div key={label} className="rounded-lg border border-white/10 p-3">
                          <div className="text-xs text-neutral-400">{label}</div>
                          <div className="mt-1 text-xl font-semibold">{Math.floor(Math.random()*90)+4}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-4">
                    <div className="mb-3 text-sm text-neutral-400">Next actions</div>
                    <ul className="space-y-3 text-sm">
                      {[
                        "Send reminders to 12 members",
                        "Approve 3 reimbursements",
                        "Export roster for finance",
                      ].map((t) => (
                        <li key={t} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0" />
                          <span className="text-neutral-300">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Logos */}
      <Section className="py-10">
        <p className="text-center text-sm uppercase tracking-wider text-neutral-400">Trusted by clubs, teams, and student orgs</p>
        <div className="mx-auto mt-6 grid max-w-5xl grid-cols-2 items-center gap-6 opacity-80 sm:grid-cols-3 md:grid-cols-6">
          {["Chess", "Dance", "Robotics", "Greek", "A Cappella", "Service"].map((n) => (
            <div key={n} className="rounded-xl border border-white/10 px-4 py-3 text-center text-xs">{n} Club</div>
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
              <li className="flex gap-3"><span className="mt-0.5">1.</span> Import your roster from CSV or Google Sheets.</li>
              <li className="flex gap-3"><span className="mt-0.5">2.</span> Set dues (one‑time or recurring) and eligibility rules.</li>
              <li className="flex gap-3"><span className="mt-0.5">3.</span> Share a secure pay link; members choose card, wallet, or bank.*</li>
              <li className="flex gap-3"><span className="mt-0.5">4.</span> Tally auto‑reconciles payments, attendance, and reminders.</li>
              <li className="flex gap-3"><span className="mt-0.5">5.</span> Export reports or connect to your CRM in one click.</li>
            </ul>
            <p className="mt-4 text-xs text-neutral-500">* Payment methods configurable by your school’s policies.</p>
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

      {/* Pricing */}
      <Section id="pricing" className="py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Simple, transparent pricing</h2>
          <p className="mt-3 text-neutral-300">Start free. Upgrade when your org grows. Educational discounts available.</p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-6 ${
                tier.highlight
                  ? "border-fuchsia-400/40 bg-gradient-to-b from-white/[0.06] to-white/[0.02]"
                  : "border-white/10 bg-neutral-900/40"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-fuchsia-400/50 bg-neutral-950 px-3 py-1 text-xs font-medium text-fuchsia-300 shadow">Most popular</div>
              )}
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <div className="mt-2 text-3xl font-bold">{tier.price}</div>
              <p className="mt-1 text-sm text-neutral-400">{tier.blurb}</p>
              <ul className="mt-5 space-y-3 text-sm">
                {tier.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#get-started"
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium ${
                  tier.highlight ? "bg-white text-neutral-900 hover:bg-neutral-200" : "border border-white/20 hover:bg-white/5"
                }`}
              >
                {tier.cta} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-neutral-500">Payment processing fees may apply depending on method.</p>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight md:text-4xl">FAQ</h2>
          <div className="mt-8 divide-y divide-white/10 rounded-2xl border border-white/10 bg-neutral-900/40">
            {[
              {
                q: "Can members pay without creating an account?",
                a: "Yes. You can share a secure pay link. Members can optionally create an account to view history and receipts.",
              },
              {
                q: "Do you support multiple clubs per user?",
                a: "Absolutely. Tally was designed for leaders in multiple orgs with different roles in each.",
              },
              {
                q: "What integrations are available?",
                a: "Google Sheets, CSV import/export, and popular CRMs. Campus‑wide deployments get custom integrations.",
              },
              {
                q: "How hard is onboarding?",
                a: "Most orgs import a roster and start collecting in minutes. Our team can help migrate historical data.",
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-fuchsia-500 via-violet-500 to-indigo-500">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-neutral-200">Tally</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-neutral-200">Terms</a>
            <a href="#" className="hover:text-neutral-200">Privacy</a>
            <a href="#" className="hover:text-neutral-200">Contact</a>
          </div>
        </Section>
      </footer>
    </div>
  );
}

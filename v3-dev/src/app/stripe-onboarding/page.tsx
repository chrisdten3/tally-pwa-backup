"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  CheckCircle,
  ArrowRight,
  Lock,
  AlertCircle,
  User,
  CreditCard,
  FileText,
  Home,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { 
  MdEmail, 
  MdBusiness, 
  MdPerson, 
  MdDescription, 
  MdAccountBalance, 
  MdCreditCard, 
  MdCheckCircle 
} from "react-icons/md";

export default function StripeOnboardingPage() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStartOnboarding = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error || "Failed to start onboarding");
        setLoading(false);
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      alert("Failed to start onboarding");
      setLoading(false);
    }
  };

  const faqs = [
    {
      question: "Why does Stripe ask for my SSN?",
      answer: "Federal regulations require identity verification for anyone receiving payouts. This is a standard requirement to prevent fraud and ensure compliance with financial laws. Your SSN is encrypted and stored securely by Stripe.",
    },
    {
      question: "What if our club is not a registered business?",
      answer: 'That\'s okay — choose "Individual" during onboarding. This is the correct option for almost all student groups and informal organizations. It does not make you personally liable.',
    },
    {
      question: "Does Tally see my financial information?",
      answer: "No. All banking and identity details stay fully encrypted inside Stripe's secure systems. Tally never has access to your SSN, date of birth, or bank account details.",
    },
    {
      question: "Can I change my bank account later?",
      answer: "Yes. You can update your bank details anytime from your Stripe Express Dashboard. You'll receive a link to access it after onboarding.",
    },
    {
      question: "Will members see my name?",
      answer: "No. They only see the statement descriptor you set during onboarding (e.g., 'Tally Club Payments'). Your personal information remains private.",
    },
  ];

  const thingsToHave = [
    { icon: <User className="w-5 h-5" />, text: "Legal first + last name (as shown on government ID)" },
    { icon: <Home className="w-5 h-5" />, text: "Home address" },
    { icon: <FileText className="w-5 h-5" />, text: "Last 4 digits of SSN" },
    { icon: <CreditCard className="w-5 h-5" />, text: "Bank account or debit card" },
  ];

  const onboardingSteps = [
    {
      title: "Email Verification",
      description: "Enter your email to begin. This becomes the email for your Stripe Express dashboard where you'll receive payout notifications.",
      icon: <MdEmail className="text-2xl" />,
    },
    {
      title: "Select Business Type",
      description: 'Choose "Individual." Student clubs and campus organizations typically don\'t have legal business registrations. This option is correct for most clubs and does not make you personally liable.',
      icon: <MdBusiness className="text-2xl" />,
    },
    {
      title: "Personal Information",
      description: "Provide your legal name, date of birth, home address, phone number, and last 4 of SSN. This information is used only for identity verification and compliance with KYC (Know Your Customer) laws.",
      icon: <MdPerson className="text-2xl" />,
    },
    {
      title: "Business Information",
      description: 'Select your industry (recommend "Membership Organization" or "Education"). If you don\'t have a website, describe your club: "We collect membership dues and event payments for a student club."',
      icon: <MdDescription className="text-2xl" />,
    },
    {
      title: "Bank Account Setup",
      description: "Connect your bank using your login credentials or manually enter routing/account numbers. This account will receive payouts from club events and dues directly from Stripe.",
      icon: <MdAccountBalance className="text-2xl" />,
    },
    {
      title: "Statement Descriptor",
      description: 'Set what appears on members\' bank statements. Suggest "Tally Club Payments" or your club\'s exact name. This ensures clarity for your members.',
      icon: <MdCreditCard className="text-2xl" />,
    },
    {
      title: "Return to Tally",
      description: "After completing onboarding, you'll return to Tally where your Stripe account will be connected. You can then create clubs, collect payments, and receive payouts.",
      icon: <MdCheckCircle className="text-2xl" />,
    },
  ];

  return (
    <div className="min-h-screen w-full bg-onyx text-soft-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/icons8-stripe-100.png"
              alt="Stripe"
              width={60}
              height={60}
              className="object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl pb-1 font-bold mb-4 bg-bright-indigo bg-clip-text text-transparent">
            Tally × Stripe Onboarding Guide
          </h1>
          <p className="text-lg md:text-xl text-cool-gray max-w-2xl mx-auto">
            A simple walkthrough to help you understand why Stripe onboarding is required and how to complete it.
          </p>
        </div>

        {/* Why You Need to Onboard */}
        <Card className="mb-8 border-prussian-blue bg-prussian-blue/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Shield className="w-7 h-7 text-mint-leaf" />
              Why You Need to Onboard With Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-cool-gray leading-relaxed">
              Tally uses Stripe as its regulated payment processor. Stripe handles all sensitive financial 
              information — Tally never sees or stores your SSN, date of birth, or bank details.
            </p>
            
            <div className="space-y-3">
              <p className="font-semibold text-soft-white">Onboarding allows your club to:</p>
              <ul className="space-y-2 ml-5">
                <li className="flex items-start gap-2 text-cool-gray">
                  <CheckCircle className="w-5 h-5 text-mint-leaf mt-0.5 shrink-0" />
                  <span>Receive payments from club members</span>
                </li>
                <li className="flex items-start gap-2 text-cool-gray">
                  <CheckCircle className="w-5 h-5 text-mint-leaf mt-0.5 shrink-0" />
                  <span>Issue refunds when needed</span>
                </li>
                <li className="flex items-start gap-2 text-cool-gray">
                  <CheckCircle className="w-5 h-5 text-mint-leaf mt-0.5 shrink-0" />
                  <span>Get payouts directly to your bank account</span>
                </li>
              </ul>
            </div>

            <Alert className="border-mint-leaf/40 bg-mint-leaf/10">
            <div className="flex items-center">
                <Lock className="h-5 w-5 text-mint-leaf" />
                <AlertDescription className="text-soft-white ml-2">
                <strong>Your information is safe.</strong> All financial data is encrypted,
                stored, and verified by Stripe — not by Tally.
                </AlertDescription>
            </div>
            </Alert>
          </CardContent>
        </Card>

        {/* Before You Start */}
        <Card className="mb-8 border-prussian-blue bg-prussian-blue/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <AlertCircle className="w-7 h-7 text-bright-indigo" />
              Before You Start
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-cool-gray mb-4">Have these items ready to complete onboarding smoothly:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {thingsToHave.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-onyx/80 border border-prussian-blue">
                  <div className="text-bright-indigo mt-0.5">{item.icon}</div>
                  <p className="text-sm text-cool-gray">{item.text}</p>
                </div>
              ))}
            </div>
<Alert className="mt-4 border-warning-amber/30 bg-warning-amber/10">
  <div className="flex items-center">
    <AlertDescription className="text-soft-white ml-2">
      <strong>Note:</strong> This is required even for student clubs, because Stripe must verify 
      the individual in control of the account per U.S. financial regulations.
    </AlertDescription>
  </div>
</Alert>

          </CardContent>
        </Card>

        {/* Step-by-Step Flow */}
        <Card className="mb-8 border-prussian-blue bg-prussian-blue/50">
          <CardHeader>
            <CardTitle className="text-2xl">Step-by-Step Onboarding Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {onboardingSteps.map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="shrink-0 w-12 h-12 flex items-center justify-center text-bright-indigo">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-soft-white">
                      Step {idx + 1} — {step.title}
                    </h3>
                    <p className="text-cool-gray leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="mb-8 border-prussian-blue bg-prussian-blue/50">
          <CardHeader>
            <CardTitle className="text-2xl">Common Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div key={idx} className="border border-prussian-blue rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between bg-onyx/50 hover:bg-onyx transition text-left"
                  >
                    <span className="font-semibold text-soft-white">{faq.question}</span>
                    {expandedFaq === idx ? (
                      <ChevronUp className="w-5 h-5 text-cool-gray" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-cool-gray" />
                    )}
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-5 py-4 bg-prussian-blue/30">
                      <p className="text-cool-gray leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Section */}
        <Card className="mb-8 border-mint-leaf/30 bg-linear-to-br from-mint-leaf/10 to-bright-indigo/10">
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold mb-4 text-soft-white">Summary</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-mint-leaf mt-0.5 shrink-0" />
                <span className="text-cool-gray">
                  Stripe onboarding is required to receive payouts from club members.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-mint-leaf mt-0.5 shrink-0" />
                <span className="text-cool-gray">
                  You&apos;ll provide basic identity info and connect a bank account — all handled safely by Stripe.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-mint-leaf mt-0.5 shrink-0" />
                <span className="text-cool-gray">
                  Once completed, your Tally account will be fully enabled for payments.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* CTA Button */}
        <div className="text-center">
          <button
            onClick={handleStartOnboarding}
            disabled={loading}
            className="group inline-flex items-center gap-3 rounded-xl bg-mint-leaf px-10 py-4 text-lg font-semibold text-onyx shadow-[0_0_24px_rgba(52,186,147,0.35)] transition hover:bg-mint-leaf/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-onyx"></div>
                Starting Onboarding...
              </>
            ) : (
              <>
                Start Stripe Onboarding
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
          <p className="mt-4 text-sm text-cool-gray">
            Ready to get started? Click above to begin the secure onboarding process.
          </p>
        </div>
      </div>
    </div>
  );
}

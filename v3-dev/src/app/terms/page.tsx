"use client";
import Image from "next/image";
import Link from "next/link";

export default function TermsAndPrivacyPage() {
  return (
    <div className="min-h-screen bg-onyx text-soft-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-onyx/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-10">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/tally-logo-transparent.png"
              alt="Tally Logo"
              width={96}
              height={96}
              className="h-24 w-24 rounded-xl"
            />
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-cool-gray hover:text-soft-white"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-24">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Terms of Service & Privacy Policy
        </h1>
        <p className="mt-4 text-cool-gray">
          Last updated: November 21, 2025
        </p>

        {/* Terms of Service */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Terms of Service</h2>
          
          <div className="mt-6 space-y-6 text-cool-gray">
            <div>
              <h3 className="text-lg font-medium text-soft-white">1. Acceptance of Terms</h3>
              <p className="mt-2">
                By accessing and using Tally (&quot;the Service&quot;), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">2. Description of Service</h3>
              <p className="mt-2">
                Tally provides a platform for student organizations and clubs to manage dues, track payments, manage rosters, send notifications, and handle financial operations. The Service facilitates payment processing through third-party providers including Stripe.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">3. User Accounts</h3>
              <p className="mt-2">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">4. Payment Processing</h3>
              <p className="mt-2">
                All payment transactions are processed by Stripe, a third-party payment processor. By using our payment features, you agree to Stripe&apos;s terms of service and privacy policy. Tally does not store or have access to your complete payment card information.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">5. User Conduct</h3>
              <p className="mt-2">
                You agree not to use the Service to:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 pl-4">
                <li>Violate any laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful or malicious code</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Engage in fraudulent activities</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">6. Fees and Payments</h3>
              <p className="mt-2">
                Certain features of the Service may require payment. All fees are non-refundable unless otherwise stated. We reserve the right to modify our pricing at any time with reasonable notice.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">7. Termination</h3>
              <p className="mt-2">
                We reserve the right to suspend or terminate your account at any time for violations of these terms or for any other reason at our sole discretion.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">8. Disclaimer of Warranties</h3>
              <p className="mt-2">
                The Service is provided &quot;as is&quot; without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">9. Limitation of Liability</h3>
              <p className="mt-2">
                Tally shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Policy */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold">Privacy Policy</h2>
          
          <div className="mt-6 space-y-6 text-cool-gray">
            <div>
              <h3 className="text-lg font-medium text-soft-white">1. Information We Collect</h3>
              <p className="mt-2">
                We collect information you provide directly to us, including:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 pl-4">
                <li>Name, email address, and phone number</li>
                <li>University or organization affiliation</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Club membership and attendance data</li>
                <li>Communications and correspondence</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">2. How We Use Your Information</h3>
              <p className="mt-2">
                We use the information we collect to:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 pl-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process payments and transactions</li>
                <li>Send notifications and reminders</li>
                <li>Communicate with you about the Service</li>
                <li>Monitor and analyze usage patterns</li>
                <li>Detect and prevent fraud or abuse</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">3. Information Sharing</h3>
              <p className="mt-2">
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 pl-4">
                <li>Service providers who assist in operating the Service (e.g., Stripe for payments)</li>
                <li>Other members of your organization as necessary for club operations</li>
                <li>Law enforcement when required by law</li>
              </ul>
              <p className="mt-4 font-medium">
                All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">4. Data Security</h3>
              <p className="mt-2">
                We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet is 100% secure.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">5. Payment Information</h3>
              <p className="mt-2">
                Payment card information is processed directly by Stripe and is never stored on our servers. We follow PCI-DSS best practices for handling payment data.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">6. Cookies and Tracking</h3>
              <p className="mt-2">
                We use cookies and similar tracking technologies to enhance your experience, analyze usage, and provide personalized features. You can control cookie preferences through your browser settings.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">7. Your Rights</h3>
              <p className="mt-2">
                You have the right to:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 pl-4">
                <li>Access and update your personal information</li>
                <li>Request deletion of your data</li>
                <li>Opt out of marketing communications</li>
                <li>Export your data</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">8. Data Retention</h3>
              <p className="mt-2">
                We retain your information for as long as necessary to provide the Service and comply with legal obligations. You may request deletion of your account at any time.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">9. Children&apos;s Privacy</h3>
              <p className="mt-2">
                Our Service is intended for users who are at least 13 years old. We do not knowingly collect information from children under 13.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-soft-white">10. Changes to This Policy</h3>
              <p className="mt-2">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
              </p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p className="mt-4 text-cool-gray">
            If you have any questions about these Terms of Service or our Privacy Policy, please contact us at:
          </p>
          <a 
            href="mailto:tallyappv1@gmail.com"
            className="mt-2 inline-block text-bright-indigo hover:text-bright-indigo/80"
          >
            tallyappv1@gmail.com
          </a>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-cool-gray md:px-10">
          <p>© {new Date().getFullYear()} Tally. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

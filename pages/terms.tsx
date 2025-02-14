import React from 'react';

const TermsPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8 text-white">Terms of Service</h1>

      <div className="space-y-8 text-neutral-300">
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">1. Age Requirements</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>You certify that you are at least 18 years old (or the age of majority in your jurisdiction)</li>
            <li>By accessing TotalToons34, you confirm you are legally an adult</li>
            <li>You are responsible for ensuring you meet age requirements for adult content in your jurisdiction</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">2. Subscription Terms</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Access to content requires an active monthly subscription</li>
            <li>Subscription fees are billed monthly in advance</li>
            <li>Subscription auto-renews unless cancelled at least 24 hours before the renewal date</li>
            <li>No refunds for partial subscription periods</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">3. User Conduct</h2>
          <p className="mb-2">You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Share your account credentials</li>
            <li>Download, copy, or redistribute content</li>
            <li>Use automated systems to access content</li>
            <li>Circumvent any technical measures</li>
            <li>Harass other users or staff</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">4. Content Policies</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>All content is intended for adult viewing only</li>
            <li>Content may not be reproduced or distributed</li>
            <li>We reserve the right to remove content at any time</li>
            <li>Users must report any inappropriate or illegal content</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">5. Termination</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>We may terminate accounts for Terms of Service violations</li>
            <li>Users may cancel subscription at any time</li>
            <li>No refunds for termination due to violations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">6. Contact Information</h2>
          <p>Email: totaltoons34@gmail.com<br />
          Support: totaltoons34@gmail.com</p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
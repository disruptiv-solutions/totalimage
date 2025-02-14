import React from 'react';

const PrivacyPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8 text-white">Privacy Policy</h1>

      <div className="space-y-8 text-neutral-300">
        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
          <p className="mb-4">TotalToons34 ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-medium text-white mb-2">2.1 Information You Provide</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Email address</li>
                <li>Payment information (processed through Stripe)</li>
                <li>Account preferences</li>
                <li>Communication with our support team</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium text-white mb-2">2.2 Automatically Collected Information</h3>
              <p className="mb-2">Through Firebase, we collect:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>IP address</li>
                <li>Browser type</li>
                <li>Device information</li>
                <li>Access times and dates</li>
                <li>Pages viewed</li>
                <li>User interaction data</li>
                <li>Authentication information</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Process your payments</li>
            <li>Provide customer support</li>
            <li>Send service updates</li>
            <li>Maintain account security</li>
            <li>Analyze service usage</li>
            <li>Prevent fraud and abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">4. Data Storage and Security</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-medium text-white mb-2">4.1 Firebase</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>User data is stored on Google Firebase servers</li>
                <li>Protected by industry-standard security measures</li>
                <li>Subject to Google Firebase's security protocols</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-medium text-white mb-2">4.2 Stripe</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Payment information is processed and stored by Stripe</li>
                <li>Protected by PCI-DSS compliance standards</li>
                <li>Subject to Stripe's security measures</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-4">5. Contact Us</h2>
          <p>For privacy-related inquiries:<br />
          Email: totaltoons34@gmail.com</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPage;
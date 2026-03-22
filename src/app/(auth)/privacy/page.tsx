export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <div className="prose prose-neutral dark:prose-invert space-y-6">
        <p><strong>Last updated:</strong> March 2026</p>

        <h2 className="text-xl font-semibold mt-6">1. Data We Collect</h2>
        <p>We collect the minimum data needed to provide Codepylot:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Account data:</strong> Name, email, and profile picture from your OAuth provider (GitHub or Google)</li>
          <li><strong>Project data:</strong> Projects, stories, sprints, and acceptance criteria you create</li>
          <li><strong>Usage data:</strong> Activity logs of actions taken within the app (story creation, status changes, etc.)</li>
          <li><strong>Payment data:</strong> Processed by Paddle. We store only your customer ID and subscription status.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">2. How We Use Your Data</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>To provide and improve the Codepylot service</li>
          <li>To process payments and manage subscriptions</li>
          <li>To send service-related notifications</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">3. Third-Party Services</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Paddle</strong> for payment processing</li>
          <li><strong>Sentry</strong> for error monitoring (anonymous crash reports)</li>
          <li><strong>GitHub/Google</strong> for authentication</li>
          <li><strong>Anthropic/Ollama</strong> for AI story rewriting (story text is sent to the configured AI provider)</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">4. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active. When you delete your account, we soft-delete your
          personal information and anonymize your activity logs. Project data associated with other members remains
          intact.
        </p>

        <h2 className="text-xl font-semibold mt-6">5. Your Rights</h2>
        <p>Under GDPR and similar regulations, you have the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Access</strong> your data (Settings &rarr; Export Data)</li>
          <li><strong>Delete</strong> your account and data (Settings &rarr; Delete Account)</li>
          <li><strong>Portability</strong> — export your data as JSON</li>
          <li><strong>Rectification</strong> — update your profile through your OAuth provider</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">6. Contact</h2>
        <p>For privacy inquiries, contact us at privacy@codepylot.dev.</p>
      </div>
    </div>
  );
}

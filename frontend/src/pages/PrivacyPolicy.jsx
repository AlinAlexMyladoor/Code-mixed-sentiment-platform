import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const EFFECTIVE_DATE = 'August 14, 2025';
const CONTACT_EMAIL = 'privacy@swarasense.ai';

export default function PrivacyPolicy() {
  const section = (title, children) => (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{
        fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)',
        marginBottom: 10, paddingBottom: 8,
        borderBottom: '1px solid var(--border)',
      }}>{title}</h2>
      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.85 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 760, width: '100%', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>SwaraSense</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sentiment Intelligence Platform</div>
          </div>
        </div>

        <h1 style={{
          fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)',
          marginBottom: 8,
        }}>Privacy Policy</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Effective Date: {EFFECTIVE_DATE}
        </p>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: 760, width: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: '36px 40px',
        boxShadow: 'var(--shadow-md)',
      }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.85, marginBottom: 32 }}>
          SwaraSense ("we", "our", or "us") is a code-mixed sentiment intelligence platform that helps businesses
          understand audience sentiment from social media comments. This Privacy Policy explains how we collect,
          use, and protect information when you use our platform.
        </p>

        {section('1. Information We Collect', <>
          <p><strong style={{ color: 'var(--text-primary)' }}>Social Media Comment Data:</strong> When you connect your Facebook Page or Instagram Business Account, SwaraSense receives comment text and associated metadata (e.g., comment ID, page ID) through the Meta Webhooks API. This data is used exclusively for sentiment analysis.</p>
          <p style={{ marginTop: 10 }}><strong style={{ color: 'var(--text-primary)' }}>Account Information:</strong> When you register for SwaraSense, we collect your email address and a hashed password. We do not store plaintext passwords.</p>
          <p style={{ marginTop: 10 }}><strong style={{ color: 'var(--text-primary)' }}>OAuth Tokens:</strong> Page access tokens obtained through Meta's OAuth flow are stored securely and used solely to subscribe and manage webhooks on your behalf.</p>
          <p style={{ marginTop: 10 }}><strong style={{ color: 'var(--text-primary)' }}>Usage Data:</strong> We may log anonymised platform usage data (e.g., API request counts) to monitor service health. No personally identifiable information is included in these logs.</p>
        </>)}

        {section('2. How We Use Your Data', <>
          <p>We use the data we collect for the following purposes:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}>To perform real-time sentiment analysis on social media comments from your connected pages.</li>
            <li style={{ marginBottom: 6 }}>To generate analytics dashboards, trend reports, and entity insights for your business.</li>
            <li style={{ marginBottom: 6 }}>To manage your connected Meta pages and maintain webhook subscriptions.</li>
            <li style={{ marginBottom: 6 }}>To authenticate and secure your account.</li>
            <li>To maintain platform reliability and troubleshoot service issues.</li>
          </ul>
          <p style={{ marginTop: 10 }}>We do <strong style={{ color: 'var(--text-primary)' }}>not</strong> use your data for advertising, profiling, or any purposes unrelated to the sentiment intelligence service you have requested.</p>
        </>)}

        {section('3. Data Sharing and Third Parties', <>
          <p>We do not sell, rent, or share your personal data or your users' comment data with any third parties for commercial purposes.</p>
          <p style={{ marginTop: 10 }}>We use the following sub-processors to operate the platform:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>Render.com</strong> — Cloud infrastructure hosting (United States).</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>Meta Platforms (via API)</strong> — Source of webhook comment events.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>PostgreSQL / Redis</strong> — Managed data storage for processed and queued data.</li>
          </ul>
          <p style={{ marginTop: 10 }}>All sub-processors are contractually bound to process data only as instructed and in compliance with applicable data protection law.</p>
        </>)}

        {section('4. Meta Platform Data Policy Compliance', <>
          <p>SwaraSense accesses social media data through the Meta Graph API under the following conditions:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}>We only request permissions necessary for sentiment analysis: <code style={{ fontSize: '0.8rem', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '1px 5px', borderRadius: 4 }}>pages_read_engagement</code>, <code style={{ fontSize: '0.8rem', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '1px 5px', borderRadius: 4 }}>pages_manage_metadata</code>, and <code style={{ fontSize: '0.8rem', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '1px 5px', borderRadius: 4 }}>instagram_manage_comments</code>.</li>
            <li style={{ marginBottom: 6 }}>Comment data obtained from Meta is used solely to provide analytical insights to the page administrator who authorised the connection.</li>
            <li>We comply with Meta's Platform Terms and Developer Policies. Data obtained via the API is not repurposed, sold, or shared outside the context of this service.</li>
          </ul>
        </>)}

        {section('5. Data Retention', <>
          <p>Processed comment data (sentiment scores, extracted entities, classification results) is retained in our database for as long as you maintain an active account. Raw webhook payloads may be archived for up to 30 days for audit and re-processing purposes.</p>
          <p style={{ marginTop: 10 }}>You may request deletion of all data associated with your account at any time by contacting us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent-1)' }}>{CONTACT_EMAIL}</a>.</p>
        </>)}

        {section('6. Data Security', <>
          <p>We implement industry-standard security measures to protect your data:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}>All data in transit is encrypted using TLS 1.2 or higher.</li>
            <li style={{ marginBottom: 6 }}>Passwords are hashed using bcrypt before storage.</li>
            <li style={{ marginBottom: 6 }}>API endpoints are protected by JWT-based authentication and rate limiting.</li>
            <li>Access tokens for Meta pages are stored securely and never exposed in client-side code.</li>
          </ul>
        </>)}

        {section('7. Your Rights', <>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>Access</strong> — Request a copy of the personal data we hold about you.</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>Rectification</strong> — Request correction of inaccurate data.</li>
            <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text-primary)' }}>Erasure</strong> — Request deletion of your account and associated data.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Portability</strong> — Request your data in a machine-readable format.</li>
          </ul>
          <p style={{ marginTop: 10 }}>To exercise any of these rights, please contact <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent-1)' }}>{CONTACT_EMAIL}</a>.</p>
        </>)}

        {section('8. Cookies', <>
          <p>SwaraSense does not use tracking cookies or third-party analytics cookies. Authentication state is maintained using access tokens stored in your browser's local storage for session continuity only.</p>
        </>)}

        {section('9. Changes to This Policy', <>
          <p>We may update this Privacy Policy from time to time. When we do, we will update the effective date at the top of this page. We encourage you to review this policy periodically. Continued use of SwaraSense after changes constitutes acceptance of the revised policy.</p>
        </>)}

        {section('10. Contact Us', <>
          <p>If you have any questions about this Privacy Policy or how we handle your data, please contact us at:</p>
          <p style={{ marginTop: 10 }}>
            <strong style={{ color: 'var(--text-primary)' }}>SwaraSense Privacy Team</strong><br />
            Email: <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent-1)' }}>{CONTACT_EMAIL}</a>
          </p>
        </>)}
      </div>

      {/* Footer */}
      <div style={{ maxWidth: 760, width: '100%', marginTop: 24, textAlign: 'center' }}>
        <Link to="/" style={{ fontSize: '0.82rem', color: 'var(--accent-1)', textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 20 }}>
          © 2025 SwaraSense. All rights reserved.
        </span>
      </div>
    </div>
  );
}

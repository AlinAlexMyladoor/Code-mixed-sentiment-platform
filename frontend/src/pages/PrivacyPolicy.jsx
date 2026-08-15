import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Mail, Trash2 } from 'lucide-react';

const EFFECTIVE_DATE = 'August 15, 2025';
const CONTACT_EMAIL = 'privacy@swarasense.ai';

const CODE = ({ children }) => (
  <code style={{
    fontSize: '0.8rem', background: 'rgba(99,102,241,0.12)',
    color: '#a5b4fc', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace',
  }}>
    {children}
  </code>
);

const S = ({ children }) => (
  <strong style={{ color: 'var(--text-primary)' }}>{children}</strong>
);

const HighlightBox = ({ color = '#6366f1', icon: Icon, title, children }) => (
  <div style={{
    background: `${color}12`,
    border: `1px solid ${color}35`,
    borderRadius: 12, padding: '16px 20px', marginTop: 14,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      {Icon && <Icon size={16} color={color} />}
      <span style={{ fontWeight: 700, color, fontSize: '0.88rem' }}>{title}</span>
    </div>
    <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
      {children}
    </div>
  </div>
);

export default function PrivacyPolicy() {
  const section = (num, title, children) => (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{
        fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)',
        marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: 6, background: 'rgba(99,102,241,0.15)',
          color: '#a5b4fc', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0,
        }}>{num}</span>
        {title}
      </h2>
      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.9 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 20px',
    }}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 780, width: '100%', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 6, flexShrink: 0,
            boxShadow: '0 2px 16px rgba(99,102,241,0.3)',
          }}>
            <img src="/logo.png" alt="SwaraSense" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>SwaraSense</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sentiment Intelligence Platform</div>
          </div>
        </div>

        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
          Effective Date: {EFFECTIVE_DATE} &nbsp;·&nbsp; Applies to all users and connected Facebook/Instagram accounts
        </p>
      </div>

      {/* ── Content card ─────────────────────────────────────────────── */}
      <div style={{
        maxWidth: 780, width: '100%',
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)', padding: '40px 44px', boxShadow: 'var(--shadow-md)',
      }}>

        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.9, marginBottom: 36 }}>
          SwaraSense ("we", "our", or "us") is a code-mixed social media sentiment intelligence platform.
          We help page administrators understand the sentiment of comments their Facebook Pages and Instagram
          Business accounts receive. This Privacy Policy describes exactly what Facebook user data we access,
          why we access it, and how you can request deletion of any data we hold.
        </p>

        {/* ── 1. What Facebook Data We Access ─────────────────────────── */}
        {section('1', 'What Facebook User Data We Access', <>
          <p>
            When you authorise SwaraSense by connecting your Facebook Page via Meta's OAuth flow, we receive
            data <S>exclusively through the Meta Webhooks API</S> and the <S>Meta Graph API</S>. We do not
            scrape public Facebook profiles or access any data beyond what you explicitly grant.
          </p>
          <p style={{ marginTop: 12 }}>The following specific data fields are received from Facebook:</p>

          <table style={{
            width: '100%', borderCollapse: 'collapse', marginTop: 14,
            fontSize: '0.83rem', borderRadius: 10, overflow: 'hidden',
          }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.12)' }}>
                {['Data Field', 'Source', 'Why We Need It'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontWeight: 700,
                    color: 'var(--text-primary)', borderBottom: '1px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Comment text (<code>message</code> / <code>text</code>)', 'Webhook event', 'The comment body that is analysed for sentiment'],
                ['Comment ID (<code>comment_id</code> / <code>id</code>)', 'Webhook event', 'To deduplicate and reference individual comments'],
                ['Parent Comment ID (<code>parent_id</code>)', 'Webhook event', 'To identify whether the comment is a reply thread'],
                ['Page ID (<code>entry[].id</code>)', 'Webhook event', 'To attribute comments to the correct connected page'],
                ['Page Access Token', 'OAuth callback', 'To maintain the webhook subscription on your behalf'],
                ['Page Name, Category, Follower Count', 'Graph API <code>/me/accounts</code>', 'To display your connected page in the dashboard'],
              ].map(([field, source, reason], i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}
                    dangerouslySetInnerHTML={{ __html: field }} />
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}
                    dangerouslySetInnerHTML={{ __html: source }} />
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <HighlightBox color="#22c55e" icon={CheckCircle} title="What we do NOT collect">
            We do not access Facebook user profile data, names, photos, friend lists, message inboxes,
            email addresses, phone numbers, location data, or any data from users who comment on your page.
            We only receive the comment text and its platform identifiers.
          </HighlightBox>
        </>)}

        {/* ── 2. Purpose of Processing ─────────────────────────────────── */}
        {section('2', 'Purpose of Processing — Sentiment Analysis Only', <>
          <p>
            <S>The sole purpose for which SwaraSense processes Facebook data is automated sentiment analysis.</S>
          </p>
          <p style={{ marginTop: 10 }}>Specifically, we use your connected page's comment data to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 22 }}>
            <li style={{ marginBottom: 8 }}>
              Classify each comment into one of four sentiment categories:
              <S> positive</S>, <S> negative</S>, <S> neutral</S>, or <S> sarcastic</S>.
            </li>
            <li style={{ marginBottom: 8 }}>
              Detect code-mixed language patterns across Tamil-English, Malayalam-English,
              Hindi-English, and Bengali-English Romanized text.
            </li>
            <li style={{ marginBottom: 8 }}>
              Calculate sociolinguistic metrics such as English ratio and language-switch frequency.
            </li>
            <li style={{ marginBottom: 8 }}>
              Extract named entities and brand mentions from comment text.
            </li>
            <li>
              Present aggregated analytics (trend charts, sentiment breakdowns, urgent alert counts)
              to the page administrator on their dashboard.
            </li>
          </ul>

          <HighlightBox color="#f59e0b" icon={AlertTriangle} title="We do not use this data for">
            Advertising targeting · User profiling · Resale to third parties · Training public AI models ·
            Any purpose other than providing the sentiment analytics service to the page administrator
            who granted access.
          </HighlightBox>
        </>)}

        {/* ── 3. Legal Basis ───────────────────────────────────────────── */}
        {section('3', 'Legal Basis for Processing', <>
          <p>
            We process Facebook page comment data under the following legal bases:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 22 }}>
            <li style={{ marginBottom: 8 }}>
              <S>Consent:</S> The page administrator explicitly authorises SwaraSense via Meta's standard
              OAuth consent screen, granting us access to their page's webhook events.
            </li>
            <li style={{ marginBottom: 8 }}>
              <S>Legitimate Interests:</S> Processing comment metadata (IDs, page IDs) to deduplicate
              records and maintain service reliability.
            </li>
            <li>
              <S>Contractual Necessity:</S> Storing page access tokens to fulfil the webhook subscription
              service the administrator has requested.
            </li>
          </ul>
        </>)}

        {/* ── 4. Data Retention ────────────────────────────────────────── */}
        {section('4', 'Data Retention', <>
          <p>We retain different categories of data for different periods:</p>
          <ul style={{ marginTop: 8, paddingLeft: 22 }}>
            <li style={{ marginBottom: 8 }}>
              <S>Processed sentiment results</S> (sentiment class, confidence scores, language metrics):
              Retained for the lifetime of the administrator's active account.
            </li>
            <li style={{ marginBottom: 8 }}>
              <S>Raw webhook payloads</S>: Archived for a maximum of 30 days, then automatically purged.
            </li>
            <li style={{ marginBottom: 8 }}>
              <S>Page access tokens</S>: Retained for as long as the page is connected. Revoked and deleted
              immediately when the administrator disconnects the page.
            </li>
            <li>
              <S>Administrator account data</S> (email, hashed password): Retained until the account is
              deleted by request.
            </li>
          </ul>
        </>)}

        {/* ── 5. Data Deletion — PRIMARY REQUIRED SECTION ──────────────── */}
        {section('5', 'How to Request Deletion of Your Data', <>
          <p>
            <S>You have the right to request deletion of all data SwaraSense holds that is associated with
            your Facebook Page or your administrator account.</S> We will process all deletion requests
            within <S>72 hours</S>.
          </p>

          <HighlightBox color="#6366f1" icon={Trash2} title="Step-by-step: Request your data deletion">
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              <li style={{ marginBottom: 10 }}>
                <S>Send an email</S> to{' '}
                <a href={`mailto:${CONTACT_EMAIL}?subject=Data Deletion Request&body=I request deletion of all data associated with my SwaraSense account and/or my Facebook Page ID: [YOUR PAGE ID].`}
                  style={{ color: '#a5b4fc' }}>
                  {CONTACT_EMAIL}
                </a>{' '}
                with the subject line: <CODE>Data Deletion Request</CODE>
              </li>
              <li style={{ marginBottom: 10 }}>
                In the body of your email, include <S>at least one</S> of the following:
                <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                  <li>Your SwaraSense account email address, <S>or</S></li>
                  <li>Your Facebook Page ID (visible in your Meta Business Suite URL or Page settings)</li>
                </ul>
              </li>
              <li style={{ marginBottom: 10 }}>
                We will acknowledge your request within <S>24 hours</S> and send a confirmation
                once all associated data has been permanently deleted.
              </li>
              <li>
                Deletion includes: all processed comment records, sentiment analysis results, stored
                page access tokens, raw webhook archives, and your administrator account (if requested).
              </li>
            </ol>
          </HighlightBox>

          <p style={{ marginTop: 14 }}>
            If you connected your Facebook Page and wish to revoke SwaraSense's access immediately,
            you can also do so directly in Facebook without contacting us:
          </p>
          <ol style={{ marginTop: 8, paddingLeft: 22 }}>
            <li style={{ marginBottom: 6 }}>
              Go to <S>Facebook Settings</S> → <S>Security and Login</S> → <S>Apps and Websites</S>.
            </li>
            <li style={{ marginBottom: 6 }}>
              Find <S>SwaraSense</S> in the list of connected apps and click <S>Remove</S>.
            </li>
            <li>
              This revokes our access token immediately. Please also email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent-1)' }}>{CONTACT_EMAIL}</a>{' '}
              so we can purge your stored data from our servers.
            </li>
          </ol>
        </>)}

        {/* ── 6. Meta Platform Policy Compliance ──────────────────────── */}
        {section('6', 'Meta Platform Data Policy Compliance', <>
          <p>SwaraSense is built on the Meta Graph API and operates in compliance with Meta's Platform Terms:</p>
          <ul style={{ marginTop: 8, paddingLeft: 22 }}>
            <li style={{ marginBottom: 8 }}>
              We request only the minimum permissions required:
              {' '}<CODE>pages_read_engagement</CODE>, <CODE>pages_manage_metadata</CODE>,
              and <CODE>instagram_manage_comments</CODE>.
            </li>
            <li style={{ marginBottom: 8 }}>
              Data received via the Meta API is used solely to provide the sentiment analytics service
              to the page administrator who authorised the connection.
            </li>
            <li style={{ marginBottom: 8 }}>
              We do not transfer, sell, or share Meta platform data with any third party for advertising
              or unrelated commercial purposes.
            </li>
            <li>
              We comply with Meta's{' '}
              <a href="https://developers.facebook.com/terms/" target="_blank" rel="noreferrer"
                style={{ color: 'var(--accent-1)' }}>
                Platform Terms
              </a>{' '}
              and{' '}
              <a href="https://developers.facebook.com/devpolicy/" target="_blank" rel="noreferrer"
                style={{ color: 'var(--accent-1)' }}>
                Developer Policies
              </a>.
            </li>
          </ul>
        </>)}

        {/* ── 7. Data Security ─────────────────────────────────────────── */}
        {section('7', 'Data Security', <>
          <ul style={{ paddingLeft: 22, margin: 0 }}>
            <li style={{ marginBottom: 8 }}>All data in transit is encrypted using TLS 1.2 or higher.</li>
            <li style={{ marginBottom: 8 }}>Passwords are hashed using bcrypt — plaintext passwords are never stored.</li>
            <li style={{ marginBottom: 8 }}>API access is protected by JWT tokens with short expiry windows and rate limiting.</li>
            <li>Page access tokens are stored server-side only and never exposed to client-side code or browser storage.</li>
          </ul>
        </>)}

        {/* ── 8. Third-Party Data Sharing ──────────────────────────────── */}
        {section('8', 'Third-Party Data Sharing', <>
          <p>
            We do not sell or share Facebook user data with any third party. We use the following
            infrastructure sub-processors solely to operate the platform:
          </p>
          <ul style={{ marginTop: 8, paddingLeft: 22 }}>
            <li style={{ marginBottom: 6 }}><S>Render.com</S> — Cloud hosting (United States). Data is processed and stored on Render's infrastructure.</li>
            <li style={{ marginBottom: 6 }}><S>PostgreSQL (managed)</S> — Stores processed sentiment records and page configuration.</li>
            <li><S>Redis (managed)</S> — Temporary queue buffer for real-time webhook processing. Data is not persisted in Redis beyond processing.</li>
          </ul>
        </>)}

        {/* ── 9. Your Rights ───────────────────────────────────────────── */}
        {section('9', 'Your Rights', <>
          <p>You have the right to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 22 }}>
            <li style={{ marginBottom: 6 }}><S>Access</S> — Request a copy of all data we hold associated with your account or page.</li>
            <li style={{ marginBottom: 6 }}><S>Rectification</S> — Request correction of any inaccurate data.</li>
            <li style={{ marginBottom: 6 }}><S>Erasure ("Right to be Forgotten")</S> — Request permanent deletion of all your data. See Section 5 for the exact process.</li>
            <li style={{ marginBottom: 6 }}><S>Restriction</S> — Request that we stop processing your data while a dispute is resolved.</li>
            <li><S>Portability</S> — Request your data in a structured, machine-readable format (JSON/CSV).</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            To exercise any right, contact <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--accent-1)' }}>{CONTACT_EMAIL}</a>.
          </p>
        </>)}

        {/* ── 10. Changes to This Policy ───────────────────────────────── */}
        {section('10', 'Changes to This Policy', <>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be communicated
            by updating the Effective Date above. Continued use of SwaraSense after changes are posted
            constitutes acceptance of the revised policy.
          </p>
        </>)}

        {/* ── 11. Contact ──────────────────────────────────────────────── */}
        {section('11', 'Contact Us', <>
          <p>For any privacy-related questions, data requests, or concerns:</p>
          <div style={{
            marginTop: 14, padding: '16px 20px', borderRadius: 12,
            background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'flex-start', gap: 14,
          }}>
            <Mail size={18} color="var(--accent-1)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>SwaraSense Privacy Team</div>
              <a href={`mailto:${CONTACT_EMAIL}?subject=Privacy Inquiry`}
                style={{ color: 'var(--accent-1)', fontSize: '0.9rem' }}>
                {CONTACT_EMAIL}
              </a>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>
                We respond to all privacy inquiries within 48 hours. Data deletion requests are processed within 72 hours.
              </div>
            </div>
          </div>
        </>)}

      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 780, width: '100%', marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Link to="/" style={{ fontSize: '0.82rem', color: 'var(--accent-1)', textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          © 2025 SwaraSense. All rights reserved.
        </span>
      </div>

    </div>
  );
}

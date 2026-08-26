import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Link2, MessageSquare, Brain, ArrowRight, Zap } from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: Link2,
    title: 'Connect a Page',
    desc: 'Link your Facebook Business Page via Meta OAuth to start receiving live comment webhooks.',
    color: '#0d9488',
    bg: 'rgba(13,148,136,0.08)',
  },
  {
    num: '02',
    icon: MessageSquare,
    title: 'Receive Comments',
    desc: 'Every code-mixed comment is processed in real-time through the PII-safe NLP pipeline.',
    color: '#0891b2',
    bg: 'rgba(8,145,178,0.08)',
  },
  {
    num: '03',
    icon: Brain,
    title: 'Get AI Insights',
    desc: 'Sentiment, sarcasm, aspect detection, and urgent alerts — all on a single dashboard.',
    color: '#4f46e5',
    bg: 'rgba(79,70,229,0.08)',
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

/**
 * Full-page onboarding hero displayed when the dashboard is empty
 * (no connected pages AND no processed comments).
 */
export default function Onboarding() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 300,
        background: 'radial-gradient(ellipse at center, rgba(13,148,136,0.10) 0%, rgba(79,70,229,0.06) 50%, transparent 75%)',
        filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0,
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ position: 'relative', zIndex: 1, maxWidth: 680 }}
      >
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.18)',
          borderRadius: 20, padding: '5px 14px', marginBottom: 20,
          fontSize: '0.68rem', fontWeight: 700, color: '#0d9488',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <Zap size={12} strokeWidth={1.5} /> Getting Started
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.2rem', fontWeight: 800,
          letterSpacing: '-0.03em', lineHeight: 1.2,
          color: 'var(--text-primary)', marginBottom: 12,
        }}>
          Welcome to <span className="gradient-text">SwaraSense</span>
        </h1>

        <p style={{
          fontSize: '0.95rem', color: 'var(--text-muted)',
          maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.65,
        }}>
          Your AI-powered sentiment intelligence platform for code-mixed social media.
          Connect a page to start monitoring in real time.
        </p>
      </motion.div>

      {/* 3-step cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18, maxWidth: 780, width: '100%',
          position: 'relative', zIndex: 1,
        }}
      >
        {steps.map((step) => (
          <motion.div
            key={step.num}
            variants={itemVariants}
            style={{
              background: '#fff', borderRadius: 16,
              border: '1px solid var(--border-mid)',
              padding: '28px 22px', textAlign: 'left',
              boxShadow: 'var(--shadow-card)',
              transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease',
              cursor: 'default',
            }}
            whileHover={{ y: -4, scale: 1.015 }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: step.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <step.icon size={18} color={step.color} strokeWidth={1.5} />
              </div>
              <span style={{
                fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-muted)',
                letterSpacing: '0.10em',
              }}>
                STEP {step.num}
              </span>
            </div>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem', fontWeight: 700,
              color: 'var(--text-primary)', marginBottom: 6,
            }}>
              {step.title}
            </h3>
            <p style={{
              fontSize: '0.78rem', color: 'var(--text-muted)',
              lineHeight: 1.55, margin: 0,
            }}>
              {step.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        style={{ marginTop: 36, position: 'relative', zIndex: 1 }}
      >
        <Link to="/connect" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '0.92rem' }}>
          Connect Your First Page <ArrowRight size={16} strokeWidth={1.5} style={{ marginLeft: 4 }} />
        </Link>
      </motion.div>
    </div>
  );
}

import { Star, TrendingUp, Clock, Send, CheckCircle2 } from 'lucide-react';

function pct(v) {
  if (v == null) return null;
  return `${Math.round(v * 100)}%`;
}

function ratingTone(r) {
  if (r == null) return 'gray';
  if (r >= 8) return 'green';
  if (r >= 6) return 'yellow';
  return 'red';
}

export default function ScoringTab({ creator, scores }) {
  return (
    <div className="scoring-tab">
      <section className="scoring-summary">
        <div className={`scoring-rating tone-${ratingTone(scores.overallRating)}`}>
          <div className="scoring-rating-num">
            {scores.overallRating != null ? scores.overallRating.toFixed(1) : '—'}
            <span className="scoring-rating-out">/ 10</span>
          </div>
          <div className="scoring-rating-label">Overall rating</div>
          <div className="muted small">
            {scores.overallRating != null
              ? `Average across ${scores.campaignsAccepted} rated campaign${scores.campaignsAccepted === 1 ? '' : 's'}`
              : 'No ratings yet'}
          </div>
        </div>
      </section>

      <section className="scoring-grid">
        <Metric
          icon={<Send size={14} />}
          label="Campaign acceptance"
          value={pct(scores.acceptanceRate)}
          sub={scores.campaignsAssigned > 0
            ? `${scores.campaignsAccepted} accepted of ${scores.campaignsAssigned} assigned`
            : 'No campaign assignments yet'}
        />
        <Metric
          icon={<CheckCircle2 size={14} />}
          label="Post compliance"
          value={pct(scores.postCompliance)}
          sub="Posted on time vs. agreed terms"
        />
        <Metric
          icon={<Clock size={14} />}
          label="Responsiveness"
          value={scores.responsivenessDays != null
            ? `${scores.responsivenessDays}d to first reply`
            : null}
          sub="Days from invite to first action"
        />
        <Metric
          icon={<TrendingUp size={14} />}
          label="Onboarding speed"
          value={scores.onboardingSpeed != null
            ? `${scores.onboardingSpeed}d from invite`
            : null}
          sub="Days to complete onboarding"
        />
      </section>

      <section className="scoring-section">
        <h3>What this score is based on</h3>
        <ul className="scoring-explainer">
          <li>Campaign ratings recorded by ops after each completed campaign (1-10 scale)</li>
          <li>Whether content was delivered as agreed and on time</li>
          <li>Time from invite to first action signals (viewed, started, accepted, declined)</li>
          <li>Speed of completing portal onboarding after initial invite</li>
        </ul>
        <p className="muted small">
          Slow responders are auto-deprioritized in roster sorting. Manual rating override is always available
          for exceptional cases.
        </p>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, sub }) {
  return (
    <div className="scoring-metric">
      <div className="scoring-metric-label">{icon} {label}</div>
      <div className="scoring-metric-value">{value ?? <span className="muted">—</span>}</div>
      <div className="muted small">{sub}</div>
    </div>
  );
}

import { useMemo } from 'react';
import {
  Star, Clock, Send, CheckCircle2, TrendingUp, AlertCircle, Info,
} from 'lucide-react';
import { useEventStore } from '../../../store/useEventStore.jsx';
import {
  selectQualityRatings, selectScoreEvents, overallScoreColor,
} from '../../../domain/selectors.js';
import RelativeTime from '../../../components/RelativeTime.jsx';
import { EVENT_TYPES as E } from '../../../domain/events.js';

function pct(v) {
  if (v == null) return null;
  return `${Math.round(v * 100)}%`;
}

const SCORE_EVENT_LABEL = {
  [E.PORTAL_INVITE_SENT]: 'Portal invite sent',
  [E.PORTAL_INVITE_VIEWED]: 'Invite viewed',
  [E.ONBOARDING_COMPLETED]: 'Onboarding completed',
  [E.ONBOARDING_PARTIAL]: 'Onboarding partial',
  [E.CAMPAIGN_ACCEPTED]: 'Campaign accepted',
  [E.CAMPAIGN_DECLINED]: 'Campaign declined',
  [E.CAMPAIGN_RATED]: 'Rating added',
  [E.POST_COMPLIANCE_LOGGED]: 'Post compliance',
};

export default function ScoringTab({ creator, scores }) {
  const { events, campaigns } = useEventStore();
  const ratings = useMemo(() => selectQualityRatings(events, creator.id, campaigns), [events, creator.id, campaigns]);
  const scoreLog = useMemo(() => selectScoreEvents(events, creator.id, 6), [events, creator.id]);

  const overallColor = overallScoreColor(scores.overall);

  return (
    <div className="scoring-tab">
      {/* ─── OVERALL ─── */}
      <section className={`scoring-overall tone-${overallColor}`}>
        <div className="scoring-overall-num">
          {scores.overall != null ? scores.overall.toFixed(1) : '—'}
          <span className="scoring-overall-out">/ 10</span>
        </div>
        <div className="scoring-overall-meta">
          <div className="scoring-overall-label">Overall score</div>
          <div className="muted small">
            {scores.overallMode === 'composite' && '60% Reliability + 40% Quality'}
            {scores.overallMode === 'reliability-only' && 'Reliability only — no quality ratings yet'}
            {scores.overallMode === 'quality-only' && 'Quality only — no reliability data'}
            {scores.overallMode === 'no-data' && (
              <span><strong>New — no history</strong>. Score will appear after first invite.</span>
            )}
          </div>
        </div>
      </section>

      {/* ─── R + Q SUB-SCORES ─── */}
      <section className="scoring-sub-grid">
        <ReliabilityCard scores={scores} />
        <QualityCard scores={scores} ratings={ratings} />
      </section>

      {/* ─── SCORE CHANGE LOG ─── */}
      <section className="scoring-section">
        <h3>Recent score events</h3>
        {scoreLog.length === 0 ? (
          <p className="muted small">No scoring events yet.</p>
        ) : (
          <ul className="scoring-changelog">
            {scoreLog.map((ev) => (
              <li key={ev.id}>
                <span className="scoring-changelog-label">
                  {SCORE_EVENT_LABEL[ev.type] ?? ev.type}
                  {ev.type === E.CAMPAIGN_RATED && ev.payload?.rating && (
                    <span className="scoring-rating-inline">
                      <Star size={11} fill="currentColor" /> {ev.payload.rating}/10
                    </span>
                  )}
                </span>
                <span className="muted small">
                  {ev.actor?.name ? `by ${ev.actor.name} · ` : ''}
                  <RelativeTime iso={ev.timestamp} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── EXPLAINER ─── */}
      <section className="scoring-section">
        <h3>How this score is computed</h3>
        <ul className="scoring-explainer">
          <li><strong>Reliability (R)</strong>: 35% reply speed · 25% onboarding · 25% post compliance · 15% acceptance rate. Auto-computed.</li>
          <li><strong>Quality (Q)</strong>: weighted average of post-campaign ratings (1–10). Recency-decayed (events ≥6mo old at 50%, ≥12mo at 25%).</li>
          <li><strong>Overall</strong>: 0.6·R + 0.4·Q. Color: ≥8 green, 6–7.9 amber, &lt;6 red.</li>
          <li><strong>Fit (F)</strong>: per-campaign, computed at brief-check time. Not stored on the card.</li>
        </ul>
      </section>
    </div>
  );
}

function ReliabilityCard({ scores }) {
  const r = scores.reliability;
  const b = scores.reliabilityBreakdown;

  return (
    <div className="scoring-sub">
      <header className="scoring-sub-header">
        <h3>Reliability</h3>
        <div className="scoring-sub-num">
          {r != null ? r.toFixed(1) : '—'}
          <span className="scoring-sub-out">/ 10</span>
        </div>
      </header>
      <div className="muted small" style={{ marginBottom: 10 }}>Auto-computed from creator's portal behavior</div>

      <div className="reliability-signals">
        <SignalRow
          label="Reply speed"
          weight={b.reply.weight}
          score={b.reply.score}
          detail={b.reply.days != null ? `${b.reply.days}d to first reply` : 'No reply yet'}
        />
        <SignalRow
          label="Onboarding"
          weight={b.onboarding.weight}
          score={b.onboarding.score}
          detail={b.onboarding.score === 10 ? 'Completed' : b.onboarding.score === 5 ? 'Partial' : b.onboarding.score === 0 ? 'Not started' : 'No data'}
        />
        <SignalRow
          label="Post compliance"
          weight={b.compliance.weight}
          score={b.compliance.score}
          detail={b.compliance.samples > 0
            ? `${Math.round((b.compliance.score / 10) * 100)}% (${b.compliance.samples} sample${b.compliance.samples === 1 ? '' : 's'})`
            : 'No campaigns completed yet'}
        />
        <SignalRow
          label="Acceptance rate"
          weight={b.acceptance.weight}
          score={b.acceptance.score}
          detail={b.acceptance.assigned >= b.acceptance.sampleFloor
            ? `${b.acceptance.accepted}/${b.acceptance.assigned} accepted`
            : `Needs ${b.acceptance.sampleFloor}+ invites (currently ${b.acceptance.assigned})`}
        />
      </div>
    </div>
  );
}

function QualityCard({ scores, ratings }) {
  const q = scores.quality;
  return (
    <div className="scoring-sub">
      <header className="scoring-sub-header">
        <h3>Quality</h3>
        <div className="scoring-sub-num">
          {q != null ? q.toFixed(1) : '—'}
          <span className="scoring-sub-out">/ 10</span>
        </div>
      </header>
      <div className="muted small" style={{ marginBottom: 10 }}>
        {scores.qualityCount > 0
          ? `Average across ${scores.qualityCount} rated campaign${scores.qualityCount === 1 ? '' : 's'}, recency-weighted`
          : 'No campaigns rated yet'}
      </div>

      {ratings.length > 0 ? (
        <ul className="quality-ratings-list">
          {ratings.map((r) => (
            <li key={r.id} className="quality-rating-row">
              <span className="quality-rating-num">
                <Star size={11} fill="currentColor" /> {r.rating}/10
              </span>
              <span className="quality-rating-meta">
                <span className="quality-rating-campaign">
                  {r.campaign ? `${r.campaign.brandHandle} · ${r.campaign.name}` : 'Campaign'}
                </span>
                <span className="muted small">
                  by {r.ratedBy} · <RelativeTime iso={r.timestamp} />
                  {r.decayWeight < 1 && (
                    <span className="quality-decay-tag" title="Older event — applied at decayed weight">
                      {Math.round(r.decayWeight * 100)}% weight
                    </span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Quality rating appears after the first campaign is rated by Katie or Dez.</p>
      )}
    </div>
  );
}

function SignalRow({ label, weight, score, detail }) {
  const dim = score == null;
  const pctScore = score != null ? (score / 10) * 100 : 0;
  const colorClass = score == null ? '' : score >= 8 ? 'green' : score >= 5 ? 'yellow' : 'red';
  return (
    <div className={`signal-row ${dim ? 'dim' : ''}`}>
      <div className="signal-row-head">
        <span className="signal-row-label">{label}</span>
        <span className="muted small">{Math.round(weight * 100)}% weight</span>
      </div>
      <div className="signal-row-bar">
        <div className={`signal-row-fill ${colorClass}`} style={{ width: `${pctScore}%` }} />
      </div>
      <div className="signal-row-detail muted small">
        {detail}
        {!dim && (
          <span className="signal-row-score">
            {score.toFixed(1)}/10
          </span>
        )}
      </div>
    </div>
  );
}

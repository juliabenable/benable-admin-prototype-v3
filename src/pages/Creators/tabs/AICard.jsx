import { useMemo, useState } from 'react';
import { Sparkles, CheckCircle2, RefreshCw, PlayCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { useEventStore } from '../../../store/useEventStore.jsx';
import { selectAICard } from '../../../domain/selectors.js';
import { useToast } from '../../../components/Toast.jsx';
import { EVENT_TYPES as E } from '../../../domain/events.js';
import { formatRelative, formatFullDate } from '../../../components/RelativeTime.jsx';
import Pill from '../../../components/Pill.jsx';

const VIDEO_BG = {
  A: '#FED7AA', B: '#BAE6FD', C: '#BBF7D0', D: '#FECACA', E: '#FED7AA',
  F: '#FEF3C7', G: '#DDD6FE', H: '#FCE7F3', I: '#A7F3D0', J: '#FDE68A',
};

export default function AICardTab({ creator }) {
  const { events, campaigns, appendEvent } = useEventStore();
  const toast = useToast();

  // Find AI cards across all campaigns this creator is in
  const cards = useMemo(() => {
    const result = [];
    for (const campaign of campaigns) {
      const card = selectAICard(events, creator.id, campaign.id);
      if (card) result.push({ campaign, ...card });
    }
    return result.sort((a, b) =>
      // Most-recent first
      (b.generatedAt ?? '').localeCompare(a.generatedAt ?? ''),
    );
  }, [events, creator.id, campaigns]);

  function markReviewed(campaignId) {
    appendEvent({
      type: E.AI_CARD_REVIEWED,
      creatorId: creator.id,
      campaignId,
      actor: { kind: 'ops', name: 'Julia' },
    });
    toast('AI card marked as reviewed');
  }

  function regenerate(campaignId) {
    // Stub — real version would call AI; here we just bump timestamps
    toast('Regeneration queued (stubbed for prototype)');
  }

  if (cards.length === 0) {
    return (
      <div className="tab-empty">
        No AI cards yet for this creator. Cards are generated automatically when the creator is assigned to a campaign — review and approve here before they go to the brand.
      </div>
    );
  }

  return (
    <div className="ai-card-tab">
      {cards.map(({ campaign, bullets, videos, reviewedAt, reviewedBy, generatedAt }) => (
        <article key={campaign.id} className="ai-card">
          <header className="ai-card-head">
            <div>
              <div className="muted micro">For brand-facing review</div>
              <h3>{campaign.brandHandle} · {campaign.name}</h3>
              <div className="muted small">
                Generated {formatRelative(generatedAt)}
                {reviewedAt && (
                  <> · Reviewed by {reviewedBy} {formatRelative(reviewedAt)}</>
                )}
              </div>
            </div>
            <div className="row gap-2">
              {reviewedAt ? (
                <span className="reviewed-badge">
                  <CheckCircle2 size={14} /> Reviewed
                </span>
              ) : (
                <Pill color="yellow">Awaiting review</Pill>
              )}
            </div>
          </header>

          <section className="ai-card-bullets">
            <div className="muted micro">Why they're a fit</div>
            <ul>
              {bullets.map((b, i) => (
                <li key={i}><Sparkles size={12} className="ai-card-bullet-icon" /> {b}</li>
              ))}
            </ul>
          </section>

          <section className="ai-card-videos">
            <div className="muted micro">Selected videos · {videos.length} of 24 AI-pre-selected</div>
            <ul className="ai-card-video-list">
              {videos.map((v, i) => (
                <li key={v.id} className="ai-card-video">
                  <div
                    className="ai-card-video-thumb"
                    style={{ background: VIDEO_BG[v.thumbnail] ?? '#E5E7EB' }}
                  >
                    <PlayCircle size={28} />
                  </div>
                  <div className="ai-card-video-meta">
                    <div className="ai-card-video-title">{v.title}</div>
                    <div className="muted small">
                      Position {i + 1}
                      <button type="button" className="btn ghost icon-only" disabled={i === 0} title="Move up">
                        <ArrowUp size={12} />
                      </button>
                      <button type="button" className="btn ghost icon-only" disabled={i === videos.length - 1} title="Move down">
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <footer className="ai-card-actions">
            <button type="button" className="btn secondary small" onClick={() => regenerate(campaign.id)}>
              <RefreshCw size={13} /> Regenerate
            </button>
            {!reviewedAt && (
              <button type="button" className="btn primary small" onClick={() => markReviewed(campaign.id)}>
                <CheckCircle2 size={13} /> Mark as reviewed
              </button>
            )}
          </footer>
        </article>
      ))}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Plus, Tag as TagIcon, Sparkles, Check, X } from 'lucide-react';
import { useEventStore } from '../../../store/useEventStore.jsx';
import { useToast } from '../../../components/Toast.jsx';
import {
  selectCreatorBrandPools, selectAllTags, selectAutoTags, AUTO_TAG_RULES,
  scoreBriefFit,
} from '../../../domain/selectors.js';
import { EVENT_TYPES as E } from '../../../domain/events.js';
import BrandLogo from '../../Brands/BrandLogo.jsx';
import Pill from '../../../components/Pill.jsx';
import FitLevelToggle from '../../../components/FitLevelToggle.jsx';

function isEmpty(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

const OPENNESS_LABEL = {
  yes: { label: 'Yes', color: 'green' },
  maybe: { label: 'Maybe', color: 'yellow' },
  no: { label: 'No', color: 'red' },
};

function OpennessChip({ value }) {
  if (!value) return <span className="muted small">Not provided</span>;
  const meta = OPENNESS_LABEL[value];
  if (!meta) return <span className="muted small">{value}</span>;
  return <span className={`pill ${meta.color}`}>{meta.label}</span>;
}

function Field({ label, children, empty }) {
  if (empty) {
    return (
      <div className="prefs-field">
        <div className="prefs-field-label">{label}</div>
        <div className="prefs-field-empty">Not yet provided</div>
      </div>
    );
  }
  return (
    <div className="prefs-field">
      <div className="prefs-field-label">{label}</div>
      <div className="prefs-field-body">{children}</div>
    </div>
  );
}

function PoolMembershipRow({ entry, onChange }) {
  const { brand, status } = entry;
  return (
    <div className="prefs-pool-row">
      <BrandLogo brand={brand} size={28} />
      <div className="prefs-pool-meta">
        <div className="prefs-pool-name">{brand.name}</div>
        <div className="muted small">{brand.handle}</div>
      </div>
      <FitLevelToggle status={status} onChange={(level) => onChange(brand.id, level)} />
    </div>
  );
}

export default function PreferencesTab({ creator }) {
  const { events, brands, campaigns, appendEvent } = useEventStore();
  const toast = useToast();

  const p = creator.preferences ?? {};
  const a = creator.audience ?? {};
  const onboarding = creator.onboardingStatus ?? 'pending';

  const pools = useMemo(
    () => selectCreatorBrandPools(events, creator.id, brands),
    [events, creator.id, brands],
  );

  // Brand IDs creator is already in
  const inPoolBrandIds = useMemo(
    () => new Set(pools.filter((p) => p.status !== 'archived').map((p) => p.brand.id)),
    [pools],
  );

  // Suggestions: brands NOT yet in pool ranked by fit. For pool-suggestion
  // (vs. specific-campaign fit) we use only the creator's own platforms,
  // so platform requirement isn't penalizing cross-platform suggestions —
  // category overlap + onboarding openness dominates.
  const suggestions = useMemo(() => {
    const out = [];
    for (const brand of brands) {
      if (inPoolBrandIds.has(brand.id)) continue;
      // Look for any live OR draft campaign for this brand
      const candidateCampaign = campaigns.find(
        (c) => c.brandHandle === brand.handle && (c.status === 'live' || c.status === 'draft'),
      );
      const brief = {
        categories: brand.categories ?? [],
        platforms: creator.socials ?? [],
        gifted: !brand.paid,
        brandIsSmall: true,
      };
      const fit = scoreBriefFit(creator, brief);
      // Threshold lowered to surface anyone with at least some signal
      if (fit.fit >= 3) {
        out.push({ brand, fit, liveCampaign: candidateCampaign });
      }
    }
    return out.sort((a, b) => b.fit.fit - a.fit.fit).slice(0, 4);
  }, [brands, inPoolBrandIds, campaigns, creator]);

  // Tag info (auto + custom)
  const autoTags = useMemo(() => selectAutoTags(creator), [creator]);
  const allTags = useMemo(() => selectAllTags(creator), [creator]);
  const autoTagRules = useMemo(() => {
    const map = new Map(AUTO_TAG_RULES.map((r) => [r.id, r]));
    return autoTags.map((id) => map.get(id)).filter(Boolean);
  }, [autoTags]);

  function changePoolStatus(brandId, level) {
    let evType;
    let payload = {};
    let label = '';
    if (level === 'good') {
      evType = E.BRAND_POOL_QUALIFIED;
      label = 'Good fit';
    } else if (level === 'not-a-fit') {
      evType = E.BRAND_POOL_ARCHIVED;
      payload = { reason: 'not-a-fit' };
      label = 'Not a fit';
    } else {
      evType = E.BRAND_POOL_UNARCHIVED; // resets to potential
      label = 'Potential fit';
    }
    appendEvent({
      type: evType,
      creatorId: creator.id,
      brandId,
      actor: { kind: 'ops', name: 'Julia' },
      payload,
    });
    const brand = brands.find((b) => b.id === brandId);
    toast(`${brand?.name}: marked ${label}`);
  }

  function addToPool(brandId) {
    appendEvent({
      type: E.BRAND_POOL_ADDED,
      creatorId: creator.id,
      brandId,
      actor: { kind: 'ops', name: 'Julia' },
      payload: { source: 'preferences-suggestion' },
    });
    const brand = brands.find((b) => b.id === brandId);
    toast(`Added ${creator.name} to ${brand?.name} pool`);
  }

  const onboardingEmpty =
    isEmpty(p.workWith) && isEmpty(p.avoid) && isEmpty(p.giftedOpenness)
    && !p.smallBrands && !p.unknownBrands
    && isEmpty(p.dreamHousehold) && isEmpty(p.dreamNiche) && isEmpty(p.dreamLocal);

  return (
    <div className="prefs-tab">
      {/* ─── ONBOARDING ANSWERS (top, per Katie May 7) ─── */}
      <section className="prefs-section">
        <h3>Onboarding answers</h3>
        {onboarding === 'pending' && (
          <p className="muted small">Onboarding has not been started yet.</p>
        )}
        {onboarding !== 'pending' && onboardingEmpty && (
          <p className="muted small">No onboarding answers provided yet.</p>
        )}

        {!onboardingEmpty && (
          <>
            <Field label="Would love to work with" empty={isEmpty(p.workWith)}>{p.workWith}</Field>
            <Field label="Would prefer to avoid" empty={isEmpty(p.avoid)}>{p.avoid}</Field>

            <Field
              label="Gifted campaigns openness"
              empty={isEmpty(p.giftedOpenness) && !p.smallBrands && !p.unknownBrands}
            >
              {p.giftedOpenness && <p>{p.giftedOpenness}</p>}
              <div className="row gap-3" style={{ marginTop: p.giftedOpenness ? 8 : 0, flexWrap: 'wrap' }}>
                <div className="row gap-2"><span className="muted small">Small brands:</span><OpennessChip value={p.smallBrands} /></div>
                <div className="row gap-2"><span className="muted small">Unknown brands:</span><OpennessChip value={p.unknownBrands} /></div>
              </div>
              {p.smallBrandsNote && <p className="muted small" style={{ marginTop: 4 }}>Small: {p.smallBrandsNote}</p>}
              {p.unknownBrandsNote && <p className="muted small">Unknown: {p.unknownBrandsNote}</p>}
            </Field>

            <Field
              label="Dream collabs"
              empty={isEmpty(p.dreamHousehold) && isEmpty(p.dreamNiche) && isEmpty(p.dreamLocal)}
            >
              {!isEmpty(p.dreamHousehold) && (
                <div className="prefs-subfield">
                  <div className="muted small">Household-name brands</div>
                  <div>{p.dreamHousehold}</div>
                </div>
              )}
              {!isEmpty(p.dreamNiche) && (
                <div className="prefs-subfield">
                  <div className="muted small">Smaller niche brands</div>
                  <div>{p.dreamNiche}</div>
                </div>
              )}
              {!isEmpty(p.dreamLocal) && (
                <div className="prefs-subfield">
                  <div className="muted small">Local businesses</div>
                  <div>{p.dreamLocal}</div>
                </div>
              )}
            </Field>
          </>
        )}
      </section>

      {/* ─── TAGS — what we know about this creator ─── */}
      <section className="prefs-section">
        <h3><TagIcon size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Tags</h3>
        <p className="muted small" style={{ marginBottom: 10 }}>
          Auto-derived from socials, onboarding answers, and content. Saves the manual scroll-the-Instagram step.
        </p>

        {creator.locationCity && (
          <div className="prefs-tag-line">
            <span className="muted micro">Location</span>
            <span className="tag-mini">{creator.locationCity}</span>
          </div>
        )}
        {creator.contentNiche && (
          <div className="prefs-tag-line">
            <span className="muted micro">Niche</span>
            <span className="tag-mini">{creator.contentNiche}</span>
          </div>
        )}
        {creator.categories?.length > 0 && (
          <div className="prefs-tag-line">
            <span className="muted micro">Categories</span>
            <div className="prefs-tags">
              {creator.categories.map((c) => <span key={c} className="tag-mini">{c}</span>)}
            </div>
          </div>
        )}
        {creator.contentFormatStrengths?.length > 0 && (
          <div className="prefs-tag-line">
            <span className="muted micro">Content formats</span>
            <div className="prefs-tags">
              {creator.contentFormatStrengths.map((c) => <span key={c} className="tag-mini">{c}</span>)}
            </div>
          </div>
        )}
        {autoTagRules.length > 0 && (
          <div className="prefs-tag-line">
            <span className="muted micro">Signals</span>
            <div className="prefs-tags">
              {autoTagRules.map((r) => <span key={r.id} className="tag-mini">{r.label}</span>)}
            </div>
          </div>
        )}
      </section>

      {/* ─── POOL MEMBERSHIPS — toggle qualified / confirmed / potential / not-qualified ─── */}
      <section className="prefs-section">
        <h3>Brand pools</h3>
        <p className="muted small" style={{ marginBottom: 10 }}>
          Which brand pools this creator is in, and whether they're qualified for each. Toggle status per brand.
        </p>
        {pools.length === 0 ? (
          <p className="muted small">Not in any brand pool yet.</p>
        ) : (
          <div className="prefs-pool-list">
            {pools.map((entry) => (
              <PoolMembershipRow
                key={entry.brand.id}
                entry={entry}
                creator={creator}
                onChange={changePoolStatus}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── SUGGESTIONS — pools they could be a fit for ─── */}
      {suggestions.length > 0 && (
        <section className="prefs-section">
          <h3><Sparkles size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Suggested pools</h3>
          <p className="muted small" style={{ marginBottom: 10 }}>
            Based on tags + onboarding answers + active campaigns from other brands. AI pass — review before adding.
          </p>
          <div className="prefs-suggestion-list">
            {suggestions.map(({ brand, fit, liveCampaign }) => (
              <div key={brand.id} className="prefs-suggestion-row">
                <BrandLogo brand={brand} size={28} />
                <div className="prefs-suggestion-meta">
                  <div className="prefs-pool-name">{brand.name}</div>
                  <div className="muted small">
                    {liveCampaign ? `${liveCampaign.name} · ` : ''}Fit {fit.fit.toFixed(1)}/10
                  </div>
                  {fit.reasons.length > 0 && (
                    <div className="muted small">
                      {fit.reasons.slice(0, 2).join(' · ')}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="btn primary small"
                  onClick={() => addToPool(brand.id)}
                >
                  <Plus size={13} /> Add to pool
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import Avatar from '../../../components/Avatar.jsx';

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

function nFormat(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
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

export default function PreferencesTab({ creator }) {
  const p = creator.preferences ?? {};
  const a = creator.audience ?? {};
  const onboarding = creator.onboardingStatus ?? 'pending';

  const onboardingEmpty =
    isEmpty(p.workWith) && isEmpty(p.avoid) && isEmpty(p.giftedOpenness)
    && !p.smallBrands && !p.unknownBrands
    && isEmpty(p.dreamHousehold) && isEmpty(p.dreamNiche) && isEmpty(p.dreamLocal);

  return (
    <div className="prefs-tab">
      {/* ─── Onboarding answers (top) ─── */}
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

      {/* ─── Creator card (About / Categories / Stats / Audience) ─── */}
      <section className="creator-card">
        <div className="creator-card-head">
          <Avatar creator={creator} size={40} />
          <div className="creator-card-name">
            <div className="creator-card-name-row">
              <span className="creator-card-name-text">{creator.name}</span>
              <span className="creator-card-verified" title="Verified">✓</span>
            </div>
            <div className="creator-card-handle">{creator.handle}</div>
          </div>
        </div>

        <div className="creator-card-section">
          <div className="creator-card-section-label">About me</div>
          {isEmpty(p.about) ? (
            <div className="prefs-field-empty">Not yet provided</div>
          ) : (
            <div className="creator-card-bio">{p.about}</div>
          )}
        </div>

        {creator.categories?.length > 0 && (
          <div className="creator-card-tags">
            {creator.categories.map((c) => <span key={c} className="creator-card-tag">{c}</span>)}
          </div>
        )}

        <div className="creator-card-stats">
          <div className="creator-card-stats-group">
            <div className="creator-card-stats-group-label">Social Stats</div>
            <div className="creator-card-stats-row">
              <div className="creator-card-stat">
                <div className="creator-card-stat-label">Followers</div>
                <div className="creator-card-stat-value">{nFormat(creator.followerCount ?? 0)}</div>
              </div>
              <div className="creator-card-stat">
                <div className="creator-card-stat-label">Engagement</div>
                <div className="creator-card-stat-value">{(creator.engagementRate ?? 0).toFixed(1)}%</div>
              </div>
            </div>
          </div>
          <div className="creator-card-stats-group">
            <div className="creator-card-stats-group-label">Audience</div>
            <div className="creator-card-stats-row">
              <div className="creator-card-stat">
                <div className="creator-card-stat-label">Location</div>
                <div className="creator-card-stat-value">{a.location ?? '—'}</div>
              </div>
              <div className="creator-card-stat">
                <div className="creator-card-stat-label">Gender</div>
                <div className="creator-card-stat-value">{a.genderFemalePct != null ? `${a.genderFemalePct}% Female` : '—'}</div>
              </div>
              <div className="creator-card-stat">
                <div className="creator-card-stat-label">Age Range</div>
                <div className="creator-card-stat-value">{a.ageRange ?? '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

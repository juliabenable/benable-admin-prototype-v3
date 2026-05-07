import { Package, MapPin, Clock, FileText, AlertCircle } from 'lucide-react';

const CONTENT_TYPE_LABEL = {
  'social-posts': 'Social posts (from my account)',
  'ugc-only': 'UGC only (no posting)',
  'open-to-both': 'Open to both',
};

export default function LogisticsTab({ creator }) {
  const l = creator.logistics ?? {};
  const contentTypePref = creator.contentTypePreference ?? 'open-to-both';
  const isUGC = contentTypePref === 'ugc-only';

  return (
    <div className="logistics-tab">
      {isUGC && (
        <div className="logistics-warning">
          <AlertCircle size={14} />
          <strong>UGC-only creator</strong> — they will not post to their own account.
          Only assign to campaigns that need content for the brand to use, not creator-channel posts.
        </div>
      )}

      <section className="logistics-section">
        <h3>Content type preference</h3>
        <div className="logistics-content-pref">
          <span className="logistics-pref-pill">{CONTENT_TYPE_LABEL[contentTypePref]}</span>
        </div>
      </section>

      <section className="logistics-section">
        <h3><Package size={14} /> Shipping</h3>
        <div className="logistics-grid">
          <Field label="Address" value={l.shippingAddress} icon={<MapPin size={12} />} prominent={!l.shippingAddress} />
          <Field label="Minimum gift value" value={l.minGiftValue ? `$${l.minGiftValue}` : null} />
        </div>
      </section>

      <section className="logistics-section">
        <h3><FileText size={14} /> Usage rights</h3>
        <div className="logistics-grid">
          <Field label="Duration" value={l.usageRightsDuration} />
          <Field label="Scope" value={l.usageRightsScope} fullWidth />
        </div>
      </section>

      <section className="logistics-section">
        <h3><Clock size={14} /> Posting timeline</h3>
        <div className="logistics-grid">
          <Field label="Typical window" value={l.postingTimeline} fullWidth />
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, icon, fullWidth, prominent }) {
  return (
    <div className={`logistics-field ${fullWidth ? 'full' : ''} ${prominent ? 'prominent' : ''}`}>
      <div className="logistics-field-label">{label}</div>
      <div className="logistics-field-value">
        {icon} {value || <span className="muted small">— Not provided</span>}
      </div>
    </div>
  );
}

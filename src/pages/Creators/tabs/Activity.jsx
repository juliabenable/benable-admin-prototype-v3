import { useEffect, useMemo, useRef, useState } from 'react';
import {
  UserPlus, Mail, Eye, X, PlayCircle, CheckCircle2, AlertCircle, ListChecks,
  ShoppingCart, Truck, Package, Send, Edit3, Globe, Star,
  ThumbsUp, ThumbsDown, Eye as EyeIcon, Clock, StickyNote,
} from 'lucide-react';
import { useEventStore } from '../../../store/useEventStore.jsx';
import { useToast } from '../../../components/Toast.jsx';
import { selectActivityFeed } from '../../../domain/selectors.js';
import { formatRelative, formatFullDate } from '../../../components/RelativeTime.jsx';
import { EVENT_TYPES as E } from '../../../domain/events.js';

// icon + dot color per event type
const EVENT_META = {
  [E.CREATOR_ADDED]: { label: 'Added to system', icon: UserPlus, tone: 'gray' },
  [E.PORTAL_INVITE_SENT]: { label: 'Portal invite sent', icon: Mail, tone: 'gray' },
  [E.PORTAL_INVITE_VIEWED]: { label: 'Portal invite viewed', icon: Eye, tone: 'gray' },
  [E.PORTAL_INVITE_DISMISSED]: { label: 'Portal invite dismissed', icon: X, tone: 'red' },
  [E.ONBOARDING_STARTED]: { label: 'Onboarding started', icon: PlayCircle, tone: 'purple' },
  [E.ONBOARDING_PARTIAL]: { label: 'Onboarding partially completed', icon: AlertCircle, tone: 'yellow' },
  [E.ONBOARDING_COMPLETED]: { label: 'Onboarding complete', icon: CheckCircle2, tone: 'green' },
  [E.PREFERENCES_EMAIL_SENT]: { label: 'Collab preferences email sent', icon: Mail, tone: 'gray' },
  [E.NUDGE_SENT]: { label: 'Nudge sent', icon: Send, tone: 'purple' },
  [E.NOTE_ADDED]: { label: 'Note added', icon: StickyNote, tone: 'yellow' },

  [E.ASSIGNED_TO_CAMPAIGN]: { label: 'Assigned to campaign', icon: ListChecks, tone: 'purple' },
  [E.CAMPAIGN_DETAILS_VIEWED]: { label: 'Campaign details viewed', icon: EyeIcon, tone: 'gray' },
  [E.CAMPAIGN_BRIEF_SCROLLED]: { label: 'Brief reviewed', icon: EyeIcon, tone: 'gray' },
  [E.CAMPAIGN_ACCEPTED]: { label: 'Accepted campaign & chose products', icon: ThumbsUp, tone: 'green' },
  [E.CAMPAIGN_DECLINED]: { label: 'Campaign declined', icon: ThumbsDown, tone: 'red' },
  [E.PRODUCT_SELECTED]: { label: 'Products selected', icon: ListChecks, tone: 'purple' },
  [E.PRODUCT_DESELECTED]: { label: 'Product deselected', icon: ListChecks, tone: 'gray' },
  [E.ORDER_PLACED]: { label: 'Order placed', icon: ShoppingCart, tone: 'purple' },
  [E.PRODUCT_SHIPPED]: { label: 'Product shipped', icon: Truck, tone: 'blue' },
  [E.DELIVERY_CONFIRMED]: { label: 'Delivery confirmed', icon: Package, tone: 'green' },
  [E.DELIVERY_DECLINED]: { label: 'Delivery declined', icon: X, tone: 'red' },
  [E.CONTENT_SUBMITTED]: { label: 'Content submitted', icon: Send, tone: 'purple' },
  [E.CONTENT_REVISION_REQUESTED]: { label: 'Content revision requested', icon: Edit3, tone: 'yellow' },
  [E.CONTENT_APPROVED]: { label: 'Content approved', icon: CheckCircle2, tone: 'green' },
  [E.CONTENT_LIVE]: { label: 'Content live', icon: Globe, tone: 'green' },
  [E.BENABLE_RECS_ADDED]: { label: 'Benable recs added', icon: Star, tone: 'purple' },
  [E.VISIBLE_TO_BRAND_TOGGLED]: { label: 'Visibility to brand toggled', icon: EyeIcon, tone: 'gray' },
  [E.BRAND_INVITED]: { label: 'Invited by brand', icon: Mail, tone: 'blue' },
  [E.BRAND_ACCEPTED]: { label: 'Accepted by brand', icon: ThumbsUp, tone: 'green' },
  [E.BRAND_REJECTED]: { label: 'Rejected by brand', icon: ThumbsDown, tone: 'red' },
  [E.BRAND_NO_RESPONSE]: { label: 'No response from brand', icon: Clock, tone: 'gray' },
};

function eventSubline(event, campaigns) {
  const campaign = event.campaignId ? campaigns.find((c) => c.id === event.campaignId) : null;
  const actorName = event.actor?.name;
  switch (event.type) {
    case E.CREATOR_ADDED:
      return event.payload?.source === 'upload'
        ? `Uploaded by ${actorName ?? 'Ops'} via JSON batch`
        : `Added by ${actorName ?? 'Ops'}`;
    case E.PORTAL_INVITE_SENT:
      return `Email sent by ${actorName ?? 'ops'}`;
    case E.NUDGE_SENT: {
      const channel = event.payload?.channel ?? 'email';
      const tpl = event.payload?.templateLabel ?? event.payload?.templateId ?? 'custom';
      return `${tpl} · sent by ${actorName ?? 'ops'} via ${channel}`;
    }
    case E.NOTE_ADDED:
      return event.payload?.body ?? '';
    case E.CAMPAIGN_ACCEPTED:
      return campaign ? `${campaign.brandHandle} · ${campaign.name}` : '';
    case E.CONTENT_SUBMITTED:
      return campaign ? `${campaign.name}` : '';
    case E.CONTENT_LIVE:
      return event.payload?.url
        ? `Posted on ${campaign?.brandHandle ?? ''}`
        : (campaign ? `${campaign.brandHandle} · ${campaign.name}` : '');
    case E.PRODUCT_SHIPPED:
      return event.payload?.tracking
        ? `Tracking #${event.payload.tracking}`
        : (campaign ? campaign.name : '');
    case E.ASSIGNED_TO_CAMPAIGN:
    case E.CAMPAIGN_DECLINED:
    case E.CAMPAIGN_DETAILS_VIEWED:
    case E.CAMPAIGN_BRIEF_SCROLLED:
    case E.PRODUCT_SELECTED:
    case E.PRODUCT_DESELECTED:
    case E.ORDER_PLACED:
    case E.DELIVERY_CONFIRMED:
    case E.DELIVERY_DECLINED:
    case E.CONTENT_REVISION_REQUESTED:
    case E.CONTENT_APPROVED:
    case E.BRAND_INVITED:
    case E.BRAND_ACCEPTED:
    case E.BRAND_REJECTED:
    case E.BRAND_NO_RESPONSE:
    case E.VISIBLE_TO_BRAND_TOGGLED:
      return campaign ? `${campaign.brandHandle} · ${campaign.name}` : '';
    default:
      return '';
  }
}

export default function ActivityTab({ creator, focusNoteKey }) {
  const { events, campaigns, appendEvent } = useEventStore();
  const toast = useToast();
  const feed = useMemo(() => selectActivityFeed(events, creator.id), [events, creator.id]);
  const [noteBody, setNoteBody] = useState('');
  const noteRef = useRef(null);

  useEffect(() => {
    if (focusNoteKey > 0) noteRef.current?.focus();
  }, [focusNoteKey]);

  function saveNote() {
    const trimmed = noteBody.trim();
    if (!trimmed) return;
    appendEvent({
      type: E.NOTE_ADDED,
      creatorId: creator.id,
      actor: { kind: 'ops', name: 'Julia' },
      payload: { body: trimmed },
    });
    setNoteBody('');
    toast('Note added');
  }

  return (
    <div className="activity-tab">
      <div className="note-compose">
        <textarea
          ref={noteRef}
          className="textarea"
          placeholder="Add a note about this creator…"
          rows={2}
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
        />
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn primary small" onClick={saveNote} disabled={!noteBody.trim()}>
            Save note
          </button>
        </div>
      </div>

      {feed.length === 0 ? (
        <div className="tab-empty">No activity yet.</div>
      ) : (
        <ol className="timeline">
          {feed.map((event) => {
            const meta = EVENT_META[event.type] ?? { label: event.type, icon: AlertCircle, tone: 'gray' };
            const Icon = meta.icon;
            return (
              <li key={event.id} className="timeline-item">
                <span className={`timeline-dot tone-${meta.tone}`}>
                  <Icon size={14} />
                </span>
                <div className="timeline-body">
                  <div className="timeline-label">{meta.label}</div>
                  {eventSubline(event, campaigns) && (
                    <div className="timeline-sub">{eventSubline(event, campaigns)}</div>
                  )}
                  <div className="timeline-time" title={formatFullDate(event.timestamp)}>
                    {formatRelative(event.timestamp)}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

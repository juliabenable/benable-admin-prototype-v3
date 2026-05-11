import { useMemo } from 'react';
import {
  UserPlus, Mail, Eye, X, PlayCircle, CheckCircle2, AlertCircle, ListChecks,
  ShoppingCart, Truck, Package, Send, Edit3, Globe, Star,
  ThumbsUp, ThumbsDown, Eye as EyeIcon, Clock, StickyNote, RotateCcw,
} from 'lucide-react';
import { useEventStore } from '../../../store/useEventStore.jsx';
import { selectActivityFeed } from '../../../domain/selectors.js';
import {
  formatRelative, formatFullDate, formatDateOnly, formatTimeOnly,
} from '../../../components/RelativeTime.jsx';
import { EVENT_TYPES as E } from '../../../domain/events.js';

// icon + dot color per event type
export const EVENT_META = {
  [E.CREATOR_ADDED]: { label: 'Added to system', icon: UserPlus, tone: 'gray' },
  [E.PORTAL_INVITE_SENT]: { label: 'Portal invite sent', icon: Mail, tone: 'gray' },
  [E.PORTAL_INVITE_VIEWED]: { label: 'Portal invite viewed', icon: Eye, tone: 'gray' },
  [E.PORTAL_INVITE_DISMISSED]: { label: 'Portal invite dismissed', icon: X, tone: 'red' },
  [E.ONBOARDING_STARTED]: { label: 'Onboarding started', icon: PlayCircle, tone: 'purple' },
  [E.ONBOARDING_PARTIAL]: { label: 'Onboarding partially completed', icon: AlertCircle, tone: 'yellow' },
  [E.ONBOARDING_COMPLETED]: { label: 'Onboarding complete', icon: CheckCircle2, tone: 'green' },
  [E.PORTAL_STATUS_RESET]: { label: 'Portal status reset', icon: RotateCcw, tone: 'gray' },
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

  [E.BRAND_POOL_ADDED]: { label: 'Added to brand pool', icon: UserPlus, tone: 'gray' },
  [E.BRAND_POOL_CONFIRMED]: { label: 'Confirmed for brand', icon: CheckCircle2, tone: 'blue' },
  [E.BRAND_POOL_QUALIFIED]: { label: 'Qualified for brand', icon: CheckCircle2, tone: 'green' },
  [E.BRAND_POOL_ARCHIVED]: { label: 'Archived from brand', icon: X, tone: 'gray' },
  [E.BRAND_POOL_UNARCHIVED]: { label: 'Unarchived', icon: PlayCircle, tone: 'purple' },

  [E.AI_CARD_GENERATED]: { label: 'AI card generated', icon: Star, tone: 'purple' },
  [E.AI_CARD_REVIEWED]: { label: 'AI card reviewed', icon: CheckCircle2, tone: 'green' },
  [E.AI_CARD_REWORKED]: { label: 'AI card reworked', icon: Edit3, tone: 'yellow' },

  [E.CAMPAIGN_RATED]: { label: 'Campaign rated', icon: Star, tone: 'green' },
  [E.POST_COMPLIANCE_LOGGED]: { label: 'Post compliance logged', icon: CheckCircle2, tone: 'green' },
};

// Helper: consistent brand · campaign formatting for ANY campaign-scoped event.
// Per Katie's feedback (May 7): every activity entry needs both brand + campaign.
function brandCampaignContext(event, campaigns, brands) {
  const campaign = event.campaignId ? campaigns.find((c) => c.id === event.campaignId) : null;
  if (!campaign) return '';
  const brandHandle = campaign.brandHandle;
  return `${brandHandle} · ${campaign.name}`;
}

// Format a duration in milliseconds as a human-friendly string
function formatDuration(ms) {
  if (ms <= 0) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

// Map: which event types are "creator response to a prompting event"?
// For each, what is the prompting event type to look back at?
const RESPONSE_PAIRS = {
  [E.PORTAL_INVITE_VIEWED]: { promptType: E.PORTAL_INVITE_SENT, label: 'after invite' },
  [E.ONBOARDING_STARTED]: { promptType: E.PORTAL_INVITE_SENT, label: 'after invite' },
  [E.ONBOARDING_COMPLETED]: { promptType: E.PORTAL_INVITE_SENT, label: 'after invite' },
  [E.CAMPAIGN_DETAILS_VIEWED]: { promptType: E.ASSIGNED_TO_CAMPAIGN, label: 'after invite' },
  [E.CAMPAIGN_BRIEF_SCROLLED]: { promptType: E.ASSIGNED_TO_CAMPAIGN, label: 'after invite' },
  [E.CAMPAIGN_ACCEPTED]: { promptType: E.ASSIGNED_TO_CAMPAIGN, label: 'after invite' },
  [E.CAMPAIGN_DECLINED]: { promptType: E.ASSIGNED_TO_CAMPAIGN, label: 'after invite' },
  [E.PRODUCT_SELECTED]: { promptType: E.CAMPAIGN_ACCEPTED, label: 'after accepting' },
  [E.DELIVERY_CONFIRMED]: { promptType: E.PRODUCT_SHIPPED, label: 'after shipping' },
  [E.CONTENT_SUBMITTED]: { promptType: E.DELIVERY_CONFIRMED, label: 'after delivery' },
  [E.CONTENT_LIVE]: { promptType: E.CONTENT_APPROVED, label: 'after approval' },
};

// For a given creator action event, find the previous prompting event in the same
// scope (campaign or portal) and return the delta + label. Only returns a result
// if the response makes sense (creator-side action with a prior prompt).
export function computeResponseTime(event, allCreatorEvents) {
  const pair = RESPONSE_PAIRS[event.type];
  if (!pair) return null;
  // Find the most recent prompting event BEFORE this one
  const prompts = allCreatorEvents
    .filter((e) => e.type === pair.promptType)
    .filter((e) => e.timestamp < event.timestamp)
    .filter((e) => {
      // For campaign events, prompts must be for the same campaign
      if (event.campaignId && e.campaignId) return event.campaignId === e.campaignId;
      return true;
    })
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const prompt = prompts[0];
  if (!prompt) return null;
  const deltaMs = Date.parse(event.timestamp) - Date.parse(prompt.timestamp);
  const dur = formatDuration(deltaMs);
  if (!dur) return null;
  return { duration: dur, label: pair.label };
}

// Map actor.kind → tone for the timeline dot
export function actorTone(actor, fallbackTone) {
  if (!actor) return fallbackTone;
  if (actor.kind === 'brand') return 'yellow';
  if (actor.kind === 'creator') return 'purple';
  if (actor.kind === 'ops') return 'blue';
  return fallbackTone;
}

export const ACTOR_LABEL = {
  ops: 'Ops',
  brand: 'Brand',
  creator: 'Creator',
  system: 'System',
};

export function eventSubline(event, campaigns, brands = []) {
  const campaign = event.campaignId ? campaigns.find((c) => c.id === event.campaignId) : null;
  const brand = event.brandId ? brands.find((b) => b.id === event.brandId) : null;
  const actorName = event.actor?.name;
  const ctx = brandCampaignContext(event, campaigns, brands);

  // Brand-pool events (no campaign — just brand)
  if (event.type === E.BRAND_POOL_ADDED || event.type === E.BRAND_POOL_CONFIRMED
      || event.type === E.BRAND_POOL_QUALIFIED || event.type === E.BRAND_POOL_UNARCHIVED) {
    return brand ? `${brand.name} pool · by ${actorName ?? 'ops'}` : '';
  }
  if (event.type === E.BRAND_POOL_ARCHIVED) {
    const reason = event.payload?.reason ? ` — ${event.payload.reason}` : '';
    return brand ? `${brand.name}${reason} · by ${actorName ?? 'ops'}` : '';
  }

  // Campaign-scoped events: ALWAYS lead with brand · campaign, optionally append payload detail
  if (event.type === E.AI_CARD_GENERATED || event.type === E.AI_CARD_REVIEWED || event.type === E.AI_CARD_REWORKED) {
    return ctx;
  }
  if (event.type === E.CAMPAIGN_RATED) {
    const rating = event.payload?.rating;
    return ctx ? `${rating ? `${rating}/10 — ` : ''}${ctx}` : '';
  }
  if (event.type === E.POST_COMPLIANCE_LOGGED) {
    const posted = event.payload?.posted ? 'Posted' : 'Did not post';
    const onTime = event.payload?.on_time ? 'on time' : 'late';
    return `${posted} ${onTime}${ctx ? ` · ${ctx}` : ''}`;
  }
  if (event.type === E.CONTENT_LIVE) {
    return ctx;
  }
  if (event.type === E.CONTENT_SUBMITTED) {
    return ctx;
  }
  if (event.type === E.PRODUCT_SHIPPED) {
    const tracking = event.payload?.tracking ? ` · Tracking #${event.payload.tracking}` : '';
    return `${ctx}${tracking}`;
  }

  switch (event.type) {
    case E.CREATOR_ADDED:
      return event.payload?.source === 'upload'
        ? `Uploaded by ${actorName ?? 'Ops'} via JSON batch`
        : `Added by ${actorName ?? 'Ops'}`;
    case E.PORTAL_INVITE_SENT:
      return `Email sent by ${actorName ?? 'ops'}`;
    case E.PORTAL_STATUS_RESET: {
      const labels = {
        NOT_IN_PROGRAM: 'Not in Creator Program',
        INVITED: 'Invited to Creator Program',
        IN_PORTAL: 'In Creator Program',
      };
      const to = labels[event.payload?.to] ?? event.payload?.to ?? '';
      const from = labels[event.payload?.from] ?? event.payload?.from;
      const direction = from ? `${from} → ${to}` : to;
      return `${direction} · by ${actorName ?? 'ops'}`;
    }
    case E.NUDGE_SENT: {
      const channel = event.payload?.channel ?? 'email';
      const tpl = event.payload?.templateLabel ?? event.payload?.templateId ?? 'custom';
      return `${tpl} · sent by ${actorName ?? 'ops'} via ${channel}`;
    }
    case E.NOTE_ADDED:
      return event.payload?.body ?? '';
    // All other campaign-scoped events: consistent brand · campaign
    case E.CAMPAIGN_ACCEPTED:
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
      return ctx;
    default:
      return '';
  }
}

export default function ActivityTab({ creator }) {
  const { events, campaigns, brands } = useEventStore();
  // Notes are NOT part of the activity feed (Katie May 8). Notes live solely
  // in the Overview tab; this timeline is brand/creator/ops events only.
  const feed = useMemo(
    () => selectActivityFeed(events, creator.id).filter((e) => e.type !== E.NOTE_ADDED),
    [events, creator.id],
  );

  return (
    <div className="activity-tab">

      {feed.length === 0 ? (
        <div className="tab-empty">No activity yet.</div>
      ) : (
        <ol className="timeline">
          {feed.map((event) => {
            const meta = EVENT_META[event.type] ?? { label: event.type, icon: AlertCircle, tone: 'gray' };
            const Icon = meta.icon;
            const tone = actorTone(event.actor, meta.tone);
            const sub = eventSubline(event, campaigns, brands);
            const response = computeResponseTime(event, feed);
            const actorLabel = ACTOR_LABEL[event.actor?.kind] ?? null;
            return (
              <li key={event.id} className={`timeline-item actor-${event.actor?.kind ?? 'system'}`}>
                {/* Date column — prominent date, time below, response duration
                    below time when applicable (Katie May 8). */}
                <div className="timeline-when" title={formatFullDate(event.timestamp)}>
                  <div className="timeline-when-date">{formatDateOnly(event.timestamp)}</div>
                  <div className="timeline-when-time">{formatTimeOnly(event.timestamp)}</div>
                  {response && (
                    <div className={`timeline-when-response tone-${tone}`} title={`${response.duration} ${response.label}`}>
                      {response.duration} {response.label}
                    </div>
                  )}
                  <div className="timeline-when-relative muted">{formatRelative(event.timestamp)}</div>
                </div>
                <span className={`timeline-dot tone-${tone}`}>
                  <Icon size={14} />
                </span>
                <div className="timeline-body">
                  <div className="timeline-label-row">
                    <span className="timeline-label">{meta.label}</span>
                    {actorLabel && (
                      <span className={`timeline-actor-badge tone-${tone}`}>{actorLabel}</span>
                    )}
                  </div>
                  {sub && <div className="timeline-sub">{sub}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

import { CAMPAIGN_SCOPED_TYPES, EVENT_TYPES as E } from './events.js';

export const STALL_THRESHOLD_DAYS = 7;
export const TODAY_ISO = '2026-05-06T12:00:00Z';

/* ───────── Helpers ───────── */

const sortAsc = (events) => [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
const sortDesc = (events) => [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

export function eventsForCreator(events, creatorId) {
  return events.filter((e) => e.creatorId === creatorId);
}

export function eventsForCreatorCampaign(events, creatorId, campaignId) {
  return events.filter((e) => e.creatorId === creatorId && e.campaignId === campaignId);
}

/* ───────── Portal stage derivation ───────── */

const PORTAL_STAGE_ORDER = [
  'NOT_IN_PROGRAM',
  'INVITED',
  'INVITE_VIEWED',
  'INVITE_DISMISSED',
  'ONBOARDING_STARTED',
  'ONBOARDING_PARTIAL',
  'IN_PORTAL',
];

function reducePortalStage(events) {
  const sorted = sortAsc(events);
  let stage = 'NOT_IN_PROGRAM';
  let stageSinceTs = null;

  const setStage = (next, ts) => {
    if (next !== stage) {
      stage = next;
      stageSinceTs = ts;
    }
  };

  for (const e of sorted) {
    switch (e.type) {
      case E.CREATOR_ADDED:
        if (stage === 'NOT_IN_PROGRAM') setStage('NOT_IN_PROGRAM', e.timestamp);
        break;
      case E.PORTAL_INVITE_SENT:
        setStage('INVITED', e.timestamp);
        break;
      case E.PORTAL_INVITE_VIEWED:
        setStage('INVITE_VIEWED', e.timestamp);
        break;
      case E.PORTAL_INVITE_DISMISSED:
        setStage('INVITE_DISMISSED', e.timestamp);
        break;
      case E.ONBOARDING_STARTED:
        setStage('ONBOARDING_STARTED', e.timestamp);
        break;
      case E.ONBOARDING_PARTIAL:
        setStage('ONBOARDING_PARTIAL', e.timestamp);
        break;
      case E.ONBOARDING_COMPLETED:
        setStage('IN_PORTAL', e.timestamp);
        break;
      default:
        break;
    }
  }

  return { stage, since: stageSinceTs };
}

/* ───────── Campaign stage derivation (per creator × campaign) ───────── */

const CAMPAIGN_STAGE_ORDER = [
  'NONE',
  'ASSIGNED',
  'DETAILS_VIEWED',
  'BRIEF_SCROLLED',
  'ACCEPTED',
  'PRODUCTS_SELECTED',
  'ORDER_PLACED',
  'PRODUCT_SHIPPED',
  'DELIVERED',
  'CONTENT_SUBMITTED',
  'CONTENT_REVISION_REQUESTED',
  'CONTENT_APPROVED',
  'CONTENT_LIVE',
  'DECLINED',
];

const CAMPAIGN_STAGE_LABEL = {
  NONE: 'Not assigned',
  ASSIGNED: 'Pre-selection',
  DETAILS_VIEWED: 'Viewed details',
  BRIEF_SCROLLED: 'Reviewed brief',
  ACCEPTED: 'Accepted',
  PRODUCTS_SELECTED: 'Products selected',
  ORDER_PLACED: 'Order placed',
  PRODUCT_SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CONTENT_SUBMITTED: 'Content submitted',
  CONTENT_REVISION_REQUESTED: 'Revision requested',
  CONTENT_APPROVED: 'Content approved',
  CONTENT_LIVE: 'Content live',
  DECLINED: 'Declined by creator',
};

function reduceCampaignStage(events) {
  const sorted = sortAsc(events);
  let stage = 'NONE';
  let visibleToBrand = false;
  let brandDecision = null; // 'INVITED' | 'ACCEPTED' | 'REJECTED' | 'NO_RESPONSE'
  let lastUpdate = null;

  for (const e of sorted) {
    lastUpdate = e.timestamp;
    switch (e.type) {
      case E.ASSIGNED_TO_CAMPAIGN: stage = 'ASSIGNED'; break;
      case E.CAMPAIGN_DETAILS_VIEWED: stage = 'DETAILS_VIEWED'; break;
      case E.CAMPAIGN_BRIEF_SCROLLED: stage = 'BRIEF_SCROLLED'; break;
      case E.CAMPAIGN_ACCEPTED: stage = 'ACCEPTED'; break;
      case E.CAMPAIGN_DECLINED: stage = 'DECLINED'; break;
      case E.PRODUCT_SELECTED:
      case E.PRODUCT_DESELECTED: stage = 'PRODUCTS_SELECTED'; break;
      case E.ORDER_PLACED: stage = 'ORDER_PLACED'; break;
      case E.PRODUCT_SHIPPED: stage = 'PRODUCT_SHIPPED'; break;
      case E.DELIVERY_CONFIRMED: stage = 'DELIVERED'; break;
      case E.CONTENT_SUBMITTED: stage = 'CONTENT_SUBMITTED'; break;
      case E.CONTENT_REVISION_REQUESTED: stage = 'CONTENT_REVISION_REQUESTED'; break;
      case E.CONTENT_APPROVED: stage = 'CONTENT_APPROVED'; break;
      case E.CONTENT_LIVE: stage = 'CONTENT_LIVE'; break;
      case E.VISIBLE_TO_BRAND_TOGGLED:
        visibleToBrand = !!e.payload?.visible;
        break;
      case E.BRAND_INVITED: brandDecision = 'INVITED'; break;
      case E.BRAND_ACCEPTED: brandDecision = 'ACCEPTED'; break;
      case E.BRAND_REJECTED: brandDecision = 'REJECTED'; break;
      case E.BRAND_NO_RESPONSE: brandDecision = 'NO_RESPONSE'; break;
      default: break;
    }
  }

  return { stage, visibleToBrand, brandDecision, lastUpdate };
}

/* ───────── Public selectors ───────── */

export function selectCreatorCampaigns(events, creatorId, campaigns) {
  const byCampaign = new Map();
  for (const e of events) {
    if (e.creatorId !== creatorId) continue;
    if (!CAMPAIGN_SCOPED_TYPES.has(e.type)) continue;
    if (!e.campaignId) continue;
    if (!byCampaign.has(e.campaignId)) byCampaign.set(e.campaignId, []);
    byCampaign.get(e.campaignId).push(e);
  }
  const out = [];
  for (const [campaignId, evts] of byCampaign.entries()) {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) continue;
    const reduced = reduceCampaignStage(evts);
    out.push({
      campaign,
      ...reduced,
      stageLabel: CAMPAIGN_STAGE_LABEL[reduced.stage],
    });
  }
  // Sort: live campaigns first, then completed, then draft; within group most-recent first.
  const statusRank = { live: 0, completed: 1, draft: 2 };
  out.sort((a, b) => {
    const r = (statusRank[a.campaign.status] ?? 3) - (statusRank[b.campaign.status] ?? 3);
    if (r !== 0) return r;
    return (b.lastUpdate ?? '').localeCompare(a.lastUpdate ?? '');
  });
  return out;
}

export function selectCreatorStatus(events, creatorId, campaigns) {
  const creatorEvents = eventsForCreator(events, creatorId);
  const portal = reducePortalStage(creatorEvents);
  const cs = selectCreatorCampaigns(events, creatorId, campaigns);
  const liveCampaign = cs.find((c) => c.campaign.status === 'live'
    && c.stage !== 'NONE' && c.stage !== 'DECLINED');
  const declinedAny = cs.some((c) => c.stage === 'DECLINED' || c.brandDecision === 'REJECTED');

  // Pill priority:
  // 1. Active campaign stage (blue) if currently in a live campaign
  // 2. Declined (red) if last action was a decline
  // 3. Portal status (green/yellow)
  // 4. Not in program (gray)
  if (liveCampaign) {
    return {
      kind: 'IN_CAMPAIGN',
      label: liveCampaign.stageLabel,
      color: 'blue',
      since: liveCampaign.lastUpdate,
    };
  }
  if (declinedAny && portal.stage !== 'IN_PORTAL') {
    return { kind: 'DECLINED', label: 'Declined', color: 'red', since: portal.since };
  }

  const map = {
    NOT_IN_PROGRAM: { label: 'Not in program', color: 'gray', kind: 'NOT_IN_PROGRAM' },
    INVITED: { label: 'Invited', color: 'yellow', kind: 'INVITED' },
    INVITE_VIEWED: { label: 'Invite viewed', color: 'yellow', kind: 'INVITED' },
    INVITE_DISMISSED: { label: 'Invite dismissed', color: 'red', kind: 'DECLINED' },
    ONBOARDING_STARTED: { label: 'Onboarding started', color: 'yellow', kind: 'INVITED' },
    ONBOARDING_PARTIAL: { label: 'Onboarding partial', color: 'yellow', kind: 'INVITED' },
    IN_PORTAL: { label: 'In Portal', color: 'green', kind: 'IN_PORTAL' },
  };
  const m = map[portal.stage] ?? map.NOT_IN_PROGRAM;
  return { ...m, since: portal.since };
}

export function selectDaysInStage(status) {
  if (!status?.since) return { days: 0, stalled: false };
  const sinceMs = Date.parse(status.since);
  const todayMs = Date.parse(TODAY_ISO);
  const days = Math.max(0, Math.floor((todayMs - sinceMs) / (1000 * 60 * 60 * 24)));
  const stalled =
    days >= STALL_THRESHOLD_DAYS
    && (status.kind === 'INVITED' || status.kind === 'IN_CAMPAIGN');
  return { days, stalled };
}

export function selectActivityFeed(events, creatorId) {
  return sortDesc(eventsForCreator(events, creatorId));
}

/* ───────── Filter helpers ───────── */

// Chips are mutually exclusive — each creator falls into exactly one bucket.
//   in-campaign: status.kind === 'IN_CAMPAIGN'
//   in-portal:   status.kind === 'IN_PORTAL'
//   invited:     status.kind === 'INVITED'
//   no-campaign: anything else (NOT_IN_PROGRAM or DECLINED w/o portal completion)
export function rosterFilterMatches(filter, status) {
  switch (filter) {
    case 'all': return true;
    case 'in-portal': return status.kind === 'IN_PORTAL';
    case 'invited': return status.kind === 'INVITED';
    case 'in-campaign': return status.kind === 'IN_CAMPAIGN';
    case 'no-campaign':
      return status.kind === 'NOT_IN_PROGRAM' || status.kind === 'DECLINED';
    default: return true;
  }
}

export function searchMatches(query, creator) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    creator.name?.toLowerCase().includes(q)
    || creator.handle?.toLowerCase().includes(q)
    || creator.email?.toLowerCase().includes(q)
  );
}

export { CAMPAIGN_STAGE_LABEL };

/* ───────── Brand-pool status (per creator × brand) ───────── */

export function selectBrandPoolStatus(events, creatorId, brandId) {
  const sorted = sortAsc(events.filter((e) =>
    e.creatorId === creatorId && e.brandId === brandId
    && (e.type === E.BRAND_POOL_ADDED
        || e.type === E.BRAND_POOL_QUALIFIED
        || e.type === E.BRAND_POOL_ARCHIVED
        || e.type === E.BRAND_POOL_UNARCHIVED)
  ));
  if (sorted.length === 0) return null;

  let status = null;
  let archiveReason = null;
  let archiveNote = null;
  let since = null;

  for (const e of sorted) {
    switch (e.type) {
      case E.BRAND_POOL_ADDED:
        if (!status) {
          status = 'potential';
          since = e.timestamp;
        }
        break;
      case E.BRAND_POOL_CONFIRMED:
        if (status !== 'qualified' && status !== 'archived') {
          status = 'confirmed';
          since = e.timestamp;
        }
        break;
      case E.BRAND_POOL_QUALIFIED:
        if (status !== 'archived') {
          status = 'qualified';
          since = e.timestamp;
        }
        break;
      case E.BRAND_POOL_ARCHIVED:
        status = 'archived';
        archiveReason = e.payload?.reason ?? null;
        archiveNote = e.payload?.note ?? null;
        since = e.timestamp;
        break;
      case E.BRAND_POOL_UNARCHIVED:
        status = 'potential';
        archiveReason = null;
        archiveNote = null;
        since = e.timestamp;
        break;
      default: break;
    }
  }
  return { status, archiveReason, archiveNote, since };
}

export function selectBrandPool(events, brandId) {
  // Returns array of { creatorId, status, archiveReason, since } for everyone in the brand pool
  const byCreator = new Map();
  for (const e of events) {
    if (e.brandId !== brandId) continue;
    if (
      e.type === E.BRAND_POOL_ADDED
      || e.type === E.BRAND_POOL_QUALIFIED
      || e.type === E.BRAND_POOL_ARCHIVED
      || e.type === E.BRAND_POOL_UNARCHIVED
    ) {
      if (!byCreator.has(e.creatorId)) byCreator.set(e.creatorId, []);
      byCreator.get(e.creatorId).push(e);
    }
  }
  const out = [];
  for (const [creatorId, evts] of byCreator) {
    const status = selectBrandPoolStatusFromEvents(evts);
    if (status) out.push({ creatorId, ...status });
  }
  return out;
}

function selectBrandPoolStatusFromEvents(creatorBrandEvents) {
  const sorted = sortAsc(creatorBrandEvents);
  let status = null;
  let archiveReason = null;
  let archiveNote = null;
  let since = null;
  for (const e of sorted) {
    switch (e.type) {
      case E.BRAND_POOL_ADDED:
        if (!status) { status = 'potential'; since = e.timestamp; }
        break;
      case E.BRAND_POOL_CONFIRMED:
        if (status !== 'qualified' && status !== 'archived') { status = 'confirmed'; since = e.timestamp; }
        break;
      case E.BRAND_POOL_QUALIFIED:
        if (status !== 'archived') { status = 'qualified'; since = e.timestamp; }
        break;
      case E.BRAND_POOL_ARCHIVED:
        status = 'archived';
        archiveReason = e.payload?.reason ?? null;
        archiveNote = e.payload?.note ?? null;
        since = e.timestamp;
        break;
      case E.BRAND_POOL_UNARCHIVED:
        status = 'potential';
        archiveReason = null;
        archiveNote = null;
        since = e.timestamp;
        break;
      default: break;
    }
  }
  return status ? { status, archiveReason, archiveNote, since } : null;
}

/* ───────── Brand notes ───────── */

export function selectBrandNotes(events, brandId) {
  return sortDesc(events.filter((e) =>
    e.type === E.BRAND_NOTE_ADDED && e.brandId === brandId
  ));
}

/* ───────── Brand-aware time-since helper ───────── */

export function relativeDays(iso) {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Math.max(0, Math.floor((Date.parse(TODAY_ISO) - ms) / 86400000));
}

/* ───────── Brief-fit deterministic scorer ───────── */
// Returns { score, reasons[], fit: 'green'|'red' }

export function scoreBriefFit(creator, brief) {
  let score = 0;
  const reasons = [];
  const negatives = [];

  // Category overlap
  const briefCats = (brief.categories ?? []).map((c) => c.toLowerCase());
  const creatorCats = (creator.categories ?? []).map((c) => c.toLowerCase());
  const overlap = creatorCats.filter((c) => briefCats.includes(c));
  if (overlap.length > 0) {
    score += overlap.length * 2;
    reasons.push(`${overlap.length} category match${overlap.length === 1 ? '' : 'es'}: ${overlap.join(', ')}`);
  } else if (briefCats.length > 0 && creatorCats.length > 0) {
    score -= 3;
    negatives.push('no category overlap with brief');
  }

  // Platform requirements
  if (brief.platforms?.length > 0) {
    const creatorPlatforms = creator.socials ?? [];
    const supported = brief.platforms.filter((p) => creatorPlatforms.includes(p));
    const missing = brief.platforms.filter((p) => !creatorPlatforms.includes(p));
    if (supported.length === brief.platforms.length) {
      score += 2;
      reasons.push(`covers required platforms (${supported.join(', ')})`);
    } else if (missing.length > 0) {
      score -= 4;
      negatives.push(`missing required platform: ${missing.join(', ')}`);
    }
  }

  // Gifted openness for gifted briefs
  if (brief.gifted) {
    const small = creator.preferences?.smallBrands;
    if (small === 'yes') { score += 2; reasons.push('open to small brands'); }
    else if (small === 'no') { score -= 5; negatives.push('not open to small brands'); }
    else if (small === 'maybe') { score += 0; reasons.push('cautious on small brands'); }
  }

  // Avoid match (strong negative)
  const avoidText = (creator.preferences?.avoid ?? '').toLowerCase();
  if (brief.vertical && avoidText.includes(brief.vertical.toLowerCase())) {
    score -= 6;
    negatives.push(`creator listed "${brief.vertical}" in avoid`);
  }

  // Onboarding completeness as confidence boost
  if (creator.onboardingStatus === 'complete') {
    score += 1;
  }

  return {
    score,
    fit: score >= 2 ? 'green' : 'red',
    reasons: reasons.concat(negatives.map((n) => `⚠ ${n}`)),
  };
}

/* ───────── Tags (auto-rules + custom) ───────── */

export const AUTO_TAG_RULES = [
  {
    id: 'instagram-only',
    label: 'Instagram only',
    test: (c) => c.socials?.includes('instagram') && !c.socials?.includes('tiktok'),
  },
  {
    id: 'tiktok-only',
    label: 'TikTok only',
    test: (c) => c.socials?.includes('tiktok') && !c.socials?.includes('instagram'),
  },
  {
    id: 'not-open-to-gifted',
    label: 'Not open to gifted',
    test: (c) => /no/i.test(c.preferences?.giftedOpenness ?? '') && !/very open|open/i.test(c.preferences?.giftedOpenness ?? ''),
  },
  {
    id: 'not-open-to-small-brands',
    label: 'Not open to small brands',
    test: (c) => c.preferences?.smallBrands === 'no',
  },
  {
    id: 'food-vertical',
    label: 'Food vertical',
    test: (c) => (c.categories ?? []).some((cat) => /food|recipe|cook/i.test(cat)),
  },
  {
    id: 'clean-beauty',
    label: 'Clean beauty',
    test: (c) =>
      (c.categories ?? []).some((cat) => /beauty|skincare/i.test(cat))
      && /clean/i.test(c.preferences?.workWith ?? ''),
  },
];

export function selectAutoTags(creator) {
  return AUTO_TAG_RULES.filter((rule) => rule.test(creator)).map((rule) => rule.id);
}

export function selectAllTags(creator) {
  // Combines auto-applied + custom (from creator.customTags)
  return [...new Set([...selectAutoTags(creator), ...(creator.customTags ?? [])])];
}

/* ───────── Scoring (per creator, derived from event log) ───────── */

export function selectCreatorScores(events, creatorId) {
  const all = eventsForCreator(events, creatorId);

  // Overall rating: average of CAMPAIGN_RATED events
  const ratings = all.filter((e) => e.type === E.CAMPAIGN_RATED).map((e) => e.payload?.rating).filter(Boolean);
  const overallRating = ratings.length === 0 ? null
    : ratings.reduce((a, b) => a + b, 0) / ratings.length;

  // Campaign acceptance rate
  const assigned = all.filter((e) => e.type === E.ASSIGNED_TO_CAMPAIGN).length;
  const accepted = all.filter((e) => e.type === E.CAMPAIGN_ACCEPTED).length;
  const declined = all.filter((e) => e.type === E.CAMPAIGN_DECLINED).length;
  const acceptanceRate = (assigned === 0) ? null : accepted / assigned;

  // Post compliance rate (based on POST_COMPLIANCE_LOGGED events)
  const postsLogged = all.filter((e) => e.type === E.POST_COMPLIANCE_LOGGED);
  const postsCompliant = postsLogged.filter((e) => e.payload?.posted && e.payload?.on_time).length;
  const postCompliance = postsLogged.length === 0 ? null : postsCompliant / postsLogged.length;

  // Speed of onboarding (days between PORTAL_INVITE_SENT and ONBOARDING_COMPLETED)
  const inviteSent = all.find((e) => e.type === E.PORTAL_INVITE_SENT);
  const onboardingComplete = all.find((e) => e.type === E.ONBOARDING_COMPLETED);
  const onboardingSpeed = (inviteSent && onboardingComplete)
    ? Math.round((Date.parse(onboardingComplete.timestamp) - Date.parse(inviteSent.timestamp)) / 86400000)
    : null;

  // Responsiveness: average days from invite sent to first response
  let respDays = null;
  if (inviteSent) {
    const firstResponse = all.find((e) =>
      Date.parse(e.timestamp) > Date.parse(inviteSent.timestamp)
      && [E.PORTAL_INVITE_VIEWED, E.ONBOARDING_STARTED, E.CAMPAIGN_DETAILS_VIEWED, E.CAMPAIGN_ACCEPTED, E.CAMPAIGN_DECLINED].includes(e.type)
    );
    if (firstResponse) {
      respDays = Math.round((Date.parse(firstResponse.timestamp) - Date.parse(inviteSent.timestamp)) / 86400000);
    }
  }

  return {
    overallRating,
    acceptanceRate,
    postCompliance,
    onboardingSpeed,
    responsivenessDays: respDays,
    campaignsAccepted: accepted,
    campaignsDeclined: declined,
    campaignsAssigned: assigned,
  };
}

/* ───────── AI Card (per creator × campaign) ───────── */

export function selectAICard(events, creatorId, campaignId) {
  const cardEvents = events.filter((e) =>
    e.creatorId === creatorId && e.campaignId === campaignId
    && (e.type === E.AI_CARD_GENERATED || e.type === E.AI_CARD_REVIEWED || e.type === E.AI_CARD_REWORKED)
  );
  if (cardEvents.length === 0) return null;

  let bullets = [];
  let videos = [];
  let reviewedAt = null;
  let reviewedBy = null;
  let generatedAt = null;

  for (const e of sortAsc(cardEvents)) {
    if (e.type === E.AI_CARD_GENERATED || e.type === E.AI_CARD_REWORKED) {
      bullets = e.payload?.bullets ?? bullets;
      videos = e.payload?.videos ?? videos;
      generatedAt = e.timestamp;
      if (e.type === E.AI_CARD_REWORKED) {
        reviewedAt = null;
        reviewedBy = null;
      }
    }
    if (e.type === E.AI_CARD_REVIEWED) {
      reviewedAt = e.timestamp;
      reviewedBy = e.actor?.name ?? 'ops';
    }
  }
  return { bullets, videos, reviewedAt, reviewedBy, generatedAt };
}

/* ───────── Auto-archive (7 days no response) ───────── */

export function shouldAutoArchive(portalStatus) {
  if (!portalStatus) return false;
  if (portalStatus.kind !== 'INVITED') return false;
  if (!portalStatus.since) return false;
  const days = relativeDays(portalStatus.since);
  return days >= 7;
}

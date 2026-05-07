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

// Portal Status is exactly one of THREE values per Katie's spec (May 7):
//   - Not in Creator Program (gray)
//   - Invited to Creator Program (yellow) — invited / viewed / onboarding-started/partial
//   - In Creator Program (green) — onboarding complete
// This is the ONLY thing the "Portal Status" column should show. Campaign
// stage info is surfaced separately (per-campaign tabs / brand pool stages).
export function selectCreatorStatus(events, creatorId /* campaigns is no longer used here, kept for arg compat */) {
  const creatorEvents = eventsForCreator(events, creatorId);
  const portal = reducePortalStage(creatorEvents);

  // Treat anything between INVITED and IN_PORTAL as "Invited to Creator Program"
  const INVITED_STAGES = new Set([
    'INVITED', 'INVITE_VIEWED', 'INVITE_DISMISSED',
    'ONBOARDING_STARTED', 'ONBOARDING_PARTIAL',
  ]);

  if (portal.stage === 'IN_PORTAL') {
    return { kind: 'IN_PORTAL', label: 'In Creator Program', color: 'green', since: portal.since };
  }
  if (INVITED_STAGES.has(portal.stage)) {
    return { kind: 'INVITED', label: 'Invited to Creator Program', color: 'yellow', since: portal.since };
  }
  return { kind: 'NOT_IN_PROGRAM', label: 'Not in Creator Program', color: 'gray', since: portal.since };
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

// Chips on the Creators tab combine portal status + "currently in a live campaign":
//   in-portal:   IN_PORTAL and not in any live campaign
//   in-campaign: in a live, non-declined campaign (regardless of portal status)
//   invited:     INVITED (portal pending) and not in a live campaign
//   no-campaign: NOT_IN_PROGRAM
export function rosterFilterMatches(filter, status, hasLiveCampaign = false) {
  switch (filter) {
    case 'all': return true;
    case 'in-portal': return status.kind === 'IN_PORTAL' && !hasLiveCampaign;
    case 'invited': return status.kind === 'INVITED' && !hasLiveCampaign;
    case 'in-campaign': return hasLiveCampaign;
    case 'no-campaign':
      return status.kind === 'NOT_IN_PROGRAM' && !hasLiveCampaign;
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

// Returns the brand-pool memberships across ALL brands for a single creator.
// Used by the Overview tab to show "this creator is in N brand pools".
export function selectCreatorBrandPools(events, creatorId, brands) {
  const out = [];
  for (const brand of brands) {
    const status = selectBrandPoolStatus(events, creatorId, brand.id);
    if (status) out.push({ brand, ...status });
  }
  // Order: qualified → confirmed → potential → archived; tie-break recency
  const rank = { qualified: 0, confirmed: 1, potential: 2, archived: 3 };
  out.sort((a, b) => {
    const r = (rank[a.status] ?? 4) - (rank[b.status] ?? 4);
    if (r !== 0) return r;
    return (b.since ?? '').localeCompare(a.since ?? '');
  });
  return out;
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

/* ─────────────────────────────────────────
   Fit Score (per Creator Scoring Spec §3C)

   Five weighted inputs, all 0–10:
     30% — Content tag overlap (% of brief tags matched by creator's tags)
     25% — Platform availability (binary: covers required platforms)
     20% — Gifted campaign openness (yes=10, maybe=5, no=0)
     15% — Small brand willingness (when brand is small) yes=10, maybe=5, no=0
     10% — Past decline penalty (10 = no past decline; 0 = previous decline)

   Returns score on 0–10 scale + breakdown.
   ───────────────────────────────────────── */

export function scoreBriefFit(creator, brief, ctx = {}) {
  const { hasPastDeclineForThisBrand = false } = ctx;

  // Tag overlap (using both categories and customTags + auto tags)
  const briefTags = [
    ...(brief.categories ?? []),
    ...(brief.tags ?? []),
  ].map((t) => String(t).toLowerCase().trim());
  const creatorTags = [
    ...(creator.categories ?? []),
    ...selectAutoTags(creator).map((id) => id.replace(/-/g, ' ')),
    ...(creator.customTags ?? []),
  ].map((t) => String(t).toLowerCase().trim());
  const overlap = creatorTags.filter((c) => briefTags.includes(c));
  const tagOverlapPct = briefTags.length === 0 ? 0 : Math.min(1, overlap.length / briefTags.length);
  const tagScore = tagOverlapPct * 10;

  // Platform availability (binary)
  const creatorPlatforms = creator.socials ?? [];
  const requiredPlatforms = brief.platforms ?? [];
  const allCovered = requiredPlatforms.length > 0
    && requiredPlatforms.every((p) => creatorPlatforms.includes(p));
  const platformScore = allCovered ? 10 : 0;
  const missingPlatforms = requiredPlatforms.filter((p) => !creatorPlatforms.includes(p));

  // Gifted openness
  const giftedAns = creator.preferences?.giftedOpenness?.toLowerCase() ?? '';
  let giftedScore = 5; // neutral default if missing
  let giftedSource = 'missing';
  if (creator.preferences?.smallBrands === 'yes' || /yes|very open/i.test(giftedAns)) {
    giftedScore = 10; giftedSource = 'yes';
  } else if (creator.preferences?.smallBrands === 'no' || /^no/i.test(giftedAns)) {
    giftedScore = 0; giftedSource = 'no';
  } else if (creator.preferences?.smallBrands === 'maybe' || /maybe/i.test(giftedAns)) {
    giftedScore = 5; giftedSource = 'maybe';
  }

  // Small brand willingness (only applies when brand is small)
  let smallBrandScore = 5;
  let smallBrandSource = 'n/a';
  if (brief.brandIsSmall) {
    if (creator.preferences?.smallBrands === 'yes') { smallBrandScore = 10; smallBrandSource = 'yes'; }
    else if (creator.preferences?.smallBrands === 'no') { smallBrandScore = 0; smallBrandSource = 'no'; }
    else if (creator.preferences?.smallBrands === 'maybe') { smallBrandScore = 5; smallBrandSource = 'maybe'; }
    else { smallBrandScore = 5; smallBrandSource = 'missing'; }
  }

  // Past-decline penalty
  const declineScore = hasPastDeclineForThisBrand ? 0 : 10;

  // Weighted composite
  const fit =
    0.30 * tagScore
    + 0.25 * platformScore
    + 0.20 * giftedScore
    + 0.15 * smallBrandScore
    + 0.10 * declineScore;

  // Reasons (for display)
  const reasons = [];
  if (overlap.length > 0) reasons.push(`tag match: ${overlap.slice(0, 3).join(', ')}${overlap.length > 3 ? '…' : ''}`);
  if (allCovered) reasons.push(`covers required platforms`);
  if (giftedSource === 'yes') reasons.push(`open to gifted`);
  if (brief.brandIsSmall && smallBrandSource === 'yes') reasons.push(`open to small brands`);

  const negatives = [];
  if (briefTags.length > 0 && overlap.length === 0) negatives.push(`no tag overlap`);
  if (missingPlatforms.length > 0) negatives.push(`missing platform: ${missingPlatforms.join(', ')}`);
  if (giftedSource === 'no') negatives.push(`not open to gifted`);
  if (brief.brandIsSmall && smallBrandSource === 'no') negatives.push(`not open to small brands`);
  if (hasPastDeclineForThisBrand) negatives.push(`past decline of this brand`);

  // Onboarding incomplete?
  const incompleteOnboarding = !creator.preferences?.giftedOpenness && !creator.preferences?.smallBrands;

  // Bucket: low / medium / high (for bar display)
  let bucket = 'low';
  if (fit >= 7) bucket = 'high';
  else if (fit >= 4) bucket = 'medium';

  return {
    fit,                             // 0–10
    bucket,                          // 'low' | 'medium' | 'high'
    breakdown: {
      tag: { score: tagScore, weight: 0.30, overlap, briefTags },
      platform: { score: platformScore, weight: 0.25, missing: missingPlatforms, covered: allCovered },
      gifted: { score: giftedScore, weight: 0.20, source: giftedSource },
      smallBrand: { score: smallBrandScore, weight: 0.15, source: smallBrandSource, applicable: !!brief.brandIsSmall },
      decline: { score: declineScore, weight: 0.10, hasPastDecline: hasPastDeclineForThisBrand },
    },
    reasons: reasons.concat(negatives.map((n) => `⚠ ${n}`)),
    incompleteOnboarding,
    // Backwards-compat for existing brief check usage (was 'green'/'red' threshold)
    score: fit, // numeric for sorting
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

/* ─────────────────────────────────────────
   Scoring (per Creator Scoring Spec, May 2026)

   Three independent sub-scores:
     R — Reliability (auto, 4 weighted signals)
     Q — Quality (manual rating average w/ recency decay)
     F — Fit (per-campaign, computed at evaluation time, NOT stored here)

   Composite Overall = 0.6R + 0.4Q
   ───────────────────────────────────────── */

const TODAY_MS = Date.parse(TODAY_ISO);

// Recency decay: 6mo = 50% weight, 12mo = 25% weight
function recencyWeight(timestamp) {
  if (!timestamp) return 1;
  const monthsAgo = (TODAY_MS - Date.parse(timestamp)) / (1000 * 60 * 60 * 24 * 30);
  if (monthsAgo > 12) return 0.25;
  if (monthsAgo > 6) return 0.5;
  return 1;
}

// Reply-speed → score (per spec: 0d=10, 1d=9, 2d=7, 3d=5, 4d=3, 5+=1, none=0)
function replyScoreForDays(days) {
  if (days == null) return 0;
  if (days <= 0) return 10;
  if (days === 1) return 9;
  if (days === 2) return 7;
  if (days === 3) return 5;
  if (days === 4) return 3;
  return 1;
}

export function selectCreatorScores(events, creatorId) {
  const all = eventsForCreator(events, creatorId);

  // ── Inputs ──
  const inviteSent = all.find((e) => e.type === E.PORTAL_INVITE_SENT);
  const onboardingComplete = all.find((e) => e.type === E.ONBOARDING_COMPLETED);
  const onboardingPartial = all.find((e) => e.type === E.ONBOARDING_PARTIAL);
  const onboardingStarted = all.find((e) => e.type === E.ONBOARDING_STARTED);

  const assigned = all.filter((e) => e.type === E.ASSIGNED_TO_CAMPAIGN).length;
  const accepted = all.filter((e) => e.type === E.CAMPAIGN_ACCEPTED).length;
  const declined = all.filter((e) => e.type === E.CAMPAIGN_DECLINED).length;

  const postsLogged = all.filter((e) => e.type === E.POST_COMPLIANCE_LOGGED);
  const postsCompliant = postsLogged.filter((e) => e.payload?.posted && e.payload?.on_time).length;

  const ratingEvents = all.filter((e) => e.type === E.CAMPAIGN_RATED);

  // ── Reliability sub-signals (each 0–10) ──
  let replyScore = null, replyDays = null;
  if (inviteSent) {
    const firstResponse = all.find((e) =>
      Date.parse(e.timestamp) > Date.parse(inviteSent.timestamp)
      && [E.PORTAL_INVITE_VIEWED, E.ONBOARDING_STARTED, E.CAMPAIGN_DETAILS_VIEWED,
          E.CAMPAIGN_ACCEPTED, E.CAMPAIGN_DECLINED].includes(e.type),
    );
    if (firstResponse) {
      replyDays = Math.round((Date.parse(firstResponse.timestamp) - Date.parse(inviteSent.timestamp)) / 86400000);
      replyScore = replyScoreForDays(replyDays);
    } else {
      // Sent ≥7 days ago without response → 0 (auto-archive trigger range)
      const daysWaiting = relativeDays(inviteSent.timestamp);
      if (daysWaiting >= 7) replyScore = 0;
      else replyScore = null; // not enough data yet
    }
  }

  let onboardingScore = null;
  if (onboardingComplete) onboardingScore = 10;
  else if (onboardingPartial || onboardingStarted) onboardingScore = 5;
  else if (inviteSent) onboardingScore = 0; // invited but never started

  // Post compliance: only if ≥1 campaign completed
  const complianceScore = postsLogged.length > 0
    ? (postsCompliant / postsLogged.length) * 10
    : null;

  // Acceptance rate: only if ≥3 invites
  const acceptanceScore = assigned >= 3
    ? (accepted / assigned) * 10
    : null;

  // ── Reliability composite (0–10) ──
  // Weights: 35% reply, 25% onboarding, 25% compliance, 15% acceptance
  // If a signal is missing (null), redistribute its weight proportionally.
  const reliabilityInputs = [
    { score: replyScore, weight: 0.35 },
    { score: onboardingScore, weight: 0.25 },
    { score: complianceScore, weight: 0.25 },
    { score: acceptanceScore, weight: 0.15 },
  ];
  const present = reliabilityInputs.filter((s) => s.score != null);
  const totalWeight = present.reduce((a, b) => a + b.weight, 0);
  const reliability = (totalWeight === 0)
    ? null
    : present.reduce((sum, s) => sum + s.score * (s.weight / totalWeight), 0);

  // ── Quality sub-score: weighted average of ratings with recency decay ──
  let quality = null;
  let qualityCount = 0;
  if (ratingEvents.length > 0) {
    let sum = 0;
    let weightSum = 0;
    for (const e of ratingEvents) {
      const r = e.payload?.rating;
      if (r == null) continue;
      const w = recencyWeight(e.timestamp);
      sum += r * w;
      weightSum += w;
      qualityCount += 1;
    }
    if (weightSum > 0) quality = sum / weightSum;
  }

  // ── Composite Overall (0.6R + 0.4Q; if Q missing, R only) ──
  let overall = null;
  let overallMode = 'no-data';
  if (reliability != null && quality != null) {
    overall = 0.6 * reliability + 0.4 * quality;
    overallMode = 'composite';
  } else if (reliability != null) {
    overall = reliability;
    overallMode = 'reliability-only';
  } else if (quality != null) {
    overall = quality;
    overallMode = 'quality-only';
  }

  // Days to onboarding complete (for display)
  const onboardingSpeed = (inviteSent && onboardingComplete)
    ? Math.round((Date.parse(onboardingComplete.timestamp) - Date.parse(inviteSent.timestamp)) / 86400000)
    : null;

  return {
    overall,
    overallMode, // 'composite' | 'reliability-only' | 'quality-only' | 'no-data'
    reliability,
    quality,
    qualityCount,
    // Reliability sub-signals (for breakdown)
    reliabilityBreakdown: {
      reply: { score: replyScore, days: replyDays, weight: 0.35 },
      onboarding: { score: onboardingScore, weight: 0.25 },
      compliance: { score: complianceScore, weight: 0.25, samples: postsLogged.length },
      acceptance: { score: acceptanceScore, weight: 0.15, accepted, assigned, sampleFloor: 3 },
    },
    // Raw values for the Scoring tab
    onboardingSpeed,
    responsivenessDays: replyDays,
    campaignsAccepted: accepted,
    campaignsDeclined: declined,
    campaignsAssigned: assigned,
    postCompliance: complianceScore != null ? complianceScore / 10 : null,
    acceptanceRate: assigned >= 3 ? accepted / assigned : null,
    overallRating: quality, // backwards-compat alias
    isNew: !inviteSent && qualityCount === 0,
  };
}

// Quality-rating timeline (for Scoring tab change log)
export function selectQualityRatings(events, creatorId, campaigns) {
  return eventsForCreator(events, creatorId)
    .filter((e) => e.type === E.CAMPAIGN_RATED)
    .map((e) => ({
      id: e.id,
      rating: e.payload?.rating,
      campaign: campaigns.find((c) => c.id === e.campaignId),
      ratedBy: e.actor?.name ?? 'Ops',
      timestamp: e.timestamp,
      decayWeight: recencyWeight(e.timestamp),
    }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// Score event history (for "Score change log" — last N changes)
export function selectScoreEvents(events, creatorId, n = 5) {
  const types = new Set([
    E.PORTAL_INVITE_SENT, E.PORTAL_INVITE_VIEWED, E.ONBOARDING_COMPLETED,
    E.ONBOARDING_PARTIAL, E.CAMPAIGN_ACCEPTED, E.CAMPAIGN_DECLINED,
    E.CAMPAIGN_RATED, E.POST_COMPLIANCE_LOGGED,
  ]);
  return eventsForCreator(events, creatorId)
    .filter((e) => types.has(e.type))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, n);
}

// Has the creator previously declined the same brand?
export function hasPastDeclineForBrand(events, creatorId, brandId, campaigns, brandHandleByCampaign = null) {
  const declines = events.filter((e) =>
    e.creatorId === creatorId && e.type === E.CAMPAIGN_DECLINED,
  );
  if (declines.length === 0) return null;
  for (const d of declines) {
    const camp = campaigns.find((c) => c.id === d.campaignId);
    if (!camp) continue;
    // Brand match: either via the (provided) lookup or by handle compare against passed brand
    if (brandHandleByCampaign && brandHandleByCampaign[camp.id] === brandId) {
      return { reason: d.payload?.reason, timestamp: d.timestamp, campaign: camp };
    }
  }
  return null;
}

// Score color per spec
export function overallScoreColor(score) {
  if (score == null) return 'gray';
  if (score >= 8) return 'green';
  if (score >= 6) return 'yellow';
  return 'red';
}

/* ─────────────────────────────────────────
   Brand operational state (per Brands tab redesign)
   ───────────────────────────────────────── */

export function selectBrandOperationalState(brand, events) {
  const brandEvents = events.filter((e) => e.brandId === brand.id);

  // Onboarding
  let onboarding = brand.initialOnboarding ?? 'not-started';
  if (brandEvents.some((e) => e.type === E.BRAND_ONBOARDING_COMPLETED)) onboarding = 'complete';
  else if (brandEvents.some((e) => e.type === E.BRAND_ONBOARDING_STARTED)) onboarding = 'in-progress';

  // Contract
  let contract = brand.initialContract ?? 'unsigned';
  if (brandEvents.some((e) => e.type === E.BRAND_CONTRACT_SIGNED)) contract = 'signed';

  // Billing
  let billing = brand.initialBilling ?? 'awaiting-first-payment';
  if (brandEvents.some((e) => e.type === E.BRAND_BILLING_SETTLED)) billing = 'settled';
  else if (brandEvents.some((e) => e.type === E.BRAND_INVOICE_PAID)) billing = 'active';
  else if (brandEvents.some((e) => e.type === E.BRAND_INVOICE_SENT)) billing = 'awaiting-first-payment';

  return { onboarding, contract, billing };
}

// Top-level brand status pill
export function selectBrandStatus(brand, operationalState, brandCampaigns) {
  if (operationalState.onboarding !== 'complete' || operationalState.contract !== 'signed'
      || operationalState.billing === 'awaiting-first-payment') {
    return { kind: 'onboarding', label: 'Onboarding', color: 'yellow' };
  }
  const hasLive = brandCampaigns.some((c) => c.status === 'live');
  const hasDraft = brandCampaigns.some((c) => c.status === 'draft');
  const allCompleted = brandCampaigns.length > 0 && brandCampaigns.every((c) => c.status === 'completed');
  if (allCompleted) return { kind: 'completed', label: 'Completed', color: 'green' };
  if (hasLive || hasDraft) return { kind: 'active', label: 'Active', color: 'green' };
  return { kind: 'inactive', label: 'No campaigns', color: 'gray' };
}

/* ─────────────────────────────────────────
   Per-campaign stage counts (for the brand tab)
   ───────────────────────────────────────── */

export function selectCampaignStageCounts(events, campaignId, campaigns) {
  // Get unique creators in this campaign
  const creatorIds = new Set();
  for (const e of events) {
    if (e.campaignId === campaignId && e.creatorId) creatorIds.add(e.creatorId);
  }
  const counts = {
    invited: 0,        // assigned but no decision yet
    accepted: 0,       // accepted, not yet shipped
    declined: 0,
    productSelected: 0,
    ordered: 0,
    shipped: 0,
    delivered: 0,
    contentSubmitted: 0,
    awaitingReview: 0,
    feedbackGiven: 0,
    waitingFinalLinks: 0,
    posted: 0,
    completed: 0,
    total: creatorIds.size,
    waitingOnBrand: 0,
  };

  for (const cid of creatorIds) {
    const cs = selectCreatorCampaigns(events, cid, campaigns).find((x) => x.campaign.id === campaignId);
    if (!cs) continue;
    const stage = cs.stage;
    if (stage === 'DECLINED') counts.declined += 1;
    else if (stage === 'ASSIGNED' || stage === 'DETAILS_VIEWED' || stage === 'BRIEF_SCROLLED') counts.invited += 1;
    else if (stage === 'ACCEPTED') counts.accepted += 1;
    else if (stage === 'PRODUCTS_SELECTED') counts.productSelected += 1;
    else if (stage === 'ORDER_PLACED') counts.ordered += 1;
    else if (stage === 'PRODUCT_SHIPPED') { counts.shipped += 1; counts.waitingOnBrand += 1; }
    else if (stage === 'DELIVERED') counts.delivered += 1;
    else if (stage === 'CONTENT_SUBMITTED') { counts.contentSubmitted += 1; counts.awaitingReview += 1; }
    else if (stage === 'CONTENT_REVISION_REQUESTED') counts.feedbackGiven += 1;
    else if (stage === 'CONTENT_APPROVED') counts.waitingFinalLinks += 1;
    else if (stage === 'CONTENT_LIVE') counts.posted += 1;
  }
  return counts;
}

// Stale invites: assigned >7 days ago with no progression past ASSIGNED
export function selectStaleInvitesForCampaign(events, campaignId, campaigns, creators) {
  const stale = [];
  const creatorIds = new Set();
  for (const e of events) {
    if (e.campaignId === campaignId && e.creatorId) creatorIds.add(e.creatorId);
  }
  for (const cid of creatorIds) {
    const cs = selectCreatorCampaigns(events, cid, campaigns).find((x) => x.campaign.id === campaignId);
    if (!cs) continue;
    if (cs.stage === 'ASSIGNED' || cs.stage === 'DETAILS_VIEWED' || cs.stage === 'BRIEF_SCROLLED') {
      const days = relativeDays(cs.lastUpdate);
      if (days >= 7) {
        const creator = creators.find((c) => c.id === cid);
        stale.push({ creator, days, lastUpdate: cs.lastUpdate, stage: cs.stage });
      }
    }
  }
  return stale;
}

// Per-campaign waiting state (who's blocking?)
export function selectCampaignWaitingState(stageCounts, campaign, opState) {
  if (campaign.status === 'completed') return { kind: 'done', label: 'Done', color: 'green' };
  if (campaign.status === 'draft' && stageCounts.total === 0) {
    if (opState.onboarding !== 'complete' || opState.billing === 'awaiting-first-payment') {
      return { kind: 'waiting-on-brand', label: 'Waiting on brand', color: 'yellow' };
    }
    return { kind: 'waiting-on-us', label: 'Waiting on us', color: 'blue' };
  }
  // For live campaigns:
  // If any creators are at "shipped" or earlier-brand-action stages
  if (stageCounts.invited > 0 && stageCounts.accepted === 0) {
    return { kind: 'waiting-on-creators', label: 'Awaiting creator decisions', color: 'yellow' };
  }
  if (stageCounts.accepted > 0 || stageCounts.productSelected > 0) {
    return { kind: 'waiting-on-brand', label: 'Waiting on brand', color: 'yellow' };
  }
  if (stageCounts.shipped > 0) {
    return { kind: 'waiting-on-creators', label: 'Awaiting content', color: 'yellow' };
  }
  if (stageCounts.contentSubmitted > 0) {
    return { kind: 'waiting-on-brand', label: 'Brand reviewing content', color: 'yellow' };
  }
  if (stageCounts.posted > 0 && stageCounts.posted === stageCounts.total) {
    return { kind: 'done', label: 'On track', color: 'green' };
  }
  return { kind: 'on-track', label: 'On track', color: 'green' };
}

// Brand-level action category — for grouping in Brands tab
export function selectBrandActionCategory(brand, opState, brandCampaigns, brandPool, allEvents, creators, campaigns) {
  // 1) Operational gates
  if (opState.onboarding !== 'complete' || opState.contract !== 'signed' || opState.billing === 'awaiting-first-payment') {
    return { category: 'needs-action', accent: 'orange', why: ['Brand onboarding incomplete or first payment pending'] };
  }

  const reasons = [];

  // 2) Live campaigns with stale invites or pending brand actions
  for (const c of brandCampaigns) {
    if (c.status !== 'live') continue;
    const stale = selectStaleInvitesForCampaign(allEvents, c.id, campaigns, creators);
    if (stale.length > 0) {
      const first = stale[0];
      reasons.push(`${first.creator?.name ?? 'Creator'} — Invited ${first.days}d ago (stale). Brand needs to select creators.`);
    }
  }

  // 3) Draft campaigns with no creators loaded
  for (const c of brandCampaigns) {
    if (c.status === 'draft') {
      const counts = selectCampaignStageCounts(allEvents, c.id, campaigns);
      if (counts.total === 0) {
        reasons.push(`Load creators from pre-selection into ${c.name}`);
      }
    }
  }

  if (reasons.length > 0) {
    return { category: 'needs-action', accent: 'orange', why: reasons };
  }
  return { category: 'on-track', accent: 'green', why: [] };
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

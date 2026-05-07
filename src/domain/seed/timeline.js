import { EVENT_TYPES as E, makeEvent } from '../events.js';

// "Today" anchor for the demo; events are placed relative to this.
const TODAY = new Date('2026-05-04T12:00:00Z');

function daysAgo(days, hours = 12) {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hours, 0, 0, 0);
  return d.toISOString();
}

const KATIE = { kind: 'ops', name: 'Katie' };
const DESTINY = { kind: 'ops', name: 'Destiny' };
const CREATOR = { kind: 'creator' };
const BRAND = { kind: 'brand' };
const SYSTEM = { kind: 'system' };

/**
 * Build a creator event timeline based on the target lifecycle "scenario."
 * Each scenario produces a chronologically-ordered list of events for the creator.
 *
 * scenarios:
 *  - 'no-campaign-fresh' — added today, no invite yet
 *  - 'invited-fresh'      — invited recently, no response yet (1-3d)
 *  - 'invited-viewed'     — invited + viewed but didn't start (4-6d)
 *  - 'invited-stalled'    — invited 8-14d ago, no progression (amber)
 *  - 'in-portal'          — full onboarding completed
 *  - 'in-portal-returning' — completed onboarding + has past completed campaign
 *  - 'campaign-assigned'   — in live campaign, just assigned
 *  - 'campaign-accepted'   — accepted + products selected, brand visible
 *  - 'campaign-order-placed' — order placed, awaiting shipment
 *  - 'campaign-content-submitted' — content submitted, awaiting brand
 *  - 'campaign-content-live' — content posted live
 *  - 'campaign-creator-declined' — creator declined the campaign
 *  - 'campaign-brand-rejected' — accepted by creator but rejected by brand
 */
export function eventsForScenario(creator, scenario, campaigns) {
  const cId = creator.id;
  const live = campaigns.find((c) => c.status === 'live');
  const completed = campaigns.filter((c) => c.status === 'completed');
  const out = [];

  const addedDayMap = {
    'no-campaign-fresh': 1,
    'invited-fresh': 3,
    'invited-viewed': 6,
    'invited-stalled': 12,
    'in-portal': 22,
    'in-portal-returning': 70,
    'campaign-assigned': 18,
    'campaign-accepted': 22,
    'campaign-order-placed': 26,
    'campaign-content-submitted': 32,
    'campaign-content-live': 42,
    'campaign-creator-declined': 16,
    'campaign-brand-rejected': 25,
  };
  const addedDay = addedDayMap[scenario] ?? 14;

  out.push(makeEvent({
    type: E.CREATOR_ADDED, creatorId: cId,
    actor: KATIE, timestamp: daysAgo(addedDay, 9),
  }));

  if (scenario === 'no-campaign-fresh') {
    return out;
  }

  // Portal invite paths
  const inviteBefore = (days, hour = 10) => daysAgo(days, hour);

  if (scenario === 'invited-fresh') {
    out.push(makeEvent({ type: E.PORTAL_INVITE_SENT, creatorId: cId, actor: KATIE, timestamp: inviteBefore(2, 11) }));
    return out;
  }
  if (scenario === 'invited-viewed') {
    out.push(makeEvent({ type: E.PORTAL_INVITE_SENT, creatorId: cId, actor: KATIE, timestamp: inviteBefore(5, 11) }));
    out.push(makeEvent({ type: E.PORTAL_INVITE_VIEWED, creatorId: cId, actor: CREATOR, timestamp: inviteBefore(4, 14) }));
    return out;
  }
  if (scenario === 'invited-stalled') {
    out.push(makeEvent({ type: E.PORTAL_INVITE_SENT, creatorId: cId, actor: KATIE, timestamp: inviteBefore(11, 11) }));
    out.push(makeEvent({ type: E.PORTAL_INVITE_VIEWED, creatorId: cId, actor: CREATOR, timestamp: inviteBefore(10, 16) }));
    out.push(makeEvent({ type: E.ONBOARDING_STARTED, creatorId: cId, actor: CREATOR, timestamp: inviteBefore(10, 17) }));
    out.push(makeEvent({ type: E.ONBOARDING_PARTIAL, creatorId: cId, actor: CREATOR, timestamp: inviteBefore(9, 19) }));
    return out;
  }

  // Portal complete
  out.push(makeEvent({ type: E.PORTAL_INVITE_SENT, creatorId: cId, actor: KATIE, timestamp: daysAgo(addedDay - 1, 11) }));
  out.push(makeEvent({ type: E.PORTAL_INVITE_VIEWED, creatorId: cId, actor: CREATOR, timestamp: daysAgo(addedDay - 1, 18) }));
  out.push(makeEvent({ type: E.ONBOARDING_STARTED, creatorId: cId, actor: CREATOR, timestamp: daysAgo(addedDay - 2, 9) }));
  out.push(makeEvent({ type: E.ONBOARDING_COMPLETED, creatorId: cId, actor: CREATOR, timestamp: daysAgo(addedDay - 2, 18) }));
  out.push(makeEvent({ type: E.PREFERENCES_EMAIL_SENT, creatorId: cId, actor: SYSTEM, timestamp: daysAgo(addedDay - 3, 9) }));

  if (scenario === 'in-portal') {
    return out;
  }
  if (scenario === 'in-portal-returning') {
    // Add a past completed campaign as history
    const past = completed[0] ?? completed[1];
    if (past) {
      out.push(...campaignArcEvents(cId, past.id, addedDay - 5, 'completed-success'));
    }
    return out;
  }

  // Live-campaign scenarios: start ~8 days ago
  if (!live) return out;
  const liveId = live.id;

  switch (scenario) {
    case 'campaign-assigned':
      out.push(makeEvent({ type: E.ASSIGNED_TO_CAMPAIGN, creatorId: cId, campaignId: liveId, actor: KATIE, timestamp: daysAgo(2, 11) }));
      out.push(makeEvent({ type: E.CAMPAIGN_DETAILS_VIEWED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(2, 17) }));
      break;
    case 'campaign-accepted':
      out.push(makeEvent({ type: E.ASSIGNED_TO_CAMPAIGN, creatorId: cId, campaignId: liveId, actor: KATIE, timestamp: daysAgo(8, 11) }));
      out.push(makeEvent({ type: E.CAMPAIGN_DETAILS_VIEWED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(8, 17) }));
      out.push(makeEvent({ type: E.CAMPAIGN_BRIEF_SCROLLED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(7, 9) }));
      out.push(makeEvent({ type: E.CAMPAIGN_ACCEPTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(7, 11) }));
      out.push(makeEvent({ type: E.PRODUCT_SELECTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(6, 14) }));
      out.push(makeEvent({ type: E.VISIBLE_TO_BRAND_TOGGLED, creatorId: cId, campaignId: liveId, actor: KATIE, timestamp: daysAgo(5, 11), payload: { visible: true } }));
      out.push(makeEvent({ type: E.BRAND_INVITED, creatorId: cId, campaignId: liveId, actor: BRAND, timestamp: daysAgo(4, 14) }));
      break;
    case 'campaign-order-placed':
      out.push(makeEvent({ type: E.ASSIGNED_TO_CAMPAIGN, creatorId: cId, campaignId: liveId, actor: KATIE, timestamp: daysAgo(11, 11) }));
      out.push(makeEvent({ type: E.CAMPAIGN_ACCEPTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(10, 13) }));
      out.push(makeEvent({ type: E.PRODUCT_SELECTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(9, 16) }));
      out.push(makeEvent({ type: E.VISIBLE_TO_BRAND_TOGGLED, creatorId: cId, campaignId: liveId, actor: KATIE, timestamp: daysAgo(8, 11), payload: { visible: true } }));
      out.push(makeEvent({ type: E.BRAND_ACCEPTED, creatorId: cId, campaignId: liveId, actor: BRAND, timestamp: daysAgo(7, 14) }));
      out.push(makeEvent({ type: E.ORDER_PLACED, creatorId: cId, campaignId: liveId, actor: SYSTEM, timestamp: daysAgo(6, 9) }));
      break;
    case 'campaign-content-submitted':
      out.push(makeEvent({ type: E.ASSIGNED_TO_CAMPAIGN, creatorId: cId, campaignId: liveId, actor: KATIE, timestamp: daysAgo(18, 11) }));
      out.push(makeEvent({ type: E.CAMPAIGN_ACCEPTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(17, 14) }));
      out.push(makeEvent({ type: E.PRODUCT_SELECTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(16, 9) }));
      out.push(makeEvent({ type: E.BRAND_ACCEPTED, creatorId: cId, campaignId: liveId, actor: BRAND, timestamp: daysAgo(15, 11) }));
      out.push(makeEvent({ type: E.ORDER_PLACED, creatorId: cId, campaignId: liveId, actor: SYSTEM, timestamp: daysAgo(14, 9) }));
      out.push(makeEvent({ type: E.PRODUCT_SHIPPED, creatorId: cId, campaignId: liveId, actor: BRAND, timestamp: daysAgo(11, 14) }));
      out.push(makeEvent({ type: E.DELIVERY_CONFIRMED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(8, 16) }));
      out.push(makeEvent({ type: E.CONTENT_SUBMITTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(2, 18) }));
      break;
    case 'campaign-content-live':
      out.push(makeEvent({ type: E.ASSIGNED_TO_CAMPAIGN, creatorId: cId, campaignId: liveId, actor: KATIE, timestamp: daysAgo(28, 11) }));
      out.push(makeEvent({ type: E.CAMPAIGN_ACCEPTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(27, 13) }));
      out.push(makeEvent({ type: E.PRODUCT_SELECTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(26, 9) }));
      out.push(makeEvent({ type: E.BRAND_ACCEPTED, creatorId: cId, campaignId: liveId, actor: BRAND, timestamp: daysAgo(25, 11) }));
      out.push(makeEvent({ type: E.ORDER_PLACED, creatorId: cId, campaignId: liveId, actor: SYSTEM, timestamp: daysAgo(24, 9) }));
      out.push(makeEvent({ type: E.PRODUCT_SHIPPED, creatorId: cId, campaignId: liveId, actor: BRAND, timestamp: daysAgo(20, 14) }));
      out.push(makeEvent({ type: E.DELIVERY_CONFIRMED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(18, 16) }));
      out.push(makeEvent({ type: E.CONTENT_SUBMITTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(10, 18) }));
      out.push(makeEvent({ type: E.CONTENT_APPROVED, creatorId: cId, campaignId: liveId, actor: BRAND, timestamp: daysAgo(7, 11) }));
      out.push(makeEvent({ type: E.CONTENT_LIVE, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(3, 18), payload: { url: 'https://www.tiktok.com/@example/video/123' } }));
      break;
    case 'campaign-creator-declined': {
      // Vary decline reasons for richer demo data
      const declineReasons = [
        '90-day usage rights too long — industry norm is 30 days',
        'Product gift value too low ($24) — would need bundle',
        'Brand too small / not enough name recognition',
        'Scheduling conflict — booked through next month',
        'Out of capacity this month',
      ];
      const idx = parseInt(cId.replace(/\D/g, '').slice(-1) || '0', 10) % declineReasons.length;
      out.push(makeEvent({ type: E.ASSIGNED_TO_CAMPAIGN, creatorId: cId, campaignId: liveId, actor: KATIE, timestamp: daysAgo(6, 11) }));
      out.push(makeEvent({ type: E.CAMPAIGN_DETAILS_VIEWED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(5, 13) }));
      out.push(makeEvent({
        type: E.CAMPAIGN_DECLINED,
        creatorId: cId, campaignId: liveId,
        actor: CREATOR, timestamp: daysAgo(4, 16),
        payload: { reason: declineReasons[idx] },
      }));
      break;
    }
    case 'campaign-brand-rejected':
      out.push(makeEvent({ type: E.ASSIGNED_TO_CAMPAIGN, creatorId: cId, campaignId: liveId, actor: KATIE, timestamp: daysAgo(13, 11) }));
      out.push(makeEvent({ type: E.CAMPAIGN_ACCEPTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(12, 13) }));
      out.push(makeEvent({ type: E.PRODUCT_SELECTED, creatorId: cId, campaignId: liveId, actor: CREATOR, timestamp: daysAgo(11, 9) }));
      out.push(makeEvent({ type: E.VISIBLE_TO_BRAND_TOGGLED, creatorId: cId, campaignId: liveId, actor: KATIE, timestamp: daysAgo(10, 11), payload: { visible: true } }));
      out.push(makeEvent({ type: E.BRAND_REJECTED, creatorId: cId, campaignId: liveId, actor: BRAND, timestamp: daysAgo(8, 14) }));
      break;
    default: break;
  }
  return out;
}

function campaignArcEvents(creatorId, campaignId, baseDay, kind) {
  // Adds a complete past-campaign arc relative to baseDay (older = bigger).
  const evs = [];
  evs.push(makeEvent({ type: E.ASSIGNED_TO_CAMPAIGN, creatorId, campaignId, actor: KATIE, timestamp: daysAgo(baseDay + 14, 11) }));
  evs.push(makeEvent({ type: E.CAMPAIGN_ACCEPTED, creatorId, campaignId, actor: CREATOR, timestamp: daysAgo(baseDay + 13, 13) }));
  evs.push(makeEvent({ type: E.PRODUCT_SELECTED, creatorId, campaignId, actor: CREATOR, timestamp: daysAgo(baseDay + 12, 9) }));
  evs.push(makeEvent({ type: E.BRAND_ACCEPTED, creatorId, campaignId, actor: BRAND, timestamp: daysAgo(baseDay + 11, 11) }));
  evs.push(makeEvent({ type: E.ORDER_PLACED, creatorId, campaignId, actor: SYSTEM, timestamp: daysAgo(baseDay + 10, 9) }));
  evs.push(makeEvent({ type: E.PRODUCT_SHIPPED, creatorId, campaignId, actor: BRAND, timestamp: daysAgo(baseDay + 7, 14) }));
  evs.push(makeEvent({ type: E.DELIVERY_CONFIRMED, creatorId, campaignId, actor: CREATOR, timestamp: daysAgo(baseDay + 5, 16) }));
  evs.push(makeEvent({ type: E.CONTENT_SUBMITTED, creatorId, campaignId, actor: CREATOR, timestamp: daysAgo(baseDay + 3, 18) }));
  evs.push(makeEvent({ type: E.CONTENT_APPROVED, creatorId, campaignId, actor: BRAND, timestamp: daysAgo(baseDay + 2, 11) }));
  evs.push(makeEvent({ type: E.CONTENT_LIVE, creatorId, campaignId, actor: CREATOR, timestamp: daysAgo(baseDay + 1, 18), payload: { url: 'https://www.instagram.com/p/example/' } }));
  return evs;
}

/* ───────── Scenario assignments ─────────
 *
 * Distribute the 50 creators across scenarios per the design's distribution targets.
 *  - 18 In Campaign (mixed campaign stages)
 *  - 14 In Portal
 *  - 12 Invited
 *  - 6 No Campaign
 *
 * Feature creators get specifically-mapped scenarios per the design.
 */

const FEATURE_SCENARIOS = {
  cr_dani:   'campaign-accepted',           // brand accepted, in live
  cr_sage:   'campaign-accepted',           // returning collaborator (also gets past arc below)
  cr_haley:  'invited-stalled',             // amber demo
  cr_ellie:  'in-portal',                   // recently completed onboarding
  cr_rylan:  'campaign-content-live',       // content posted
  cr_willow: 'in-portal-returning',         // returning collaborator
  cr_carla:  'campaign-brand-rejected',     // rejected by brand demo
};

// Distribute remaining 43 generic creators
const GENERIC_DISTRIBUTION = [
  // In Campaign — 16 (since Dani, Sage, Rylan, Carla already cover 4 of 18)
  ...Array(5).fill('campaign-assigned'),
  ...Array(3).fill('campaign-accepted'),
  ...Array(3).fill('campaign-order-placed'),
  ...Array(2).fill('campaign-content-submitted'),
  ...Array(1).fill('campaign-content-live'),
  ...Array(2).fill('campaign-creator-declined'),
  // In Portal — 12 (Ellie + Willow cover 2 of 14)
  ...Array(8).fill('in-portal'),
  ...Array(4).fill('in-portal-returning'),
  // Invited — 11 (Haley covers 1 of 12)
  ...Array(4).fill('invited-fresh'),
  ...Array(4).fill('invited-viewed'),
  ...Array(3).fill('invited-stalled'),
  // No campaign — 6
  ...Array(6).fill('no-campaign-fresh'),
];

export function buildEventTimeline(creators, campaigns) {
  const events = [];

  for (const creator of creators) {
    let scenario = FEATURE_SCENARIOS[creator.id];
    if (!scenario) {
      const idx = creators.findIndex((c) => c.id === creator.id) - 7; // skip features
      scenario = GENERIC_DISTRIBUTION[idx] ?? 'in-portal';
    }
    const evs = eventsForScenario(creator, scenario, campaigns);
    events.push(...evs);

    // Sage and Willow are returning collaborators — add a past completed campaign arc.
    if (creator.id === 'cr_sage') {
      const past = campaigns.find((c) => c.id === 'camp_spring_refresh');
      if (past) events.push(...campaignArcEvents(creator.id, past.id, 50, 'completed-success'));
    }
    if (creator.id === 'cr_willow') {
      const past = campaigns.find((c) => c.id === 'camp_glow_edit');
      if (past) events.push(...campaignArcEvents(creator.id, past.id, 60, 'completed-success'));
    }
  }

  // A handful of seeded notes from Katie for the feature creators
  events.push(makeEvent({
    type: E.NOTE_ADDED, creatorId: 'cr_dani', actor: KATIE, timestamp: daysAgo(3, 15),
    payload: { body: 'Strong fit for clean-beauty briefs. Great taste, science-leaning voice.' },
  }));
  events.push(makeEvent({
    type: E.NOTE_ADDED, creatorId: 'cr_sage', actor: DESTINY, timestamp: daysAgo(1, 14),
    payload: { body: 'Returning from Spring Refresh — content was on-brief and on-time. High priority for The Western Cozy Set.' },
  }));
  events.push(makeEvent({
    type: E.NOTE_ADDED, creatorId: 'cr_haley', actor: KATIE, timestamp: daysAgo(2, 11),
    payload: { body: 'Stalled on onboarding step 3 — sent a nudge. If no movement by next Mon, consider sending a SMS.' },
  }));
  events.push(makeEvent({
    type: E.NUDGE_SENT, creatorId: 'cr_haley', actor: KATIE, timestamp: daysAgo(2, 12),
    payload: { templateId: 'onboarding-stalled', channel: 'email', body: '…' },
  }));

  return events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

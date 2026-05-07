import { EVENT_TYPES as E, makeEvent } from '../events.js';
import { CAMPAIGN_TO_BRAND, SEED_BRANDS } from './brands.js';

const TODAY = new Date('2026-05-06T12:00:00Z');
function daysAgo(days, hours = 12) {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hours, 0, 0, 0);
  return d.toISOString();
}

const KATIE = { kind: 'ops', name: 'Katie' };
const DESTINY = { kind: 'ops', name: 'Destiny' };
const JULIA = { kind: 'ops', name: 'Julia' };

/**
 * Build brand-pool events:
 *  - For every creator who has any campaign-scoped event, mark them Qualified for that campaign's brand.
 *  - Add some explicit Potential creators per brand (sourced but not yet qualified).
 *  - Add a few Archived creators per brand to demo the archive section.
 *  - Brand notes (Katie / Des / Julia) for each brand.
 */
export function buildBrandPoolEvents(creators, campaigns, baseEvents) {
  const events = [];

  // 1. Auto-qualify everyone who's in a campaign for that campaign's brand
  const qualifiedByBrand = new Map(); // brandId → Set(creatorId)
  for (const ev of baseEvents) {
    if (!ev.campaignId) continue;
    const brandId = CAMPAIGN_TO_BRAND[ev.campaignId];
    if (!brandId) continue;
    if (!qualifiedByBrand.has(brandId)) qualifiedByBrand.set(brandId, new Set());
    qualifiedByBrand.get(brandId).add(ev.creatorId);
  }

  for (const [brandId, creatorIds] of qualifiedByBrand) {
    for (const creatorId of creatorIds) {
      // Added to pool (potential first)
      events.push(makeEvent({
        type: E.BRAND_POOL_ADDED,
        creatorId, brandId,
        actor: KATIE,
        timestamp: daysAgo(28, 10),
      }));
      // Then qualified
      events.push(makeEvent({
        type: E.BRAND_POOL_QUALIFIED,
        creatorId, brandId,
        actor: KATIE,
        timestamp: daysAgo(26, 14),
      }));
    }
  }

  // 2. Explicit Potential creators per brand (uploaded but not yet qualified)
  // Pick creators from the In Portal pool who aren't already in a brand pool.
  const inPortalCreators = creators.filter((c) => {
    const isInPool = qualifiedByBrand.has('brand_aubree_says') && qualifiedByBrand.get('brand_aubree_says').has(c.id);
    return !isInPool;
  });

  // Aubree-Says: 5 potential (recently sourced from Logan's tool)
  const aubreePotentials = ['cr_g05', 'cr_g08', 'cr_g11', 'cr_g14', 'cr_g17'];
  for (const cid of aubreePotentials) {
    if (!creators.find((c) => c.id === cid)) continue;
    events.push(makeEvent({
      type: E.BRAND_POOL_ADDED,
      creatorId: cid, brandId: 'brand_aubree_says',
      actor: KATIE,
      timestamp: daysAgo(2, 11),
      payload: { source: 'logan-import' },
    }));
  }

  // Home with Tay: 3 potential
  const tayPotentials = ['cr_g20', 'cr_g23', 'cr_g26'];
  for (const cid of tayPotentials) {
    if (!creators.find((c) => c.id === cid)) continue;
    events.push(makeEvent({
      type: E.BRAND_POOL_ADDED,
      creatorId: cid, brandId: 'brand_home_with_tay',
      actor: DESTINY,
      timestamp: daysAgo(5, 11),
      payload: { source: 'logan-import' },
    }));
  }

  // Clean Beauty Club: 4 potential
  const cleanPotentials = ['cr_g29', 'cr_g32', 'cr_g35', 'cr_g38'];
  for (const cid of cleanPotentials) {
    if (!creators.find((c) => c.id === cid)) continue;
    events.push(makeEvent({
      type: E.BRAND_POOL_ADDED,
      creatorId: cid, brandId: 'brand_clean_beauty_club',
      actor: KATIE,
      timestamp: daysAgo(8, 11),
      payload: { source: 'logan-import' },
    }));
  }

  // Kinder Living: 6 potential (just sourced)
  const kinderPotentials = ['cr_sage', 'cr_haley', 'cr_g02', 'cr_g05', 'cr_g08', 'cr_g41'];
  for (const cid of kinderPotentials) {
    if (!creators.find((c) => c.id === cid)) continue;
    events.push(makeEvent({
      type: E.BRAND_POOL_ADDED,
      creatorId: cid, brandId: 'brand_kinder_living',
      actor: JULIA,
      timestamp: daysAgo(1, 14),
      payload: { source: 'logan-import' },
    }));
  }

  // 3. Archived creators per brand with varied reasons
  const archives = [
    { brandId: 'brand_aubree_says', creatorId: 'cr_g09', reason: 'not-a-fit',
      note: 'Aesthetic doesn\'t match the cozy western vibe.' },
    { brandId: 'brand_aubree_says', creatorId: 'cr_g15', reason: 'timing',
      note: 'Invited 18 days ago, no response.' },
    { brandId: 'brand_clean_beauty_club', creatorId: 'cr_g28', reason: 'not-open-to-gifted' },
    { brandId: 'brand_home_with_tay', creatorId: 'cr_g22', reason: 'failed-onboarding',
      note: 'Stopped at step 3 of onboarding.' },
  ];
  for (const a of archives) {
    if (!creators.find((c) => c.id === a.creatorId)) continue;
    events.push(makeEvent({
      type: E.BRAND_POOL_ADDED,
      creatorId: a.creatorId, brandId: a.brandId,
      actor: KATIE,
      timestamp: daysAgo(20, 10),
    }));
    events.push(makeEvent({
      type: E.BRAND_POOL_ARCHIVED,
      creatorId: a.creatorId, brandId: a.brandId,
      actor: KATIE,
      timestamp: daysAgo(15, 14),
      payload: { reason: a.reason, note: a.note },
    }));
  }

  // 4. Returning collaborators — Sage in multiple brands
  events.push(makeEvent({
    type: E.BRAND_POOL_ADDED,
    creatorId: 'cr_sage', brandId: 'brand_clean_beauty_club',
    actor: KATIE,
    timestamp: daysAgo(45, 10),
  }));
  events.push(makeEvent({
    type: E.BRAND_POOL_QUALIFIED,
    creatorId: 'cr_sage', brandId: 'brand_clean_beauty_club',
    actor: KATIE,
    timestamp: daysAgo(43, 14),
  }));

  // Willow in Clean Beauty Club too (returning collaborator)
  events.push(makeEvent({
    type: E.BRAND_POOL_ADDED,
    creatorId: 'cr_willow', brandId: 'brand_clean_beauty_club',
    actor: DESTINY,
    timestamp: daysAgo(60, 10),
  }));
  events.push(makeEvent({
    type: E.BRAND_POOL_QUALIFIED,
    creatorId: 'cr_willow', brandId: 'brand_clean_beauty_club',
    actor: DESTINY,
    timestamp: daysAgo(58, 14),
  }));

  // 5. Brand notes per brand
  events.push(makeEvent({
    type: E.BRAND_NOTE_ADDED, brandId: 'brand_aubree_says', actor: KATIE,
    timestamp: daysAgo(4, 15),
    payload: { body: 'Aubree confirmed she wants 10 creators live by May 20. Prioritize cozy + clean-living vibe.' },
  }));
  events.push(makeEvent({
    type: E.BRAND_NOTE_ADDED, brandId: 'brand_aubree_says', actor: DESTINY,
    timestamp: daysAgo(2, 11),
    payload: { body: 'She specifically asked for fewer pure-fashion creators this round. More lifestyle/home angle.' },
  }));
  events.push(makeEvent({
    type: E.BRAND_NOTE_ADDED, brandId: 'brand_clean_beauty_club', actor: KATIE,
    timestamp: daysAgo(7, 14),
    payload: { body: 'Dana (Bloom) prefers email summaries every Friday — adjust cadence.' },
  }));
  events.push(makeEvent({
    type: E.BRAND_NOTE_ADDED, brandId: 'brand_kinder_living', actor: JULIA,
    timestamp: daysAgo(3, 16),
    payload: { body: 'Tony demoed May 3. Mei wants gifted bundles for moms 28–40 with kids under 5. Brief due any day.' },
  }));

  return events;
}

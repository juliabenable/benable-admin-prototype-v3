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
      // Then confirmed (preferences reviewed)
      events.push(makeEvent({
        type: E.BRAND_POOL_CONFIRMED,
        creatorId, brandId,
        actor: KATIE,
        timestamp: daysAgo(27, 11),
      }));
      // Then qualified (full vetting + AI card complete)
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

  // Aubree-Says: 5 potential (recently sourced from Logan's tool) + 2 confirmed-not-qualified
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
  // Confirmed (preferences reviewed but not yet fully qualified)
  const aubreeConfirmed = ['cr_g03', 'cr_g06'];
  for (const cid of aubreeConfirmed) {
    if (!creators.find((c) => c.id === cid)) continue;
    events.push(makeEvent({
      type: E.BRAND_POOL_ADDED, creatorId: cid, brandId: 'brand_aubree_says',
      actor: KATIE, timestamp: daysAgo(4, 11),
    }));
    events.push(makeEvent({
      type: E.BRAND_POOL_CONFIRMED, creatorId: cid, brandId: 'brand_aubree_says',
      actor: KATIE, timestamp: daysAgo(2, 14),
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

  // AI cards: generated + some reviewed
  const aiCardSeeds = [
    {
      creatorId: 'cr_dani', campaignId: 'camp_western_cozy',
      bullets: [
        'Clean-beauty creator with science-led voice — strong fit for cozy home + clean ingredients aesthetic.',
        'Polished face-to-camera reels and tutorial format match Aubree\'s product-routine demos.',
        '4.2k IG followers at 18.4% engagement — well above the 3-7% benchmark for the gifted tier.',
      ],
      videos: [
        { id: 'v1', title: 'Morning skincare routine', url: 'https://www.tiktok.com/@example/v1', thumbnail: 'A' },
        { id: 'v2', title: 'Clean ingredient deep-dive', url: 'https://www.instagram.com/p/v2', thumbnail: 'B' },
        { id: 'v3', title: 'Cozy night reset', url: 'https://www.instagram.com/p/v3', thumbnail: 'C' },
      ],
      reviewed: true,
      reviewedBy: DESTINY,
    },
    {
      creatorId: 'cr_sage', campaignId: 'camp_western_cozy',
      bullets: [
        'Mom-life creator with established cozy/lifestyle aesthetic — natural fit for the brand voice.',
        'Returning Benable collaborator (Spring Refresh, 100% delivery) — high trust signal.',
        '12.8k IG followers at 9.2% engagement, 88% female 28-38 — squarely in target demo.',
      ],
      videos: [
        { id: 'v4', title: 'Sunday reset', url: 'https://www.instagram.com/p/v4', thumbnail: 'D' },
        { id: 'v5', title: 'Cozy mom essentials', url: 'https://www.instagram.com/p/v5', thumbnail: 'E' },
        { id: 'v6', title: 'Home with kids', url: 'https://www.instagram.com/p/v6', thumbnail: 'F' },
      ],
      reviewed: true,
      reviewedBy: KATIE,
    },
    {
      creatorId: 'cr_rylan', campaignId: 'camp_western_cozy',
      bullets: [
        'TikTok-native lifestyle creator with strong face-to-camera presence — adds video-first reach.',
        'Younger demo (18-28) extends Aubree\'s reach into Gen Z without diluting brand voice.',
        '21.6k TikTok followers at 14.5% engagement; recent campaign hit 89k organic views.',
      ],
      videos: [
        { id: 'v7', title: 'Get ready with me', url: 'https://www.tiktok.com/@rylan/v7', thumbnail: 'G' },
        { id: 'v8', title: 'Cozy aesthetic haul', url: 'https://www.tiktok.com/@rylan/v8', thumbnail: 'H' },
        { id: 'v9', title: 'Quick reset routine', url: 'https://www.tiktok.com/@rylan/v9', thumbnail: 'I' },
      ],
      reviewed: false, // pending review
      reviewedBy: null,
    },
    {
      creatorId: 'cr_carla', campaignId: 'camp_western_cozy',
      bullets: [
        'Clean beauty creator — the rejection here was style mismatch, not creator quality.',
        'NYC-based; strong face-to-camera tutorial format.',
        '5.1k IG at 16.2% engagement.',
      ],
      videos: [
        { id: 'v10', title: 'Skincare routine', url: 'https://www.instagram.com/p/v10', thumbnail: 'J' },
      ],
      reviewed: true,
      reviewedBy: DESTINY,
    },
  ];

  for (const card of aiCardSeeds) {
    events.push(makeEvent({
      type: E.AI_CARD_GENERATED,
      creatorId: card.creatorId, campaignId: card.campaignId,
      actor: { kind: 'system' },
      timestamp: daysAgo(7, 9),
      payload: { bullets: card.bullets, videos: card.videos },
    }));
    if (card.reviewed) {
      events.push(makeEvent({
        type: E.AI_CARD_REVIEWED,
        creatorId: card.creatorId, campaignId: card.campaignId,
        actor: card.reviewedBy,
        timestamp: daysAgo(6, 14),
      }));
    }
  }

  // Past-campaign ratings + post compliance (Sage and Willow are returning)
  const pastRatings = [
    { creatorId: 'cr_sage', campaignId: 'camp_spring_refresh', rating: 9, posted: true, on_time: true, platform: 'instagram' },
    { creatorId: 'cr_willow', campaignId: 'camp_glow_edit', rating: 8, posted: true, on_time: true, platform: 'instagram' },
    { creatorId: 'cr_rylan', campaignId: 'camp_western_cozy', rating: 9, posted: true, on_time: true, platform: 'tiktok' }, // current campaign rating
  ];
  for (const r of pastRatings) {
    events.push(makeEvent({
      type: E.POST_COMPLIANCE_LOGGED,
      creatorId: r.creatorId, campaignId: r.campaignId,
      actor: KATIE, timestamp: daysAgo(3, 11),
      payload: { posted: r.posted, on_time: r.on_time, platform: r.platform },
    }));
    events.push(makeEvent({
      type: E.CAMPAIGN_RATED,
      creatorId: r.creatorId, campaignId: r.campaignId,
      actor: KATIE, timestamp: daysAgo(2, 11),
      payload: { rating: r.rating },
    }));
  }

  return events;
}

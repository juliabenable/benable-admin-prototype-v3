import { SEED_CAMPAIGNS, SEED_CAMPAIGN_TEMPLATES } from './campaigns.js';
import { SEED_BRANDS } from './brands.js';
import { SEED_CREATORS } from './creators.js';
import { NUDGE_TEMPLATES } from './templates.js';
import { buildEventTimeline } from './timeline.js';
import { buildBrandPoolEvents } from './brandPools.js';

export function buildSeed() {
  const campaigns = SEED_CAMPAIGNS;
  const creators = SEED_CREATORS;
  const brands = SEED_BRANDS;
  const baseEvents = buildEventTimeline(creators, campaigns);
  const brandPoolEvents = buildBrandPoolEvents(creators, campaigns, baseEvents);
  const events = [...baseEvents, ...brandPoolEvents]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return {
    brands,
    creators,
    campaigns,
    campaignTemplates: SEED_CAMPAIGN_TEMPLATES,
    events,
    nudgeTemplates: NUDGE_TEMPLATES,
  };
}

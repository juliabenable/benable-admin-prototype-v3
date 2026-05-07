export const SEED_CAMPAIGN_TEMPLATES = [
  {
    id: 'tpl_general',
    name: 'General Creator Program',
    description: 'Default outreach + onboarding flow for new creators in the program.',
  },
  {
    id: 'tpl_beauty',
    name: 'Beauty Brand Drop',
    description: 'Standard cadence for beauty/skincare gifted campaigns.',
  },
  {
    id: 'tpl_lifestyle',
    name: 'Lifestyle / Home Drop',
    description: 'Pre-built brief and product flow for home-and-lifestyle campaigns.',
  },
];

export const SEED_CAMPAIGNS = [
  // Aubree Says — live + draft
  {
    id: 'camp_western_cozy',
    name: 'The Western Cozy Set',
    brandHandle: '@aubree-says',
    brandName: 'Aubree Says',
    status: 'live',
    productLabel: 'The Western Cozy Set',
  },
  {
    id: 'camp_aubree_holiday',
    name: 'Holiday Cozy Drop',
    brandHandle: '@aubree-says',
    brandName: 'Aubree Says',
    status: 'draft',
    productLabel: 'Holiday Cozy Bundle',
  },

  // Pikora — live
  {
    id: 'camp_pikora_bone_broth',
    name: 'Instant Bone Broth Collection',
    brandHandle: '@pikora',
    brandName: 'Pikora',
    status: 'live',
    productLabel: 'Bone Broth Collection',
  },
  {
    id: 'camp_glow_edit',
    name: 'Glow Edit',
    brandHandle: '@pikora',
    brandName: 'Pikora',
    status: 'completed',
    productLabel: 'Collagen Glow Set',
  },

  // Home with Tay — completed
  {
    id: 'camp_spring_refresh',
    name: 'Spring Home Refresh',
    brandHandle: '@homewith.tay',
    brandName: 'Home with Tay',
    status: 'completed',
    productLabel: 'Spring Refresh Bundle',
  },

  // Kinder Living — draft
  {
    id: 'camp_summer_mom',
    name: 'First Campaign',
    brandHandle: '@kinder-living',
    brandName: 'Kinder Living',
    status: 'draft',
    productLabel: 'Summer Mom Bundle',
  },
];

// Nudge templates keyed by stage context. Each template is a function of (creator, campaign?)
// returning a string body. Editable in the modal before send.

export const NUDGE_TEMPLATES = [
  {
    id: 'invited-no-response',
    label: 'Invited — no response yet',
    appliesTo: ['INVITED', 'INVITE_VIEWED'],
    subject: 'A spot in our creator program for you',
    body: (creator) =>
      `Hi ${creator.firstName ?? creator.name ?? 'there'},\n\n` +
      `I wanted to follow up on the invite to join Benable's creator program. We'd love to have you in. ` +
      `Joining takes about five minutes — let me know if you have any questions or hit a snag.\n\n` +
      `— Katie at Benable`,
  },
  {
    id: 'onboarding-stalled',
    label: 'Onboarding partially complete',
    appliesTo: ['ONBOARDING_PARTIAL', 'ONBOARDING_STARTED'],
    subject: 'Almost there — finish up your Benable profile',
    body: (creator) =>
      `Hi ${creator.firstName ?? creator.name ?? 'there'},\n\n` +
      `I noticed your Benable onboarding is partway through — finishing up the preferences questions ` +
      `unlocks campaign matches. Should only take a few minutes.\n\n` +
      `Let me know if anything's confusing.\n— Katie`,
  },
  {
    id: 'campaign-pending-decision',
    label: 'Campaign assigned — awaiting decision',
    appliesTo: ['ASSIGNED', 'DETAILS_VIEWED', 'BRIEF_SCROLLED'],
    subject: 'Quick check-in on your campaign invite',
    body: (creator, campaign) =>
      `Hi ${creator.firstName ?? creator.name ?? 'there'},\n\n` +
      `Just nudging on the ${campaign?.name ?? 'campaign'} invite — let me know if you'd like to ` +
      `join, pass, or have any questions about the brief. Happy to chat.\n\n` +
      `— Katie`,
  },
  {
    id: 'content-overdue',
    label: 'Content overdue',
    appliesTo: ['DELIVERED', 'PRODUCT_SHIPPED'],
    subject: 'Checking in on your content',
    body: (creator, campaign) =>
      `Hi ${creator.firstName ?? creator.name ?? 'there'},\n\n` +
      `Hoping you're loving what arrived for ${campaign?.name ?? 'the campaign'} — ready to chat about ` +
      `content timing whenever you are.\n\n— Katie`,
  },
  {
    id: 'welcome-collab-prefs',
    label: 'Welcome — collab preferences',
    appliesTo: ['IN_PORTAL'],
    subject: 'Welcome! A few quick questions',
    body: (creator) =>
      `Hi ${creator.firstName ?? creator.name ?? 'there'},\n\n` +
      `So glad to have you in the Benable creator program. To match you with the right brands, ` +
      `we've sent a short collab preferences questionnaire to your email — would love to get your responses ` +
      `when you have a moment.\n\n— Katie`,
  },
];

export function pickTemplateForStage(stageCode) {
  return (
    NUDGE_TEMPLATES.find((t) => t.appliesTo.includes(stageCode))
    ?? NUDGE_TEMPLATES[0]
  );
}

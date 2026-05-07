import { Mail, Phone } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { InstagramIcon, TikTokIcon, BenableIcon } from './SocialIcons.jsx';

/**
 * Standard inline creator identity row used everywhere a creator is listed:
 *   [Avatar] Name [IG] [TT] [✉] [📞]
 *           @handle
 *
 * Pass `compact` to scale down for dense list rows.
 */
export default function CreatorIdentity({
  creator,
  size = 32,
  compact = false,
  showContact = true,
  rightOfName = null,
}) {
  return (
    <div className={`creator-identity ${compact ? 'compact' : ''}`}>
      <Avatar creator={creator} size={size} />
      <div className="creator-identity-text">
        <div className="creator-identity-line1">
          <span className="creator-identity-name">{creator.name}</span>
          {creator.benableHandle && (
            <a
              href={`https://benable.com/${creator.benableHandle}`}
              target="_blank"
              rel="noreferrer"
              className="creator-identity-icon"
              title={`benable.com/${creator.benableHandle}`}
              onClick={(e) => e.stopPropagation()}
            >
              <BenableIcon size={compact ? 12 : 14} />
            </a>
          )}
          {creator.socials?.includes('instagram') && (
            <span className="creator-identity-icon" title="Instagram">
              <InstagramIcon size={compact ? 12 : 14} />
            </span>
          )}
          {creator.socials?.includes('tiktok') && (
            <span className="creator-identity-icon" title="TikTok">
              <TikTokIcon size={compact ? 12 : 14} />
            </span>
          )}
          {showContact && creator.email && (
            <a
              href={`mailto:${creator.email}`}
              className="creator-identity-icon muted"
              title={creator.email}
              onClick={(e) => e.stopPropagation()}
            >
              <Mail size={compact ? 12 : 13} strokeWidth={1.75} />
            </a>
          )}
          {showContact && creator.phone && (
            <a
              href={`tel:${creator.phone}`}
              className="creator-identity-icon muted"
              title={creator.phone}
              onClick={(e) => e.stopPropagation()}
            >
              <Phone size={compact ? 12 : 13} strokeWidth={1.75} />
            </a>
          )}
          {rightOfName}
        </div>
        <div className="creator-identity-handle">{creator.handle}</div>
      </div>
    </div>
  );
}

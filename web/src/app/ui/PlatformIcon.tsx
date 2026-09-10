import type { IconType } from 'react-icons';
import { FaInstagram, FaTiktok, FaYoutube, FaFacebook, FaXTwitter, FaLinkedin, FaGlobe } from 'react-icons/fa6';

const MAP: Record<string, { Icon: IconType; color: string; label: string }> = {
  instagram: { Icon: FaInstagram, color: '#E1306C', label: 'Instagram' },
  tiktok: { Icon: FaTiktok, color: '#000000', label: 'TikTok' },
  youtube: { Icon: FaYoutube, color: '#FF0000', label: 'YouTube' },
  facebook: { Icon: FaFacebook, color: '#1877F2', label: 'Facebook' },
  twitter: { Icon: FaXTwitter, color: '#000000', label: 'X' },
  x: { Icon: FaXTwitter, color: '#000000', label: 'X' },
  linkedin: { Icon: FaLinkedin, color: '#0A66C2', label: 'LinkedIn' },
};

export function platformMeta(platform: string) {
  return MAP[platform.toLowerCase().trim()] ?? { Icon: FaGlobe, color: '#6B6560', label: platform };
}

export function PlatformIcon({
  platform,
  size = 16,
  colored = true,
}: {
  platform: string;
  size?: number;
  colored?: boolean;
}) {
  const { Icon, color, label } = platformMeta(platform);
  return <Icon size={size} color={colored ? color : 'currentColor'} title={label} aria-label={label} />;
}

import { useLocation } from 'react-router-dom';

/**
 * Profile URLs for competition avatars/names, matched to where the viewer is:
 * business app → /business/creators/:id, creator app → /creator/creators/:handle
 * and /creator/businesses/:slug, everywhere else → the public profile pages.
 * Returns null when there's nothing to link by (e.g. public results expose a
 * username but no id; the form preview has no organizer slug).
 */
export function useProfilePaths() {
  const { pathname } = useLocation();
  const area = pathname.startsWith('/business') ? 'business' : pathname.startsWith('/creator') ? 'creator' : 'public';
  return {
    creator: (cr: { id?: string | null; username?: string | null }): string | null => {
      if (area === 'business') return cr.id ? `/business/creators/${cr.id}` : null;
      const handle = cr.username || cr.id;
      if (!handle) return null;
      return area === 'creator' ? `/creator/creators/${encodeURIComponent(handle)}` : `/creators/${encodeURIComponent(handle)}`;
    },
    business: (slugOrId: string | null | undefined): string | null => {
      if (!slugOrId) return null;
      return area === 'creator' ? `/creator/businesses/${encodeURIComponent(slugOrId)}` : `/businesses/${encodeURIComponent(slugOrId)}`;
    },
  };
}

import { Avatar }       from '../components/Avatar';
import { StatusBadge }  from '../components/StatusBadge';
import { PageHeader }   from '../components/PageHeader';
import { api, type ApiCreator } from '../lib/api';
import { useApi }       from '../lib/useApi';

const PLATFORM_DOT: Record<string, string> = {
  instagram: 'bg-pink-500',
  tiktok:    'bg-gray-800',
  youtube:   'bg-red-500',
  facebook:  'bg-blue-600',
};

function SocialDots({ links }: { links: Record<string, string> }) {
  const platforms = Object.keys(links).slice(0, 3);
  return (
    <div className="flex items-center gap-1.5">
      {platforms.map((p) => (
        <span
          key={p}
          className={`w-2.5 h-2.5 rounded-full inline-block ${PLATFORM_DOT[p.toLowerCase()] ?? 'bg-gray-400'}`}
          title={p}
        />
      ))}
      {Object.keys(links).length > 3 && (
        <span className="text-xs text-gray-400">+{Object.keys(links).length - 3}</span>
      )}
    </div>
  );
}

function CreatorCard({ creator }: { creator: ApiCreator }) {
  const initials = creator.fullName.slice(0, 2).toUpperCase();
  const status   = creator.isVerified ? 'active' : 'pending';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {creator.avatarUrl ? (
            <img src={creator.avatarUrl} alt={creator.fullName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <Avatar initials={initials} size="lg" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{creator.fullName}</p>
            <p className="text-xs text-gray-500 truncate">{creator.user.email}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {creator.categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {creator.categories.slice(0, 3).map((cat) => (
            <span key={cat} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {cat}
            </span>
          ))}
        </div>
      )}

      {Object.keys(creator.socialLinks).length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Platforms:</span>
          <SocialDots links={creator.socialLinks} />
        </div>
      )}

      {creator.location && (
        <p className="text-xs text-gray-500 truncate">📍 {creator.location}</p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          {creator._count.applications} application{creator._count.applications !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-2">
          <button className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">View</button>
          <button className="text-xs text-gray-400 hover:text-gray-600 font-medium">Suspend</button>
        </div>
      </div>
    </div>
  );
}

export function Creators() {
  const { data, loading, error } = useApi(() => api.admin.creators({ limit: 50 }));
  const creators = data?.data ?? [];
  const total    = data?.pagination?.total ?? creators.length;

  return (
    <div>
      <PageHeader
        title="Creators"
        subtitle={loading ? 'Loading...' : `${total} registered creators`}
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-52 animate-pulse" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">No creators yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      )}
    </div>
  );
}

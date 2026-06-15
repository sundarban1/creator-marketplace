import {
  Users,
  Star,
  Briefcase,
  Megaphone,
  AlertTriangle,
  TrendingUp,
  Clock,
  UserPlus,
} from 'lucide-react';
import { StatCard }  from '../components/StatCard';
import { useAuth }   from '../context/AuthContext';
import { api }       from '../lib/api';
import { useApi }    from '../lib/useApi';

const ROLE_COLORS: Record<string, string> = {
  CREATOR:  'bg-violet-100 text-violet-700',
  BUSINESS: 'bg-amber-100 text-amber-700',
  ADMIN:    'bg-blue-100 text-blue-700',
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-3/4" />
    </div>
  );
}

export function Dashboard() {
  const { user }            = useAuth();
  const { data, loading, error } = useApi(() => api.admin.stats());
  const stats = data?.data;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Welcome back, {user?.name ?? 'Admin'}. Here's what's happening.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Failed to load stats: {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Users"
              value={(stats?.totalUsers ?? 0).toLocaleString()}
              icon={Users}
              iconColor="text-blue-600"
              iconBg="bg-blue-50"
            />
            <StatCard
              title="Creators"
              value={(stats?.totalCreators ?? 0).toLocaleString()}
              icon={Star}
              iconColor="text-violet-600"
              iconBg="bg-violet-50"
            />
            <StatCard
              title="Businesses"
              value={(stats?.totalBusinesses ?? 0).toLocaleString()}
              icon={Briefcase}
              iconColor="text-amber-600"
              iconBg="bg-amber-50"
            />
            <StatCard
              title="Active Campaigns"
              value={(stats?.activeCampaigns ?? 0).toLocaleString()}
              icon={Megaphone}
              iconColor="text-emerald-600"
              iconBg="bg-emerald-50"
            />
            <StatCard
              title="Total Campaigns"
              value={(stats?.totalCampaigns ?? 0).toLocaleString()}
              icon={TrendingUp}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-50"
            />
            <StatCard
              title="Pending Applications"
              value={(stats?.pendingApplications ?? 0).toLocaleString()}
              icon={AlertTriangle}
              iconColor="text-orange-600"
              iconBg="bg-orange-50"
            />
          </>
        )}
      </div>

      {/* Recent users */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-gray-400" />
          <h2 className="text-base font-semibold text-gray-800">Recently Joined Users</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : stats?.recentUsers && stats.recentUsers.length > 0 ? (
          <ul className="space-y-2">
            {stats.recentUsers.map((u) => {
              const name =
                u.creatorProfile?.fullName ??
                u.businessProfile?.businessName ??
                u.email.split('@')[0];
              return (
                <li
                  key={u.id}
                  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <UserPlus size={14} className="text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {u.role}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(u.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day:   'numeric',
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">No users yet.</p>
        )}
      </div>
    </div>
  );
}

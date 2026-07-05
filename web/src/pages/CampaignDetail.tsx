import { useState }           from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, MapPin, Calendar, Users, DollarSign,
  Target, Clock, CheckCircle2, XCircle, Hourglass, Star,
  FileText, Activity,
} from 'lucide-react';
import { StatusBadge }  from '../components/StatusBadge';
import { Avatar }       from '../components/Avatar';
import { api, type ApiCampaignDetail, type ApiApplication } from '../lib/api';
import { useApi }       from '../lib/useApi';

const CAMPAIGN_STATUSES = ['ACTIVE', 'PAUSED', 'CLOSED'] as const;

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(date: string) {
  return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatBudget(min: number, max: number) {
  if (min === 0 && max === 0) return 'Non-monetary';
  const f = (n: number) => `NPR ${n.toLocaleString()}`;
  return min === max ? f(min) : `${f(min)} – ${f(max)}`;
}

function appStatusIcon(status: string) {
  if (status === 'ACCEPTED')  return <CheckCircle2 size={14} className="text-green-500" />;
  if (status === 'REJECTED')  return <XCircle      size={14} className="text-red-400"   />;
  return                              <Hourglass    size={14} className="text-amber-500" />;
}

function appStatusBadge(status: string): string {
  const s = status.toLowerCase();
  if (s === 'accepted') return 'active';
  if (s === 'rejected') return 'cancelled';
  return 'pending';
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function buildTimeline(campaign: ApiCampaignDetail) {
  const events: { date: string; label: string; sub?: string; color: string }[] = [];

  events.push({
    date:  campaign.createdAt,
    label: 'Campaign created',
    sub:   `by ${campaign.business.businessName}`,
    color: 'bg-indigo-500',
  });

  const byDate = [...campaign.applications].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const app of byDate) {
    const name = app.creator.fullName ?? app.creator.user.email;
    events.push({
      date:  app.createdAt,
      label: `${name} applied`,
      sub:   `NPR ${app.proposedRate.toLocaleString()} · ${app.timeline}`,
      color: 'bg-gray-400',
    });
    if (app.status !== 'PENDING') {
      events.push({
        date:  app.updatedAt,
        label: `${name} ${app.status === 'ACCEPTED' ? 'accepted' : 'rejected'}`,
        color: app.status === 'ACCEPTED' ? 'bg-green-500' : 'bg-red-400',
      });
    }
    if (app.workStatus === 'IN_PROGRESS') {
      events.push({ date: app.updatedAt, label: `${name} started work`, color: 'bg-blue-500' });
    }
    if (app.workStatus === 'SUBMITTED') {
      events.push({ date: app.updatedAt, label: `${name} submitted deliverables`, color: 'bg-purple-500' });
    }
    if (app.workStatus === 'APPROVED') {
      events.push({ date: app.updatedAt, label: `Work approved — ${name}`, color: 'bg-green-600' });
    }
  }

  events.push({
    date:  campaign.updatedAt,
    label: `Status: ${campaign.status}`,
    sub:   'Current campaign status',
    color: campaign.status === 'ACTIVE' ? 'bg-emerald-500' : campaign.status === 'PAUSED' ? 'bg-orange-400' : 'bg-gray-500',
  });

  return events
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter((e, i, arr) => i === 0 || e.date !== arr[i - 1]!.date || e.label !== arr[i - 1]!.label);
}

// ── Application row ───────────────────────────────────────────────────────────

function ApplicationRow({ app }: { app: ApiApplication }) {
  const [expanded, setExpanded] = useState(false);
  const name = app.creator.fullName ?? app.creator.user.email;
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {app.creator.avatarUrl ? (
          <img src={app.creator.avatarUrl} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
        ) : (
          <Avatar initials={initials} size="sm" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{app.creator.user.email}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-800">NPR {app.proposedRate.toLocaleString()}</span>
          <div className="flex items-center gap-1">
            {appStatusIcon(app.status)}
            <StatusBadge status={appStatusBadge(app.status)} />
          </div>
          <span className="text-xs text-gray-400">{fmt(app.createdAt)}</span>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cover Letter</p>
            <p className="text-sm text-gray-700 leading-relaxed">{app.coverLetter}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span><span className="font-medium text-gray-700">Timeline:</span> {app.timeline}</span>
            {app.creator.location && <span><span className="font-medium text-gray-700">Location:</span> {app.creator.location}</span>}
            {app.portfolioUrl && (
              <a href={app.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-medium">
                Portfolio
              </a>
            )}
          </div>
          {app.creator.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {app.creator.categories.map((c) => (
                <span key={c} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CampaignDetail() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const [statusChanging, setStatusChanging] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const { data, loading, error, refetch } = useApi(() => api.admin.campaignDetail(id!));
  const campaign = data?.data ?? null;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleStatusChange(newStatus: string) {
    if (!campaign || newStatus === campaign.status) return;
    setStatusChanging(true);
    try {
      await api.admin.updateCampaignStatus(id!, newStatus);
      showToast(`Status updated to ${newStatus}`);
      refetch();
    } catch (e) {
      showToast((e as Error).message ?? 'Failed to update status.', false);
    } finally {
      setStatusChanging(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
        {error ?? 'Campaign not found.'}
      </div>
    );
  }

  const acceptedCount = campaign.applications.filter((a) => a.status === 'ACCEPTED').length;
  const pendingCount  = campaign.applications.filter((a) => a.status === 'PENDING').length;
  const rejectedCount = campaign.applications.filter((a) => a.status === 'REJECTED').length;
  const timeline      = buildTimeline(campaign);
  const isEvent       = campaign.campaignType === 'OPEN_EVENT';

  return (
    <div className="space-y-6">

      {/* Back + title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/campaigns')}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{campaign.title}</h1>
              {campaign.isFeatured && (
                <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  <Star size={11} /> Featured
                </span>
              )}
              <StatusBadge status={campaign.status.toLowerCase()} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{campaign.business.businessName} · {isEvent ? 'Open Event' : 'Paid Campaign'}</p>
          </div>
        </div>

        {/* Status management */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500">Status:</span>
          <select
            value={campaign.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusChanging}
            className="text-xs font-medium border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          >
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left column */}
        <div className="xl:col-span-2 space-y-6">

          {/* Info card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={15} className="text-gray-400" /> Campaign Details
            </h2>

            {/* Key stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: DollarSign, label: 'Budget',   value: formatBudget(campaign.budgetMin, campaign.budgetMax) },
                { icon: Calendar,   label: 'Deadline', value: fmt(campaign.deadline) },
                { icon: Users,      label: 'Needed',   value: `${campaign.creatorsNeeded} creator${campaign.creatorsNeeded !== 1 ? 's' : ''}` },
                { icon: Target,     label: 'Platform', value: campaign.platform || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-3">
                  <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                    <Icon size={13} />
                    <span className="text-xs">{label}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {/* Meta rows */}
            <div className="space-y-2 text-sm">
              {campaign.category && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 flex-shrink-0">Category</span>
                  <span className="text-gray-800">{campaign.category}</span>
                </div>
              )}
              {campaign.location && (
                <div className="flex gap-2 items-start">
                  <span className="text-gray-400 w-24 flex-shrink-0 flex items-center gap-1"><MapPin size={11} /> Location</span>
                  <span className="text-gray-800">{campaign.location}</span>
                </div>
              )}
              {isEvent && campaign.venue && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 flex-shrink-0">Venue</span>
                  <span className="text-gray-800">{campaign.venue}</span>
                </div>
              )}
              {isEvent && campaign.eventDate && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 flex-shrink-0">Event date</span>
                  <span className="text-gray-800">{fmt(campaign.eventDate)}</span>
                </div>
              )}
              {campaign.paymentType && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-24 flex-shrink-0">Payment</span>
                  <span className="text-gray-800">{campaign.paymentType}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-gray-400 w-24 flex-shrink-0">Created</span>
                <span className="text-gray-800">{fmt(campaign.createdAt)}</span>
              </div>
            </div>

            {/* Goals */}
            {campaign.goals.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Goals</p>
                <div className="flex flex-wrap gap-1.5">
                  {campaign.goals.map((g) => (
                    <span key={g} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">{g}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits (events) */}
            {isEvent && campaign.benefits.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Creator Benefits</p>
                <div className="flex flex-wrap gap-1.5">
                  {campaign.benefits.map((b) => (
                    <span key={b} className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full">{b}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Objective */}
            {campaign.objective && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Objective</p>
                <p className="text-sm text-gray-700 leading-relaxed">{campaign.objective}</p>
              </div>
            )}

            {/* Target Audience */}
            {!!campaign.targetAudience?.length && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Target Audience</p>
                <div className="flex flex-wrap gap-1.5">
                  {campaign.targetAudience.map((a) => (
                    <span key={a} className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Content Guidelines */}
            {!!campaign.contentGuidelines?.length && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Content Guidelines</p>
                <ul className="text-sm text-gray-700 leading-relaxed list-disc list-inside space-y-0.5">
                  {campaign.contentGuidelines.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            )}

            {/* Hashtags */}
            {!!campaign.hashtags?.length && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Hashtags</p>
                <div className="flex flex-wrap gap-1.5">
                  {campaign.hashtags.map((h) => (
                    <span key={h} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">#{h.replace(/^#/, '')}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {campaign.description && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{campaign.description}</p>
              </div>
            )}

            {/* Sample Caption */}
            {campaign.sampleCaption && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sample Caption</p>
                <p className="text-sm text-gray-700 leading-relaxed italic">&ldquo;{campaign.sampleCaption}&rdquo;</p>
              </div>
            )}

            {/* Call to Action */}
            {campaign.callToAction && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Call to Action</p>
                <p className="text-sm text-gray-700 leading-relaxed">{campaign.callToAction}</p>
              </div>
            )}

            {/* Approval Requirements */}
            {campaign.approvalRequirements && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Brand Approval Requirements</p>
                <p className="text-sm text-gray-700 leading-relaxed">{campaign.approvalRequirements}</p>
              </div>
            )}

            {/* Quick-create provenance */}
            {campaign.aiGenerated && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <FileText size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-indigo-700">
                  <span className="font-semibold">Created from a quick description</span>
                  {campaign.aiPrompt && <p className="text-indigo-600 mt-0.5">&ldquo;{campaign.aiPrompt}&rdquo;</p>}
                  {(!!campaign.aiSuggestedCategories?.length || !!campaign.aiSuggestedPlatforms?.length) && (
                    <p className="text-indigo-500 mt-1">
                      Also relevant: {[...(campaign.aiSuggestedCategories ?? []), ...(campaign.aiSuggestedPlatforms ?? [])].join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Applications */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users size={15} className="text-gray-400" /> Applications
                <span className="font-normal text-gray-400">({campaign._count.applications})</span>
              </h2>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="text-green-600 font-medium">{acceptedCount} accepted</span>
                <span className="text-amber-500 font-medium">{pendingCount} pending</span>
                <span className="text-red-400 font-medium">{rejectedCount} rejected</span>
              </div>
            </div>

            {campaign.applications.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No applications yet.</p>
            ) : (
              <div className="space-y-2">
                {campaign.applications.map((app) => (
                  <ApplicationRow key={app.id} app={app} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Business card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Building2 size={15} className="text-gray-400" /> Business
            </h2>
            <div className="flex items-center gap-3">
              {campaign.business.logoUrl ? (
                <img src={campaign.business.logoUrl} alt={campaign.business.businessName} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <Avatar initials={campaign.business.businessName.slice(0, 2).toUpperCase()} size="sm" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{campaign.business.businessName}</p>
                {campaign.business.website && (
                  <a href={campaign.business.website} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline truncate block">
                    {campaign.business.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
            {campaign.business.description && (
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{campaign.business.description}</p>
            )}
          </div>

          {/* Quick stats */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Quick Stats</h2>
            {[
              { label: 'Total applications', value: campaign._count.applications },
              { label: 'Accepted',           value: acceptedCount },
              { label: 'Pending review',     value: pendingCount },
              { label: 'Rejected',           value: rejectedCount },
              { label: 'Slots needed',       value: campaign.creatorsNeeded },
              { label: 'Slots filled',       value: `${acceptedCount} / ${campaign.creatorsNeeded}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-sm font-semibold text-gray-900">{value}</span>
              </div>
            ))}
          </div>

          {/* Activity timeline */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Activity size={15} className="text-gray-400" /> Activity Timeline
            </h2>
            <div className="relative space-y-0">
              {timeline.map((event, i) => (
                <div key={i} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${event.color}`} />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                  </div>
                  <div className="pb-0 min-w-0">
                    <p className="text-xs font-medium text-gray-800 leading-snug">{event.label}</p>
                    {event.sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{event.sub}</p>}
                    <p className="text-xs text-gray-300 mt-0.5">
                      <Clock size={10} className="inline mr-1" />{fmtTime(event.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-lg z-50 ${toast.ok ? 'bg-gray-900' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

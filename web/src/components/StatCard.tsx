import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changePositive?: boolean;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export function StatCard({ title, value, change, changePositive, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <div className="lp-glass rounded-2xl p-5 flex items-start gap-4 transition-transform hover:-translate-y-0.5">
      <div className={`p-3 rounded-xl ${iconBg} flex-shrink-0`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-[0.12em] truncate">{title}</p>
        <p className="lp-display text-3xl text-gray-900 mt-1">{value.toLocaleString()}</p>
        {change && (
          <p className={`text-xs mt-1 font-medium ${changePositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {change} vs last month
          </p>
        )}
      </div>
    </div>
  );
}

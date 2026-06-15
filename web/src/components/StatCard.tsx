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
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-lg ${iconBg} flex-shrink-0`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500 font-medium truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value.toLocaleString()}</p>
        {change && (
          <p className={`text-xs mt-1 font-medium ${changePositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {change} vs last month
          </p>
        )}
      </div>
    </div>
  );
}

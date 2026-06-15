const COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
];

function colorFromInitials(initials: string): string {
  const idx = initials.charCodeAt(0) % COLORS.length;
  return COLORS[idx];
}

interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };

export function Avatar({ initials, size = 'md' }: AvatarProps) {
  return (
    <div className={`${sizes[size]} ${colorFromInitials(initials)} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}

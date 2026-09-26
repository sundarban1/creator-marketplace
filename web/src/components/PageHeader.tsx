interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

// Landing-style heading: thin display type with the closing word set bold in
// the brand gradient (the hero's "thin line + gradient phrase" treatment).
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const words = title.split(' ');
  const lead = words.slice(0, -1).join(' ');
  const last = words[words.length - 1];

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="lp-display text-[2rem] sm:text-[2.25rem] leading-tight text-gray-900">
          {lead && <>{lead} </>}
          <span className="lp-gradient-text">{last}</span>
        </h1>
        {subtitle && <p className="text-[15px] font-light text-gray-500 mt-1.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

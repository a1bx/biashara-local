

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article';
}

export function Card({ children, className = '', as = 'div' }: CardProps) {
  const Tag = as;
  return (
    <Tag
      className={`rounded-xl border border-line bg-surface ${className}`}>
      
      {children}
    </Tag>);

}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 text-brand">{icon}</div> : null}
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {subtitle ?
          <p className="mt-0.5 text-xs text-faint">{subtitle}</p> :
          null}
        </div>
      </div>
      {action}
    </div>);

}
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
  'bg-brand text-canvas hover:bg-brand-bright disabled:bg-brand-deep disabled:text-canvas/70',
  secondary:
  'bg-raised text-ink border border-line hover:border-brand/50 hover:text-brand-bright',
  ghost: 'text-muted hover:text-ink hover:bg-raised',
  danger:
  'bg-transparent text-expense border border-expense/40 hover:bg-expense/10'
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2'
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}>
      
      {icon}
      {children}
    </button>);

}
import { SearchIcon } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  label,
  className = ''
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <SearchIcon
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
        aria-hidden="true" />
      
      <input
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-line bg-panel pl-8 pr-3 text-xs text-ink placeholder:text-faint focus:border-brand/50 focus:outline-none" />
      
    </div>);

}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon } from
'lucide-react';
import { ModelIndicator } from './ModelIndicator';

interface TopBarProps {
  title: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ title, collapsed, onToggleSidebar }: TopBarProps) {
  const navigate = useNavigate();
  const [showOfflineNote, setShowOfflineNote] = useState(false);

  return (
    <header className="flex h-[62px] shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="rounded-md p-1.5 text-muted transition-colors duration-150 ease-out hover:bg-raised hover:text-ink">
          
          {collapsed ?
          <PanelLeftOpenIcon className="h-4 w-4" /> :

          <PanelLeftCloseIcon className="h-4 w-4" />
          }
        </button>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <ModelIndicator />
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowOfflineNote(true)}
            onMouseLeave={() => setShowOfflineNote(false)}
            onFocus={() => setShowOfflineNote(true)}
            onBlur={() => setShowOfflineNote(false)}
            onClick={() => setShowOfflineNote((v) => !v)}
            aria-describedby="offline-note"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-raised">

            <span
              className="h-2 w-2 shrink-0 rounded-full bg-success"
              aria-hidden="true" />

            <span className="leading-tight">
              <span className="block text-xs font-medium text-ink">
                Offline Mode
              </span>
              <span className="block text-2xs text-faint">All data is local</span>
            </span>
          </button>
          {showOfflineNote ?
          <div
            id="offline-note"
            role="tooltip"
            className="absolute right-0 top-full z-40 mt-2 w-64 rounded-lg border border-line bg-panel p-3 text-2xs leading-relaxed text-muted shadow-xl">

              Biashara Local is running locally. No cloud connection is required,
              and your business data never leaves this device.
            </div> :
          null}
        </div>

        <button
          type="button"
          onClick={() => navigate('/knowledge-base')}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-raised px-3 text-xs font-medium text-ink transition-colors duration-150 ease-out hover:border-brand/50 hover:text-brand-bright">
          
          <BookOpenIcon className="h-4 w-4" aria-hidden="true" />
          Knowledge Base
        </button>

        <button
          type="button"
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="rounded-md p-2 text-muted transition-colors duration-150 ease-out hover:bg-raised hover:text-ink">
          
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>
    </header>);

}
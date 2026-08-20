import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3Icon,
  BriefcaseIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  HomeIcon,
  InfoIcon,
  LaptopIcon,
  SettingsIcon } from
'lucide-react';
import { LogoMark } from '../common/Logo';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const PRIMARY: NavItem[] = [
{ to: '/', label: 'Dashboard', icon: <HomeIcon className="h-4 w-4" />, end: true },
{
  to: '/statements',
  label: 'Statement Understanding',
  icon: <BarChart3Icon className="h-4 w-4" />
},
{
  to: '/documents',
  label: 'Document Drafting',
  icon: <FileTextIcon className="h-4 w-4" />
},
{
  to: '/compliance',
  label: 'Compliance Q&A',
  icon: <HelpCircleIcon className="h-4 w-4" />
},
{ to: '/files', label: 'My Documents', icon: <FolderIcon className="h-4 w-4" /> },
{
  to: '/business-data',
  label: 'Business Data',
  icon: <BriefcaseIcon className="h-4 w-4" />
}];


const SECONDARY: NavItem[] = [
{ to: '/settings', label: 'Settings', icon: <SettingsIcon className="h-4 w-4" /> },
{ to: '/about', label: 'About', icon: <InfoIcon className="h-4 w-4" /> }];


function itemClass({ isActive }: {isActive: boolean;}): string {
  return [
  'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors duration-150 ease-out',
  isActive ?
  'bg-brand/12 text-brand-bright font-medium' :
  'text-muted hover:bg-raised hover:text-ink'].
  join(' ');
}

export function Sidebar({ collapsed }: {collapsed: boolean;}) {
  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out ${
      collapsed ? 'w-[68px]' : 'w-[242px]'}`
      }
      aria-label="Main">
      
      <div className="flex h-[62px] items-center gap-3 border-b border-hairline px-4">
        <LogoMark size={32} className="shrink-0" />
        {!collapsed ?
        <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              Biashara Local
            </p>
            <p className="truncate text-2xs text-faint">
              Offline Business Assistant
            </p>
          </div> :
        null}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {PRIMARY.map((item) =>
          <li key={item.to}>
              <NavLink
              to={item.to}
              end={item.end}
              className={itemClass}
              title={collapsed ? item.label : undefined}>
              
                <span className="shrink-0">{item.icon}</span>
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            </li>
          )}
        </ul>

        <div className="my-4 h-px bg-hairline" />

        <ul className="space-y-1">
          {SECONDARY.map((item) =>
          <li key={item.to}>
              <NavLink
              to={item.to}
              className={itemClass}
              title={collapsed ? item.label : undefined}>
              
                <span className="shrink-0">{item.icon}</span>
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {!collapsed ?
      <div className="m-3 rounded-lg border border-brand/20 bg-brand-soft/40 p-3">
          <p className="text-xs font-semibold text-brand-bright">Biashara Local</p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="text-2xs leading-relaxed text-muted">
              Runs entirely on this device
            </p>
            <LaptopIcon
            className="h-6 w-6 shrink-0 text-brand/60"
            aria-hidden="true" />
          
          </div>
        </div> :

      <div className="m-3 flex justify-center rounded-lg border border-brand/20 bg-brand-soft/40 p-3">
          <LaptopIcon className="h-5 w-5 text-brand/70" aria-hidden="true" />
          <span className="sr-only">Biashara Local runs entirely on this device</span>
        </div>
      }
    </aside>);

}
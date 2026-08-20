import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const TITLES: Array<{match: RegExp;title: string;}> = [
{ match: /^\/$/, title: 'Dashboard' },
{ match: /^\/statements\/.+/, title: 'Statement Detail' },
{ match: /^\/statements/, title: 'Statement Understanding' },
{ match: /^\/documents/, title: 'Document Drafting' },
{ match: /^\/compliance/, title: 'Compliance Q&A' },
{ match: /^\/knowledge-base/, title: 'Knowledge Base' },
{ match: /^\/files/, title: 'My Documents' },
{ match: /^\/business-data/, title: 'Business Data' },
{ match: /^\/settings/, title: 'Settings' },
{ match: /^\/about/, title: 'About' }];


export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const title = TITLES.find((t) => t.match.test(pathname))?.title ?? 'Dashboard';

  return (
    <div className="flex h-full w-full overflow-hidden bg-canvas">
      <Sidebar collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((v) => !v)} />
        
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>);

}
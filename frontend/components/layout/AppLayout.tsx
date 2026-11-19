'use client';

import React, { useState } from 'react';
import { Sidebar, SidebarToggle } from './Sidebar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-10 flex items-center gap-4 px-4 py-3 bg-surface-900/95 backdrop-blur-sm border-b border-surface-700">
          <SidebarToggle onClick={() => setSidebarOpen(true)} />
          <span className="text-base font-semibold text-white">SpendWise</span>
        </header>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

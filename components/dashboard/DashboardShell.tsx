'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  MessageSquare,
  BarChart3,
  Lightbulb,
  TrendingUp,
  PencilLine,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const ZOYA_HEADER_LOGO =
  'https://www.zoya.in/on/demandware.static/-/Sites-Zoya-Library/default/dw3635170c/images/zoya-header-logo.png';

const navMain = [
  {
    href: '/dashboard/conversation',
    label: 'Conversations',
    icon: MessageSquare,
  },
] as const;

const navAnalytics = [
  {
    href: '/dashboard/analytics/insights',
    label: 'Customer Insights',
    icon: Lightbulb,
  },
  {
    href: '/dashboard/analytics/roi',
    label: 'ROI Dashboard',
    icon: TrendingUp,
  },
  {
    href: '/dashboard/analytics/edits',
    label: 'Detailed Edits',
    icon: PencilLine,
  },
] as const;

function NavLink({
  href,
  label,
  Icon,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
}) {
  const activeClasses = collapsed
    ? active
      ? 'bg-[var(--zoya-gold-bg)] text-[var(--zoya-accent)]'
      : 'text-[var(--foreground)] hover:bg-black/[0.06]'
    : active
      ? 'border border-[var(--zoya-border)] bg-[var(--zoya-gold-bg)] text-[var(--zoya-accent)]'
      : 'border border-transparent text-[var(--foreground)] hover:bg-black/[0.04]';

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={[
        'flex items-center font-medium transition-colors',
        collapsed
          ? 'justify-center rounded-md p-2'
          : 'gap-3 rounded-lg px-3 py-2.5 text-[13px]',
        activeClasses,
      ].join(' ')}
    >
      <Icon
        className={[
          'shrink-0 opacity-90',
          collapsed ? 'h-4 w-4' : 'h-[18px] w-[18px]',
        ].join(' ')}
        strokeWidth={1.75}
      />
      {!collapsed ? label : null}
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f2f0ed]">
      <aside
        className={[
          'flex h-full shrink-0 flex-col overflow-hidden border-r border-[var(--zoya-border-light)] bg-[var(--zoya-sidebar-bg)] transition-[width] duration-200 ease-out',
          sidebarCollapsed ? 'w-[52px]' : 'w-[236px]',
        ].join(' ')}
      >
        <div
          className={
            sidebarCollapsed
              ? 'border-b border-[var(--zoya-border-light)] px-2 py-3'
              : 'border-b border-[var(--zoya-border-light)] px-4 py-4'
          }
        >
          <div
            className={
              sidebarCollapsed
                ? 'flex flex-col items-center gap-2'
                : 'flex items-center justify-between gap-3'
            }
          >
            <Link
              href="/dashboard/conversation"
              aria-label={
                sidebarCollapsed
                  ? 'Zoya Concierge — Internal Platform'
                  : undefined
              }
              className={
                sidebarCollapsed
                  ? 'flex w-full flex-col items-center'
                  : 'flex min-w-0 flex-1 items-center gap-2.5 text-left'
              }
            >
              <span className="flex shrink-0 items-center justify-start">
                <Image
                  src={ZOYA_HEADER_LOGO}
                  alt="Zoya"
                  width={200}
                  height={48}
                  priority
                  className={
                    sidebarCollapsed
                      ? 'h-4 w-auto max-h-4 max-w-[29px] object-contain object-center'
                      : 'h-[23px] w-auto max-h-[23px] max-w-[min(100%,94px)] object-contain object-left'
                  }
                />
              </span>
              {!sidebarCollapsed ? (
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[12px] font-semibold leading-tight text-[var(--foreground)] tracking-tighter">
                    Zoya Concierge
                  </span>
                  <span className="truncate text-[11px] font-normal leading-tight text-[var(--zoya-muted)]">
                    Internal Platform
                  </span>
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className={[
                'flex shrink-0 items-center justify-center rounded-md text-[var(--zoya-accent)] transition-colors',
                'hover:bg-black/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zoya-gold)]/35',
                sidebarCollapsed ? 'p-1' : 'h-8 w-8',
              ].join(' ')}
              aria-expanded={!sidebarCollapsed}
              aria-label={
                sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
              }
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        <nav
          className={[
            'flex min-h-0 flex-1 flex-col overflow-y-auto',
            sidebarCollapsed ? 'gap-0.5 px-1 py-3' : 'gap-1 px-4 py-4',
          ].join(' ')}
        >
          {navMain.map(({ href, label, icon: Icon }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              Icon={Icon}
              active={pathname === href}
              collapsed={sidebarCollapsed}
            />
          ))}

          <div className={sidebarCollapsed ? 'pt-3' : 'pt-4'}>
            {!sidebarCollapsed ? (
              <div className="mb-2 flex items-center gap-2">
                <BarChart3
                  className="h-4 w-4 text-[var(--zoya-muted)]"
                  strokeWidth={1.75}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--zoya-muted)]">
                  Analytics
                </span>
              </div>
            ) : (
              <div
                className="mx-auto mb-1.5 h-px w-6 bg-[var(--zoya-border-light)]"
                aria-hidden
              />
            )}
            <div
              className={
                sidebarCollapsed
                  ? 'flex flex-col gap-0.5'
                  : 'flex flex-col gap-0.5 border-l border-[var(--zoya-border-light)] pl-2'
              }
            >
              {navAnalytics.map(({ href, label, icon: Icon }) => (
                <NavLink
                  key={href}
                  href={href}
                  label={label}
                  Icon={Icon}
                  active={pathname === href}
                  collapsed={sidebarCollapsed}
                />
              ))}
            </div>
          </div>
        </nav>

        <div
          className={
            sidebarCollapsed
              ? 'border-t border-[var(--zoya-border-light)] px-1 py-3'
              : 'border-t border-[var(--zoya-border-light)] px-4 py-4'
          }
        >
          <div
            className={
              sidebarCollapsed
                ? 'flex justify-center'
                : 'flex items-center gap-3'
            }
          >
            <span
              className={
                sidebarCollapsed
                  ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white'
                  : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white'
              }
              style={{ background: 'var(--zoya-gold)' }}
              aria-hidden
              title={sidebarCollapsed ? 'Demo User' : undefined}
            >
              D
            </span>
            {!sidebarCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">
                  Demo User
                </p>
                <p className="truncate text-[11px] text-[var(--zoya-muted)]">
                  demo@zoya.com
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

// src/components/nav/BottomTabs.tsx
//
// Mobile bottom navigation — Cash App / Mercado Pago pattern with a raised
// FAB ("Negociar") that lives IN-FLOW (no `absolute`/`left-1/2` translation)
// so spacing stays perfectly symmetric across the 4-col grid.
//
// Earlier iteration used `absolute left-1/2 -translate-x-1/2` which pinned
// the FAB to 50% of the nav width. With a 4-col grid that's between cols 2
// and 3 — visually too close to Historial and a wide gap before Perfil.
// User-reported: "Historia muy pegado a Negociar […] hay una distancia
// entre Negociar y Perfil". Fix: FAB occupies its own grid column; the lift
// is purely vertical (`-mt-4`, 16px) so the slot above the FAB sees the
// disc rise out of the bar without breaking horizontal alignment.
//
//   ┌──────────────────────────────────────────────────┐
//   │                          ⊕                       │ ← -mt-4 lift
//   │                       Negociar                   │
//   │  ⌂        📄                          👤         │
//   │ Inicio  Historial                    Perfil      │
//   └──────────────────────────────────────────────────┘
//      col 1     col 2        col 3         col 4
//      25%       25%           25%           25%
//
// The disc is `w-12 h-12` (48px) — matches the CD-23 touch-target floor
// without towering over the regular icons. Elevation comes from
// `ring-2 ring-luma-50` + `shadow-lg`, not from a tall translate.
'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { House, Receipt, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const HIDE_PREFIXES = ['/login', '/signup', '/auth', '/onboarding', '/~offline'];

type Tab = {
  href: string;
  label: string;
  Icon: typeof House;
};

const TABS: { left: Tab[]; fab: Tab; right: Tab[] } = {
  left: [
    { href: '/dashboard', label: 'Inicio', Icon: House },
    { href: '/historial', label: 'Historial', Icon: Receipt },
  ],
  fab: { href: '/negociar', label: 'Negociar', Icon: Sparkles },
  right: [{ href: '/perfil', label: 'Perfil', Icon: User }],
};

export function BottomTabs() {
  const pathname = usePathname() ?? '';
  if (
    pathname === '/' ||
    HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return null;
  }
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-luma-50/95 backdrop-blur-md border-t border-luma-200 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 items-end px-2 pt-2 pb-1">
        {TABS.left.map((t) => (
          <TabButton key={t.href} tab={t} active={isActive(t.href)} />
        ))}
        <FloatingActionButton tab={TABS.fab} active={isActive(TABS.fab.href)} />
        {TABS.right.map((t) => (
          <TabButton key={t.href} tab={t} active={isActive(t.href)} />
        ))}
      </div>
    </nav>
  );
}

function TabButton({ tab, active }: { tab: Tab; active: boolean }) {
  const { Icon } = tab;
  return (
    <Link
      href={tab.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-1 min-h-[48px] py-2 text-[11px] transition-colors',
        active ? 'text-luma-700 font-semibold' : 'text-luma-450 hover:text-luma-600',
      )}
    >
      <Icon
        className={cn('w-5 h-5 transition-transform', active && 'scale-110')}
        strokeWidth={active ? 2.4 : 1.8}
        aria-hidden
      />
      <span>{tab.label}</span>
    </Link>
  );
}

function FloatingActionButton({ tab, active }: { tab: Tab; active: boolean }) {
  const { Icon } = tab;
  return (
    <Link
      href={tab.href}
      aria-current={active ? 'page' : undefined}
      aria-label={`${tab.label} — acción principal`}
      className={cn(
        // In-flow column of the grid (no absolute positioning).
        // `-mt-4` lifts the disc 16px above the row baseline; the label
        // sits below the disc inside the column, no overflow.
        'flex flex-col items-center justify-end min-h-[48px] -mt-4 text-[11px] transition-colors',
        active ? 'text-luma-700 font-semibold' : 'text-luma-600',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-full',
          'bg-luma-600 text-luma-50 ring-2 ring-luma-50',
          'shadow-[0_6px_18px_-4px_rgba(79,8,32,0.45)]',
          'transition-transform hover:scale-105 active:scale-95',
          active && 'bg-luma-700',
        )}
      >
        <Icon className="w-5 h-5" strokeWidth={2.2} aria-hidden />
      </div>
      <span className="mt-1">{tab.label}</span>
    </Link>
  );
}

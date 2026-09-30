'use client';

import type { ReactNode } from 'react';

type Section = 'today' | 'training' | 'nutrition' | 'progress' | 'coach' | 'boost';

type Item = { id: Section; label: string; icon: string };

const items: Item[] = [
  { id: 'today', label: "Aujourd’hui", icon: 'home' },
  { id: 'training', label: 'Entraînement', icon: 'training' },
  { id: 'nutrition', label: 'Nutrition', icon: 'nutrition' },
  { id: 'progress', label: 'Progression', icon: 'progress' },
  { id: 'coach', label: 'Coach IA', icon: 'coach' },
];

export default function AppSidebar({ active, onChange }: { active: Section; onChange: (value: Section) => void }) {
  return (
    <aside className={active === 'today' ? 'ref-sidebar ref-sidebar-home' : 'ref-sidebar'}>
      <button className="ref-brand" onClick={() => onChange('today')} aria-label="Retour à l’accueil">
        <img className="ref-brand-logo" src="/athleo-logo.webp" alt="ATHLEO" />
      </button>

      <div className="ref-menu-label">MENU PRINCIPAL</div>
      <nav className="ref-nav">
        {items.map(item => (
          <button key={item.id} className={active === item.id ? 'ref-nav-item active' : 'ref-nav-item'} onClick={() => onChange(item.id)}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="ref-sidebar-separator" />
      <div className="ref-nav ref-nav-secondary">
        <button className="ref-nav-item" type="button"><Icon name="library" /><span>Bibliothèque</span></button>
        <button className="ref-nav-item" type="button"><Icon name="settings" /><span>Paramètres</span></button>
      </div>

      <div className="ref-sidebar-signature">
        <img className="ref-sidebar-emblem" src="/athleo-emblem.webp" alt="" aria-hidden="true" />
        <blockquote className="ref-sidebar-quote">« Une meilleure<br />version de toi.<br />Chaque jour. »</blockquote>
      </div>
    </aside>
  );
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></>,
    training: <><path d="M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8"/></>,
    nutrition: <><path d="M6 4v7M3.5 4v4c0 2 1 3 2.5 3s2.5-1 2.5-3V4M6 11v9M15 4v16M19 4c-3 1-4 4-4 7h4z"/></>,
    progress: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-5 3 2 5-6"/></>,
    coach: <><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></>,
    library: <><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.12-1.28l2-1.55-2-3.46-2.45 1a7 7 0 0 0-2.2-1.28L13.9 3h-4l-.34 2.43a7 7 0 0 0-2.2 1.28l-2.45-1-2 3.46 2 1.55A7 7 0 0 0 4.8 12c0 .44.04.87.12 1.28l-2 1.55 2 3.46 2.45-1a7 7 0 0 0 2.2 1.28L9.9 21h4l.34-2.43a7 7 0 0 0 2.2-1.28l2.45 1 2-3.46-2-1.55A7 7 0 0 0 19 12Z"/></>,
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

'use client';

import type { ReactNode } from 'react';

type Section = 'today' | 'training' | 'nutrition' | 'progress' | 'coach' | 'boost';

const week = [
  { day: 'Lun', date: '22', label: 'Entraînement', meta: '2 654 kcal', done: true },
  { day: 'Mar', date: '23', label: 'Entraînement', meta: '2 312 kcal', done: true },
  { day: 'Mer', date: '24', label: 'Upper B', meta: '2 104 kcal', active: true },
  { day: 'Jeu', date: '25', label: 'Repos', meta: '' },
  { day: 'Ven', date: '26', label: 'Entraînement', meta: '' },
  { day: 'Sam', date: '27', label: 'Entraînement', meta: '' },
  { day: 'Dim', date: '28', label: 'Repos', meta: '' },
];

export default function TodayDashboard({
  userName,
  onNavigate,
  profileControl,
}: {
  userName: string;
  onNavigate: (value: Section) => void;
  profileControl: ReactNode;
}) {
  return (
    <div className="ref-home">
      <header className="ref-home-header">
        <div>
          <h1>Bonjour <span>{userName}</span>.</h1>
          <p>On continue sur la lancée. Même discipline, plus de résultats.</p>
        </div>
        <div className="ref-home-meta">
          <span>Mercredi 24 septembre 2025</span>
          <button className="ref-bell" aria-label="Notifications" type="button">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
          </button>
          {profileControl}
        </div>
      </header>

      <section className="ref-hero">
        <div className="ref-hero-copy">
          <p className="ref-kicker">TON OBJECTIF</p>
          <h2>Plus fort,<br />plus régulier.</h2>
          <p className="ref-hero-sub">Suis ton plan, reste constant,<br />les résultats suivent.</p>
          <button onClick={() => onNavigate('training')}>Voir mon plan <span>→</span></button>
        </div>

        <div className="ref-hero-stats">
          <Metric label="SÉANCES CETTE SEMAINE" value="3 / 4" progress={76} />
          <Metric label="APPORT CALORIQUE" value="2 104 / 2 800 kcal" progress={75} />
          <div className="ref-weight-stat">
            <span>POIDS ACTUEL</span>
            <strong>80,4 kg <em>↓ -0,8 kg</em></strong>
            <svg className="ref-mini-chart" viewBox="0 0 170 42" preserveAspectRatio="none" aria-hidden="true">
              <path d="M1 34 C20 31,24 35,42 29 S67 30,84 24 S110 26,128 17 S151 20,169 7" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
        </div>

        <div className="ref-hero-visual" aria-label="Visuel Athleo">
          <img src="/athleo-hero-reference.jpg" alt="Athlète dans une ambiance sombre Athleo" />
        </div>
      </section>

      <section className="ref-priority-section">
        <div className="ref-section-title"><h2>Aujourd’hui</h2><span>Tes priorités du jour.</span></div>
        <div className="ref-priority-grid">
          <PriorityCard icon="training" title="Entraînement" main="Upper B" foot="0 / 6 exercices" onClick={() => onNavigate('training')} />
          <PriorityCard icon="nutrition" title="Nutrition" main="2 104 / 2 800 kcal" foot="" progress={72} onClick={() => onNavigate('nutrition')} />
          <PriorityCard icon="progress" title="Progression" main="80,4 kg" delta="↓ -0,8 kg" foot="" onClick={() => onNavigate('progress')} />
          <PriorityCard icon="coach" title="Coach IA" main="Faire mon bilan" foot="" onClick={() => onNavigate('coach')} />
        </div>
      </section>

      <section className="ref-week-section">
        <div className="ref-week-head">
          <div className="ref-section-title"><h2>Ma semaine</h2><span>Vue d’ensemble.</span></div>
          <button onClick={() => onNavigate('training')}>Voir mon programme <span>→</span></button>
        </div>
        <div className="ref-week-grid">
          {week.map(item => (
            <article key={item.day} className={item.active ? 'ref-week-card active' : 'ref-week-card'}>
              <div className="ref-week-day"><div><b>{item.day}</b><span>{item.date}</span></div>{item.done ? <span className="ref-week-check">✓</span> : <span className="ref-week-arrow">→</span>}</div>
              <strong>{item.label}</strong>
              {item.meta && <small>{item.meta}</small>}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div className="ref-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <div><i style={{ width: `${progress}%` }} /></div>
    </div>
  );
}

function PriorityCard({ icon, title, main, foot, delta, progress, onClick }: { icon: string; title: string; main: string; foot: string; delta?: string; progress?: number; onClick: () => void }) {
  return (
    <button className="ref-priority-card" onClick={onClick}>
      <span className="ref-priority-icon"><CardIcon name={icon} /></span>
      <span className="ref-priority-copy"><b>{title}</b><strong>{main} {delta && <em>{delta}</em>}</strong>{foot && <small>{foot}</small>}{progress && <span className="ref-card-progress"><i style={{ width: `${progress}%` }} /></span>}</span>
      <span className="ref-priority-arrow">→</span>
    </button>
  );
}

function CardIcon({ name }: { name: string }) {
  const common = { viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'training') return <svg {...common}><path d="M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8" /></svg>;
  if (name === 'nutrition') return <svg {...common}><path d="M6 4v7M3.5 4v4c0 2 1 3 2.5 3s2.5-1 2.5-3V4M6 11v9M15 4v16M19 4c-3 1-4 4-4 7h4z" /></svg>;
  if (name === 'progress') return <svg {...common}><path d="M4 19V5M4 19h16m-13-4 4-5 3 2 5-6" /></svg>;
  return <svg {...common}><path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5" /></svg>;
}

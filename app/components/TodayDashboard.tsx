'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { loadProgressPhotoHighlights, ProgressPhotoEntry } from '../../lib/progressPhotos';

type Section = 'today' | 'training' | 'nutrition' | 'progress' | 'coach' | 'boost';

const weekPlan = [
  { label: 'Entraînement' },
  { label: 'Entraînement' },
  { label: 'Upper B' },
  { label: 'Repos' },
  { label: 'Entraînement' },
  { label: 'Entraînement' },
  { label: 'Repos' },
];

function getParisDateParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function getWeek() {
  const parts = getParisDateParts();
  const today = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  const todayIndex = (today.getUTCDay() + 6) % 7;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - todayIndex);

  return weekPlan.map((item, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return {
      ...item,
      day: new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(date).replace('.', ''),
      date: date.getUTCDate(),
      active: index === todayIndex,
      done: index < todayIndex,
    };
  });
}

export default function TodayDashboard({
  userName,
  onNavigate,
  profileControl,
}: {
  userName: string;
  onNavigate: (value: Section) => void;
  profileControl: ReactNode;
}) {
  const [photoHighlights, setPhotoHighlights] = useState<ProgressPhotoEntry[]>([]);

  useEffect(() => {
    let active = true;
    loadProgressPhotoHighlights()
      .then(items => { if (active) setPhotoHighlights(items); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <div className="ref-home">
      <header className="ref-home-header">
        <div>
          <h1>Bonjour <span>{userName}</span>.</h1>
        </div>
        <div className="ref-home-meta">
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

        <div className="ref-hero-visual" aria-hidden="true">
          <Image src="/athleo-hero-reference.jpg" alt="" fill priority sizes="(max-width: 820px) 100vw, 55vw" />
        </div>
      </section>

      {photoHighlights.length > 0 && <section className="ref-photo-comparison">
        <div className="ref-photo-comparison-heading"><div><h2>Mon évolution en photos</h2><p>Premier repère et dernière photo enregistrée.</p></div><span>{photoHighlights.length === 1 ? '1 photo' : 'Comparaison'}</span></div>
        <div className="ref-photo-comparison-grid">
          <figure><img src={photoHighlights[0].imageUrl} alt="Première photo de progression" /><figcaption><span>Début</span><time>{new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${photoHighlights[0].measured_at}T12:00:00Z`))}</time></figcaption></figure>
          {photoHighlights.length > 1 ? <figure><img src={photoHighlights[1].imageUrl} alt="Dernière photo de progression" /><figcaption><span>Dernière photo</span><time>{new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${photoHighlights[1].measured_at}T12:00:00Z`))}</time></figcaption></figure> : <div className="ref-photo-next-step"><b>La suite arrive ici.</b><span>Ajoute une nouvelle photo dans Progression pour comparer ton évolution.</span></div>}
        </div>
      </section>}

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
          {getWeek().map(item => (
            <article key={item.day} className={item.active ? 'ref-week-card active' : 'ref-week-card'}>
              <div className="ref-week-day"><div><b>{item.day}</b><span>{item.date}</span></div>{item.done ? <span className="ref-week-check">✓</span> : <span className="ref-week-arrow">→</span>}</div>
              <strong>{item.label}</strong>
            </article>
          ))}
        </div>
      </section>
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

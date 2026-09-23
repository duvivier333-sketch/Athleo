'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import NutritionPage from './components/NutritionPage';
import ProgressionPage from './components/ProgressionPage';

type Section = 'today' | 'training' | 'nutrition' | 'progress' | 'coach' | 'boost';
type AuthMode = 'signup' | 'login';
type NavItem = { id: Section; label: string; icon: string };
type UserProfile = { id: string; firstName: string; lastName: string; email: string };

const navItems: NavItem[] = [
  { id: 'today', label: "Aujourd’hui", icon: 'home' },
  { id: 'training', label: 'Entraînement', icon: 'training' },
  { id: 'nutrition', label: 'Nutrition', icon: 'nutrition' },
  { id: 'progress', label: 'Progression', icon: 'progress' },
  { id: 'coach', label: 'Coach IA', icon: 'coach' },
  { id: 'boost', label: 'Boost', icon: 'boost' },
];

const sectionMeta: Record<Exclude<Section, 'today' | 'nutrition' | 'progress'>, { eyebrow: string; title: string; text: string }> = {
  training: { eyebrow: 'ENTRAÎNEMENT', title: 'Ton entraînement', text: 'Programmes, séances, exercices et suivi de performance seront regroupés ici.' },
  coach: { eyebrow: 'COACH IA', title: 'Ton coach ATHLEO', text: 'Conseils, synthèses et recommandations personnalisées seront regroupés ici.' },
  boost: { eyebrow: 'BOOST', title: 'Tes boosts', text: 'Supplémentation, prises du jour et protocoles seront regroupés ici.' },
};

async function loadProfile(user: User): Promise<UserProfile> {
  const { data } = await supabase.from('profiles').select('id, first_name, last_name, email').eq('id', user.id).maybeSingle();
  return {
    id: user.id,
    firstName: data?.first_name || user.user_metadata?.first_name || '',
    lastName: data?.last_name || user.user_metadata?.last_name || '',
    email: data?.email || user.email || '',
  };
}

export default function Page() {
  const [section, setSection] = useState<Section>('today');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user && active) setProfile(await loadProfile(data.session.user));
      if (active) setCheckingSession(false);
    }

    restoreSession();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (session?.user) setProfile(await loadProfile(session.user));
      else setProfile(null);
      setCheckingSession(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileOpen(false);
    setSection('today');
  }

  if (checkingSession) return <div className="auth-loading">ATHLEO</div>;
  if (!profile) return <AuthScreen onAuthenticated={setProfile} />;

  const initials = `${profile.firstName[0] || ''}${profile.lastName[0] || ''}`.toUpperCase() || 'A';

  return (
    <main className="app">
      <Sidebar active={section} onChange={setSection} />
      <section className="workspace">
        <header className="workspace-topbar">
          <div className="breadcrumb">TON ESPACE <span>/</span> {section === 'today' ? "AUJOURD’HUI" : navItems.find(i => i.id === section)?.label.toUpperCase()}</div>
          <div className="profile-shell">
            <button className="avatar" aria-label="Profil utilisateur" onClick={() => setProfileOpen(v => !v)}>{initials}</button>
            {profileOpen && (
              <div className="profile-menu">
                <b>{profile.firstName} {profile.lastName}</b>
                <span>{profile.email}</span>
                <button onClick={signOut}>Se déconnecter</button>
              </div>
            )}
          </div>
        </header>

        {section === 'today' && <TodayHome userName={profile.firstName} onNavigate={setSection} />}
        {section === 'nutrition' && <NutritionPage />}
        {section === 'progress' && <ProgressionPage />}
        {section !== 'today' && section !== 'nutrition' && section !== 'progress' && <SectionPlaceholder section={section} />}
      </section>
    </main>
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (profile: UserProfile) => void }) {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Renseigne une adresse e-mail valide.');
      if (password.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');

      if (mode === 'signup') {
        if (!firstName.trim() || !lastName.trim()) throw new Error('Renseigne ton nom et ton prénom.');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { first_name: firstName.trim(), last_name: lastName.trim() } },
        });
        if (signUpError) throw signUpError;
        if (data.session?.user) onAuthenticated(await loadProfile(data.session.user));
        else {
          setInfo('Compte créé. Vérifie ton e-mail pour confirmer ton adresse, puis connecte-toi.');
          setMode('login');
          setPassword('');
        }
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (loginError) throw new Error('E-mail ou mot de passe incorrect.');
        if (!data.user) throw new Error('Impossible de récupérer ton compte.');
        onAuthenticated(await loadProfile(data.user));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setError('');
    setInfo('');
    setPassword('');
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand"><span className="brand-mark"><span>A</span></span><strong>ATHLEO</strong></div>
        <div className="auth-brand-copy">
          <p>LA MÉTHODE AU SERVICE DE TON PHYSIQUE.</p>
          <h1>Un espace pensé<br />pour ta progression<span>.</span></h1>
          <p>Entraînement, nutrition et suivi réunis dans une expérience personnalisée.</p>
        </div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Créer un compte</button>
            <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Se connecter</button>
          </div>
          <div className="auth-heading">
            <p>{mode === 'signup' ? 'BIENVENUE CHEZ ATHLEO' : 'BON RETOUR'}</p>
            <h2>{mode === 'signup' ? 'Créons ton espace.' : 'Retrouve ton espace.'}</h2>
            <span>{mode === 'signup' ? 'Quelques informations suffisent pour personnaliser ton expérience.' : 'Connecte-toi avec les informations de ton compte.'}</span>
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === 'signup' && <div className="auth-name-grid"><label>Prénom<input value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" placeholder="Gwendal" /></label><label>Nom<input value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" placeholder="Duvivier" /></label></div>}
            <label>Adresse e-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="nom@exemple.fr" /></label>
            <label>Mot de passe<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="8 caractères minimum" /></label>
            {error && <p className="auth-error">{error}</p>}
            {info && <p className="auth-info">{info}</p>}
            <button className="auth-submit" type="submit" disabled={loading}>{loading ? 'Chargement…' : mode === 'signup' ? 'Créer mon compte' : 'Me connecter'} <span>→</span></button>
          </form>
          <p className="auth-note">Ton compte ATHLEO est sécurisé et reconnu sur tes différents appareils.</p>
        </div>
      </section>
    </main>
  );
}

function Sidebar({ active, onChange }: { active: Section; onChange: (value: Section) => void }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onChange('today')} aria-label="Retour à l’accueil"><span className="brand-mark"><span>A</span></span><strong>ATHLEO</strong></button>
      <p className="sidebar-label">TON ESPACE</p>
      <nav className="nav-list">{navItems.map(item => <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => onChange(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>
      <div className="sidebar-signature"><div className="signature-a">A</div><p>La méthode au service<br />de ton physique.</p></div>
    </aside>
  );
}

function TodayHome({ userName, onNavigate }: { userName: string; onNavigate: (value: Section) => void }) {
  return (
    <div className="page-content">
      <div className="page-intro"><div><p className="overline">CHAQUE JOUR COMPTE</p><h1>Bonjour {userName}<span>.</span></h1><p className="intro-copy">Ton cap, tes repères, ta journée.</p></div><button className="date-switcher"><span>‹</span><b>Aujourd’hui · 19 sept.</b><span>›</span></button></div>
      <section className="goal-card"><div className="goal-main"><p className="goal-label">MON CAP</p><h2>Construire avec méthode.</h2><p className="goal-program">Prise de masse · Semaine 3 sur 12</p><div className="goal-progress"><span style={{ width: '25%' }} /></div><div className="goal-footer"><small>Un bloc. Des repères. Une progression.</small><button>Voir mon parcours <span>→</span></button></div></div><div className="goal-deadline"><div className="calendar-icon">▢</div><p>PROCHAINE ÉCHÉANCE</p><h3>Shooting</h3><span>Dans 12 semaines</span></div></section>
      <div className="dashboard-grid">
        <section className="essential-column">
          <div className="section-heading"><h2>L’essentiel du jour</h2><span>0 / 2 actions renseignées</span></div>
          <article className="large-card workout-card"><div className="card-topline"><div className="card-category"><span className="category-icon"><Icon name="training" /></span><b>ENTRAÎNEMENT</b></div><span className="status">À faire</span></div><div className="card-body-row"><div><h3>Upper B</h3><p>Ta séance prévue ce jour</p></div><button className="round-arrow" onClick={() => onNavigate('training')}>→</button></div><div className="card-footer"><span>2 séances réalisées cette semaine</span><button onClick={() => onNavigate('training')}>Voir ma séance</button></div></article>
          <article className="large-card nutrition-card"><div className="card-topline"><div className="card-category"><span className="category-icon"><Icon name="nutrition" /></span><b>NUTRITION</b></div><span className="status blue">Jour haut</span></div><div className="nutrition-head"><div><h3>1 004 <small>/ 2 800 kcal</small></h3><p>Consommé / objectif du jour</p></div><button className="round-arrow" onClick={() => onNavigate('nutrition')}>→</button></div><div className="macro-grid"><Macro label="Protéines" value="84" target="170 g" progress={49} tone="blue" /><Macro label="Glucides" value="140" target="350 g" progress={40} tone="dark" /><Macro label="Lipides" value="10" target="80 g" progress={13} tone="gray" /></div><div className="card-footer"><span>2 repas renseignés sur 4</span><button onClick={() => onNavigate('nutrition')}>Voir ma diète</button></div></article>
          <article className="coach-card"><div className="coach-icon"><Icon name="coach" /></div><div><div className="coach-title">Le point du coach <span>IA</span></div><p>Tes deux dernières séances sont renseignées. Retrouve ta séance dans ton programme et complète ton check du jour.</p><button onClick={() => onNavigate('coach')}>Échanger avec ATHLEO <span>→</span></button></div></article>
        </section>
        <aside className="reference-column">
          <div className="section-heading"><h2>Mes repères</h2><span>AUJOURD’HUI</span></div>
          <article className="side-card check-card"><div className="check-row"><span className="check-icon">✓</span><span className="status">À compléter</span></div><h3>Mon check quotidien</h3><p>Poids, sommeil, forme.<br />Un point rapide pour te situer.</p><button>Faire le point <span>→</span></button></article>
          <article className="side-card activity-card"><div className="side-title"><h3>Mon activité</h3><span>→</span></div><Activity label="Pas" value="5 800" target="8 000" progress={72} /><Activity label="Cardio" value="20" target="20 min" progress={100} done /></article>
          <article className="supplement-card" onClick={() => onNavigate('boost')}><div className="pill">◇</div><div><b>Mes prises du jour</b><span>1 sur 2 renseignée</span></div><span>›</span></article>
          <section className="week-block"><div className="week-title"><h3>Cette semaine</h3><span>SEPTEMBRE</span></div><div className="week-days">{['14','15','16','17','18','19','20'].map((day, i) => <div className={day === '19' ? 'day active' : day === '18' ? 'day done' : 'day'} key={day}><small>{['L','M','M','J','V','S','D'][i]}</small><b>{day}</b></div>)}</div></section>
        </aside>
      </div>
    </div>
  );
}

function Macro({ label, value, target, progress, tone }: { label: string; value: string; target: string; progress: number; tone: string }) {
  return <div className="macro"><span>{label}</span><b>{value} <small>/ {target}</small></b><div className={`macro-bar ${tone}`}><span style={{ width: `${progress}%` }} /></div></div>;
}

function Activity({ label, value, target, progress, done }: { label: string; value: string; target: string; progress: number; done?: boolean }) {
  return <div className="activity-row"><div className="activity-line"><span>{label}</span><b>{value} <small>/ {target}</small>{done && <em>✓</em>}</b></div><div className="activity-progress"><span style={{ width: `${progress}%` }} /></div></div>;
}

function SectionPlaceholder({ section }: { section: Exclude<Section, 'today' | 'nutrition' | 'progress'> }) {
  const data = sectionMeta[section];
  return <div className="placeholder-page"><p className="overline">{data.eyebrow}</p><h1>{data.title}<span>.</span></h1><p>{data.text}</p><div className="placeholder-card"><div className="placeholder-icon"><Icon name={navItems.find(i => i.id === section)?.icon || 'home'} /></div><div><b>Section prête</b><span>Envoie-moi les éléments de cet onglet et je construirai son contenu ici sans modifier la structure générale d’Athleo.</span></div></div></div>;
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-6h5v6"/></>,
    training: <><path d="M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8"/></>,
    nutrition: <><path d="M6 4v7M3.5 4v4c0 2 1 3 2.5 3s2.5-1 2.5-3V4M6 11v9M15 4v16M19 4c-3 1-4 4-4 7h4z"/></>,
    progress: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-5 3 2 5-6"/></>,
    coach: <><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></>,
    boost: <><path d="M8 4a4 4 0 0 1 0 8l-1.5 1.5a4 4 0 0 1-5.5-5.5L6 3a4 4 0 0 1 5.5 5.5L8 12" transform="translate(5 2) scale(.7)"/></>,
  };
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

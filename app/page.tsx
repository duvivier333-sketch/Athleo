'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import NutritionPage from './components/NutritionPage';
import ProgressionPage from './components/ProgressionPage';
import CoachPage from './components/CoachPage';
import AppSidebar from './components/AppSidebar';
import TodayDashboard from './components/TodayDashboard';

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

const sectionMeta: Record<Exclude<Section, 'today' | 'nutrition' | 'progress' | 'coach'>, { eyebrow: string; title: string; text: string }> = {
  training: { eyebrow: 'ENTRAÎNEMENT', title: 'Ton entraînement', text: 'Programmes, séances, exercices et suivi de performance seront regroupés ici.' },
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
  const profileControl = (
    <div className="profile-shell">
      <button className="avatar" aria-label="Profil utilisateur" onClick={() => setProfileOpen(value => !value)}>{initials}</button>
      {profileOpen && (
        <div className="profile-menu">
          <b>{profile.firstName} {profile.lastName}</b>
          <span>{profile.email}</span>
          <button onClick={signOut}>Se déconnecter</button>
        </div>
      )}
    </div>
  );

  return (
    <main className="app">
      <AppSidebar active={section} onChange={setSection} />
      <section className="workspace">
        {section !== 'today' && (
          <header className="workspace-topbar">
            <div className="breadcrumb">TON ESPACE <span>/</span> {navItems.find(item => item.id === section)?.label.toUpperCase()}</div>
            {profileControl}
          </header>
        )}

        {section === 'today' && <TodayDashboard userName={profile.firstName} onNavigate={setSection} profileControl={profileControl} />}
        {section === 'nutrition' && <NutritionPage />}
        {section === 'progress' && <ProgressionPage />}
        {section === 'coach' && <CoachPage userName={profile.firstName} />}
        {section !== 'today' && section !== 'nutrition' && section !== 'progress' && section !== 'coach' && <SectionPlaceholder section={section} />}
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
            {mode === 'signup' && (
              <div className="auth-name-grid">
                <label>Prénom<input value={firstName} onChange={event => setFirstName(event.target.value)} autoComplete="given-name" placeholder="Gwendal" /></label>
                <label>Nom<input value={lastName} onChange={event => setLastName(event.target.value)} autoComplete="family-name" placeholder="Duvivier" /></label>
              </div>
            )}
            <label>Adresse e-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="nom@exemple.fr" /></label>
            <label>Mot de passe<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="8 caractères minimum" /></label>
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

function SectionPlaceholder({ section }: { section: Exclude<Section, 'today' | 'nutrition' | 'progress' | 'coach'> }) {
  const data = sectionMeta[section];
  return (
    <div className="placeholder-page">
      <p className="overline">{data.eyebrow}</p>
      <h1>{data.title}<span>.</span></h1>
      <p>{data.text}</p>
      <div className="placeholder-card">
        <div className="placeholder-icon"><Icon name={navItems.find(item => item.id === section)?.icon || 'home'} /></div>
        <div><b>Section prête</b><span>Envoie-moi les éléments de cet onglet et je construirai son contenu ici sans modifier la structure générale d’Athleo.</span></div>
      </div>
    </div>
  );
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

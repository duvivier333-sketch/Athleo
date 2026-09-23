'use client';

import { FormEvent, useState } from 'react';

type Tab = 'discussion' | 'audit';
type Message = { id: number; from: 'coach' | 'user'; text: string };

export default function CoachPage({ userName }: { userName: string }) {
  const [tab, setTab] = useState<Tab>('discussion');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: 'coach', text: `Bonjour ${userName || 'Gwendal'}. Tu peux faire un retour sur ta séance ou revoir tes objectifs avec l’audit.` },
  ]);

  function send(text?: string) {
    const value = (text ?? message).trim();
    if (!value) return;
    setMessages(current => [...current, { id: Date.now(), from: 'user', text: value }]);
    setMessage('');
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send();
  }

  return (
    <div className="coach-page-view">
      <header className="coach-page-header">
        <p className="overline">TON ACCOMPAGNEMENT</p>
        <h1>Mon coach IA<span>.</span></h1>
        <p>Comprendre, faire le point, avancer.</p>
      </header>

      <section className="coach-audit-hero">
        <div>
          <p>TON POINT DE DÉPART</p>
          <h2>Un programme qui commence par toi.</h2>
          <span>Objectifs, rythme de vie et préférences.</span>
        </div>
        <button onClick={() => setTab('audit')}>Commencer mon audit</button>
      </section>

      <div className="coach-tabs" role="tablist" aria-label="Navigation coach">
        <button className={tab === 'discussion' ? 'active' : ''} onClick={() => setTab('discussion')}>Discussion</button>
        <button className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>Audit</button>
      </div>

      {tab === 'discussion' ? (
        <section className="coach-conversation-card">
          <h2>Discuter avec ATHLEO</h2>
          <div className="coach-demo-note">Conversation simulée pour tester la maquette. Aucun modèle IA n’est connecté.</div>

          <div className="coach-thread">
            {messages.map(item => (
              <div key={item.id} className={`coach-message ${item.from}`}>{item.text}</div>
            ))}
          </div>

          <div className="coach-suggestions">
            <button onClick={() => send('Retour sur Upper B')}>Retour sur Upper B</button>
            <button onClick={() => send('Comprendre ma diète')}>Comprendre ma diète</button>
            <button onClick={() => send('Faire mon bilan')}>Faire mon bilan</button>
          </div>

          <form className="coach-composer" onSubmit={submit}>
            <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Partage ton ressenti…" />
            <button type="submit">Envoyer <span>→</span></button>
          </form>
        </section>
      ) : (
        <section className="coach-audit-card">
          <div>
            <p className="overline">AUDIT ATHLEO</p>
            <h2>Construisons ton point de départ.</h2>
            <p>Cette étape permettra ensuite d’adapter l’entraînement, la nutrition et les repères à ton profil.</p>
          </div>
          <div className="coach-audit-grid">
            {[
              ['01', 'Objectif principal', 'Prise de masse, recomposition, perte de gras…'],
              ['02', 'Rythme de vie', 'Sommeil, emploi du temps et contraintes.'],
              ['03', 'Expérience', 'Niveau, historique et fréquence d’entraînement.'],
              ['04', 'Préférences', 'Exercices, alimentation et habitudes.'],
            ].map(([number, title, copy]) => (
              <article key={number}>
                <span>{number}</span><h3>{title}</h3><p>{copy}</p>
              </article>
            ))}
          </div>
          <button className="coach-start-audit">Démarrer l’audit <span>→</span></button>
        </section>
      )}
    </div>
  );
}

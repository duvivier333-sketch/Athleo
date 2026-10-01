'use client';

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { loadProgressPhases, type ProgressPhase, type ProgressPhaseDraft, type PhaseType, saveProgressPhase, deleteProgressPhase } from '../../lib/progressPhases';
import type { ProgressPhotoEntry } from '../../lib/progressPhotos';

type Props = {
  entries: ProgressPhotoEntry[];
  loadingEntries: boolean;
  onAddPhoto: () => void;
};

type PhasePoint = { id: string; date: string; weight: number };

const PHASES: Record<PhaseType, { label: string; color: string }> = {
  recomposition: { label: 'Recomposition', color: '#657358' },
  bulk: { label: 'Bulk', color: '#b8855a' },
  cut: { label: 'Sèche', color: '#8b1e25' },
};

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

function dateValue(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).getTime();
}

function dateLabel(value: string, year = true) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' as const } : {}), timeZone: 'UTC' })
    .format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function numberLabel(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}

function dayInputToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function phaseDays(phase: ProgressPhase, year: number) {
  const first = Math.max(dateValue(phase.starts_on), Date.UTC(year, 0, 1));
  const last = Math.min(dateValue(phase.ends_on || dayInputToday()), Date.UTC(year + 1, 0, 1) - 1);
  return Math.max(1, Math.floor((last - first) / 86_400_000) + 1);
}

function graphPoints(rows: PhasePoint[], min: number, max: number, year: number) {
  const first = Date.UTC(year, 0, 1);
  const span = Date.UTC(year + 1, 0, 1) - first;
  return rows.map(row => ({
    ...row,
    x: ((dateValue(row.date) - first) / span) * 900,
    y: 218 - ((row.weight - min) / Math.max(max - min, 0.1)) * 185,
  }));
}

export default function AnnualProgress({ entries, loadingEntries, onAddPhoto }: Props) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [phases, setPhases] = useState<ProgressPhase[]>([]);
  const [loadingPhases, setLoadingPhases] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<ProgressPhase | null | false>(false);
  const [phaseType, setPhaseType] = useState<PhaseType>('recomposition');
  const [startsOn, setStartsOn] = useState(dayInputToday);
  const [endsOn, setEndsOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    loadProgressPhases()
      .then(rows => { if (active) setPhases(rows); })
      .catch(() => { if (active) setLoadError('Impossible de charger tes phases. Réessaie dans un instant.'); })
      .finally(() => { if (active) setLoadingPhases(false); });
    return () => { active = false; };
  }, []);

  const years = useMemo(() => {
    const savedYears = [...entries.map(entry => Number(entry.measured_at.slice(0, 4))), ...phases.map(phase => Number(phase.starts_on.slice(0, 4)))].filter(Number.isFinite);
    const firstYear = Math.min(2025, ...savedYears);
    const lastYear = Math.max(2028, currentYear + 2, ...savedYears);
    return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index);
  }, [entries, phases, currentYear]);

  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;
  const yearEntries = useMemo(() => entries.filter(entry => entry.measured_at >= yearStart && entry.measured_at <= yearEnd)
    .sort((a, b) => a.measured_at.localeCompare(b.measured_at)), [entries, yearStart, yearEnd]);
  const weights = useMemo(() => yearEntries.filter(entry => entry.weight_kg != null)
    .map(entry => ({ id: entry.id, date: entry.measured_at, weight: Number(entry.weight_kg) })), [yearEntries]);
  const today = dayInputToday();
  const yearPhases = useMemo(() => phases.filter(phase => phase.starts_on <= yearEnd && (phase.ends_on || today) >= yearStart), [phases, yearStart, yearEnd, today]);
  const firstWeight = weights[0]?.weight;
  const lastWeight = weights.at(-1)?.weight;
  const weightDelta = firstWeight == null || lastWeight == null ? null : lastWeight - firstWeight;
  const minWeight = weights.length ? Math.min(...weights.map(row => row.weight)) : 0;
  const maxWeight = weights.length ? Math.max(...weights.map(row => row.weight)) : 0;
  const weightPadding = Math.max((maxWeight - minWeight) * 0.18, 0.6);
  const points = graphPoints(weights, minWeight - weightPadding, maxWeight + weightPadding, selectedYear);

  function openCreate() {
    setEditing(null);
    setPhaseType('recomposition');
    setStartsOn(dayInputToday());
    setEndsOn('');
    setError('');
  }

  function openEdit(phase: ProgressPhase) {
    setEditing(phase);
    setPhaseType(phase.phase_type);
    setStartsOn(phase.starts_on);
    setEndsOn(phase.ends_on || '');
    setError('');
  }

  async function savePhase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (endsOn && endsOn < startsOn) {
      setError('La date de fin doit être après la date de début.');
      return;
    }
    const proposedEnd = endsOn || '9999-12-31';
    const overlap = phases.some(phase => {
      if (phase.id === (editing && editing !== null ? editing.id : '')) return false;
      return startsOn <= (phase.ends_on || '9999-12-31') && (phase.starts_on <= proposedEnd);
    });
    if (overlap) {
      setError('Cette période chevauche une autre phase. Termine ou modifie d’abord la phase existante.');
      return;
    }

    setBusy(true);
    try {
      const draft: ProgressPhaseDraft = { phase_type: phaseType, starts_on: startsOn, ends_on: endsOn || null };
      const saved = await saveProgressPhase(draft, editing && editing !== null ? editing.id : undefined);
      setPhases(current => [...current.filter(phase => phase.id !== saved.id), saved].sort((a, b) => a.starts_on.localeCompare(b.starts_on)));
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'La phase n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  }

  async function removePhase(phase: ProgressPhase) {
    if (!window.confirm(`Supprimer la phase « ${PHASES[phase.phase_type].label} » ?`)) return;
    setError('');
    setBusy(true);
    try {
      await deleteProgressPhase(phase.id);
      setPhases(current => current.filter(item => item.id !== phase.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'La phase n’a pas pu être supprimée.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="annual-progress">
      <header className="annual-progress-header">
        <div><p className="overline">TON ANNÉE EN UN COUP D’ŒIL</p><h2>Parcours annuel</h2><p>Visualise tes phases et les repères qui les accompagnent.</p></div>
        <label className="annual-year-picker"><span>Année</span><select aria-label="Choisir l’année" value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
      </header>

      {loadError && <p className="annual-error" role="alert">{loadError}</p>}

      <div className="annual-summary-grid">
        <article><span>Poids de début</span><strong>{firstWeight == null ? '—' : `${numberLabel(firstWeight)} kg`}</strong><small>{weights[0] ? dateLabel(weights[0].date) : 'Aucun relevé cette année'}</small></article>
        <article><span>Évolution du poids</span><strong className={weightDelta == null ? '' : weightDelta > 0 ? 'is-up' : weightDelta < 0 ? 'is-down' : ''}>{weightDelta == null ? '—' : `${weightDelta > 0 ? '+' : ''}${numberLabel(weightDelta)} kg`}</strong><small>{weights.length > 1 ? `${weights.length} pesées enregistrées` : 'Ajoute plusieurs repères pour comparer'}</small></article>
        <article><span>Phases suivies</span><strong>{yearPhases.length}</strong><small>{yearPhases.length === 1 ? 'phase sur cette année' : 'phases sur cette année'}</small></article>
      </div>

      <section className="annual-card annual-chart-card">
        <div className="annual-section-heading"><div><p className="overline">POIDS & PHASES</p><h3>La courbe de ton année</h3></div><div className="annual-phase-legend">{(Object.entries(PHASES) as [PhaseType, typeof PHASES[PhaseType]][]).map(([type, meta]) => <span key={type}><i style={{ backgroundColor: meta.color }} />{meta.label}</span>)}</div></div>
        {loadingEntries ? <p className="annual-empty-note">Chargement de tes relevés…</p> : weights.length === 0 ? <div className="annual-empty-note"><p>Pas encore de poids enregistré en {selectedYear}.</p><button type="button" onClick={onAddPhoto}>Ajouter une photo avec mon poids</button></div> : <>
          <div className="annual-chart-shell">
            <div className="annual-y-labels"><span>{numberLabel(maxWeight + weightPadding)} kg</span><span>{numberLabel((maxWeight + minWeight) / 2)} kg</span><span>{numberLabel(minWeight - weightPadding)} kg</span></div>
            <svg viewBox="0 0 900 240" preserveAspectRatio="none" role="img" aria-label={`Évolution du poids pendant ${selectedYear}`}>
              {yearPhases.map(phase => {
                const clippedStart = Math.max(dateValue(phase.starts_on), Date.UTC(selectedYear, 0, 1));
                const clippedEnd = Math.min(dateValue(phase.ends_on || dayInputToday()), Date.UTC(selectedYear + 1, 0, 1) - 1);
                if (clippedEnd < clippedStart) return null;
                const left = ((clippedStart - Date.UTC(selectedYear, 0, 1)) / (Date.UTC(selectedYear + 1, 0, 1) - Date.UTC(selectedYear, 0, 1))) * 900;
                const width = Math.max(2, ((clippedEnd - clippedStart + 86_400_000) / (Date.UTC(selectedYear + 1, 0, 1) - Date.UTC(selectedYear, 0, 1))) * 900);
                return <rect key={phase.id} x={left} y="10" width={width} height="205" fill={PHASES[phase.phase_type].color} opacity=".13"><title>{PHASES[phase.phase_type].label}</title></rect>;
              })}
              {[25, 120, 215].map(y => <line key={y} x1="0" y1={y} x2="900" y2={y} className="annual-grid-line" />)}
              {points.length > 1 && <polyline points={points.map(point => `${point.x},${point.y}`).join(' ')} className="annual-weight-line" />}
              {points.map(point => <circle key={point.id} cx={point.x} cy={point.y} r="6" className="annual-weight-dot"><title>{numberLabel(point.weight)} kg · {dateLabel(point.date)}</title></circle>)}
            </svg>
          </div>
          <div className="annual-months">{MONTHS.map((month, index) => {
            const monthEntries = yearEntries.filter(entry => Number(entry.measured_at.slice(5, 7)) === index + 1);
            const monthPhase = yearPhases.find(phase => phase.starts_on.slice(0, 7) <= `${selectedYear}-${String(index + 1).padStart(2, '0')}` && (phase.ends_on || '9999-12-31').slice(0, 7) >= `${selectedYear}-${String(index + 1).padStart(2, '0')}`);
            return <div className="annual-month" key={month} style={{ borderTopColor: monthPhase ? PHASES[monthPhase.phase_type].color : 'transparent' }}><span>{month}</span>{monthEntries.length > 0 && <small>{monthEntries.length} rep.</small>}</div>;
          })}</div>
        </>}
      </section>

      <section className="annual-phases-section">
        <div className="annual-section-heading"><div><p className="overline">RECOMPOSITION, BULK, SÈCHE</p><h3>Les phases de {selectedYear}</h3></div><button type="button" className="annual-add-button" onClick={openCreate}>+ Ajouter une phase</button></div>
        {error && !editing && <p className="annual-error" role="alert">{error}</p>}
        {loadingPhases ? <p className="annual-empty-note">Chargement de tes phases…</p> : yearPhases.length === 0 ? <div className="annual-empty-note"><p>Déclare une phase pour donner du contexte à ta courbe de poids.</p><button type="button" onClick={openCreate}>Créer ma première phase</button></div> : <div className="annual-phase-list">
          {yearPhases.map(phase => {
            const phaseStart = phase.starts_on > yearStart ? phase.starts_on : yearStart;
            const phaseEnd = (phase.ends_on || dayInputToday()) < yearEnd ? phase.ends_on || dayInputToday() : yearEnd;
            const phaseRows = yearEntries.filter(entry => entry.measured_at >= phaseStart && entry.measured_at <= phaseEnd);
            const phaseWeights = phaseRows.filter(entry => entry.weight_kg != null);
            const delta = phaseWeights.length > 1 ? Number(phaseWeights.at(-1)!.weight_kg) - Number(phaseWeights[0].weight_kg) : null;
            const photos = phaseRows.length === 1 ? [phaseRows[0]] : phaseRows.length > 1 ? [phaseRows[0], phaseRows.at(-1)!] : [];
            return <article className="annual-phase-card" key={phase.id} style={{ '--phase-color': PHASES[phase.phase_type].color } as CSSProperties}>
              <div className="annual-phase-card-head"><div><span className="annual-phase-tag"><i />{PHASES[phase.phase_type].label}</span><h4>{dateLabel(phase.starts_on)} – {phase.ends_on ? dateLabel(phase.ends_on) : 'En cours'}</h4><p>{phaseDays(phase, selectedYear)} jours sur {selectedYear}</p></div><div className="annual-phase-actions"><button type="button" onClick={() => openEdit(phase)}>Modifier</button><button type="button" onClick={() => void removePhase(phase)} disabled={busy}>Supprimer</button></div></div>
              <div className="annual-phase-stats"><span><small>Évolution du poids</small><b>{delta == null ? 'Pas assez de pesées' : `${delta > 0 ? '+' : ''}${numberLabel(delta)} kg`}</b></span><span><small>Repères photo</small><b>{phaseRows.length}</b></span></div>
              {photos.length > 0 ? <div className="annual-phase-photos">{photos.map((photo, index) => <div key={photo.id} className="annual-phase-photo"><img src={photo.imageUrl} alt={`Repère du ${dateLabel(photo.measured_at)}`} /><span>{index === 0 ? 'Début' : 'Dernier repère'} · {dateLabel(photo.measured_at, false)}{photo.weight_kg != null ? ` · ${numberLabel(photo.weight_kg)} kg` : ''}</span></div>)}</div> : <button type="button" className="annual-add-photo-link" onClick={onAddPhoto}>Ajouter une photo à cette période <span>→</span></button>}
            </article>;
          })}
        </div>}
      </section>

      {editing !== false && <div className="annual-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setEditing(false); }}>
        <form className="annual-phase-modal" onSubmit={savePhase}>
          <div className="annual-modal-heading"><div><p className="overline">PARCOURS ANNUEL</p><h3>{editing ? 'Modifier la phase' : 'Ajouter une phase'}</h3></div><button type="button" aria-label="Fermer" onClick={() => setEditing(false)} disabled={busy}>×</button></div>
          <label className="annual-form-field">Type de phase<select value={phaseType} onChange={event => setPhaseType(event.target.value as PhaseType)}><option value="recomposition">Recomposition</option><option value="bulk">Bulk</option><option value="cut">Sèche</option></select></label>
          <div className="annual-date-fields"><label className="annual-form-field">Date de début<input type="date" value={startsOn} onChange={event => setStartsOn(event.target.value)} required /></label><label className="annual-form-field">Date de fin <span>(facultative si en cours)</span><input type="date" value={endsOn} onChange={event => setEndsOn(event.target.value)} min={startsOn} /></label></div>
          <p className="annual-modal-hint">Les poids et photos enregistrés entre ces dates seront rattachés à la phase.</p>
          {error && <p className="annual-error" role="alert">{error}</p>}
          <div className="annual-modal-actions"><button type="button" onClick={() => setEditing(false)} disabled={busy}>Annuler</button><button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer la phase'}</button></div>
        </form>
      </div>}
    </section>
  );
}

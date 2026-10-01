'use client';

import { useEffect, useMemo, useState } from 'react';
import ProgressPhotos from './ProgressPhotos';
import { loadProgressPhotos, type ProgressPhotoEntry } from '../../lib/progressPhotos';

type MainTab = 'evolution' | 'photos' | 'annual';
type Metric = 'weight' | 'bodyfat';
type PeriodMode = 'month' | 'year' | 'all';
type ChartPoint = { id: string; date: string; value: number };

type Measure = {
  id: string;
  label: string;
  color: string;
  values: number[];
};

const measures: Measure[] = [
  { id: 'neck', label: 'Cou', color: '#8b1e25', values: [39,39,39.2,39.1,39.3,39.4,39.4,39.5,39.6,39.6,39.8,40] },
  { id: 'waist', label: 'Taille', color: '#b8855a', values: [82,81.8,81.6,81.4,81.3,81.1,81,80.8,80.6,80.5,80.3,80] },
  { id: 'right-arm', label: 'Bras droit', color: '#657358', values: [36,36.2,36.1,36.4,36.5,36.7,36.8,36.9,37,37.1,37.2,37.4] },
  { id: 'left-thigh', label: 'Cuisse gauche', color: '#766b61', values: [59,59.2,59.1,59.4,59.5,59.7,59.8,60,60.1,60.2,60.4,60.5] },
  { id: 'right-calf', label: 'Mollet droit', color: '#3f4a3a', values: [38,38.1,38.1,38.2,38.3,38.3,38.4,38.4,38.5,38.5,38.6,38.7] },
  { id: 'shoulders', label: 'Épaules', color: '#9d5b48', values: [118,118.2,118.3,118.4,118.5,118.7,118.8,119,119.2,119.4,119.6,119.8] },
  { id: 'hips', label: 'Hanches', color: '#75624d', values: [99,99,98.8,98.8,98.7,98.7,98.6,98.6,98.5,98.4,98.4,98.3] },
  { id: 'left-forearm', label: 'Avant-bras gauche', color: '#9b7655', values: [29.5,29.5,29.6,29.6,29.7,29.8,29.8,29.9,30,30,30.1,30.2] },
  { id: 'right-thigh', label: 'Cuisse droite', color: '#5c6250', values: [59.2,59.3,59.4,59.4,59.6,59.7,59.8,59.9,60,60.2,60.3,60.4] },
  { id: 'chest', label: 'Poitrine', color: '#806557', values: [105,105.1,105.2,105.4,105.5,105.6,105.7,105.9,106,106.2,106.3,106.5] },
  { id: 'left-arm', label: 'Bras gauche', color: '#956c68', values: [35.8,36,36,36.1,36.3,36.4,36.5,36.6,36.8,36.9,37,37.2] },
  { id: 'right-forearm', label: 'Avant-bras droit', color: '#795c42', values: [29.7,29.7,29.8,29.8,29.9,30,30,30.1,30.2,30.2,30.3,30.4] },
  { id: 'left-calf', label: 'Mollet gauche', color: '#657358', values: [37.9,38,38,38.1,38.2,38.2,38.3,38.4,38.4,38.5,38.6,38.6] },
];

function formatDate(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Intl.DateTimeFormat('fr-FR', { ...options, timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}

function points(rows: ChartPoint[], min: number, max: number) {
  const dates = rows.map(row => new Date(`${row.date.slice(0, 10)}T12:00:00Z`).getTime());
  const firstDate = Math.min(...dates);
  const lastDate = Math.max(...dates);
  const dateSpan = Math.max(lastDate - firstDate, 1);
  return rows.map((row, index) => {
    const x = rows.length === 1 ? 450 : ((dates[index] - firstDate) / dateSpan) * 900;
    const y = 235 - ((row.value - min) / Math.max(max - min, 0.1)) * 210;
    return { ...row, x, y };
  });
}

export default function ProgressionPage() {
  const [tab, setTab] = useState<MainTab>('evolution');
  const [metric, setMetric] = useState<Metric>('weight');
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [entries, setEntries] = useState<ProgressPhotoEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<string[]>(measures.map(item => item.id));

  useEffect(() => {
    let active = true;
    loadProgressPhotos()
      .then(rows => { if (active) setEntries(rows); })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoadingEntries(false); });
    return () => { active = false; };
  }, []);

  const metricEntries = useMemo(() => entries
    .map(entry => ({
      id: entry.id,
      date: entry.measured_at,
      value: metric === 'weight' ? entry.weight_kg : entry.body_fat_percent,
    }))
    .filter((entry): entry is ChartPoint => entry.value != null && Number.isFinite(entry.value))
    .sort((a, b) => a.date.localeCompare(b.date)), [entries, metric]);

  const years = useMemo(() => [...new Set(metricEntries.map(entry => entry.date.slice(0, 4)))].sort().reverse(), [metricEntries]);
  const filteredEntries = useMemo(() => metricEntries.filter(entry => {
    if (periodMode === 'month') return selectedMonth ? entry.date.slice(0, 7) === selectedMonth : false;
    if (periodMode === 'year') return selectedYear ? entry.date.slice(0, 4) === selectedYear : false;
    return true;
  }), [metricEntries, periodMode, selectedMonth, selectedYear]);

  const chartMinValue = filteredEntries.length ? Math.min(...filteredEntries.map(entry => entry.value)) : 0;
  const chartMaxValue = filteredEntries.length ? Math.max(...filteredEntries.map(entry => entry.value)) : 0;
  const chartPadding = Math.max((chartMaxValue - chartMinValue) * 0.18, metric === 'weight' ? 0.6 : 0.25);
  const chartMin = chartMinValue - chartPadding;
  const chartMax = chartMaxValue + chartPadding;
  const plottedPoints = points(filteredEntries, chartMin, chartMax);
  const latest = metricEntries.at(-1);
  const unit = metric === 'weight' ? 'kg' : '%';
  const selectedMeasures = useMemo(() => measures.filter(item => selected.includes(item.id)), [selected]);

  function toggleMeasure(id: string) {
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  return (
    <div className="progress-page">
      <div className="progress-head">
        <p className="overline">DES REPÈRES CLAIRS</p>
        <h1>Progression<span>.</span></h1>
        <p>Ton évolution, tes photos et ton parcours annuel.</p>
      </div>

      <div className="progress-tabs" role="tablist" aria-label="Sections de progression">
        <button type="button" role="tab" aria-selected={tab === 'evolution'} className={tab === 'evolution' ? 'active' : ''} onClick={() => setTab('evolution')}>Évolution</button>
        <button type="button" role="tab" aria-selected={tab === 'photos'} className={tab === 'photos' ? 'active' : ''} onClick={() => setTab('photos')}>Photos</button>
        <button type="button" role="tab" aria-selected={tab === 'annual'} className={tab === 'annual' ? 'active' : ''} onClick={() => setTab('annual')}>Parcours annuel</button>
      </div>

      {tab === 'evolution' && (
        <>
          <section className="progress-callout">
            <div><h2>Mon poids & mes mensurations</h2><p>Ajoute une photo de progression avec ton poids pour suivre son évolution ici.</p></div>
            <button type="button" onClick={() => setTab('photos')}>+ Ajouter un repère</button>
          </section>

          <section className="progress-card weight-card">
            <div className="weight-card-heading"><div><p className="overline">TES DONNÉES DE SUIVI</p><h2>Poids & body fat</h2></div>
              <div className="metric-toggle" role="group" aria-label="Mesure affichée">
                <button type="button" className={metric === 'weight' ? 'active' : ''} aria-pressed={metric === 'weight'} onClick={() => setMetric('weight')}>Poids</button>
                <button type="button" className={metric === 'bodyfat' ? 'active' : ''} aria-pressed={metric === 'bodyfat'} onClick={() => setMetric('bodyfat')}>Body fat</button>
              </div>
            </div>
            <div className="weight-summary">
              <div>
                {latest ? <><strong>{formatNumber(latest.value)}</strong><span>{unit}</span><p>Dernier relevé · {formatDate(latest.date)}</p></> : <><strong className="no-weight-value">—</strong><span>{unit}</span><p>{metric === 'weight' ? 'Aucun poids renseigné sur tes photos.' : 'Aucune masse grasse renseignée sur tes photos.'}</p></>}
              </div>
              <div className="period-controls" role="group" aria-label="Période du graphique">
                <div className="period-switch">
                  <button type="button" aria-pressed={periodMode === 'month'} className={periodMode === 'month' ? 'active' : ''} onClick={() => setPeriodMode('month')}>Mois</button>
                  <button type="button" aria-pressed={periodMode === 'year'} className={periodMode === 'year' ? 'active' : ''} onClick={() => setPeriodMode('year')}>Année</button>
                  <button type="button" aria-pressed={periodMode === 'all'} className={periodMode === 'all' ? 'active' : ''} onClick={() => setPeriodMode('all')}>Depuis le début</button>
                </div>
                {periodMode === 'month' && <label className="period-picker"><span>Mois</span><input aria-label="Choisir un mois" type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></label>}
                {periodMode === 'year' && <label className="period-picker"><span>Année</span><select aria-label="Choisir une année" value={selectedYear} onChange={event => setSelectedYear(event.target.value)}><option value="">Choisir</option>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label>}
              </div>
            </div>
            {loadError ? <div className="progress-chart-empty" role="status"><p>Impossible de charger les données de progression.</p><button type="button" onClick={() => setTab('photos')}>Ouvrir l’espace photos</button></div> : loadingEntries ? <div className="progress-chart-empty" role="status"><p>Chargement de tes repères…</p></div> : filteredEntries.length === 0 ? <div className="progress-chart-empty" role="status"><p>{metricEntries.length === 0 ? 'Enregistre un poids avec une photo pour commencer ta courbe.' : 'Aucun relevé sur cette période.'}</p>{metricEntries.length === 0 && <button type="button" onClick={() => setTab('photos')}>Ajouter une photo</button>}</div> : <>
              <div className="chart-shell">
                <div className="chart-labels" aria-hidden="true"><span>{formatNumber(chartMax)} {unit}</span><span>{formatNumber((chartMax + chartMin) / 2)} {unit}</span><span>{formatNumber(chartMin)} {unit}</span></div>
                <svg className="line-chart" viewBox="0 0 900 260" preserveAspectRatio="none" role="img" aria-label={`Évolution ${metric === 'weight' ? 'du poids' : 'du body fat'} sur ${filteredEntries.length} relevé${filteredEntries.length > 1 ? 's' : ''}`}>
                  <line x1="0" y1="25" x2="900" y2="25" className="grid-line"/><line x1="0" y1="130" x2="900" y2="130" className="grid-line"/><line x1="0" y1="235" x2="900" y2="235" className="grid-line"/>
                  {plottedPoints.length > 1 && <polyline points={plottedPoints.map(point => `${point.x},${point.y}`).join(' ')} className="main-line" />}
                  {plottedPoints.map(point => <circle key={point.id} cx={point.x} cy={point.y} r="7" className="main-dot"><title>{formatNumber(point.value)} {unit} · {formatDate(point.date)}</title></circle>)}
                </svg>
              </div>
              <div className="chart-dates" aria-hidden="true"><span>{formatDate(filteredEntries[0].date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span>{formatDate(filteredEntries.at(-1)!.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
              <p className="chart-record-count">{filteredEntries.length} relevé{filteredEntries.length > 1 ? 's' : ''} sur cette période</p>
            </>}
          </section>

          <section className="progress-card measurements-card">
            <div className="measurements-top"><div><p className="overline">SUIVI COMPLÉMENTAIRE</p><h2>Toutes mes mensurations</h2><p>Courbes en centimètres.<br/>Sélectionne les zones à comparer.</p></div></div>
            <div className="measure-actions"><button type="button" onClick={() => setSelected(measures.map(item => item.id))}>Tout afficher</button><button type="button" onClick={() => setSelected([])}>Tout masquer</button></div>
            <div className="measure-grid">
              {measures.map(item => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleMeasure(item.id)} /><span className="measure-dot" style={{ background: item.color }} />{item.label}</label>)}
            </div>
            <div className="measure-chart-wrap">
              <div className="chart-labels measure-labels"><span>121 cm</span><span>75 cm</span></div>
              <svg className="line-chart measure-chart" viewBox="0 0 900 280" preserveAspectRatio="none" aria-label="Évolution des mensurations">
                <line x1="0" y1="55" x2="900" y2="55" className="grid-line"/><line x1="0" y1="210" x2="900" y2="210" className="grid-line"/>
                {selectedMeasures.map(item => {
                  const min = Math.min(...item.values) - 3;
                  const max = Math.max(...item.values) + 3;
                  const pts = item.values.map((value, index) => `${index * (900 / (item.values.length - 1))},${Math.min(245, Math.max(25, 210 - ((value - min) / (max - min)) * 180))}`).join(' ');
                  return <g key={item.id}><polyline points={pts} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>{pts.split(' ').map((point,i) => { const [x,y]=point.split(','); return <circle key={i} cx={x} cy={y} r="4.5" fill={item.color}/>; })}</g>;
                })}
              </svg>
            </div>
          </section>
        </>
      )}

      {tab === 'photos' && <ProgressPhotos />}
      {tab === 'annual' && <section className="progress-card empty-progress"><div className="empty-icon">↗</div><h2>Parcours annuel</h2><p>Une vue synthétique de tes blocs, de ton poids et de tes principaux repères sur l’année.</p><div className="annual-strip">{['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'].map((month,i) => <span className={i < 9 ? 'done' : ''} key={month}>{month}</span>)}</div></section>}
    </div>
  );
}

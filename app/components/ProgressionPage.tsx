'use client';

import { useMemo, useState } from 'react';

type MainTab = 'evolution' | 'photos' | 'annual';
type Metric = 'weight' | 'bodyfat';

type Measure = {
  id: string;
  label: string;
  color: string;
  values: number[];
};

const weightValues = [78.7, 78.9, 79.0, 79.1, 79.4, 79.5, 79.8, 79.6, 80.0, 80.2, 80.4, 80.7];
const bodyFatValues = [13.8, 13.7, 13.6, 13.5, 13.5, 13.4, 13.3, 13.3, 13.2, 13.1, 13.0, 12.9];

const measures: Measure[] = [
  { id: 'neck', label: 'Cou', color: '#2f60f5', values: [39,39,39.2,39.1,39.3,39.4,39.4,39.5,39.6,39.6,39.8,40] },
  { id: 'waist', label: 'Taille', color: '#d85a00', values: [82,81.8,81.6,81.4,81.3,81.1,81,80.8,80.6,80.5,80.3,80] },
  { id: 'right-arm', label: 'Bras droit', color: '#8b5a20', values: [36,36.2,36.1,36.4,36.5,36.7,36.8,36.9,37,37.1,37.2,37.4] },
  { id: 'left-thigh', label: 'Cuisse gauche', color: '#6177c8', values: [59,59.2,59.1,59.4,59.5,59.7,59.8,60,60.1,60.2,60.4,60.5] },
  { id: 'right-calf', label: 'Mollet droit', color: '#65728a', values: [38,38.1,38.1,38.2,38.3,38.3,38.4,38.4,38.5,38.5,38.6,38.7] },
  { id: 'shoulders', label: 'Épaules', color: '#9443c0', values: [118,118.2,118.3,118.4,118.5,118.7,118.8,119,119.2,119.4,119.6,119.8] },
  { id: 'hips', label: 'Hanches', color: '#b32761', values: [99,99,98.8,98.8,98.7,98.7,98.6,98.6,98.5,98.4,98.4,98.3] },
  { id: 'left-forearm', label: 'Avant-bras gauche', color: '#607407', values: [29.5,29.5,29.6,29.6,29.7,29.8,29.8,29.9,30,30,30.1,30.2] },
  { id: 'right-thigh', label: 'Cuisse droite', color: '#71458e', values: [59.2,59.3,59.4,59.4,59.6,59.7,59.8,59.9,60,60.2,60.3,60.4] },
  { id: 'chest', label: 'Poitrine', color: '#167b50', values: [105,105.1,105.2,105.4,105.5,105.6,105.7,105.9,106,106.2,106.3,106.5] },
  { id: 'left-arm', label: 'Bras gauche', color: '#168793', values: [35.8,36,36,36.1,36.3,36.4,36.5,36.6,36.8,36.9,37,37.2] },
  { id: 'right-forearm', label: 'Avant-bras droit', color: '#ca4d45', values: [29.7,29.7,29.8,29.8,29.9,30,30,30.1,30.2,30.2,30.3,30.4] },
  { id: 'left-calf', label: 'Mollet gauche', color: '#228365', values: [37.9,38,38,38.1,38.2,38.2,38.3,38.4,38.4,38.5,38.6,38.6] },
];

function points(values: number[], width: number, height: number, min: number, max: number) {
  const gap = width / Math.max(values.length - 1, 1);
  return values.map((value, index) => {
    const x = index * gap;
    const ratio = (value - min) / Math.max(max - min, 0.001);
    const y = height - ratio * height;
    return `${x},${y}`;
  }).join(' ');
}

export default function ProgressionPage() {
  const [tab, setTab] = useState<MainTab>('evolution');
  const [metric, setMetric] = useState<Metric>('weight');
  const [range, setRange] = useState('12');
  const [selected, setSelected] = useState<string[]>(measures.map(item => item.id));
  const [showRecord, setShowRecord] = useState(false);
  const [weight, setWeight] = useState('80.4');
  const [bodyFat, setBodyFat] = useState('13.0');

  const mainValues = metric === 'weight' ? weightValues : bodyFatValues;
  const latest = metric === 'weight' ? '80,4' : '13,0';
  const unit = metric === 'weight' ? 'kg' : '%';
  const chartMin = metric === 'weight' ? 78.4 : 12.6;
  const chartMax = metric === 'weight' ? 82 : 14.2;

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

      <div className="progress-tabs" role="tablist">
        <button className={tab === 'evolution' ? 'active' : ''} onClick={() => setTab('evolution')}>Évolution</button>
        <button className={tab === 'photos' ? 'active' : ''} onClick={() => setTab('photos')}>Photos</button>
        <button className={tab === 'annual' ? 'active' : ''} onClick={() => setTab('annual')}>Parcours annuel</button>
      </div>

      {tab === 'evolution' && (
        <>
          <section className="progress-callout">
            <div><h2>Mon poids & mes mensurations</h2><p>Renseigne un relevé daté pour alimenter tes courbes.</p></div>
            <button onClick={() => setShowRecord(true)}>+ Ajouter un relevé</button>
          </section>

          <section className="progress-card weight-card">
            <h2>Poids & body fat</h2>
            <div className="metric-toggle">
              <button className={metric === 'weight' ? 'active' : ''} onClick={() => setMetric('weight')}>Poids</button>
              <button className={metric === 'bodyfat' ? 'active' : ''} onClick={() => setMetric('bodyfat')}>Body fat</button>
            </div>
            <div className="weight-summary">
              <div><strong>{latest}</strong><span>{unit}</span><p>Dernier relevé · 19 sept. 2026</p></div>
              <select value={range} onChange={event => setRange(event.target.value)}><option value="4">4 semaines</option><option value="8">8 semaines</option><option value="12">12 semaines</option><option value="24">24 semaines</option></select>
            </div>
            <div className="chart-shell">
              <div className="chart-labels"><span>{metric === 'weight' ? '82 kg' : '14 %'}</span><span>{metric === 'weight' ? '79,5 kg' : '13,3 %'}</span><span>{metric === 'weight' ? '77 kg' : '12,5 %'}</span></div>
              <svg className="line-chart" viewBox="0 0 900 260" preserveAspectRatio="none" aria-label={`Évolution ${metric === 'weight' ? 'du poids' : 'du body fat'}`}>
                <line x1="0" y1="25" x2="900" y2="25" className="grid-line"/><line x1="0" y1="130" x2="900" y2="130" className="grid-line"/><line x1="0" y1="235" x2="900" y2="235" className="grid-line"/>
                <polyline points={points(mainValues, 900, 210, chartMin, chartMax).split(' ').map(p => { const [x,y] = p.split(',').map(Number); return `${x},${y+25}`; }).join(' ')} className="main-line" />
                {mainValues.map((value, i) => { const p = points(mainValues, 900, 210, chartMin, chartMax).split(' ')[i].split(',').map(Number); return <circle key={i} cx={p[0]} cy={p[1]+25} r="5" className="main-dot"/>; })}
              </svg>
            </div>
          </section>

          <section className="progress-card measurements-card">
            <div className="measurements-top"><div><h2>Toutes mes mensurations</h2><p>Courbes en centimètres.<br/>Sélectionne les zones à comparer.</p></div><select value={range} onChange={event => setRange(event.target.value)}><option value="4">4 semaines</option><option value="8">8 semaines</option><option value="12">12 semaines</option><option value="24">24 semaines</option></select></div>
            <div className="measure-actions"><button onClick={() => setSelected(measures.map(item => item.id))}>Tout afficher</button><button onClick={() => setSelected([])}>Tout masquer</button></div>
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
                  const pts = points(item.values, 900, 180, min, max).split(' ').map(p => { const [x,y] = p.split(',').map(Number); const base = 35 + (measures.findIndex(m => m.id === item.id) % 5) * 38; return `${x},${Math.min(245, Math.max(25, y * .18 + base))}`; }).join(' ');
                  return <g key={item.id}><polyline points={pts} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>{pts.split(' ').map((p,i) => { const [x,y]=p.split(','); return <circle key={i} cx={x} cy={y} r="4.5" fill={item.color}/>; })}</g>;
                })}
              </svg>
            </div>
          </section>
        </>
      )}

      {tab === 'photos' && <section className="progress-card empty-progress"><div className="empty-icon">▣</div><h2>Photos de progression</h2><p>Ajoute tes photos au fil des semaines pour comparer ton évolution visuellement.</p><button>+ Ajouter une photo</button></section>}
      {tab === 'annual' && <section className="progress-card empty-progress"><div className="empty-icon">↗</div><h2>Parcours annuel</h2><p>Une vue synthétique de tes blocs, de ton poids et de tes principaux repères sur l’année.</p><div className="annual-strip">{['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'].map((month,i) => <span className={i < 9 ? 'done' : ''} key={month}>{month}</span>)}</div></section>}

      {showRecord && <div className="record-backdrop" onClick={() => setShowRecord(false)}><form className="record-modal" onClick={event => event.stopPropagation()} onSubmit={event => { event.preventDefault(); setShowRecord(false); }}><button type="button" className="record-close" onClick={() => setShowRecord(false)}>×</button><p className="overline">NOUVEAU RELEVÉ</p><h2>Ajouter mes mesures</h2><div className="record-grid"><label>Poids (kg)<input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} /></label><label>Body fat (%)<input type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} /></label><label>Date<input type="date" defaultValue="2026-09-19" /></label></div><button className="save-record" type="submit">Enregistrer le relevé</button></form></div>}
    </div>
  );
}

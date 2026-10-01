'use client';

import { type DragEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import { loadProgressPhotos, ProgressPhotoEntry } from '../../lib/progressPhotos';
import { supabase } from '../../lib/supabase';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MEASUREMENTS = [
  ['neck', 'Cou'], ['shoulders', 'Épaules'], ['chest', 'Poitrine'], ['waist', 'Taille'], ['hips', 'Hanches'],
  ['left_arm', 'Bras gauche'], ['right_arm', 'Bras droit'], ['left_forearm', 'Avant-bras gauche'], ['right_forearm', 'Avant-bras droit'],
  ['left_thigh', 'Cuisse gauche'], ['right_thigh', 'Cuisse droite'], ['left_calf', 'Mollet gauche'], ['right_calf', 'Mollet droit'],
] as const;

function parisDateInputValue() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T12:00:00Z`));
}

export default function ProgressPhotos() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<ProgressPhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [date, setDate] = useState(parisDateInputValue);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [editingEntry, setEditingEntry] = useState<ProgressPhotoEntry | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [editError, setEditError] = useState('');

  async function refreshEntries() {
    setEntries(await loadProgressPhotos());
  }

  useEffect(() => {
    let active = true;
    loadProgressPhotos()
      .then(items => { if (active) setEntries(items); })
      .catch(() => { if (active) setError('Impossible de charger tes photos. Réessaie dans un instant.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(nextFile.type)) {
      setError('Choisis une image au format JPG, PNG ou WebP.');
      return;
    }
    if (nextFile.size > MAX_PHOTO_BYTES) {
      setError('La photo doit faire 5 Mo ou moins.');
      return;
    }
    let uploadFile = nextFile;
    if (nextFile.size > MAX_UPLOAD_BYTES) {
      try {
        const bitmap = await createImageBitmap(nextFile);
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Préparation de la photo impossible.');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.84));
        if (!blob || blob.size > MAX_UPLOAD_BYTES) throw new Error('La photo reste trop volumineuse après compression.');
        uploadFile = new File([blob], `${nextFile.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      } catch (compressionError) {
        setError(compressionError instanceof Error ? compressionError.message : 'Impossible de préparer cette photo. Essaie un autre fichier.');
        return;
      }
    }
    setDate(parisDateInputValue());
    setWeight('');
    setBodyFat('');
    setMeasurements({});
    setFile(uploadFile);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void chooseFile(event.dataTransfer.files[0]);
  }

  async function saveWeight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEntry) return;
    setEditError('');
    setSavingWeight(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!authData.session?.access_token) throw new Error('Connecte-toi pour modifier ce repère.');
      const response = await fetch('/api/progress-photos', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingEntry.id,
          weight_kg: editWeight.trim() === '' ? null : Number(editWeight),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Le poids n’a pas pu être enregistré.');
      await refreshEntries();
      setEditingEntry(null);
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : 'Le poids n’a pas pu être enregistré.');
    } finally {
      setSavingWeight(false);
    }
  }

  async function savePhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setError('');
    setBusy(true);

    let rowSaved = false;
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!authData.session?.access_token) throw new Error('Connecte-toi pour enregistrer une photo.');
      const numericMeasurements = Object.fromEntries(
        Object.entries(measurements)
          .filter(([, value]) => value.trim() !== '')
          .map(([key, value]) => [key, Number(value)]),
      );

      const formData = new FormData();
      formData.append('photo', file, file.name);
      formData.append('measured_at', date);
      formData.append('weight_kg', weight.trim());
      formData.append('body_fat_percent', bodyFat.trim());
      formData.append('measurements', JSON.stringify(numericMeasurements));

      const response = await fetch('/api/progress-photos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authData.session.access_token}` },
        body: formData,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `L’enregistrement a échoué (${response.status}).`);
      rowSaved = true;

      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      await refreshEntries();
    } catch (saveError) {
      setError(rowSaved
        ? 'Ton repère est enregistré, mais la galerie ne s’est pas actualisée. Recharge la page pour le voir.'
        : saveError instanceof TypeError && saveError.message === 'Failed to fetch'
          ? 'La connexion a interrompu l’envoi. Vérifie ton réseau puis réessaie.'
          : saveError instanceof Error ? saveError.message : 'La photo n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="progress-photo-section">
      <div className="progress-photos-heading">
        <div><h2>Mes photos de progression</h2><p>Une photo par repère, avec tes mesures du jour.</p></div>
        <button type="button" className="progress-photo-add" onClick={() => inputRef.current?.click()}>+ Ajouter une photo</button>
      </div>
      <input ref={inputRef} className="progress-photo-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choisir une photo de progression" tabIndex={-1} onChange={event => { void chooseFile(event.target.files?.[0]); }} />

      <div className={`progress-photo-drop${dragging ? ' is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
        {loading ? <p>Chargement de tes photos…</p> : entries.length === 0 ? <><strong>Dépose ta première photo ici</strong><span>ou choisis une image JPG, PNG ou WebP, jusqu’à 5 Mo.</span><button type="button" onClick={() => inputRef.current?.click()}>Choisir une photo</button></> : <><strong>Ajouter un nouveau repère</strong><span>Dépose ta photo ici ou choisis un fichier pour saisir tes mesures.</span><button type="button" onClick={() => inputRef.current?.click()}>Choisir une photo</button></>}
      </div>

      {error && <p className="progress-photo-error" role="alert">{error}</p>}

      {!loading && entries.length > 0 && <div className="progress-photo-grid">
        {entries.map(entry => {
          const filledMeasurements = MEASUREMENTS.filter(([key]) => entry.measurements?.[key]);
          return <article className="progress-photo-card" key={entry.id}>
            <img src={entry.imageUrl} alt={`Photo de progression du ${displayDate(entry.measured_at)}`} />
            <div className="progress-photo-card-body">
              <time>{displayDate(entry.measured_at)}</time>
              <div className="progress-photo-stats">
                {entry.weight_kg != null && <span><b>{entry.weight_kg}</b> kg</span>}
                {entry.body_fat_percent != null && <span><b>{entry.body_fat_percent}</b> % masse grasse</span>}
              </div>
              <button
                type="button"
                className="progress-photo-weight-edit"
                onClick={() => { setEditingEntry(entry); setEditWeight(entry.weight_kg?.toString() || ''); setEditError(''); }}
              >
                {entry.weight_kg == null ? 'Renseigner le poids' : 'Modifier le poids'}
              </button>
              {filledMeasurements.length > 0 && <details className="progress-photo-measurements"><summary>Mensurations · {filledMeasurements.length}</summary><div>{filledMeasurements.map(([key, label]) => <span key={key}>{label} <b>{entry.measurements[key]} cm</b></span>)}</div></details>}
            </div>
          </article>;
        })}
      </div>}

      {editingEntry && <div className="photo-upload-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !savingWeight) setEditingEntry(null); }}>
        <form className="photo-upload-modal photo-weight-edit-modal" onSubmit={saveWeight}>
          <div className="photo-upload-head">
            <div><p className="overline">REPÈRE DU {displayDate(editingEntry.measured_at).toLocaleUpperCase('fr-FR')}</p><h2>Renseigner le poids</h2><span>Le poids est associé à la date de cette photo.</span></div>
            <button type="button" aria-label="Fermer" onClick={() => setEditingEntry(null)} disabled={savingWeight}>×</button>
          </div>
          <div className="photo-upload-main">
            <label className="photo-upload-field">Poids (kg)
              <input type="number" inputMode="decimal" min="1" max="500" step="0.1" value={editWeight} onChange={event => setEditWeight(event.target.value)} placeholder="Ex. 80,4" required />
            </label>
            {editError && <p className="progress-photo-error" role="alert">{editError}</p>}
          </div>
          <div className="photo-upload-actions">
            <button type="button" onClick={() => setEditingEntry(null)} disabled={savingWeight}>Annuler</button>
            <button type="submit" disabled={savingWeight}>{savingWeight ? 'Enregistrement…' : 'Enregistrer le poids'}</button>
          </div>
        </form>
      </div>}

      {file && <div className="photo-upload-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setFile(null); }}>
        <form className="photo-upload-modal" onSubmit={savePhoto}>
          <div className="photo-upload-head"><div><p className="overline">NOUVEAU REPÈRE</p><h2>Ajouter une photo</h2><span>Complète les informations que tu souhaites suivre.</span></div><button type="button" aria-label="Fermer" onClick={() => setFile(null)} disabled={busy}>×</button></div>
          <div className="photo-upload-main">
            {preview && <img className="photo-upload-preview" src={preview} alt="Aperçu de la photo sélectionnée" />}
            <label className="photo-upload-field">Date du relevé<input type="date" value={date} onChange={event => setDate(event.target.value)} required /></label>
            <div className="photo-upload-primary-fields">
              <label className="photo-upload-field">Poids (kg) · facultatif<input type="number" inputMode="decimal" min="1" max="500" step="0.1" value={weight} onChange={event => setWeight(event.target.value)} placeholder="Ex. 80,4" /></label>
              <label className="photo-upload-field">Masse grasse (%) · facultative<input type="number" inputMode="decimal" min="0" max="100" step="0.1" value={bodyFat} onChange={event => setBodyFat(event.target.value)} placeholder="Ex. 13,0" /></label>
            </div>
            <fieldset className="photo-measurements-fields"><legend>Mensurations <span>cm · facultatif</span></legend><div>{MEASUREMENTS.map(([key, label]) => <label className="photo-upload-field" key={key}>{label}<input type="number" inputMode="decimal" min="1" max="300" step="0.1" value={measurements[key] || ''} onChange={event => setMeasurements(current => ({ ...current, [key]: event.target.value }))} placeholder="—" /></label>)}</div></fieldset>
          </div>
          {error && <p className="progress-photo-error" role="alert">{error}</p>}
          <div className="photo-upload-actions"><button type="button" onClick={() => setFile(null)} disabled={busy}>Annuler</button><button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer le repère'}</button></div>
        </form>
      </div>}
    </section>
  );
}

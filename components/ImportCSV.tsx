'use client';

import { CheckCircleIcon, XCircleIcon, UploadIcon } from './icons';

import { useState } from 'react';

interface Props {
  accountId: number;
  onImported: () => void;
}

export default function ImportCSV({ accountId, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleImport() {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('accountId', accountId.toString());

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ ok: true, text: `Successfully imported ${data.imported} of ${data.total} transactions` });
        setFile(null);
        onImported();
      } else {
        setResult({ ok: false, text: `Error: ${data.error}` });
      }
    } catch (error) {
      console.error('Error importing:', error);
      setResult({ ok: false, text: 'Import failed' });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="row" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
          <UploadIcon size={16} />
          {file ? file.name : 'Choose CSV file'}
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          />
        </label>
        <button onClick={handleImport} disabled={!file || importing} className="btn btn-primary">
          {importing ? 'Importing…' : 'Import'}
        </button>
      </div>
      {result && (
        <div className={`alert ${result.ok ? 'alert--safe' : 'alert--danger'}`} style={{ marginTop: '0.75rem' }}>
          {result.ok ? <CheckCircleIcon size={18} /> : <XCircleIcon size={18} />}
          <div>{result.text}</div>
        </div>
      )}
    </div>
  );
}

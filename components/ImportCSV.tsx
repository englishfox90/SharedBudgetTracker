'use client';

import { IconLabel, CheckCircleIcon, XCircleIcon } from './icons';

import { useState } from 'react';
import { useIsMobile } from '@/lib/useIsMobile';

interface Props {
  accountId: number;
  onImported: () => void;
}

export default function ImportCSV({ accountId, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const isMobile = useIsMobile();

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
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: '0.5rem', 
        alignItems: isMobile ? 'stretch' : 'center',
      }}>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ 
            flex: 1,
            padding: '0.5rem',
            fontSize: '0.875rem',
          }}
        />
        <button
          onClick={handleImport}
          disabled={!file || importing}
          style={{
            ...buttonStyle,
            opacity: !file || importing ? 0.5 : 1,
            cursor: !file || importing ? 'not-allowed' : 'pointer',
            width: isMobile ? '100%' : 'auto',
          }}
        >
          {importing ? 'Importing...' : 'Import CSV'}
        </button>
      </div>
      {result && (
        <div style={{ marginTop: '0.75rem', color: result.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
          <IconLabel icon={result.ok ? <CheckCircleIcon size={16} /> : <XCircleIcon size={16} />}>{result.text}</IconLabel>
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'var(--button-bg)',
  color: 'var(--button-text)',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

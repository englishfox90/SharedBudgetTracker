'use client';

import { useState, useEffect } from 'react';

interface Props {
  accountId: number;
  onImported: () => void;
}

export default function ImportCSV({ accountId, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    setIsMobile(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  async function handleImport() {
    if (!file) return;

    setImporting(true);
    setResult('');

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
        setResult(`✅ Successfully imported ${data.imported} of ${data.total} transactions`);
        setFile(null);
        onImported();
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error importing:', error);
      setResult('❌ Import failed');
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
        <div style={{ marginTop: '0.75rem' }}>
          {result}
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#1a1a1a',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

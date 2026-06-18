import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { cvApi, extractErrorMessage } from '@/api/client';

export const UploadCvPage = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    filename: string;
    skills: string[];
    years: number;
  } | null>(null);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    disabled: busy,
  });

  const file = acceptedFiles[0];

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await cvApi.upload(file);
      setResult({
        filename: res.filename,
        skills: res.extractedSkills,
        years: res.yearsExperience,
      });
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <p className="section-label">CV Upload</p>
          <h1 style={{ marginTop: 6 }}>
            <span style={{ color: 'var(--text-dim)' }}>Upload.</span> Get Matched.
          </h1>
        </div>
      </div>

      <div className="container-form animate-in">

        {error && <div className="error">{error}</div>}

        {result ? (
          <div className="alert-success">
            <div style={{ marginBottom: 16 }}>
              <p style={{
                fontSize: '0.62rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--success)',
                marginBottom: 8,
                fontWeight: 600,
              }}>
                CV Processed
              </p>
              <h2 style={{ color: 'var(--text)', fontSize: '1rem' }}>{result.filename}</h2>
            </div>
            <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
              <div className="stat-block">
                <div className="stat-num" style={{ fontSize: '2rem' }}>{result.skills.length}</div>
                <div className="stat-label">Skills detected</div>
              </div>
              <div className="stat-block">
                <div className="stat-num" style={{ fontSize: '2rem' }}>{result.years}</div>
                <div className="stat-label">Years experience</div>
              </div>
            </div>
            <div>
              {result.skills.slice(0, 10).map((s) => (
                <span key={s} className="badge matched">{s}</span>
              ))}
              {result.skills.length > 10 && (
                <span className="badge">+{result.skills.length - 10} more</span>
              )}
            </div>
            <p style={{ marginTop: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Redirecting to dashboard…
            </p>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 32, lineHeight: 1.65 }}>
              Upload a PDF resume. Text is extracted, skills are detected, and a
              384-dimensional embedding is generated for semantic matching against open roles.
            </p>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''}`}
              style={{ marginBottom: 16 }}
            >
              <input {...getInputProps()} />
              {file ? (
                <div>
                  <p style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 600,
                    fontSize: '1.1rem',
                    marginBottom: 6,
                    letterSpacing: '-0.01em',
                  }}>
                    {file.name}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {(file.size / 1024).toFixed(1)} KB · PDF
                  </p>
                </div>
              ) : isDragActive ? (
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                  Drop the PDF here
                </p>
              ) : (
                <div>
                  <p style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 600,
                    fontSize: '1rem',
                    marginBottom: 8,
                    letterSpacing: '-0.01em',
                  }}>
                    Drop your PDF here
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    or click to browse — max 5 MB
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || busy}
              style={{ width: '100%', padding: '14px', fontSize: '0.75rem' }}
            >
              {busy ? (
                <span className="flex" style={{ justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: 'var(--bg)' }} />
                  Processing & indexing
                </span>
              ) : (
                <>Upload and index <span className="btn-arrow">→</span></>
              )}
            </button>
          </>
        )}
      </div>
    </>
  );
};

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
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <h1>Upload your CV</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        PDF only, max 5 MB. Text is extracted, skills are detected, and a
        384-dim embedding is generated for semantic matching.
      </p>

      {error && <div className="error">{error}</div>}
      {result && (
        <div className="success">
          ✓ <strong>{result.filename}</strong> indexed — {result.skills.length} skills
          detected, {result.years} years of experience. Redirecting…
        </div>
      )}

      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''}`}
        style={{ marginBottom: 16 }}
      >
        <input {...getInputProps()} />
        {file ? (
          <div>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>{file.name}</p>
            <p className="muted">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : isDragActive ? (
          <p>Drop the PDF here…</p>
        ) : (
          <div>
            <p style={{ marginBottom: 4 }}>Drop your PDF here, or click to browse</p>
            <p className="muted">Max 5 MB</p>
          </div>
        )}
      </div>

      <button onClick={handleUpload} disabled={!file || busy} style={{ width: '100%' }}>
        {busy ? 'Processing…' : 'Upload and index'}
      </button>
    </div>
  );
};

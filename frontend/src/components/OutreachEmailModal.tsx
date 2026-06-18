interface OutreachEmailModalProps {
  emailContent: string;
  candidateName: string;
  onClose: () => void;
}

export function OutreachEmailModal({ emailContent, candidateName, onClose }: OutreachEmailModalProps) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: '0', padding: '2rem', maxWidth: '600px', width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Draft Outreach: {candidateName}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>
            &times;
          </button>
        </div>
        
        <div style={{
          backgroundColor: '#0a0a0a', padding: '1.5rem', border: '1px solid var(--border-md)',
          whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-body)', marginBottom: '1.5rem',
          fontFamily: 'Inter, sans-serif'
        }}>
          {emailContent}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(emailContent)}>
            Copy to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}

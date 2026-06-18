import { useState, useEffect } from 'react';
import { jobApi, agentApi, extractErrorMessage } from '@/api/client';
import type { Job, AgentRunResponse, AgentMatchItem } from '@/types';
import { SkillGapCard } from '@/components/SkillGapCard';
import { OutreachEmailModal } from '@/components/OutreachEmailModal';

export const AgentDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string>('');
  const [result, setResult] = useState<AgentRunResponse | null>(null);
  const [error, setError] = useState('');
  
  const [modalCandidate, setModalCandidate] = useState<AgentMatchItem | null>(null);

  useEffect(() => {
    jobApi.listOpen().then(setJobs).catch(err => setError(extractErrorMessage(err)));
  }, []);

  const runAgent = async () => {
    if (!selectedJob) return;
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      setStep('Fetching job details and requirements...');
      await new Promise(r => setTimeout(r, 800)); // UI delay to show step
      
      setStep('Scanning vector store for top candidates...');
      await new Promise(r => setTimeout(r, 800));
      
      setStep('Drafting outreach emails with Llama 3.3...');
      const response = await agentApi.run(selectedJob, 5);
      
      setStep('Compiling report...');
      await new Promise(r => setTimeout(r, 400));
      
      setResult(response);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  return (
    <div className="container">
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1 className="hero-title">LangGraph Hiring Agent</h1>
          <p className="hero-subtitle">Automate sourcing, scoring, and outreach drafting.</p>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1rem', border: '1px solid #ef4444', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Select Target Job
          </label>
          <select 
            className="input" 
            value={selectedJob} 
            onChange={(e) => setSelectedJob(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Choose a job --</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title} @ {j.company}</option>
            ))}
          </select>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={runAgent} 
          disabled={!selectedJob || loading}
          style={{ height: '48px' }}
        >
          {loading ? 'Agent Running...' : 'Deploy Agent'}
        </button>
      </div>

      {loading && step && (
        <div style={{ 
          padding: '2rem', border: '1px dashed var(--border-md)', 
          textAlign: 'center', backgroundColor: 'var(--bg-elevated)', marginBottom: '2rem'
        }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <p style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: '1.125rem' }}>{step}</p>
        </div>
      )}

      {result && (
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            Top Candidates Identified ({result.candidates.length})
          </h2>
          <div className="grid">
            {result.candidates.map((c) => (
              <SkillGapCard 
                key={c.jobId} 
                candidate={c} 
                onViewOutreach={() => setModalCandidate(c)} 
              />
            ))}
          </div>
        </div>
      )}

      {modalCandidate && (
        <OutreachEmailModal 
          emailContent={modalCandidate.outreach_email}
          candidateName={modalCandidate.jobTitle}
          onClose={() => setModalCandidate(null)}
        />
      )}
    </div>
  );
};

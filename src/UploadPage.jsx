import { useState, useRef, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function analyzeDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(API_BASE + '/extract', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.error || 'Extraction failed. Please try again.')
  return json
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png'
const ACCEPT_MIME = ['application/pdf', 'image/jpeg', 'image/png']

const FIELD_LABELS = [
  { key: 'applicantName',        label: 'Applicant Name',           icon: 'user' },
  { key: 'fatherOrHusbandName',  label: "Father's Name",            icon: 'user' },
  { key: 'dateOfBirth',          label: 'Date of Birth',            icon: 'calendar' },
  { key: 'address',              label: 'Residential Address',      icon: 'doc' },
  { key: 'annualIncome',         label: 'Annual Income',            icon: 'currency' },
  { key: 'occupation',           label: 'Occupation',               icon: 'doc' },
  { key: 'purposeOfCertificate', label: 'Purpose of Certificate',   icon: 'doc' },
  { key: 'aadhaarNumber',        label: 'Aadhaar Number',           icon: 'id' },
]

/* ── Field Icons ── */
function FieldIcon({ type }) {
  const style = { width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }
  if (type === 'calendar') return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
  if (type === 'currency') return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  )
  if (type === 'id') return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  )
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

/* ── Animated Dots ── */
function Dots() {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f + 1) % 4), 400)
    return () => clearInterval(t)
  }, [])
  return <span style={{ letterSpacing: 2 }}>{'.'.repeat(frame)}&nbsp;</span>
}

/* ── Live Extraction View ── */
function ExtractionView({ file, pendingResult, onComplete }) {
  const [logLines, setLogLines] = useState([
    { id: 0, text: 'Reading document...', type: 'scan' },
  ])
  const [confirmedFields, setConfirmedFields] = useState([])
  const [foundCount, setFoundCount] = useState(0)
  const [agentLabel, setAgentLabel] = useState('Reading your document')
  const [isDone, setIsDone] = useState(false)
  const revealedRef = useRef(false)

  useEffect(() => {
    const timers = []
    timers.push(setTimeout(() => {
      setLogLines(prev => [...prev.map(l => l.id === 0 ? { ...l, type: 'done' } : l),
        { id: 1, text: 'Analyzing document structure...', type: 'scan' }])
      setAgentLabel('Analyzing structure')
    }, 700))
    timers.push(setTimeout(() => {
      setLogLines(prev => [...prev.map(l => l.id === 1 ? { ...l, type: 'done' } : l),
        { id: 2, text: 'Running OCR and text extraction...', type: 'scan' }])
      setAgentLabel('Extracting text')
    }, 1600))
    timers.push(setTimeout(() => {
      setLogLines(prev => [...prev.map(l => l.id === 2 ? { ...l, type: 'done' } : l),
        { id: 3, text: 'Identifying key form fields', type: 'active' }])
      setAgentLabel('Identifying fields')
    }, 2500))
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (!pendingResult || revealedRef.current) return
    revealedRef.current = true
    const found = FIELD_LABELS.filter(({ key }) => pendingResult.data?.[key])
    const missing = FIELD_LABELS.filter(({ key }) => !pendingResult.data?.[key])
    setLogLines(prev => prev.map(l => l.type === 'active' ? { ...l, type: 'done' } : l))
    found.forEach(({ key, label, icon }, i) => {
      setTimeout(() => {
        const value = pendingResult.data[key]
        setLogLines(prev => [...prev, { id: 10 + i, text: 'Found ' + label + ': ' + value, type: 'found' }])
        setConfirmedFields(prev => [...prev, { key, label, value, icon }])
        setFoundCount(i + 1)
        setAgentLabel('Found ' + label)
      }, i * 380)
    })
    const totalDelay = found.length * 380 + 500
    setTimeout(() => {
      missing.forEach(({ label }, i) => {
        setLogLines(prev => [...prev, { id: 100 + i, text: label + ': not found in document', type: 'missing' }])
      })
      setAgentLabel('Extraction complete')
      setIsDone(true)
    }, totalDelay)
  }, [pendingResult])

  const totalFields = FIELD_LABELS.length
  const progress = (foundCount / totalFields) * 100

  return (
    <div style={{ minHeight: '100vh', background: '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'Inter, sans-serif', position: 'relative' }}>
      <div style={{ position: 'fixed', top: 20, right: 24, display: 'flex', alignItems: 'center', gap: 8, background: '#13696a', color: '#fff', borderRadius: 9999, padding: '8px 16px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(19,105,106,0.3)', zIndex: 50 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite' }}>
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
        Agent: {agentLabel}
      </div>
      <div style={{ width: '100%', maxWidth: 640, background: '#E8EEF7', borderRadius: 20, border: '1px solid #D0DAEA', overflow: 'hidden', boxShadow: '0 8px 40px rgba(26,54,93,0.08)' }}>
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #D0DAEA' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111c2c', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                Extracting Data{isDone ? '' : <Dots />}
              </h1>
              <p style={{ fontSize: 13, color: '#43474e', margin: 0 }}>Income Certificate Application</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#13696a', margin: '0 0 6px' }}>{foundCount} of {totalFields} fields found</p>
              <div style={{ width: 160, height: 5, background: '#C4CDD8', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: progress + '%', background: '#13696a', borderRadius: 9999, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ margin: '16px 20px', background: '#F2F5FA', borderRadius: 12, border: '1px solid #C8D4E4', padding: '16px 18px', maxHeight: 200, overflowY: 'auto', fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace', fontSize: 13, lineHeight: '22px' }}>
          {logLines.map(line => {
            if (line.type === 'done') return <div key={line.id} style={{ color: '#94a3b8', textDecoration: 'line-through', marginBottom: 2 }}>{line.text}</div>
            if (line.type === 'found') return <div key={line.id} style={{ color: '#166534', fontWeight: 600, marginBottom: 2 }}>{line.text}</div>
            if (line.type === 'missing') return <div key={line.id} style={{ color: '#92400e', marginBottom: 2 }}>{line.text}</div>
            if (line.type === 'active') return <div key={line.id} style={{ color: '#1A365D', fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>{line.text} <Dots /></div>
            return <div key={line.id} style={{ color: '#64748b', marginBottom: 2 }}>{line.text}</div>
          })}
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#74777f', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Confirmed Fields</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {confirmedFields.map(({ key, label, value, icon }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid #E2EBF5', boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f0fdf4', border: '1.5px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#74777f', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111c2c', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
                </div>
                <FieldIcon type={icon} />
              </div>
            ))}
            {!isDone && confirmedFields.length < 3 && Array.from({ length: 3 - confirmedFields.length }).map((_, i) => (
              <div key={'ph-' + i} style={{ height: 56, background: '#F5F8FC', borderRadius: 12, border: '1px dashed #C8D4E4' }} />
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            {isDone ? (
              <button id="continueToReviewBtn" onClick={onComplete}
                style={{ width: '100%', padding: '13px', background: '#1A365D', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0f2238' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1A365D' }}>
                Continue to Review
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </button>
            ) : (
              <div style={{ width: '100%', padding: '13px', background: '#D8E3F0', color: '#74777f', borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Awaiting Completion
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════
   Agent Home / Task Intake Screen
════════════════════════════════════════ */
export default function UploadPage({ onExtracted }) {
  const [file, setFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [pendingResult, setPendingResult] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const reset = () => {
    setFile(null); setPendingResult(null); setError(''); setAnalyzing(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFile = async (selected) => {
    if (!selected) return
    if (!ACCEPT_MIME.includes(selected.type)) { setError('Unsupported file type. Please upload a PDF, JPG, or PNG.'); return }
    if (selected.size > 10 * 1024 * 1024) { setError('File is too large. Maximum allowed size is 10 MB.'); return }
    setError(''); setPendingResult(null); setFile(selected); setAnalyzing(true)
    try {
      const data = await analyzeDocument(selected)
      setPendingResult(data)
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.')
      setAnalyzing(false)
    }
  }

  const handleComplete = () => {
    if (!pendingResult) return
    setAnalyzing(false)
    if (onExtracted) onExtracted({ ...pendingResult, explanation: pendingResult.data?.explanation, checklist: pendingResult.data?.checklist })
  }

  const onInputChange = (e) => handleFile(e.target.files?.[0])
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }

  if (analyzing) {
    return <ExtractionView file={file} pendingResult={pendingResult} onComplete={handleComplete} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F3FA', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* ── Navigation ── */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 40px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1A365D', letterSpacing: '-0.01em' }}>PaperPilot</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <a href="#" style={{ fontSize: 14, color: '#43474e', textDecoration: 'none', fontWeight: 500 }}>Dashboard</a>
          <a href="#" style={{ fontSize: 14, color: '#43474e', textDecoration: 'none', fontWeight: 500 }}>Applications</a>
          <a href="#" style={{ fontSize: 14, color: '#43474e', textDecoration: 'none', fontWeight: 500 }}>Documents</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#43474e' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#43474e' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px 32px' }}>

        {/* Robot Icon */}
        <div style={{ width: 80, height: 80, background: '#1A365D', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, boxShadow: '0 8px 32px rgba(26,54,93,0.2)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"/>
            <path d="M12 11V7"/><circle cx="12" cy="5" r="2"/>
            <line x1="8" y1="15" x2="8" y2="15"/><line x1="12" y1="15" x2="12" y2="15"/><line x1="16" y1="15" x2="16" y2="15"/>
            <path d="M3 15H1m22 0h-2"/>
          </svg>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 40, fontWeight: 800, color: '#111c2c', textAlign: 'center', maxWidth: 600, margin: '0 0 16px', lineHeight: '1.15', letterSpacing: '-0.02em' }}>
          I'll read your document and fill your Income Certificate application
        </h1>
        <p style={{ fontSize: 17, color: '#43474e', margin: '0 0 40px', textAlign: 'center' }}>
          You approve everything before it's submitted.
        </p>

        {/* ── Drop Zone ── */}
        <div
          role="button"
          tabIndex={0}
          aria-label="File upload drop zone"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            width: '100%', maxWidth: 560,
            border: '2px dashed ' + (dragOver ? '#1A365D' : '#B8C8DC'),
            borderRadius: 16,
            padding: '48px 32px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? '#E8EEF7' : '#fff',
            transition: 'border-color 0.2s, background 0.2s',
            marginBottom: 20,
          }}
        >
          {/* Upload icon */}
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EEF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#111c2c', margin: '0 0 8px' }}>
            Hand me your document
          </p>
          <p style={{ fontSize: 14, color: '#74777f', margin: 0 }}>
            Drag &amp; drop PDF, JPG, or PNG here, or{' '}
            <span style={{ color: '#13696a', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}>browse</span>
          </p>
          <input ref={inputRef} id="documentUpload" type="file" accept={ACCEPT} onChange={onInputChange} style={{ display: 'none' }} aria-label="Upload document" />
        </div>

        {/* Error */}
        {error && (
          <div style={{ width: '100%', maxWidth: 560, marginBottom: 16, padding: '10px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 14, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* ── Trust Badges ── */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 9999, padding: '10px 24px', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingRight: 20 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#13696a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#43474e' }}>Nothing is stored after this session</span>
          </div>
          <div style={{ width: 1, height: 18, background: '#E2E8F0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingLeft: 20 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#13696a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#43474e' }}>You approve every field</span>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: '#fff', borderTop: '1px solid #E2E8F0', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A365D', margin: '0 0 2px' }}>PaperPilot</p>
          <p style={{ fontSize: 12, color: '#74777f', margin: 0 }}>© 2024 PaperPilot AI. Secure Government Paperwork Assistant.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {['Privacy Policy', 'Terms of Service', 'Help Center', 'Contact Support'].map(link => (
            <a key={link} href="#" style={{ fontSize: 13, color: '#43474e', textDecoration: 'none', fontWeight: 500 }}>{link}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}

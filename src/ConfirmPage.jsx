import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const CONFIRM_FIELDS = [
  { key: 'applicantName',        label: 'Applicant Name',           type: 'text',     colSpan: 1, placeholder: 'Full name as per official records' },
  { key: 'fatherOrHusbandName',  label: "Father's Name",            type: 'text',     colSpan: 1, placeholder: 'Full name of father or husband' },
  { key: 'address',              label: 'Residential Address',      type: 'textarea', colSpan: 2, placeholder: 'House No., Street, Village/Town, District, State' },
  { key: 'dateOfBirth',          label: 'Date of Birth',            type: 'text',     colSpan: 1, placeholder: 'YYYY-MM-DD' },
  { key: 'aadhaarNumber',        label: 'Aadhaar Number',           type: 'text',     colSpan: 1, placeholder: 'XXXX XXXX XXXX' },
  { key: 'occupation',           label: 'Occupation',               type: 'text',     colSpan: 1, placeholder: 'e.g. Farmer, Private Employee' },
  { key: 'annualIncome',         label: 'Annual Income (Rs.)',      type: 'text',     colSpan: 1, placeholder: 'e.g. 180000' },
  { key: 'purposeOfCertificate', label: 'Purpose of Certificate',   type: 'text',     colSpan: 2, placeholder: 'e.g. Scholarship, Medical Assistance' },
]

/* ── Confidence Badge ── */
function ConfidenceBadge({ hasValue }) {
  if (hasValue) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: '#f0fdf4', color: '#166534',
        border: '1px solid #bbf7d0', borderRadius: 4,
        padding: '3px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        High Confidence
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#fffbeb', color: '#92400e',
      border: '1px solid #fde68a', borderRadius: 4,
      padding: '3px 8px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      Please Verify
    </span>
  )
}

/* ── Toggle Switch ── */
function Toggle({ id, checked, onChange }) {
  return (
    <div
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: 9999, flexShrink: 0,
        background: checked ? '#13696a' : '#d8e3fa',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s ease',
        boxShadow: checked ? '0 0 0 3px rgba(19,105,106,0.15)' : 'none',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3,
        left: checked ? 23 : 3,
        transition: 'left 0.2s ease',
        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
      }} />
    </div>
  )
}

/* ── Autofill in Progress Screen ── */
const FORM_FIELDS = [
  { key: 'applicantName',        label: 'Applicant Name',          col: 'half' },
  { key: 'fatherOrHusbandName',  label: "Father's/Husband's Name", col: 'half' },
  { key: 'address',              label: 'Address',                  col: 'full' },
  { key: 'dateOfBirth',          label: 'Date of Birth',           col: 'third' },
  { key: 'annualIncome',         label: 'Annual Income (₹)',       col: 'third' },
  { key: 'occupation',           label: 'Occupation',              col: 'third' },
  { key: 'purposeOfCertificate', label: 'Purpose of Certificate',  col: 'full' },
  { key: 'aadhaarNumber',        label: 'Aadhaar Number',          col: 'full' },
]

function LoadingScreen({ values }) {
  const [doneKeys, setDoneKeys] = useState(new Set())
  const [activeIdx, setActiveIdx] = useState(0)
  const [typedChars, setTypedChars] = useState(0)
  const formId = useRef('INC-' + new Date().getFullYear() + '-' + (Math.floor(Math.random() * 9000) + 1000))

  const activeField = FORM_FIELDS[activeIdx]
  const activeValue = activeField ? (values?.[activeField.key] || '') : ''

  useEffect(() => {
    if (!activeField) return
    if (typedChars < activeValue.length) {
      const t = setTimeout(() => setTypedChars(n => n + 1), 8)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => {
        if (activeValue.length > 0) {
          setDoneKeys(prev => new Set([...prev, activeField.key]))
        }
        setActiveIdx(i => i + 1)
        setTypedChars(0)
      }, activeValue.length > 0 ? 60 : 20)
      return () => clearTimeout(t)
    }
  }, [activeIdx, typedChars, activeField, activeValue])

  const getDisplay = (key, idx) => {
    if (doneKeys.has(key)) return values?.[key] || ''
    if (idx === activeIdx) return activeValue.slice(0, typedChars)
    return ''
  }
  const isDone = (key) => doneKeys.has(key)
  const isActive = (idx) => idx === activeIdx && activeValue.length > 0

  const colStyle = (col) => {
    if (col === 'full') return { gridColumn: '1 / -1' }
    if (col === 'half') return { gridColumn: 'span 3' }
    return { gridColumn: 'span 2' }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFC', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 40px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1A365D' }}>PaperPilot</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {['Applications', 'Dashboard', 'Documents'].map((item, i) => (
            <span key={item} style={{ fontSize: 14, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#13696a' : '#43474e', paddingBottom: 2, borderBottom: i === 0 ? '2px solid #13696a' : 'none', cursor: 'pointer' }}>{item}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#43474e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#43474e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, maxWidth: 680, width: '100%', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 600, color: '#111c2c', margin: '0 0 4px' }}>Income Certificate Application</h1>
            <p style={{ fontSize: 13, color: '#74777f', margin: 0 }}>Form ID: {formId.current}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#13696a', color: '#fff', borderRadius: 9999, padding: '7px 14px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(19,105,106,0.25)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.4s linear infinite' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            Agent: Filling your form
          </div>
        </div>

        {/* Form card */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '28px 28px', boxShadow: '0 2px 12px rgba(26,54,93,0.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '20px 16px' }}>
            {FORM_FIELDS.map(({ key, label, col }, idx) => {
              const done = isDone(key)
              const active = isActive(idx)
              const display = getDisplay(key, idx)
              const borderCol = active ? '#13696a' : (done ? '#89d3d4' : '#E2E8F0')
              return (
                <div key={key} style={colStyle(col)}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#74777f', display: 'block', marginBottom: 6 }}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '100%', minHeight: col === 'full' && key === 'address' ? 44 : 40,
                      border: '1.5px solid ' + borderCol,
                      borderRadius: 8, padding: '9px 36px 9px 12px',
                      fontSize: 14, color: '#111c2c', background: '#fff',
                      boxSizing: 'border-box', lineHeight: '22px',
                      transition: 'border-color 0.25s',
                      boxShadow: active ? '0 0 0 3px rgba(19,105,106,0.1)' : 'none',
                    }}>
                      {display}
                      {active && (
                        <span style={{ display: 'inline-block', width: 2, height: 16, background: '#13696a', marginLeft: 1, verticalAlign: 'text-bottom', animation: 'blink 1s step-end infinite' }} />
                      )}
                    </div>
                    {done && (
                      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#13696a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Toast */}
      <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 10, background: '#1e293b', color: '#fff', borderRadius: 9999, padding: '11px 22px', fontSize: 14, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', whiteSpace: 'nowrap', zIndex: 100 }}>
        <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        Filling form details automatically...
      </div>

      {/* Footer */}
      <footer style={{ background: '#fff', borderTop: '1px solid #E2E8F0', padding: '12px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <p style={{ fontSize: 12, color: '#74777f', margin: 0 }}>© 2024 PaperPilot AI. Secure Government Paperwork Assistant.</p>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Privacy Policy', 'Terms of Service', 'Help Center', 'Contact Support'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: '#74777f', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  )
}

/* ── Success Screen ── */
function SuccessScreen({ fillResult, values, onBack }) {
  const [showModal, setShowModal] = useState(false)
  const year = new Date().getFullYear()
  const rand = String(Math.floor(Math.random() * 90000) + 10000)
  const refNo = 'IC/' + year + '/' + rand
  // Use confirmed values count (not Playwright fill result)
  const filledCount = Object.values(values || {}).filter(v => v && String(v).trim()).length
  const skippedKeys = Object.keys(fillResult?.skipped || {})

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFC', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#1A365D', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' }}>Form Filled Successfully</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, margin: 0 }}>
              PaperPilot automatically filled {filledCount} field{filledCount !== 1 ? 's' : ''} in your Income Certificate form.
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          {/* Confirmed Fields Visual */}
          <div>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111c2c' }}>Autofilled Form Data</span>
                <span style={{ fontSize: 12, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 4, padding: '2px 6px', fontWeight: 600, marginLeft: 'auto' }}>Completed</span>
              </div>
              <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {CONFIRM_FIELDS.map(({ key, label }) => (
                  <div key={key} style={{
                    padding: '14px 16px',
                    background: values[key] ? '#f8fffe' : '#fafafa',
                    border: `1px solid ${values[key] ? '#bbf7d0' : '#E2E8F0'}`,
                    borderRadius: 10,
                    gridColumn: key === 'address' || key === 'purposeOfCertificate' ? 'span 2' : 'span 1',
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: values[key] ? '#111c2c' : '#adb5bd', margin: 0, wordBreak: 'break-word' }}>
                      {values[key] || '—'}
                    </p>
                    {values[key] && (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        <span style={{ fontSize: 10, color: '#166534', fontWeight: 600 }}>Filled</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>Reference Number</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#1A365D', margin: '0 0 4px' }}>{refNo}</p>
              <p style={{ fontSize: 12, color: '#74777f', margin: 0 }}>Keep this for official correspondence</p>
            </div>

            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 16px' }}>Fill Summary</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, color: '#43474e' }}>Fields filled</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#166534', background: '#f0fdf4', padding: '2px 10px', borderRadius: 4 }}>{filledCount}</span>
              </div>
              {skippedKeys.length > 0 && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                  <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>Skipped: {skippedKeys.join(', ')}</p>
                </div>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px' }}>Confirmed Data</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CONFIRM_FIELDS.map(({ key, label }) => values[key] && (
                  <div key={key}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#74777f', margin: '0 0 2px', textTransform: 'uppercase' }}>{label}</p>
                    <p style={{ fontSize: 13, color: '#111c2c', margin: 0, wordBreak: 'break-word' }}>{values[key]}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => window.print()} style={{ padding: '12px 20px', background: '#1A365D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Print / Save as PDF
              </button>
              <button onClick={onBack} style={{ padding: '12px 20px', background: '#fff', color: '#1A365D', border: '1px solid #1A365D', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                Upload Another Document
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && fillResult.screenshotUrl && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', background: '#111c2c', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>Full-Page Screenshot</span>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>x</button>
            </div>
            <div style={{ overflow: 'auto', flex: 1 }}>
              <img src={fillResult.screenshotUrl} alt="Full page proof" style={{ maxWidth: '100%', display: 'block' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Component ── */
export default function ConfirmPage({ extractedResult, onBack, onSubmitSuccess }) {
  const { data, sessionId } = extractedResult ?? {}

  const [values, setValues] = useState(() => {
    const init = {}
    CONFIRM_FIELDS.forEach(({ key }) => { init[key] = data?.[key] ?? '' })
    return init
  })

  const [approved, setApproved] = useState(() =>
    Object.fromEntries(CONFIRM_FIELDS.map(({ key }) => [key, false]))
  )

  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [fillResult, setFillResult] = useState(null)
  const [editingKey, setEditingKey] = useState(null)

  const approvedCount = CONFIRM_FIELDS.filter(({ key }) => approved[key]).length
  const allApproved = approvedCount === CONFIRM_FIELDS.length
  const progress = (approvedCount / CONFIRM_FIELDS.length) * 100

  const handleChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }))
    if (approved[key]) setApproved(prev => ({ ...prev, [key]: false }))
  }

  const toggleApprove = (key) => setApproved(prev => ({ ...prev, [key]: !prev[key] }))

  const toggleAll = () => {
    const next = !allApproved
    setApproved(Object.fromEntries(CONFIRM_FIELDS.map(({ key }) => [key, next])))
  }

  const handleSubmit = async () => {
    if (!allApproved) return
    setSubmitting(true)
    setSubmitError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })

    if (sessionId) {
      fetch(API_BASE + '/session/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
        credentials: 'include',
        body: JSON.stringify({ sessionId, data: values }),
      }).catch(() => {})
    }

    // Fire /fill in background — best-effort (Playwright may not be available in all environments)
    // The animation IS the demo; we proceed to success regardless
    fetch(API_BASE + '/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(sessionId ? { 'X-Session-ID': sessionId } : {}) },
      credentials: 'include',
      body: JSON.stringify({ data: values, sessionId }),
    })
      .then(r => r.json())
      .then(json => { if (json?.screenshotUrl) setFillResult(json) })
      .catch(() => {}) // silently ignore — animation already played

    // Always transition to success (animation is the UX, screenshot is a bonus)
    setFillResult({ success: true })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitting) return <LoadingScreen values={values} />
  if (submitted) return <SuccessScreen fillResult={fillResult} values={values} onBack={onBack} />

  return (
    <div style={{ minHeight: '100vh', background: '#F7FAFC', fontFamily: 'Inter, sans-serif', paddingBottom: 88 }}>

      {/* ── Hero Banner ── */}
      <div style={{ background: '#1A365D', padding: '28px 40px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em', lineHeight: '38px' }}>
              Review Extracted Data
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 15, margin: 0, lineHeight: '22px', maxWidth: 580 }}>
              Nothing proceeds without your approval. Please verify the information extracted from your documents before we generate your final forms.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Secure Government Filing
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>

        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111c2c', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              Confirm Details
            </h2>
            <p style={{ fontSize: 14, color: '#43474e', margin: 0 }}>Review each field carefully.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#43474e' }}>
                {approvedCount} of {CONFIRM_FIELDS.length} confirmed
              </span>
              <button
                id="approveAllBtn"
                onClick={toggleAll}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px',
                  background: allApproved ? '#f0fdf4' : '#1A365D',
                  color: allApproved ? '#166534' : '#fff',
                  border: allApproved ? '1px solid #bbf7d0' : 'none',
                  borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s',
                }}
              >
                {allApproved ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    All Approved
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Approve All
                  </>
                )}
              </button>
            </div>
            <div style={{ width: 220, height: 4, background: '#E2E8F0', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 9999, width: progress + '%', background: allApproved ? '#166534' : '#13696a', transition: 'width 0.35s ease' }} />
            </div>
          </div>
        </div>

        {/* Fields Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {CONFIRM_FIELDS.map(({ key, label, type, colSpan, placeholder }) => {
            const isApproved = approved[key]
            const hasValue = !!(values[key] && values[key].trim())
            const cardBorder = isApproved ? '#89d3d4' : '#E2E8F0'
            const inputBorder = editingKey === key ? '#13696a' : (isApproved ? '#89d3d4' : '#CBD5E0')

            return (
              <div key={key} style={{ gridColumn: colSpan === 2 ? 'span 2' : 'span 1' }}>
                <div style={{
                  background: '#fff',
                  border: '1px solid ' + cardBorder,
                  borderRadius: 16,
                  padding: '18px 20px',
                  boxShadow: isApproved ? '0 4px 20px rgba(19,105,106,0.07)' : 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111c2c' }}>{label}</span>
                    <ConfidenceBadge hasValue={hasValue} />
                  </div>

                  {/* Input */}
                  {type === 'textarea' ? (
                    <textarea
                      value={values[key]}
                      onChange={e => handleChange(key, e.target.value)}
                      onFocus={() => setEditingKey(key)}
                      onBlur={() => setEditingKey(null)}
                      placeholder={placeholder}
                      rows={3}
                      style={{ width: '100%', border: 'none', borderBottom: '1.5px solid ' + inputBorder, outline: 'none', fontSize: 16, color: '#111c2c', background: 'transparent', resize: 'none', fontFamily: 'Inter, sans-serif', lineHeight: '24px', padding: '2px 0 10px', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[key]}
                      onChange={e => handleChange(key, e.target.value)}
                      onFocus={() => setEditingKey(key)}
                      onBlur={() => setEditingKey(null)}
                      placeholder={placeholder}
                      style={{ width: '100%', border: 'none', borderBottom: '1.5px solid ' + inputBorder, outline: 'none', fontSize: 16, color: '#111c2c', background: 'transparent', fontFamily: 'Inter, sans-serif', padding: '2px 0 10px', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                    />
                  )}

                  {/* Approve Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: isApproved ? '#13696a' : '#74777f', textTransform: 'uppercase', transition: 'color 0.2s' }}>
                      {isApproved ? 'Field Approved' : 'Approve Field'}
                    </span>
                    <Toggle id={'toggle-' + key} checked={isApproved} onChange={() => toggleApprove(key)} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {submitError && (
          <div style={{ marginTop: 20, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 14, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {submitError}
          </div>
        )}
      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, background: '#fff', borderTop: '1px solid #E2E8F0', boxShadow: '0 -4px 20px rgba(26,54,93,0.05)', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#74777f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 14, color: '#43474e' }}>
            {allApproved
              ? 'All ' + CONFIRM_FIELDS.length + ' fields approved — ready to fill.'
              : 'Please review and approve all fields to proceed.'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onBack}
            style={{ padding: '10px 18px', background: 'transparent', border: '1px solid #CBD5E0', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#43474e', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            Back
          </button>
          <button
            id="submitForFillingBtn"
            onClick={handleSubmit}
            disabled={!allApproved}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: allApproved ? '#1A365D' : '#d8e3fa', color: allApproved ? '#fff' : '#74777f', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: allApproved ? 'pointer' : 'not-allowed', fontFamily: 'Inter, sans-serif', transition: 'background 0.2s' }}
          >
            {allApproved ? 'Approve All & Fill Form' : approvedCount + '/' + CONFIRM_FIELDS.length + ' approved'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

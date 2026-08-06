import { useState } from 'react'

/* ── The 8 fields to confirm ── */
const CONFIRM_FIELDS = [
  { key: 'applicantName',        label: 'Applicant Name',              type: 'text',     colSpan: 2, placeholder: 'Full name as per official records' },
  { key: 'fatherOrHusbandName',  label: "Father's / Husband's Name",   type: 'text',     colSpan: 2, placeholder: 'Full name of father or husband' },
  { key: 'dateOfBirth',          label: 'Date of Birth',               type: 'text',     colSpan: 1, placeholder: 'e.g. 1990-05-12 (YYYY-MM-DD)' },
  { key: 'aadhaarNumber',        label: 'Aadhaar Number',              type: 'text',     colSpan: 1, placeholder: 'XXXX XXXX XXXX' },
  { key: 'occupation',           label: 'Occupation',                  type: 'text',     colSpan: 1, placeholder: 'e.g. Farmer, Private Employee' },
  { key: 'annualIncome',         label: 'Annual Income (₹)',           type: 'text',     colSpan: 1, placeholder: 'e.g. 180000' },
  { key: 'purposeOfCertificate', label: 'Purpose of Certificate',      type: 'text',     colSpan: 2, placeholder: 'e.g. Scholarship, Medical Assistance' },
  { key: 'address',              label: 'Residential Address',         type: 'textarea', colSpan: 2, placeholder: 'House No., Street, Village/Town, District, State – PIN Code' },
]

export default function ConfirmPage({ extractedResult, onBack, onSubmitSuccess }) {
  const { data, explanation, checklist, fileName, model, sessionId } = extractedResult ?? {}

  /* ── Field values (editable) ── */
  const [values, setValues] = useState(() => {
    const init = {}
    CONFIRM_FIELDS.forEach(({ key }) => {
      init[key] = data?.[key] ?? ''
    })
    return init
  })

  /* ── Confirmed state per field ── */
  const [confirmed, setConfirmed] = useState(() =>
    Object.fromEntries(CONFIRM_FIELDS.map(({ key }) => [key, false]))
  )

  const [submitted, setSubmitted] = useState(false)

  const confirmedCount = CONFIRM_FIELDS.filter(({ key }) => confirmed[key]).length
  const allConfirmed = confirmedCount === CONFIRM_FIELDS.length
  const progress = (confirmedCount / CONFIRM_FIELDS.length) * 100

  const confirmAll = () => {
    const next = !allConfirmed
    setConfirmed(Object.fromEntries(CONFIRM_FIELDS.map(({ key }) => [key, next])))
    if (next && sessionId) {
      // Sync confirmed values to session storage
      fetch('http://localhost:3001/session/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
        credentials: 'include',
        body: JSON.stringify({ sessionId, data: values }),
      }).catch(err => console.warn('Session sync failed:', err))
    }
  }

  const handleChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }))
    // Changing a value un-confirms it so user re-reviews
    if (confirmed[key]) {
      setConfirmed(prev => ({ ...prev, [key]: false }))
    }
  }

  const toggleConfirm = (key) => {
    setConfirmed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [fillResult, setFillResult] = useState(null)
  const [showFullImage, setShowFullImage] = useState(false)

  const handleSubmit = async () => {
    if (!allConfirmed) return
    setSubmitting(true)
    setSubmitError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    try {
      // First sync confirmed fields to session store
      if (sessionId) {
        await fetch('http://localhost:3001/session/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId,
          },
          credentials: 'include',
          body: JSON.stringify({ sessionId, data: values }),
        })
      }

      // Execute form fill using session data
      const response = await fetch('http://localhost:3001/fill-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'X-Session-ID': sessionId } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ sessionId, ...values }),
      })

      const resData = await response.json()
      if (!response.ok) throw new Error(resData.error || 'Form fill failed')

      setFillResult(resData)
      setSubmitted(true)
    } catch (err) {
      console.error('Fill form error:', err)
      setSubmitError(err.message || 'Automated form filling failed. Make sure server is running.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Loading screen during Playwright automation ── */
  if (submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #e8e0d0 0%, #f0ebe0 50%, #e4ddd0 100%)' }}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center" style={{ border: '1.5px solid #B8A77A' }}>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'EB Garamond, serif', color: '#003580' }}>
            Automating Form Filling...
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: '#4A4A6A' }}>
            Launching headless Playwright browser to populate the official application form with your confirmed details and capture a full-page screenshot proof.
          </p>
        </div>
      </div>
    )
  }

  /* ── Success screen with Screenshot Proof ── */
  if (submitted) {
    const refNo = `IC/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 90000) + 10000)}`
    return (
      <div className="min-h-screen py-10 px-4" style={{ background: 'linear-gradient(135deg, #e8e0d0 0%, #f0ebe0 50%, #e4ddd0 100%)' }}>
        <div className="mx-auto max-w-3xl">
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden p-8" style={{ border: '2px solid #138808' }}>
            <div style={{ height: 6, background: 'linear-gradient(to right, #FF6700 33.33%, #fff 33.33% 66.66%, #138808 66.66%)', position: 'absolute', top: 0, left: 0, right: 0 }} />

            <div className="text-center mb-6">
              <div className="mx-auto mt-2 mb-4 w-20 h-20 rounded-full border-4 flex items-center justify-center"
                style={{ borderColor: '#138808', background: '#f0fff4' }}>
                <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="#138808" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'EB Garamond, serif', color: '#138808' }}>
                Form Filled & Submitted Successfully!
              </h2>
              <p className="text-sm" style={{ color: '#4A4A6A' }}>
                All {CONFIRM_FIELDS.length} fields were automatically filled by Playwright automation.
              </p>
              <div className="my-4 py-3 rounded-lg border max-w-md mx-auto" style={{ borderColor: '#B8A77A', background: '#FDFAF4' }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#4A4A6A' }}>Application Reference Number</p>
                <p className="text-xl font-bold tracking-widest" style={{ fontFamily: 'EB Garamond, serif', color: '#003580' }}>{refNo}</p>
              </div>
            </div>

            {/* ── Screenshot Proof Section ── */}
            {fillResult?.screenshotUrl && (
              <div className="mt-6 border-t pt-6" style={{ borderColor: '#e5e7eb' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: '#003580' }}>
                    📸 Full-Page Automation Proof (Playwright Screenshot)
                  </h4>
                  <a
                    href={fillResult.screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold px-3 py-1 rounded-lg border transition-colors"
                    style={{ borderColor: '#003580', color: '#003580', background: '#f0f4ff' }}
                  >
                    ↗ Open Full Size
                  </a>
                </div>

                {/* Screenshot Container */}
                <div
                  onClick={() => setShowFullImage(true)}
                  className="group relative rounded-xl overflow-hidden border-2 cursor-pointer shadow-md transition-all hover:shadow-xl max-h-96 overflow-y-auto"
                  style={{ borderColor: '#B8A77A' }}
                >
                  <img
                    src={fillResult.screenshotUrl}
                    alt="Playwright Form Fill Full Page Screenshot"
                    className="w-full h-auto object-top"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/90 px-4 py-2 rounded-full text-xs font-bold shadow-lg" style={{ color: '#003580' }}>
                      🔍 Click to Expand Proof
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center mt-8">
              <button onClick={onBack}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors hover:bg-blue-50"
                style={{ borderColor: '#003580', color: '#003580' }}>
                ← Upload Another Document
              </button>
            </div>
          </div>
        </div>

        {/* ── Fullscreen Image Modal ── */}
        {showFullImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 bg-gray-900 text-white flex justify-between items-center shrink-0">
                <span className="text-sm font-semibold">📸 Full-Page Automation Proof</span>
                <button
                  onClick={() => setShowFullImage(false)}
                  className="text-gray-400 hover:text-white font-bold text-lg px-2"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 bg-gray-100 flex justify-center">
                <img
                  src={fillResult.screenshotUrl}
                  alt="Full Page Proof"
                  className="max-w-full h-auto shadow-lg rounded"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'linear-gradient(135deg, #e8e0d0 0%, #f0ebe0 50%, #e4ddd0 100%)' }}>
      <div className="mx-auto" style={{ maxWidth: 780 }}>

        {/* ── Page Header ── */}
        <div className="mb-6">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-sm mb-4 transition-opacity hover:opacity-70"
            style={{ color: '#003580', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← Back to Upload
          </button>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'EB Garamond, serif', color: '#003580' }}>
                Verify Extracted Information
              </h1>
              <p className="text-sm mt-0.5" style={{ color: '#4A4A6A' }}>
                Review each AI-extracted field, edit if needed, then click ✓ to confirm. All 8 fields must be confirmed before submitting.
              </p>
            </div>
            {/* File info badge */}
            <div className="rounded-xl px-3 py-2 text-xs shrink-0" style={{ background: '#f0f4ff', border: '1px solid #a3b4d6', color: '#003580' }}>
              <p className="font-semibold truncate max-w-[180px]">📄 {fileName}</p>
              <p style={{ color: '#6B7280' }}>Model: {model}</p>
            </div>
          </div>
        </div>

        {/* ── Progress Bar ── */}
        <div className="rounded-2xl overflow-hidden mb-5 shadow-sm" style={{ background: '#FDFAF4', border: '1.5px solid #B8A77A' }}>
          <div style={{ height: 5, background: 'linear-gradient(to right, #FF6700 33.33%, #fff 33.33% 66.66%, #138808 66.66%)' }} />
          <div className="px-6 py-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: '#4A4A6A' }}>
                <span className="font-semibold">Confirmation Progress</span>
                <span className="font-bold" style={{ color: allConfirmed ? '#138808' : '#003580' }}>
                  {confirmedCount} / {CONFIRM_FIELDS.length} fields confirmed
                </span>
              </div>
              <div className="w-full rounded-full h-2.5" style={{ background: '#e5e7eb' }}>
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: allConfirmed
                      ? 'linear-gradient(to right, #138808, #22c55e)'
                      : 'linear-gradient(to right, #003580, #2563eb)',
                  }}
                />
              </div>
            </div>
            <div className="text-2xl font-bold shrink-0" style={{ color: allConfirmed ? '#138808' : '#003580', fontFamily: 'EB Garamond, serif' }}>
              {confirmedCount}/{CONFIRM_FIELDS.length}
            </div>
          </div>
        </div>

        {/* ── AI Explanation ── */}
        {explanation && (
          <div className="rounded-2xl mb-4 overflow-hidden shadow-sm" style={{ background: '#eff6ff', border: '1.5px solid #93c5fd' }}>
            <div className="px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#1e40af' }}>
                📌 About This Document
              </p>
              <p className="text-sm leading-relaxed" style={{ color: '#1e3a8a' }}>{explanation}</p>
            </div>
          </div>
        )}

        {/* ── Checklist ── */}
        {checklist?.length > 0 && (
          <div className="rounded-2xl mb-6 overflow-hidden shadow-sm" style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
            <div className="px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#166534' }}>
                ✅ Documents / Actions Required
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {checklist.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm" style={{ color: '#14532d' }}>
                    <span className="shrink-0 mt-0.5" style={{ color: '#16a34a' }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Fields Card ── */}
        <div className="rounded-2xl overflow-hidden shadow-sm mb-6" style={{ background: '#FDFAF4', border: '1.5px solid #B8A77A' }}>
          <div style={{ height: 5, background: 'linear-gradient(to right, #FF6700 33.33%, #fff 33.33% 66.66%, #138808 66.66%)' }} />

          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4A4A6A' }}>
                Step 1 — Review, edit if needed, then click ✓ to confirm each field
              </p>
              {/* ── Confirm All button ── */}
              <button
                id="confirmAllBtn"
                type="button"
                onClick={confirmAll}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200"
                style={{
                  background: allConfirmed ? '#fef9c3' : 'linear-gradient(135deg, #138808 0%, #16a34a 100%)',
                  border: `2px solid ${allConfirmed ? '#fde047' : '#166534'}`,
                  color: allConfirmed ? '#854d0e' : '#ffffff',
                  cursor: 'pointer',
                  boxShadow: allConfirmed ? 'none' : '0 2px 10px rgba(20,120,20,0.25)',
                }}
              >
                {allConfirmed ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Unconfirm All
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm All Fields
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {CONFIRM_FIELDS.map(({ key, label, type, colSpan, placeholder }) => {
                const isConfirmed = confirmed[key]
                const isEmpty = !values[key]?.trim()
                return (
                  <div
                    key={key}
                    className={colSpan === 2 ? 'sm:col-span-2' : ''}
                  >
                    {/* Label row */}
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold" style={{ color: '#1A1A2E' }}>
                        {label}
                        {isEmpty && !isConfirmed && (
                          <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded" style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                            Not found
                          </span>
                        )}
                      </label>
                      {/* Confirm toggle */}
                      <button
                        type="button"
                        onClick={() => toggleConfirm(key)}
                        title={isConfirmed ? 'Click to un-confirm' : 'Click to confirm this field'}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
                        style={{
                          background: isConfirmed ? '#dcfce7' : '#fef9c3',
                          border: `1.5px solid ${isConfirmed ? '#86efac' : '#fde047'}`,
                          color: isConfirmed ? '#166534' : '#854d0e',
                          cursor: 'pointer',
                        }}
                      >
                        {isConfirmed ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Confirmed
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Confirm
                          </>
                        )}
                      </button>
                    </div>

                    {/* Input */}
                    {type === 'textarea' ? (
                      <textarea
                        value={values[key]}
                        onChange={e => handleChange(key, e.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        className="w-full rounded-xl px-3 py-2.5 text-sm transition-all duration-200"
                        style={{
                          border: `2px solid ${isConfirmed ? '#86efac' : isEmpty ? '#fbbf24' : '#fde047'}`,
                          background: isConfirmed ? '#f0fdf4' : isEmpty ? '#fffbeb' : '#fefce8',
                          color: '#1A1A2E',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={values[key]}
                        onChange={e => handleChange(key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full rounded-xl px-3 py-2.5 text-sm transition-all duration-200"
                        style={{
                          border: `2px solid ${isConfirmed ? '#86efac' : isEmpty ? '#fbbf24' : '#fde047'}`,
                          background: isConfirmed ? '#f0fdf4' : isEmpty ? '#fffbeb' : '#fefce8',
                          color: '#1A1A2E',
                          outline: 'none',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      />
                    )}

                    {/* State hint */}
                    <p className="text-xs mt-1" style={{ color: isConfirmed ? '#16a34a' : '#92400e' }}>
                      {isConfirmed
                        ? '✓ Field confirmed'
                        : isEmpty
                        ? '⚠ Not extracted — please fill manually and confirm'
                        : '⟳ Edit if needed, then click Confirm'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {submitError && (
          <div className="rounded-2xl p-4 mb-4 text-xs font-semibold flex items-center gap-2" style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#991b1b' }}>
            <span>⚠ {submitError}</span>
          </div>
        )}

        {/* ── Submit Section ── */}
        <div
          className="rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap shadow-sm"
          style={{ background: '#FDFAF4', border: '1.5px solid #B8A77A' }}
        >
          <div>
            {allConfirmed ? (
              <p className="text-sm font-semibold" style={{ color: '#138808' }}>
                ✅ All fields confirmed — ready to submit!
              </p>
            ) : (
              <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
                ⚠ {CONFIRM_FIELDS.length - confirmedCount} field{CONFIRM_FIELDS.length - confirmedCount !== 1 ? 's' : ''} still need confirmation
              </p>
            )}
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              Review and confirm all 8 fields to enable submission
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!allConfirmed}
            id="submitForFillingBtn"
            className="px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 shadow-lg"
            style={{
              background: allConfirmed
                ? 'linear-gradient(135deg, #003580 0%, #1a5276 100%)'
                : '#d1d5db',
              color: allConfirmed ? '#ffffff' : '#9ca3af',
              cursor: allConfirmed ? 'pointer' : 'not-allowed',
              boxShadow: allConfirmed ? '0 4px 18px rgba(0,53,128,0.35)' : 'none',
              border: 'none',
            }}
          >
            {allConfirmed ? '✓ Submit for Filling' : `Submit for Filling (${confirmedCount}/${CONFIRM_FIELDS.length})`}
          </button>
        </div>

      </div>
    </div>
  )
}

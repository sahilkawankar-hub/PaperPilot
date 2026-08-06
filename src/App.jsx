import { useState, useRef } from 'react'
import UploadPage from './UploadPage.jsx'
import ConfirmPage from './ConfirmPage.jsx'

/* ─── Root App shell ─── */
export default function App() {
  const [page, setPage] = useState('form')
  const [extractedResult, setExtractedResult] = useState(null)

  const handleExtracted = (result) => {
    setExtractedResult(result)
    setPage('confirm')
  }

  const handleBackFromConfirm = () => {
    setPage('upload')
  }

  return (
    <div>
      {/* ── Global Nav ── */}
      <nav
        style={{
          background: '#003580',
          boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="mx-auto max-w-5xl px-6 flex items-center justify-between h-14">
          {/* Logo / brand */}
          <button
            id="navBrandLogo"
            onClick={() => setPage('form')}
            className="flex items-center gap-2 text-white font-bold text-lg"
            style={{ fontFamily: 'EB Garamond, serif', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span style={{ color: '#FF6700' }}>Paper</span>
            <span style={{ color: '#ffffff' }}>Pilot</span>
          </button>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <NavLink id="navFormLink" label="Apply for Certificate" active={page === 'form'} onClick={() => setPage('form')} />
            <NavLink id="navUploadLink" label="Upload Document" active={page === 'upload' || page === 'confirm'} onClick={() => setPage('upload')} />
          </div>
        </div>
      </nav>

      {/* ── Page content ── */}
      {page === 'form' && <IncomeCertificateForm />}
      {page === 'upload' && <UploadPage onExtracted={handleExtracted} />}
      {page === 'confirm' && (
        <ConfirmPage
          extractedResult={extractedResult}
          onBack={handleBackFromConfirm}
          onSubmitSuccess={() => setPage('form')}
        />
      )}
    </div>
  )
}

function NavLink({ id, label, active, onClick }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
      style={{
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

/* ─── Field definitions ─── */
const FIELDS = [
  {
    id: 'applicantName',
    label: 'Applicant Name',
    type: 'text',
    placeholder: 'Full name as per Aadhaar / official records',
    required: true,
    colSpan: 2,
  },
  {
    id: 'fatherHusbandName',
    label: "Father's / Husband's Name",
    type: 'text',
    placeholder: 'Full name of father or husband',
    required: true,
    colSpan: 2,
  },
  {
    id: 'dateOfBirth',
    label: 'Date of Birth',
    type: 'date',
    required: true,
    colSpan: 1,
  },
  {
    id: 'aadhaarNumber',
    label: 'Aadhaar Number',
    type: 'text',
    placeholder: 'XXXX XXXX XXXX',
    pattern: '[0-9 ]{14}',
    maxLength: 14,
    required: true,
    colSpan: 1,
  },
  {
    id: 'occupation',
    label: 'Occupation',
    type: 'select',
    required: true,
    colSpan: 1,
    options: [
      'Agriculture / Farmer',
      'Business / Self-Employed',
      'Daily Wage Worker',
      'Government Employee',
      'Homemaker',
      'Private Sector Employee',
      'Student',
      'Unemployed',
      'Other',
    ],
  },
  {
    id: 'annualIncome',
    label: 'Annual Income (₹)',
    type: 'number',
    placeholder: 'e.g. 180000',
    min: 0,
    required: true,
    colSpan: 1,
  },
  {
    id: 'purposeOfCertificate',
    label: 'Purpose of Certificate',
    type: 'select',
    required: true,
    colSpan: 2,
    options: [
      'Scholarship / Educational Assistance',
      'Government Job / Employment',
      'BPL Card / Ration Card',
      'Bank Loan / Subsidy',
      'Legal / Court Purpose',
      'Housing Scheme / Awas Yojana',
      'Medical Assistance / Hospital',
      'Other Government Scheme',
    ],
  },
  {
    id: 'address',
    label: 'Residential Address',
    type: 'textarea',
    placeholder: 'House No., Street, Village/Town, District, State – PIN Code',
    required: true,
    colSpan: 2,
    rows: 3,
  },
]

/* ─── Aadhaar auto-spacer ─── */
function formatAadhaar(val) {
  const digits = val.replace(/\D/g, '').slice(0, 12)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

/* ─── Main Component ─── */
function IncomeCertificateForm() {
  const initialState = Object.fromEntries(FIELDS.map((f) => [f.id, '']))
  const [form, setForm] = useState(initialState)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [refNo] = useState(() => {
    const d = new Date()
    return `IC/${d.getFullYear()}/${String(Math.floor(Math.random() * 90000) + 10000)}`
  })
  const submitBtnRef = useRef(null)

  /* ── Change handler ── */
  const handleChange = (e) => {
    const { id, value } = e.target
    let v = value
    if (id === 'aadhaarNumber') v = formatAadhaar(value)
    setForm((prev) => ({ ...prev, [id]: v }))
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: '' }))
  }

  /* ── Validation ── */
  const validate = () => {
    const newErrors = {}
    FIELDS.forEach(({ id, required, label }) => {
      if (required && !form[id].trim()) {
        newErrors[id] = `${label} is required.`
      }
    })
    const aadhaarDigits = form.aadhaarNumber.replace(/\s/g, '')
    if (aadhaarDigits && aadhaarDigits.length !== 12) {
      newErrors.aadhaarNumber = 'Aadhaar must be exactly 12 digits.'
    }
    return newErrors
  }

  /* ── Ripple effect ── */
  const addRipple = (e) => {
    const btn = submitBtnRef.current
    if (!btn) return
    const circle = document.createElement('span')
    const rect = btn.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    circle.className = 'ripple-circle'
    circle.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`
    btn.appendChild(circle)
    setTimeout(() => circle.remove(), 700)
  }

  /* ── Submit ── */
  const handleSubmit = (e) => {
    e.preventDefault()
    addRipple(e)
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      const firstErr = document.getElementById(Object.keys(errs)[0])
      firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      firstErr?.focus()
      return
    }
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className="stamp-animate relative bg-white rounded-2xl shadow-2xl border-2 max-w-lg w-full p-10 text-center overflow-hidden"
          style={{ borderColor: 'var(--gov-green)' }}
        >
          {/* Tricolor strip */}
          <div className="tricolor-strip absolute top-0 left-0 right-0 rounded-t-2xl" />
          {/* Big stamp */}
          <div
            className="mx-auto mb-4 w-28 h-28 rounded-full border-4 flex items-center justify-center"
            style={{ borderColor: 'var(--gov-green)', background: '#f0fff4' }}
          >
            <svg viewBox="0 0 24 24" className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--gov-green)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'EB Garamond, serif', color: 'var(--gov-green)' }}>
            Application Submitted
          </h2>
          <p className="text-sm mb-1" style={{ color: 'var(--ink-muted)' }}>
            Your Income Certificate application has been received.
          </p>
          <div className="my-4 py-3 rounded-lg border" style={{ borderColor: 'var(--paper-border)', background: 'var(--paper-bg)' }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--ink-muted)' }}>Reference Number</p>
            <p className="text-xl font-bold tracking-widest" style={{ fontFamily: 'EB Garamond, serif', color: 'var(--gov-navy)' }}>
              {refNo}
            </p>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--ink-muted)' }}>
            Please retain this reference number for future correspondence with the issuing authority.
          </p>
          <button
            onClick={() => { setForm(initialState); setSubmitted(false) }}
            className="mt-6 px-6 py-2 rounded-lg text-sm font-semibold border-2 transition-colors"
            style={{ borderColor: 'var(--gov-navy)', color: 'var(--gov-navy)' }}
          >
            ← Submit Another Application
          </button>
        </div>
      </div>
    )
  }

  /* ── Form screen ── */
  return (
    <div className="min-h-screen py-8 px-4">
      <div
        className="relative mx-auto max-w-3xl rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--paper-bg)', border: '1.5px solid var(--paper-border)' }}
      >
        {/* ── Watermark ── */}
        <div className="watermark" style={{ zIndex: 0 }}>
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <text
              x="50" y="58"
              textAnchor="middle"
              fontSize="11"
              fontWeight="bold"
              fontFamily="serif"
              fill="var(--gov-navy)"
              letterSpacing="1"
            >
              GOVERNMENT
            </text>
            <text
              x="50" y="72"
              textAnchor="middle"
              fontSize="9"
              fontFamily="serif"
              fill="var(--gov-navy)"
              letterSpacing="1"
            >
              OF INDIA
            </text>
            <circle cx="50" cy="50" r="44" fill="none" stroke="var(--gov-navy)" strokeWidth="2" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="var(--gov-navy)" strokeWidth="0.8" />
          </svg>
        </div>

        {/* ── Tricolor top strip ── */}
        <div className="tricolor-strip" style={{ position: 'relative', zIndex: 1 }} />

        {/* ── Header ── */}
        <div
          className="relative px-8 pt-8 pb-6 text-center"
          style={{ zIndex: 1, borderBottom: '2px solid var(--paper-border)' }}
        >
          {/* Emblem row */}
          <div className="flex items-center justify-center gap-4 mb-5">
            {/* Left Ashoka Chakra SVG */}
            <AshokaChakra size={52} />
            {/* Emblem text */}
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-0.5" style={{ color: 'var(--gov-saffron)' }}>
                भारत सरकार
              </p>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--gov-green)' }}>
                Government of India
              </p>
            </div>
            {/* Right Ashoka Chakra */}
            <AshokaChakra size={52} />
          </div>

          <h1
            className="text-3xl font-bold leading-tight"
            style={{ fontFamily: 'EB Garamond, serif', color: 'var(--gov-navy)' }}
          >
            Application for Income Certificate
          </h1>
          <p className="text-sm mt-1" style={{ fontFamily: 'EB Garamond, serif', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
            आय प्रमाण पत्र के लिए आवेदन
          </p>

          {/* Decorative rule */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px" style={{ background: 'var(--paper-border)' }} />
            <span className="text-base" style={{ color: 'var(--gov-gold)' }}>✦</span>
            <div className="flex-1 h-px" style={{ background: 'var(--paper-border)' }} />
          </div>

          {/* Meta row */}
          <div className="flex justify-between items-center mt-3 text-xs" style={{ color: 'var(--ink-muted)' }}>
            <span>Form No.: IC-2024/01</span>
            <span>Ref.: {refNo}</span>
          </div>
        </div>

        {/* ── Form ── */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="relative px-8 py-7"
          style={{ zIndex: 1 }}
          aria-label="Income Certificate Application Form"
        >
          {/* Instructions box */}
          <div
            className="mb-6 px-4 py-3 rounded-lg text-xs leading-relaxed"
            style={{
              background: '#fffbeb',
              border: '1px solid #d6b560',
              color: '#5c460a',
            }}
            role="note"
          >
            <span className="font-semibold">Instructions:</span> All fields marked with{' '}
            <span className="text-red-600 font-bold">*</span> are mandatory. Please fill in details
            as per official records. Submission of false information is a punishable offence under
            applicable laws.
          </div>

          {/* Grid of fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {FIELDS.map((field, i) => (
              <div
                key={field.id}
                className={`fade-row ${field.colSpan === 2 ? 'sm:col-span-2' : ''}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <FieldRow
                  field={field}
                  value={form[field.id]}
                  error={errors[field.id]}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>

          {/* Declaration */}
          <div
            className="mt-7 px-4 py-3 rounded-lg text-xs leading-relaxed"
            style={{
              background: '#f0f4ff',
              border: '1px solid #a3b4d6',
              color: '#1a2a5e',
            }}
          >
            <span className="font-semibold">Declaration:</span> I hereby solemnly affirm and declare
            that the information furnished above is true and correct to the best of my knowledge and
            belief. I understand that if any information is found to be false or incorrect, I may be
            liable to legal action.
          </div>

          {/* Signature row */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between gap-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
            <div>
              <p className="font-semibold mb-8">Date: ___________________</p>
              <p>Place: ___________________</p>
            </div>
            <div className="text-right sm:text-right">
              <p className="font-semibold mb-8">Signature / Left Thumb Impression</p>
              <p>of the Applicant</p>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--paper-border)' }} />
            <span style={{ color: 'var(--gov-gold)' }}>✦</span>
            <div className="flex-1 h-px" style={{ background: 'var(--paper-border)' }} />
          </div>

          {/* Submit */}
          <div className="flex justify-center">
            <button
              ref={submitBtnRef}
              type="submit"
              id="submitButton"
              className="btn-submit px-12 py-3.5 rounded-xl text-white font-semibold text-base tracking-wide shadow-lg"
              style={{
                background: `linear-gradient(135deg, var(--gov-navy) 0%, #1a5276 100%)`,
                boxShadow: '0 4px 18px rgba(0, 53, 128, 0.35)',
              }}
            >
              Submit Application
            </button>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--ink-muted)' }}>
            For office use only — Do not write below this line
          </p>
          <div className="mt-1 h-px" style={{ background: 'var(--paper-border)', borderTop: '1px dashed #c9b78a' }} />

          {/* Office-use row */}
          <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-center" style={{ color: 'var(--ink-muted)' }}>
            {['Received by', 'Verified by', 'Issued by'].map((t) => (
              <div key={t}>
                <p className="mb-6">&nbsp;</p>
                <div style={{ borderTop: '1px solid var(--paper-border)' }} />
                <p className="mt-1 font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </form>

        {/* Footer strip */}
        <div
          className="px-8 py-3 text-center text-xs"
          style={{
            background: 'var(--gov-navy)',
            color: '#ffffffaa',
            fontFamily: 'EB Garamond, serif',
          }}
        >
          Issued under the authority of the State Government &nbsp;|&nbsp; This is a computer-generated form
        </div>
      </div>
    </div>
  )
}

/* ─── Field Row ─── */
function FieldRow({ field, value, error, onChange }) {
  const { id, label, type, required, placeholder, options, rows, min, maxLength, pattern } = field

  const inputClass = `gov-input w-full rounded-lg px-3 py-2.5 text-sm border ${
    error ? 'border-red-400 bg-red-50' : 'border-[var(--field-border)] bg-[var(--field-bg)]'
  }`
  const inputStyle = { color: 'var(--ink)', fontFamily: 'Inter, sans-serif' }

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold mb-1"
        style={{ color: 'var(--ink)' }}
      >
        {label}
        {required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows ?? 3}
          required={required}
          className={inputClass}
          style={{ ...inputStyle, resize: 'vertical' }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      ) : type === 'select' ? (
        <select
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          required={required}
          className={inputClass}
          style={inputStyle}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <option value="">— Select —</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          min={min}
          maxLength={maxLength}
          pattern={pattern}
          className={inputClass}
          style={inputStyle}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          inputMode={type === 'number' ? 'numeric' : id === 'aadhaarNumber' ? 'numeric' : undefined}
        />
      )}

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}

/* ─── Ashoka Chakra SVG ─── */
function AshokaChakra({ size = 48 }) {
  const spokes = Array.from({ length: 24 }, (_, i) => i)
  const cx = size / 2, cy = size / 2, r = size / 2 - 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      role="img"
    >
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--gov-navy)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r - 4} fill="none" stroke="var(--gov-navy)" strokeWidth="0.8" />
      {/* Spokes */}
      {spokes.map((i) => {
        const angle = (i * 360) / 24
        const rad = (angle * Math.PI) / 180
        const x1 = cx + (r - 8) * Math.sin(rad)
        const y1 = cy - (r - 8) * Math.cos(rad)
        const x2 = cx + 5 * Math.sin(rad)
        const y2 = cy - 5 * Math.cos(rad)
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--gov-navy)" strokeWidth="1.2" strokeLinecap="round" />
        )
      })}
      {/* Inner hub */}
      <circle cx={cx} cy={cy} r={4} fill="var(--gov-navy)" />
    </svg>
  )
}

import { useState, useRef } from 'react'

/* ── Real backend call ── */
async function analyzeDocument(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('http://localhost:3001/extract', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const json = await response.json()

  if (!response.ok) {
    throw new Error(json.error || 'Extraction failed. Please try again.')
  }

  return json // { success, sessionId, fileName, fileSize, model, data: { ... } }
}

/* ── File type helpers ── */
const ACCEPT = '.pdf,.jpg,.jpeg,.png'
const ACCEPT_MIME = ['application/pdf', 'image/jpeg', 'image/png']
const FILE_ICONS = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
}

/* ── Field label map ── */
const FIELD_LABELS = [
  { key: 'applicantName',        label: 'Applicant Name' },
  { key: 'fatherOrHusbandName',  label: "Father's / Husband's Name" },
  { key: 'dateOfBirth',          label: 'Date of Birth' },
  { key: 'address',              label: 'Address' },
  { key: 'annualIncome',         label: 'Annual Income (₹)' },
  { key: 'occupation',           label: 'Occupation' },
  { key: 'purposeOfCertificate', label: 'Purpose of Certificate' },
  { key: 'aadhaarNumber',        label: 'Aadhaar Number' },
]

export default function UploadPage({ onExtracted }) {
  const [file, setFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const reset = () => {
    setFile(null)
    setResult(null)
    setError('')
    setAnalyzing(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleFile = async (selected) => {
    if (!selected) return

    if (!ACCEPT_MIME.includes(selected.type)) {
      setError('Unsupported file type. Please upload a PDF, JPG, or PNG.')
      return
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum allowed size is 10 MB.')
      return
    }

    setError('')
    setResult(null)
    setFile(selected)
    setAnalyzing(true)

    try {
      const data = await analyzeDocument(selected)
      // If parent gave us a callback, navigate to confirm page
      if (onExtracted) {
        onExtracted({ ...data, explanation: data.data?.explanation, checklist: data.data?.checklist })
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err.message || 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const onInputChange = (e) => handleFile(e.target.files?.[0])

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'linear-gradient(135deg, #e8e0d0 0%, #f0ebe0 50%, #e4ddd0 100%)' }}>
      <div className="mx-auto" style={{ maxWidth: result ? 720 : 520 }}>

        {/* ── Card ── */}
        <div
          className="rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: '#FDFAF4', border: '1.5px solid #B8A77A' }}
        >
          {/* Tricolor strip */}
          <div style={{ height: 6, background: 'linear-gradient(to right, #FF6700 33.33%, #fff 33.33% 66.66%, #138808 66.66%)' }} />

          <div className="px-8 py-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                style={{ background: '#eef2ff', border: '2px solid #a3b4d6' }}
              >
                <svg className="w-8 h-8" style={{ color: '#003580' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: 'EB Garamond, serif', color: '#003580' }}
              >
                Document Analysis
              </h1>
              <p className="text-sm mt-1" style={{ color: '#4A4A6A' }}>
                Upload your document and let our AI extract the key details.
              </p>
            </div>

            {/* ── Drop zone ── */}
            {!analyzing && !result && (
              <div
                role="button"
                tabIndex={0}
                aria-label="File upload drop zone"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className="cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 p-10 text-center"
                style={{
                  borderColor: dragOver ? '#003580' : '#B8A77A',
                  background: dragOver ? '#eef2ff' : '#fefce8',
                }}
              >
                <svg
                  className="mx-auto mb-3 w-10 h-10"
                  style={{ color: dragOver ? '#003580' : '#C9A227' }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="font-semibold text-sm" style={{ color: '#1A1A2E' }}>
                  Drag & drop your file here, or{' '}
                  <span style={{ color: '#003580', textDecoration: 'underline' }}>browse</span>
                </p>
                <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                  Accepted formats: PDF, JPG, PNG &nbsp;·&nbsp; Max 10 MB
                </p>

                <input
                  ref={inputRef}
                  id="documentUpload"
                  type="file"
                  accept={ACCEPT}
                  onChange={onInputChange}
                  className="sr-only"
                  aria-label="Upload document"
                />
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-sm"
                style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b' }}
              >
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* ── Analyzing state ── */}
            {analyzing && (
              <div className="flex flex-col items-center gap-5 py-6">
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3 w-full"
                  style={{ background: '#f0f4ff', border: '1px solid #a3b4d6' }}
                >
                  <span className="text-2xl">{FILE_ICONS[file?.type] ?? '📎'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1A1A2E' }}>{file?.name}</p>
                    <p className="text-xs" style={{ color: '#4A4A6A' }}>{(file?.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                <Spinner />

                <p id="analyzingStatus" className="text-sm font-medium" style={{ color: '#003580' }}>
                  Analyzing document…
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  This may take a few seconds
                </p>
              </div>
            )}

            {/* ── Result state ── */}
            {result && !analyzing && (
              <div className="py-2">
                {/* Success banner */}
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3 mb-6"
                  style={{ background: '#f0fff4', border: '1px solid #6ee7b7' }}
                >
                  <svg className="w-5 h-5 shrink-0" style={{ color: '#138808' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: '#065f46' }}>
                      Analysis complete!
                    </span>
                    <span className="text-xs ml-2" style={{ color: '#6B7280' }}>
                      Powered by {result.model}
                    </span>
                  </div>
                </div>

                {/* ── Extracted Fields Grid ── */}
                <h2 className="text-base font-bold mb-3" style={{ color: '#003580', fontFamily: 'EB Garamond, serif' }}>
                  📋 Extracted Information
                </h2>
                <div className="grid grid-cols-1 gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                  {FIELD_LABELS.map(({ key, label }) => (
                    <div
                      key={key}
                      className="rounded-xl px-4 py-3"
                      style={{
                        background: result.data[key] ? '#f0f4ff' : '#fafafa',
                        border: `1px solid ${result.data[key] ? '#a3b4d6' : '#e5e7eb'}`,
                      }}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#4A4A6A' }}>
                        {label}
                      </p>
                      <p className="text-sm font-medium" style={{ color: result.data[key] ? '#1A1A2E' : '#9CA3AF' }}>
                        {result.data[key] ?? '—  Not found in document'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* ── Explanation ── */}
                {result.data.explanation && (
                  <div
                    className="rounded-xl px-4 py-4 mb-4"
                    style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#92400e' }}>
                      📌 About This Document
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: '#1A1A2E' }}>
                      {result.data.explanation}
                    </p>
                  </div>
                )}

                {/* ── Checklist ── */}
                {result.data.checklist?.length > 0 && (
                  <div
                    className="rounded-xl px-4 py-4 mb-6"
                    style={{ background: '#f0fff4', border: '1px solid #a7f3d0' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#065f46' }}>
                      ✅ Documents / Actions Checklist
                    </p>
                    <ul className="space-y-2">
                      {result.data.checklist.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#1A1A2E' }}>
                          <span style={{ color: '#138808', marginTop: 1 }}>✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Re-upload button */}
                <button
                  id="reuploadButton"
                  onClick={reset}
                  className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors hover:bg-blue-50"
                  style={{ borderColor: '#003580', color: '#003580' }}
                >
                  ↑ Upload Another Document
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-8 py-3 text-center text-xs"
            style={{ background: '#003580', color: '#ffffffaa', fontFamily: 'EB Garamond, serif' }}
          >
            Supported formats: PDF · JPG · PNG &nbsp;|&nbsp; Max file size: 10 MB
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Spinner component ── */
function Spinner() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
      style={{ borderColor: '#d1d5db', borderTopColor: '#003580' }}
    />
  )
}

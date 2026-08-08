import express from 'express'
import multer from 'multer'
import cors from 'cors'
import dotenv from 'dotenv'
import Groq from 'groq-sdk'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { createWorker } from 'tesseract.js'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const __dirname = dirname(fileURLToPath(import.meta.url))

dotenv.config()

/* ──────────────────────────────────────────────
   Validation
────────────────────────────────────────────── */
if (!process.env.GROQ_API_KEY) {
  console.error('[PaperPilot] ❌  GROQ_API_KEY is not set. Create server/.env and add it.')
  process.exit(1)
}

/* ──────────────────────────────────────────────
   In-Memory Session Storage (Plain JS Object/Map)
────────────────────────────────────────────── */
const sessions = new Map()

function parseCookies(cookieHeader) {
  const list = {}
  if (!cookieHeader) return list
  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=')
    name = name?.trim()
    if (!name) return
    const val = rest.join('=').trim()
    list[name] = decodeURIComponent(val)
  })
  return list
}

function getOrCreateSession(req, res, createNew = false) {
  const cookies = parseCookies(req.headers.cookie)
  let sessionId = req.headers['x-session-id'] || cookies['sessionId'] || req.query?.sessionId || req.body?.sessionId

  if (createNew || !sessionId || !sessions.has(sessionId)) {
    sessionId = `sess_${randomUUID()}`
    sessions.set(sessionId, {
      id: sessionId,
      createdAt: new Date().toISOString(),
      extractedData: null,
      confirmedData: null,
      fileName: null,
      screenshotUrl: null,
    })
  }

  const session = sessions.get(sessionId)
  res.setHeader('X-Session-ID', sessionId)
  res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly; SameSite=Lax`)

  return { sessionId, session }
}

/* ──────────────────────────────────────────────
   Express setup
────────────────────────────────────────────── */
const app = express()
const PORT = process.env.PORT || 3001

const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., server-to-server, curl)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin "${origin}" not allowed`))
  },
  credentials: true,
  exposedHeaders: ['X-Session-ID'],
  methods: ['POST', 'GET', 'PUT', 'DELETE'],
}))
app.use(express.json())

/* ──────────────────────────────────────────────
   Multer – memory storage, 10 MB limit
────────────────────────────────────────────── */
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, JPG, PNG, WEBP`))
    }
  },
})

/* ──────────────────────────────────────────────
   Groq client — text model only (no vision)
────────────────────────────────────────────── */
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'

/* ──────────────────────────────────────────────
   OCR helper: image buffer → raw text via Tesseract.js
────────────────────────────────────────────── */
async function ocrImage(buffer, mimetype) {
  console.log('[OCR] Starting Tesseract OCR...')
  const worker = await createWorker('eng', 1, {
    logger: () => {}, // silence progress logs
  })
  try {
    // Tesseract accepts a Buffer directly
    const { data: { text } } = await worker.recognize(buffer)
    console.log(`[OCR] Extracted ${text.trim().length} chars from image`)
    return text.trim()
  } finally {
    await worker.terminate()
  }
}

/* ──────────────────────────────────────────────
   PDF helper: PDF buffer → raw text via pdf-parse
   Returns empty string on corrupted/unreadable PDFs (doesn't throw)
────────────────────────────────────────────── */
async function extractPdfText(buffer) {
  console.log('[PDF] Extracting text with pdf-parse...')
  try {
    const pdfData = await pdfParse(buffer)
    const text = pdfData.text?.trim() || ''
    console.log(`[PDF] Extracted ${text.length} chars from PDF`)
    return text
  } catch (err) {
    console.warn(`[PDF] pdf-parse failed (${err.message}) — PDF may be corrupted or image-only`)
    return '' // caller will handle the empty string
  }
}

/* ──────────────────────────────────────────────
   Extraction prompt
────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a document analysis AI specialising in Indian government certificates.
You are given raw text extracted (via OCR or PDF parsing) from a scanned or digital Indian government document.
Analyse the text carefully and extract the following information.

Return ONLY a single valid JSON object — no markdown fences, no prose, no explanation outside the JSON.

The JSON must contain exactly these keys:

{
  "applicantName":          "<full name of the applicant, or null if not found>",
  "fatherOrHusbandName":    "<father's or husband's name, or null if not found>",
  "address":                "<complete residential address, or null if not found>",
  "dateOfBirth":            "<date of birth in YYYY-MM-DD format, or null if not found>",
  "annualIncome":           "<annual income as a numeric string without currency symbol, e.g. '180000', or null if not found>",
  "occupation":             "<occupation or profession, or null if not found>",
  "purposeOfCertificate":   "<the stated purpose for which the certificate is requested/issued, or null if not found>",
  "aadhaarNumber":          "<12-digit Aadhaar number formatted as 'XXXX XXXX XXXX', or null if not found>",
  "explanation":            "<2-3 sentence plain-English summary: what this document is, what it certifies, and who typically needs it>",
  "checklist":              ["<string: a supporting document or action the applicant typically needs>", ...]
}

Rules:
- Do NOT include any text before or after the JSON.
- If a field cannot be found in the text, set its value to null — never guess or fabricate.
- For 'checklist', include 4–7 practical items relevant to obtaining or using this certificate in India.
- For 'explanation', write for a general Indian citizen with limited familiarity with government processes.`

/* ──────────────────────────────────────────────
   Helper: parse Groq text → JSON
────────────────────────────────────────────── */
function parseJSON(rawText) {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return JSON.parse(cleaned)
}

/* ──────────────────────────────────────────────
   POST /extract
────────────────────────────────────────────── */
app.post('/extract', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Use field name "file".' })
    }

    const { mimetype, buffer, originalname, size } = req.file
    console.log(`\n[/extract] ─── New request ───`)
    console.log(`[/extract] File: ${originalname} | ${mimetype} | ${(size / 1024).toFixed(1)} KB`)

    /* ── Step 1: Extract raw text from the document ── */
    let rawDocText = ''

    if (mimetype === 'application/pdf') {
      rawDocText = await extractPdfText(buffer)
    } else {
      // image/jpeg, image/png, image/webp → Tesseract OCR
      rawDocText = await ocrImage(buffer, mimetype)
    }

    if (!rawDocText || rawDocText.length < 15) {
      return res.status(422).json({
        error: mimetype === 'application/pdf'
          ? 'Could not extract text from this PDF. It may be a scanned image, password-protected, or corrupted. Please try uploading a JPG/PNG photo of the document instead.'
          : 'Could not extract readable text from this image. Please ensure the image is clear and well-lit.',
      })
    }

    /* ── Step 2: Send extracted text to Groq Llama for field extraction ── */
    console.log(`[/extract] Sending ${rawDocText.length} chars to Groq (${TEXT_MODEL})...`)

    const completion = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Here is the raw text extracted from the document:\n\n${rawDocText}` },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    })

    const groqRaw = completion.choices[0]?.message?.content || ''
    console.log(`[/extract] Groq response (first 300 chars): ${groqRaw.slice(0, 300)}`)

    /* ── Step 3: Parse JSON ── */
    let extracted
    try {
      extracted = parseJSON(groqRaw)
    } catch (parseErr) {
      console.error('[/extract] JSON parse failed:', parseErr.message)
      return res.status(502).json({
        error: 'AI returned a non-JSON response.',
        rawResponse: groqRaw,
      })
    }

    /* ── Step 4: Ensure all keys present ── */
    const REQUIRED_KEYS = [
      'applicantName', 'fatherOrHusbandName', 'address', 'dateOfBirth',
      'annualIncome', 'occupation', 'purposeOfCertificate', 'aadhaarNumber',
      'explanation', 'checklist',
    ]
    for (const key of REQUIRED_KEYS) {
      if (!(key in extracted)) extracted[key] = null
    }
    if (!Array.isArray(extracted.checklist)) extracted.checklist = []

    /* ── Step 5: Save in-memory session ── */
    const { sessionId, session } = getOrCreateSession(req, res, true)
    session.extractedData = extracted
    session.fileName = originalname

    console.log(`[/extract] ✅ Extraction complete for: ${originalname} (Session: ${sessionId})`)
    return res.status(200).json({
      success: true,
      sessionId,
      fileName: originalname,
      fileSize: size,
      model: TEXT_MODEL,
      data: extracted,
    })

  } catch (err) {
    if (err.message?.startsWith('Unsupported file type')) {
      return res.status(415).json({ error: err.message })
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum allowed size is 10 MB.' })
    }
    console.error('[/extract] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error.', detail: err.message })
  }
})

/* ──────────────────────────────────────────────
   GET /session
   Retrieves current in-memory session data
────────────────────────────────────────────── */
app.get('/session', (req, res) => {
  const { sessionId, session } = getOrCreateSession(req, res, false)
  return res.json({
    success: true,
    sessionId,
    session,
  })
})

/* ──────────────────────────────────────────────
   POST /session/confirm
   Saves confirmed JSON fields into the in-memory session
────────────────────────────────────────────── */
app.post('/session/confirm', (req, res) => {
  const { sessionId, session } = getOrCreateSession(req, res, false)
  const confirmedData = req.body?.data || req.body

  if (!confirmedData || typeof confirmedData !== 'object') {
    return res.status(400).json({ error: 'Body must be a JSON object with confirmed field values.' })
  }

  session.confirmedData = { ...session.confirmedData, ...confirmedData }
  console.log(`[/session/confirm] Updated confirmed fields for Session: ${sessionId}`)

  return res.json({
    success: true,
    sessionId,
    confirmedData: session.confirmedData,
  })
})

/* ──────────────────────────────────────────────
   Health check
────────────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: TEXT_MODEL, ocr: 'tesseract.js', timestamp: new Date().toISOString() })
})

/* ──────────────────────────────────────────────
   Start
────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🚀 PaperPilot server running on http://localhost:${PORT}`)
  console.log(`   Model : ${TEXT_MODEL}`)
  console.log(`   OCR   : Tesseract.js (images) + pdf-parse (PDFs)`)
  console.log(`   Health: http://localhost:${PORT}/health\n`)
})

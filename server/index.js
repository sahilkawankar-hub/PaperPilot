import express from 'express'
import multer from 'multer'
import cors from 'cors'
import dotenv from 'dotenv'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

dotenv.config()

/* ──────────────────────────────────────────────
   Validation
────────────────────────────────────────────── */
if (!process.env.GEMINI_API_KEY) {
  console.error('[PaperPilot] ❌  GEMINI_API_KEY is not set. Create server/.env and add it.')
  process.exit(1)
}

/* ──────────────────────────────────────────────
   Express setup
────────────────────────────────────────────── */
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  methods: ['POST', 'GET'],
}))

app.use(express.json())

/* ──────────────────────────────────────────────
   Multer – memory storage, 10 MB limit
────────────────────────────────────────────── */
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, JPG, PNG, WEBP`))
    }
  },
})

/* ──────────────────────────────────────────────
   Gemini client
────────────────────────────────────────────── */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-1.5-pro'

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
]

/* ──────────────────────────────────────────────
   Extraction prompt
────────────────────────────────────────────── */
const EXTRACT_PROMPT = `
You are a document analysis AI specialising in Indian government certificates.
Analyse the uploaded document carefully and extract the following information.

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
- If a field cannot be found in the document, set its value to null — never guess or fabricate.
- For 'checklist', include 4–7 practical items relevant to obtaining or using this certificate in India (e.g. "Attach a self-attested copy of Aadhaar card", "Attach latest electricity bill as address proof").
- For 'explanation', write for a general Indian citizen with limited familiarity with government processes.
`.trim()

/* ──────────────────────────────────────────────
   Helper: parse Gemini text → JSON
────────────────────────────────────────────── */
function parseGeminiJSON(rawText) {
  // Strip any accidental markdown fences Gemini might add
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
    /* 1. Validate file presence */
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a multipart/form-data request with field name "file".' })
    }

    const { mimetype, buffer, originalname, size } = req.file
    console.log(`[/extract] Received: ${originalname} | ${mimetype} | ${(size / 1024).toFixed(1)} KB`)

    /* 2. Build Gemini inline-data part */
    const filePart = {
      inlineData: {
        mimeType: mimetype,
        data: buffer.toString('base64'),
      },
    }

    /* 3. Call Gemini */
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, safetySettings })

    const result = await model.generateContent([EXTRACT_PROMPT, filePart])
    const response = result.response
    const rawText = response.text()

    console.log(`[/extract] Gemini raw response (first 300 chars): ${rawText.slice(0, 300)}`)

    /* 4. Parse JSON */
    let extracted
    try {
      extracted = parseGeminiJSON(rawText)
    } catch (parseErr) {
      console.error('[/extract] JSON parse failed:', parseErr.message)
      console.error('[/extract] Raw text was:', rawText)
      return res.status(502).json({
        error: 'Gemini returned a non-JSON response. The document may be unreadable or unsupported.',
        rawResponse: rawText,
      })
    }

    /* 5. Ensure all expected keys exist (fill missing with null) */
    const REQUIRED_KEYS = [
      'applicantName', 'fatherOrHusbandName', 'address', 'dateOfBirth',
      'annualIncome', 'occupation', 'purposeOfCertificate', 'aadhaarNumber',
      'explanation', 'checklist',
    ]
    for (const key of REQUIRED_KEYS) {
      if (!(key in extracted)) extracted[key] = null
    }
    if (!Array.isArray(extracted.checklist)) extracted.checklist = []

    /* 6. Return */
    console.log(`[/extract] ✅  Extraction successful for: ${originalname}`)
    return res.status(200).json({
      success: true,
      fileName: originalname,
      fileSize: size,
      model: MODEL_NAME,
      data: extracted,
    })

  } catch (err) {
    /* Multer file-filter error */
    if (err.message?.startsWith('Unsupported file type')) {
      return res.status(415).json({ error: err.message })
    }
    /* Multer size error */
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum allowed size is 10 MB.' })
    }

    console.error('[/extract] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error.', detail: err.message })
  }
})

/* ──────────────────────────────────────────────
   Health check
────────────────────────────────────────────── */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', model: MODEL_NAME, timestamp: new Date().toISOString() })
})

/* ──────────────────────────────────────────────
   Start
────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🚀 PaperPilot server running on http://localhost:${PORT}`)
  console.log(`   Model : ${MODEL_NAME}`)
  console.log(`   Health: http://localhost:${PORT}/health\n`)
})

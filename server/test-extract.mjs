// Quick test script — run with: node test-extract.mjs
import { createReadStream, statSync } from 'fs'
import { basename } from 'path'
import http from 'http'

const PDF_PATH = 'D:\\All Projects\\Project Vikasit PaperPilot\\income certificate.pdf'
const HOST = 'localhost'
const PORT = 3001
const ENDPOINT = '/extract'

// ── Build a multipart/form-data body manually ──
const BOUNDARY = '----PaperPilotBoundary' + Date.now()
const filename  = basename(PDF_PATH)
const fileStats = statSync(PDF_PATH)

const preamble = Buffer.from(
  `--${BOUNDARY}\r\n` +
  `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
  `Content-Type: application/pdf\r\n` +
  `\r\n`
)
const epilogue = Buffer.from(`\r\n--${BOUNDARY}--\r\n`)
const totalLength = preamble.length + fileStats.size + epilogue.length

console.log(`\n📤 Sending: ${filename} (${(fileStats.size / 1024).toFixed(1)} KB)`)
console.log(`   → POST http://${HOST}:${PORT}${ENDPOINT}\n`)

const req = http.request({
  hostname: HOST,
  port: PORT,
  path: ENDPOINT,
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`,
    'Content-Length': totalLength,
  },
}, (res) => {
  let body = ''
  res.on('data', chunk => body += chunk)
  res.on('end', () => {
    console.log(`📥 HTTP Status: ${res.statusCode}\n`)
    try {
      const parsed = JSON.parse(body)
      console.log(JSON.stringify(parsed, null, 2))
    } catch {
      console.log(body)
    }
  })
})

req.on('error', err => {
  console.error('❌ Request failed:', err.message)
  if (err.code === 'ECONNREFUSED') {
    console.error('   Is the server running? → cd server && node index.js')
  }
})

// Stream: preamble → file → epilogue
req.write(preamble)
const fileStream = createReadStream(PDF_PATH)
fileStream.on('data', chunk => req.write(chunk))
fileStream.on('end', () => {
  req.write(epilogue)
  req.end()
})

// Quick test script — run with: node test-extract.mjs [path-to-file]
import { createReadStream, statSync, existsSync } from 'fs'
import { basename, extname, resolve } from 'path'
import http from 'http'

const defaultPath = resolve('../samples/sample_income_certificate.jpg')
const inputPath = process.argv[2] ? resolve(process.argv[2]) : defaultPath

if (!existsSync(inputPath)) {
  console.error(`❌ File not found: ${inputPath}`)
  process.exit(1)
}

const ext = extname(inputPath).toLowerCase()
const mimeTypes = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}
const mimeType = mimeTypes[ext] || 'application/octet-stream'

const HOST = 'localhost'
const PORT = 3001
const ENDPOINT = '/extract'

// ── Build a multipart/form-data body manually ──
const BOUNDARY = '----PaperPilotBoundary' + Date.now()
const filename  = basename(inputPath)
const fileStats = statSync(inputPath)

const preamble = Buffer.from(
  `--${BOUNDARY}\r\n` +
  `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
  `Content-Type: ${mimeType}\r\n` +
  `\r\n`
)
const epilogue = Buffer.from(`\r\n--${BOUNDARY}--\r\n`)
const totalLength = preamble.length + fileStats.size + epilogue.length

console.log(`\n📤 Sending: ${filename} (${(fileStats.size / 1024).toFixed(1)} KB) [${mimeType}]`)
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
const fileStream = createReadStream(inputPath)
fileStream.on('data', chunk => req.write(chunk))
fileStream.on('end', () => {
  req.write(epilogue)
  req.end()
})

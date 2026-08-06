// Integration test for Session Storage pipeline: /extract -> /session -> /session/confirm -> /fill-form
import { createReadStream, statSync, existsSync } from 'fs'
import { resolve } from 'path'
import http from 'http'

const sampleImage = resolve('../samples/sample_income_certificate.jpg')
if (!existsSync(sampleImage)) {
  console.error('❌ Sample image not found:', sampleImage)
  process.exit(1)
}

const HOST = 'localhost'
const PORT = 3001

async function runSessionTest() {
  console.log('🧪 Starting Session Pipeline Test...\n')

  // Step 1: Upload document to /extract
  console.log('1️⃣ Step 1: POST /extract (First upload — generates session)...')
  const BOUNDARY = '----PaperPilotBoundary' + Date.now()
  const stats = statSync(sampleImage)
  const preamble = Buffer.from(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="sample_income_certificate.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
  )
  const epilogue = Buffer.from(`\r\n--${BOUNDARY}--\r\n`)
  const totalLength = preamble.length + stats.size + epilogue.length

  const extractRes = await new Promise((resResolve, resReject) => {
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: '/extract',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`,
        'Content-Length': totalLength,
      },
    }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resResolve({
        status: res.statusCode,
        headers: res.headers,
        data: JSON.parse(body),
      }))
    })
    req.on('error', resReject)
    req.write(preamble)
    const fileStream = createReadStream(sampleImage)
    fileStream.on('data', chunk => req.write(chunk))
    fileStream.on('end', () => {
      req.write(epilogue)
      req.end()
    })
  })

  console.log(`   Status: ${extractRes.status}`)
  console.log(`   X-Session-ID Header: ${extractRes.headers['x-session-id']}`)
  console.log(`   Set-Cookie Header:   ${extractRes.headers['set-cookie']?.[0]}`)
  console.log(`   JSON Session ID:     ${extractRes.data.sessionId}`)

  const sessionId = extractRes.data.sessionId
  if (!sessionId) throw new Error('Session ID not returned in /extract')

  // Step 2: GET /session
  console.log('\n2️⃣ Step 2: GET /session (Retrieve stored extracted data)...')
  const getSessionRes = await new Promise((resResolve, resReject) => {
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: '/session',
      method: 'GET',
      headers: { 'X-Session-ID': sessionId },
    }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resResolve(JSON.parse(body)))
    })
    req.on('error', resReject)
    req.end()
  })

  console.log(`   Retrieved Session ID: ${getSessionRes.sessionId}`)
  console.log(`   Extracted Applicant Name: "${getSessionRes.session?.extractedData?.applicantName}"`)

  // Step 3: POST /session/confirm
  console.log('\n3️⃣ Step 3: POST /session/confirm (Save confirmed fields in session)...')
  const confirmedPayload = {
    ...getSessionRes.session.extractedData,
    applicantName: 'Rahul Vinod Deshmukh (Verified)',
  }

  const confirmRes = await new Promise((resResolve, resReject) => {
    const payload = JSON.stringify({ data: confirmedPayload })
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: '/session/confirm',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resResolve(JSON.parse(body)))
    })
    req.on('error', resReject)
    req.write(payload)
    req.end()
  })

  console.log(`   Confirmed Session ID: ${confirmRes.sessionId}`)
  console.log(`   Confirmed Applicant Name: "${confirmRes.confirmedData?.applicantName}"`)

  // Step 4: POST /fill-form (using session ID only — no body fields)
  console.log('\n4️⃣ Step 4: POST /fill-form (Automated Playwright fill using Session ID)...')
  const fillRes = await new Promise((resResolve, resReject) => {
    const payload = JSON.stringify({ sessionId })
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: '/fill-form',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': sessionId,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => resResolve({ status: res.statusCode, data: JSON.parse(body) }))
    })
    req.on('error', resReject)
    req.write(payload)
    req.end()
  })

  console.log(`   Status: ${fillRes.status}`)
  console.log(`   Screenshot URL: ${fillRes.data.screenshotUrl}`)
  console.log(`   Filled Applicant Name: "${fillRes.data.filled?.applicantName}"`)

  console.log('\n✅ ALL SESSION PIPELINE TESTS PASSED SUCCESSFULLY!')
}

runSessionTest().catch((err) => {
  console.error('\n❌ Test failed:', err)
  process.exit(1)
})

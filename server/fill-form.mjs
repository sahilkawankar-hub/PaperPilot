/**
 * fill-form.mjs
 * Playwright automation: fills the PaperPilot Income Certificate form
 * and returns a screenshot as proof.
 *
 * Exported function:  fillForm(data) → { screenshotPath, screenshotFile }
 * CLI usage:          node fill-form.mjs '{"applicantName":"Rahul...", ...}'
 */

import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname }         from 'path'
import { fileURLToPath }         from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname      = dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = join(__dirname, 'screenshots')
if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR, { recursive: true })

const FORM_URL = process.env.FORM_URL || 'http://localhost:5173'

/* ──────────────────────────────────────────────
   JSON key  →  HTML element id + type
   Note: fatherOrHusbandName (JSON) maps to fatherHusbandName (form ID)
────────────────────────────────────────────── */
const FIELD_MAP = [
  { key: 'applicantName',        id: 'applicantName',        type: 'text'     },
  { key: 'fatherOrHusbandName',  id: 'fatherHusbandName',    type: 'text'     },
  { key: 'dateOfBirth',          id: 'dateOfBirth',          type: 'date'     },
  { key: 'aadhaarNumber',        id: 'aadhaarNumber',        type: 'text'     },
  { key: 'occupation',           id: 'occupation',           type: 'select'   },
  { key: 'annualIncome',         id: 'annualIncome',         type: 'number'   },
  { key: 'purposeOfCertificate', id: 'purposeOfCertificate', type: 'select'   },
  { key: 'address',              id: 'address',              type: 'textarea' },
]

/* ──────────────────────────────────────────────
   Normalize a date string to YYYY-MM-DD
   Handles: "14/06/2001", "2001-06-14", "June 14 2001" etc.
────────────────────────────────────────────── */
function normalizeDate(value) {
  if (!value) return ''

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`

  // MM/DD/YYYY
  const mdy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`

  // Try native Date parse as last resort
  const parsed = new Date(value)
  if (!isNaN(parsed)) {
    return parsed.toISOString().slice(0, 10)
  }

  return value
}

/* ──────────────────────────────────────────────
   Fuzzy-match extracted value against <select> options
   Returns the option value string to pass to selectOption(), or null
────────────────────────────────────────────── */
async function findBestOption(page, selectId, rawValue) {
  if (!rawValue) return null

  const options = await page.$$eval(
    `#${selectId} option`,
    (opts) => opts
      .filter((o) => o.value !== '')
      .map((o) => ({ value: o.value, text: o.textContent.trim() }))
  )

  if (!options.length) return null

  const needle = rawValue.toLowerCase().trim()

  // 1. Exact match (case-insensitive)
  const exact = options.find(
    (o) => o.text.toLowerCase() === needle || o.value.toLowerCase() === needle
  )
  if (exact) return exact.value

  // 2. Option text contains the extracted value OR vice-versa
  const partial = options.find(
    (o) =>
      o.text.toLowerCase().includes(needle) ||
      needle.includes(o.text.toLowerCase())
  )
  if (partial) return partial.value

  // 3. Keyword overlap — split both sides by /[\s,\/]+/ and look for shared words > 3 chars
  const needleWords = needle.split(/[\s,\/\-]+/).filter((w) => w.length > 3)
  const keyword = options.find((o) => {
    const optWords = o.text.toLowerCase().split(/[\s,\/\-]+/)
    return needleWords.some((nw) => optWords.some((ow) => ow.includes(nw) || nw.includes(ow)))
  })
  if (keyword) return keyword.value

  // 4. Fall back to "Other" if present
  const other = options.find((o) => o.text.toLowerCase() === 'other')
  return other ? other.value : null
}

/* ──────────────────────────────────────────────
   Main exported function
────────────────────────────────────────────── */
export async function fillForm(data) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  try {
    console.log(`[fill-form] Navigating to ${FORM_URL}`)
    await page.goto(FORM_URL, { waitUntil: 'networkidle', timeout: 30_000 })

    // Ensure we are on the "Apply for Certificate" (form) page
    const navBtn = page.locator('#navFormLink')
    if (await navBtn.isVisible()) {
      await navBtn.click()
      await page.waitForTimeout(600)
    }

    const filled = {}
    const skipped = {}

    // ── Fill each field ──
    for (const { key, id, type } of FIELD_MAP) {
      let value = data[key]
      if (value === null || value === undefined || String(value).trim() === '') {
        skipped[key] = 'no value'
        continue
      }

      const strValue = String(value).trim()
      const selector  = `#${id}`

      try {
        await page.waitForSelector(selector, { timeout: 5_000 })

        if (type === 'select') {
          const best = await findBestOption(page, id, strValue)
          if (best) {
            await page.selectOption(selector, best)
            filled[key] = best
          } else {
            skipped[key] = `no matching option for "${strValue}"`
          }

        } else if (type === 'date') {
          const iso = normalizeDate(strValue)
          await page.fill(selector, iso)
          filled[key] = iso

        } else {
          // text / number / textarea
          await page.fill(selector, '')
          await page.fill(selector, strValue)
          filled[key] = strValue
        }

        console.log(`[fill-form] ✓ #${id} = "${filled[key] ?? skipped[key]}"`)
      } catch (err) {
        skipped[key] = err.message
        console.warn(`[fill-form] ⚠ #${id}: ${err.message}`)
      }
    }

    // Wait for UI to settle
    await page.waitForTimeout(800)

    // ── Full-page screenshot ──
    const filename       = `fill_${Date.now()}.png`
    const screenshotPath = join(SCREENSHOTS_DIR, filename)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`[fill-form] 📸 Screenshot saved: ${screenshotPath}`)

    return {
      success: true,
      screenshotPath,
      screenshotFile: filename,
      screenshotUrl: `/screenshots/${filename}`,
      filled,
      skipped,
    }
  } finally {
    await browser.close()
  }
}

/* ──────────────────────────────────────────────
   CLI entry-point:  node fill-form.mjs '{"applicantName":"..."}'
────────────────────────────────────────────── */
const isMain = process.argv[1]?.endsWith('fill-form.mjs')
if (isMain) {
  const raw  = process.argv[2] || '{}'
  let data
  try { data = JSON.parse(raw) } catch { data = {} }

  fillForm(data)
    .then((result) => console.log('\n✅ Done:\n', JSON.stringify(result, null, 2)))
    .catch((err) => { console.error('❌', err.message); process.exit(1) })
}

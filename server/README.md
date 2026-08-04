# PaperPilot – Server

Express API that uses **Google Gemini** (multimodal) to extract structured fields from uploaded Indian government certificate documents (PDF / JPG / PNG).

---

## Quick Start

```bash
# 1. Install dependencies
cd server
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
# Get one free at: https://aistudio.google.com/app/apikey

# 3. Start the server
npm run dev        # Development (auto-restart on changes)
npm start          # Production
```

Server runs on **http://localhost:3001** by default.

---

## Endpoints

### `POST /extract`

Accepts a multipart/form-data upload and returns structured JSON extracted from the document using Gemini.

**Request**
```
Content-Type: multipart/form-data
Field name:   file
Accepted:     .pdf, .jpg, .jpeg, .png, .webp
Max size:     10 MB
```

**Example (curl)**
```bash
curl -X POST http://localhost:3001/extract \
  -F "file=@/path/to/income_certificate.pdf"
```

**Success Response (200)**
```json
{
  "success": true,
  "fileName": "income_certificate.pdf",
  "fileSize": 123456,
  "model": "gemini-1.5-pro",
  "data": {
    "applicantName":        "Ramesh Kumar Sharma",
    "fatherOrHusbandName":  "Shyam Lal Sharma",
    "address":              "12, Gandhi Nagar, Pune, Maharashtra – 411001",
    "dateOfBirth":          "1985-04-15",
    "annualIncome":         "180000",
    "occupation":           "Agriculture / Farmer",
    "purposeOfCertificate": "Scholarship / Educational Assistance",
    "aadhaarNumber":        "1234 5678 9012",
    "explanation":          "This is an Income Certificate issued by the State Government...",
    "checklist": [
      "Attach a self-attested copy of Aadhaar card",
      "Attach latest electricity or water bill as address proof",
      "Attach a recent passport-size photograph",
      "Attach PAN card copy if annual income exceeds ₹2.5 lakh",
      "Attach school/college bonafide certificate (for scholarship purpose)"
    ]
  }
}
```

**Error Responses**

| Status | Meaning |
|--------|---------|
| 400    | No file uploaded |
| 413    | File exceeds 10 MB |
| 415    | Unsupported file type |
| 502    | Gemini returned non-JSON (unreadable document) |
| 500    | Internal server error |

---

### `GET /health`

```json
{ "status": "ok", "model": "gemini-1.5-pro", "timestamp": "2026-08-04T15:00:00.000Z" }
```

---

## Environment Variables

| Variable        | Required | Default                    | Description |
|-----------------|----------|----------------------------|-------------|
| `GEMINI_API_KEY` | ✅ Yes   | —                          | Google AI Studio API key |
| `GEMINI_MODEL`  | No       | `gemini-1.5-pro`           | Model name (`gemini-1.5-flash`, `gemini-2.0-flash-exp`, etc.) |
| `PORT`          | No       | `3001`                     | Server port |
| `CLIENT_ORIGIN` | No       | `http://localhost:5173`    | CORS allowed origin |

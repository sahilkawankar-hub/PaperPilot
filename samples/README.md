# Sample Test Files

This directory contains sample government certificate applications for testing PaperPilot's document extraction pipeline.

## Files
- `sample_income_certificate.jpg`: Filled Income Certificate Application (Maharashtra) — works with Tesseract OCR + Groq Llama extraction.
- `sample_income_certificate.pdf`: PDF version of the Maharashtra Income Certificate Application.

## Running Tests
To run the automated extraction test against `sample_income_certificate.jpg`:

```bash
cd server
node test-extract.mjs ../samples/sample_income_certificate.jpg
```

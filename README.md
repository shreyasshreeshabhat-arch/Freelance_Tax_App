# Automated Freelance Tax & Invoice Chaser

Frontend-only demo (React 19 + Vite + Tailwind 3 + Lucide). Auth, bank feeds, classifier and email dispatch are all simulated client-side; state lives in `localStorage`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static bundle in dist/ (Netlify / Vercel ready, hash routing, no rewrites)
npm run lint
```

**Demo login:** `shreyas@freelance.io` / `TaxSafe2026!` (also on the login screen). Use **Reset Demo Data** (header, or login screen for a full wipe) before presenting.

**Bank tokens:** `access-sandbox-valid-901` (syncs 12 transactions) · `expired-token-000` (fails gracefully).

## Layout
- `src/utils/taxEngine.js` – N, T_q, P_thresh, jurisdictions
- `src/utils/invoiceEngine.js` – aging, escalation stages, dispatcher planning, email templates
- `src/utils/classifier.js` – rule + simulated-AI tagger; `validators.js` – all required messages
- `src/data/mockData.js` – seed ledger/invoices, bank feed, simulated incoming pool
- `src/context/*` – Router, System (audit log/toasts/bell), Auth, Data (all actions)
- `src/components/*`, `src/pages/*` – UI

## Notes
- Baseline ledger = $69,700 gross / $11,200 deductions. Connecting the bank or syncing new transactions adds rows and moves the numbers on purpose; Reset restores the baseline.
- Escalation stages use absolute thresholds (overdue ≥ interval). With the default 3/7/14, INV-104 (18 days) is Stage 3; use e.g. 3/7/21 to see it in Stage 2.
- Amounts are not FX-converted between jurisdictions.

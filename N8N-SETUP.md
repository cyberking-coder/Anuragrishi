# n8n booking workflow — setup

`n8n-booking-workflow.json` handles bookings for the **Mussoorie** retreat (the only
event currently selling tickets — Goa is waitlist-only). It verifies the payment with
Razorpay server-side, sends the guest a WhatsApp message through **WATI**,
and appends every attempt to the Google Sheet.

This replaces the old Google Apps Script automation, which has been deleted from the
repo. Once n8n is live, also **delete the Apps Script deployment** at
<https://script.google.com> so the old `/exec` webhook stops accepting posts.

## 1. Import both workflows

n8n → **Workflows → Import from File**, once for each:

| File | What it does |
|---|---|
| `n8n-create-order-workflow.json` | called *before* checkout opens — creates a Razorpay order server-side and returns its `order_id` |
| `n8n-booking-workflow.json` | called *after* the payment — verifies it, sends WhatsApp, logs to Sheets |

Both use the same `Razorpay Live API Keys` credential. **Activate both.**

The create-order webhook must be reachable from the browser, so its Respond node
sends `Access-Control-Allow-Origin: *`. Its URL is
`https://n8n.srv965659.hstgr.cloud/webhook/create-order`, already set as `ORDER_URL`
in `event-mussoorie.html`. If your n8n assigns a different path on import, update
`ORDER_URL` to match — checkout won't open otherwise.

## 2. Create the two credentials

| Credential (n8n type) | Fields |
|---|---|
| **Basic Auth** — name it `Razorpay Live API Keys` | User = `rzp_live_TMQEp7ZTrkukW4`, Password = your **live Key Secret** |
| **Google Sheets OAuth2** — `Google Sheets — Know Thyself` | sheet `1JE_S0qRktHKFXzwrBwtD0Tzvz6BtfaasQxf1YLORE2I`, tab `Bookings` |

Then open each node showing a red credential warning and re-select the credential you
just made. The Razorpay secret lives **only** in the n8n credential — never in this
repo and never in the website HTML.

## 3. Paste the WATI token into both WATI nodes

The two WATI nodes use an inline `Authorization` header instead of a credential, so the
token has to be pasted into each one. Open **WATI — Booking Confirmed** and
**WATI — Payment Failed**, and in *Header Parameters* replace

```
Bearer PASTE_YOUR_WATI_TOKEN_HERE
```

with your real token from **WATI → Settings → API Docs → Access Token**. If WATI already
shows the value starting with `Bearer `, don't add a second one.

The endpoint is already set to your tenant:
`https://live-mt-server.wati.io/320595/api/v1/sendTemplateMessage`.

> **Note:** an inline token is saved inside the workflow and appears in any export, so
> **never commit a filled-in copy of this file back to the repo.** To avoid that risk
> entirely, switch both nodes to *Authentication → Generic → Header Auth* and store the
> token in a credential instead — same request, token kept out of the JSON.

Guest numbers are normalised automatically: a bare 10-digit Indian mobile gets `91`
prefixed, spaces/`+`/dashes are stripped. Guests outside India must enter their number
with the country code on the site.

## 4. Create two WATI templates

WhatsApp only allows business-initiated messages from **approved templates**, so create
these in **WATI → Broadcast → Templates** and wait for Meta approval before going live.
The names and variables must match exactly:

| Template name | Variables | Sent when |
|---|---|---|
| `booking_confirmed` | `name`, `event`, `dates`, `amount`, `payment_id` | Razorpay confirms the payment captured |
| `payment_failed` | `name`, `event`, `reason` | payment not captured, or amount mismatch |

Suggested body for `booking_confirmed`:

> Hi {{name}}, your seat at {{event}} ({{dates}}) is confirmed 🎉
> Amount paid: {{amount}}
> Payment ID: {{payment_id}}
> Our team will reach out shortly with travel and preparation details.

To change what's sent, edit the template in WATI — not the workflow. The workflow only
passes the variable values.

## 5. Activate

The site already posts to the production webhook:

```
https://n8n.srv965659.hstgr.cloud/webhook/d1cda85e-1973-4fba-8095-3e1712837cff
```

set as `WEBHOOK_URL` in `event-mussoorie.html`. The workflow's Booking Webhook node uses
that same path, so an import matches the URL as-is. **Activate the workflow** — the
`/webhook/` URL only responds when active (`/webhook-test/` is the manual-run URL and
works only while you're listening in the editor).

## 6. Where the price lives

The price is set **server-side**, in the **Look Up Price** node of the create-order
workflow — the browser never sends an amount:

```js
const EVENTS = {
  mussoorie: { name: 'Know Thyself · Mussoorie', dates: '14 – 19 Nov 2026', amount_paise: 100 }
};
```

The booking workflow keeps a matching guard in its **Parse Booking** node:

```js
const EXPECTED_AMOUNT_PAISE = { 'Know Thyself · Mussoorie': 100 };  // ₹1 — LIVE TEST
```

⚠️ **Currently in live test mode at ₹1.** Change **both** to `17582000` (₹1,75,820) to go
live for real. If they disagree, every payment lands on the failure branch.

Add an entry per event in both places. The key in `EVENTS` (`mussoorie`) is what the page
sends as `EVENT_KEY`; an unknown key is rejected with a 400 before any order is created.

## Flow

```
Webhook → Parse Booking → Razorpay Fetch Payment → Check Payment → Captured?
   ├─ yes → WATI "booking confirmed" → Sheets append (status: booked)  ┐
   └─ no  → WATI "payment failed"    → Sheets append (status: failed)  ┴→ Respond OK
```

Both WATI nodes and both Sheets nodes use `neverError` / continue-on-error, so a
WhatsApp or Sheets hiccup never aborts the run — open the execution and check that
node's output if a message or row doesn't appear.

Razorpay is the source of truth: the browser's claimed amount is ignored, and a
missing or unknown `payment_id` returns a 404 that routes straight to the failure
branch rather than stopping the workflow.

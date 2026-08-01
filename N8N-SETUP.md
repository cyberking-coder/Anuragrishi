# n8n booking workflow — setup

`n8n-booking-workflow.json` handles bookings for the **Mussoorie** retreat (the only
event currently selling tickets — Goa is waitlist-only). It verifies the payment with
Razorpay server-side, emails guest + admin, and logs to the Google Sheet.

This replaces the old Google Apps Script automation, which has been deleted from the
repo. Once n8n is live, also **delete the Apps Script deployment** at
<https://script.google.com> so the old `/exec` webhook stops accepting posts.

## 1. Import
n8n → **Workflows → Import from File** → pick `n8n-booking-workflow.json`.

## 2. Create the three credentials

| Credential (n8n type) | Fields |
|---|---|
| **Basic Auth** — name it `Razorpay Live API Keys` | User = `rzp_live_GtCPbMMCPYFygU`, Password = your **live Key Secret** |
| **Gmail OAuth2** — `Gmail — Know Thyself` | sign in as `ar.happinessmovement@gmail.com` |
| **Google Sheets OAuth2** — `Google Sheets — Know Thyself` | same Google account (sheet `1JE_S0qRktHKFXzwrBwtD0Tzvz6BtfaasQxf1YLORE2I`, tab `Bookings`) |

Then open each node that shows a red credential warning and re-select the credential
you just made. The key secret lives **only** in n8n credentials — never in this repo
and never in the website HTML.

If your n8n has no Gmail/Sheets OAuth set up, swap the Gmail nodes for **Send Email (SMTP)**
and delete the Sheets node — the rest of the flow is unchanged.

## 3. Activate + point the site at it
The site already posts to the production webhook:

```
https://n8n.srv965659.hstgr.cloud/webhook/d1cda85e-1973-4fba-8095-3e1712837cff
```

set as `WEBHOOK_URL` in `event-mussoorie.html`. The workflow's Booking Webhook node
uses that same path, so an import matches the URL as-is. **Activate the workflow** —
the `/webhook/` URL only responds when the workflow is active (`/webhook-test/` is the
manual-run URL and works only while you're listening in the editor).

## 4. Amount tampering guard
Expected totals live in the **Parse Booking** node:

```js
const EXPECTED_AMOUNT_PAISE = { 'Know Thyself · Mussoorie': 17582000 };
```

Add a line per event. If the amount Razorpay actually captured doesn't match, the
booking is marked `unverified`, the guest gets **no** confirmation, and you get an alert.

## Flow

```
Webhook → Parse Booking → Paid?
   ├─ yes → Razorpay Fetch Payment → Verify → Verified?
   │            ├─ yes → guest confirmation + admin alert
   │            └─ no  → admin "unverified" alert
   └─ no  → Failed? → guest "payment failed" email
                          ↓
                 Log to Google Sheet → Respond OK
```

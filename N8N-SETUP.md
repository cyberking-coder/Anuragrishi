# n8n booking workflow — setup

`n8n-booking-workflow.json` replaces `apps-script-email.gs` (same behaviour: verify the
payment with Razorpay server-side, email guest + admin, log to the Google Sheet).

## 1. Import
n8n → **Workflows → Import from File** → pick `n8n-booking-workflow.json`.

## 2. Create the three credentials

| Credential (n8n type) | Fields |
|---|---|
| **Basic Auth** — name it `Razorpay Live API Keys` | User = your **live Key ID** (`rzp_live_…`), Password = your **live Key Secret** |
| **Gmail OAuth2** — `Gmail — Know Thyself` | sign in as `ar.happinessmovement@gmail.com` |
| **Google Sheets OAuth2** — `Google Sheets — Know Thyself` | same Google account (sheet `1JE_S0qRktHKFXzwrBwtD0Tzvz6BtfaasQxf1YLORE2I`, tab `Bookings`) |

Then open each node that shows a red credential warning and re-select the credential
you just made. The key secret lives **only** in n8n credentials — never in this repo
and never in the website HTML.

If your n8n has no Gmail/Sheets OAuth set up, swap the Gmail nodes for **Send Email (SMTP)**
and delete the Sheets node — the rest of the flow is unchanged.

## 3. Activate + point the site at it
Activate the workflow, copy the **Production** webhook URL
(`https://<your-n8n>/webhook/knowthyself-booking`), and set it as `WEBHOOK_URL`
in `event-goa.html` (line 206) in place of the Apps Script `/exec` URL.

## 4. Amount tampering guard
Expected totals live in the **Parse Booking** node:

```js
const EXPECTED_AMOUNT_PAISE = { 'Know Thyself · Goa': 17582000 };
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

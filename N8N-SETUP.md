# n8n booking workflow — setup

`n8n-booking-workflow.json` handles bookings for the **Mussoorie** retreat (the only
event currently selling tickets — Goa is waitlist-only). It verifies the payment with
Razorpay server-side, sends WhatsApp messages through **WATI** to the guest and to you,
and logs every attempt to the Google Sheet.

This replaces the old Google Apps Script automation, which has been deleted from the
repo. Once n8n is live, also **delete the Apps Script deployment** at
<https://script.google.com> so the old `/exec` webhook stops accepting posts.

## 1. Import
n8n → **Workflows → Import from File** → pick `n8n-booking-workflow.json`.

## 2. Create the three credentials

| Credential (n8n type) | Fields |
|---|---|
| **Basic Auth** — name it `Razorpay Live API Keys` | User = `rzp_live_GtCPbMMCPYFygU`, Password = your **live Key Secret** |
| **Header Auth** — `WATI API Token` | Name = `Authorization`, Value = `Bearer <your WATI access token>` |
| **Google Sheets OAuth2** — `Google Sheets — Know Thyself` | sheet `1JE_S0qRktHKFXzwrBwtD0Tzvz6BtfaasQxf1YLORE2I`, tab `Bookings` |

Then open each node showing a red credential warning and re-select the credential you
just made. The Razorpay secret and the WATI token live **only** in n8n credentials —
never in this repo and never in the website HTML.

Get the WATI token from **WATI → Settings → API Docs → Access Token**. Copy the whole
value; if WATI shows it already starting with `Bearer `, don't add a second `Bearer`.

## 3. Set your WATI endpoint

Open the **Parse Booking** node and edit the config block at the top:

```js
const WATI_BASE     = 'https://live-mt-server.wati.io/YOUR_TENANT_ID';
const ADMIN_WHATSAPP = '917373738338';
```

`WATI_BASE` is on the same **Settings → API Docs** page (your tenant ID is the number
after the host). No trailing slash. `ADMIN_WHATSAPP` is where booking alerts go —
country code first, digits only.

Guest numbers are normalised automatically: a bare 10-digit Indian mobile gets `91`
prefixed, spaces/`+`/dashes are stripped. Guests outside India must enter their number
with the country code on the site.

## 4. Create four WATI templates

WhatsApp only allows business-initiated messages from **approved templates**, so create
these in **WATI → Broadcast → Templates** and wait for Meta approval before going live.
The names and variables must match exactly:

| Template name | Variables | Goes to |
|---|---|---|
| `booking_confirmed` | `name`, `event`, `dates`, `amount`, `payment_id` | guest |
| `payment_failed` | `name`, `event`, `reason` | guest |
| `admin_new_booking` | `name`, `phone`, `event`, `amount`, `payment_id` | you |
| `admin_unverified_payment` | `name`, `phone`, `event`, `payment_id`, `reason` | you |

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

## 6. Amount tampering guard

Expected totals live in the same **Parse Booking** config block:

```js
const EXPECTED_AMOUNT_PAISE = { 'Know Thyself · Mussoorie': 17582000 };
```

Add a line per event. If the amount Razorpay actually captured doesn't match, the
booking is marked `unverified`, the guest gets **no** confirmation, and you get the
`admin_unverified_payment` alert instead.

## Flow

```
Webhook → Parse Booking → Paid?
   ├─ yes → Razorpay Fetch Payment → Verify → Verified?
   │            ├─ yes → WATI guest confirmation + WATI admin alert
   │            └─ no  → WATI admin "unverified payment" alert
   └─ no  → Failed? → WATI guest "payment failed"
                          ↓
                 Log to Google Sheet → Respond OK
```

The WATI nodes use `neverError`, so a WhatsApp delivery problem never blocks the sheet
log — check the node output in the execution if a message doesn't arrive.

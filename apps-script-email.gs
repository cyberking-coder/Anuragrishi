// KOSH — Know Thyself retreat booking emails
// Google Apps Script Web App. Receives booking data from the website and
// emails the guest (and you) on payment success / failure — free, via Gmail.
//
// SETUP
// 1. Go to https://script.google.com  ->  New project.
// 2. Delete the sample code, paste this whole file.
// 3. (Optional) change ADMIN_EMAIL below.
// 4. Deploy -> New deployment -> type "Web app".
//      - Execute as:      Me
//      - Who has access:  Anyone
//    Click Deploy, authorize access (allow Gmail send) when prompted.
// 5. Copy the Web app URL ending in /exec and send it to be pasted into the site.
//
// To change the emails later: edit here, then Deploy -> Manage deployments ->
// edit the existing deployment -> Version: New version -> Deploy (URL stays the same).

var ADMIN_EMAIL = 'ar.happinessmovement@gmail.com'; // you get a copy of every booking
var FROM_NAME   = 'KOSH · Know Thyself Retreat';

// Google Sheet logging:
// Create a Google Sheet, copy the long ID from its URL
//   https://docs.google.com/spreadsheets/d/THIS_LONG_ID/edit
// and paste it below. Leave '' to skip logging.
var SHEET_ID   = '';
var SHEET_NAME = 'Bookings'; // tab name; created automatically if missing

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);

    logToSheet(d); // record every attempt (booked + failed) with a timestamp

    if (d.status === 'booked') {
      // ---- Guest: seat confirmed ----
      MailApp.sendEmail({
        to: d.email,
        name: FROM_NAME,
        subject: 'Your Seat Is Confirmed — ' + d.event_name,
        htmlBody:
          '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#23301f">' +
            '<h2 style="color:#3a7a2c">Your seat is booked 🎉</h2>' +
            '<p>Dear ' + esc(d.name) + ',</p>' +
            '<p>Thank you for reserving your place at <b>' + esc(d.event_name) + '</b>. ' +
            'We can\'t wait to welcome you.</p>' +
            '<table style="border-collapse:collapse;margin:16px 0">' +
              row('Retreat', d.event_name) +
              row('Dates', d.event_dates) +
              row('Amount Paid', d.amount_display) +
              row('Payment ID', d.payment_id) +
            '</table>' +
            '<p>A team member will reach out shortly with travel and preparation details.</p>' +
            '<p style="color:#718169;font-size:13px">With warmth,<br>' + FROM_NAME + '</p>' +
          '</div>'
      });
      // ---- You: new booking alert ----
      MailApp.sendEmail({
        to: ADMIN_EMAIL,
        name: FROM_NAME,
        subject: 'New booking — ' + d.event_name + ' — ' + d.name,
        htmlBody: 'New confirmed booking:<br><br>' +
          'Name: ' + esc(d.name) + '<br>Email: ' + esc(d.email) + '<br>Phone: ' + esc(d.phone) +
          '<br>Event: ' + esc(d.event_name) + ' (' + esc(d.event_dates) + ')' +
          '<br>Amount: ' + esc(d.amount_display) + '<br>Payment ID: ' + esc(d.payment_id)
      });

    } else if (d.status === 'failed') {
      // ---- Guest: payment failed ----
      MailApp.sendEmail({
        to: d.email,
        name: FROM_NAME,
        subject: 'Payment Could Not Be Completed — ' + d.event_name,
        htmlBody:
          '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#23301f">' +
            '<h2 style="color:#a4614e">Your payment didn\'t go through</h2>' +
            '<p>Dear ' + esc(d.name) + ',</p>' +
            '<p>We couldn\'t complete your payment for <b>' + esc(d.event_name) + '</b>' +
            (d.reason ? ' (' + esc(d.reason) + ')' : '') + '. No amount has been charged.</p>' +
            '<p>Your seat is not yet reserved. Please try again, or reply to this email and we\'ll help you complete your booking.</p>' +
            '<p style="color:#718169;font-size:13px">Warm regards,<br>' + FROM_NAME + '</p>' +
          '</div>'
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function logToSheet(d) {
  if (!SHEET_ID) return;
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp', 'Status', 'Name', 'Email', 'Phone',
        'Event', 'Dates', 'Amount', 'Payment ID', 'Reason']);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    }
    sheet.appendRow([
      new Date(), d.status || '', d.name || '', d.email || '', d.phone || '',
      d.event_name || '', d.event_dates || '', d.amount_display || '',
      d.payment_id || '', d.reason || ''
    ]);
  } catch (err) {
    // logging failure must never block the email flow
  }
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function row(label, value) {
  return '<tr>' +
    '<td style="padding:6px 14px 6px 0;color:#718169">' + esc(label) + '</td>' +
    '<td style="padding:6px 0;font-weight:bold">' + esc(value) + '</td></tr>';
}

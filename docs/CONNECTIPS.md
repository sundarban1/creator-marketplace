# connectIPS payments

Businesses fund a creator's escrow through the connectIPS Gateway (NCHL) as one of
the admin-enabled payment methods (`PaymentMethod.key = "connectips"`). Source of
truth for the protocol: https://doc.connectips.com/docs/category/3-connectips-gateway
(Merchant Interface §3, Payment Validation §4, Response List §6, Exceptions §7).

## Flow

```
Business clicks Pay (web / mobile)
  → POST /api/campaigns/applications/:appId/pay/connectips/initiate      (auth: BUSINESS)
      1. re-checks this application's open attempts with NCHL — if one was
         actually paid, funds the escrow and returns { paymentUrl: null, alreadyPaid: true }
      2. otherwise creates a ConnectIpsPayment (TXNID, amount frozen in paisa)
         and returns { paymentUrl: <api>/api/payments/connectips/checkout/:txnId }
  → GET  /api/payments/connectips/checkout/:txnId                        (public)
      auto-submits the signed form to CONNECTIPS_GATEWAY_URL
  → user logs in to their bank on connectIPS, enters OTP
  → NCHL redirects to the URL registered for the merchant, appending ?TXNID=
      success: /api/payments/connectips/success   (GET or POST)
      failure: /api/payments/connectips/failure   (GET or POST — "Return" buttons)
  → both call settleConnectIpsPayment(txnId): validatetxn decides, never the redirect
  → browser lands on web /business/events/:id?payment=success|failed|pending
    or mobile kolab://connectips-callback?success=…&pending=…
```

The first character of the TXNID records who started the payment (`W` web, `M`
mobile), because NCHL's redirect URL is fixed per merchant and can't carry it.

## Correctness rules

- **Paid only after server-side verification.** `validatetxn` must return `SUCCESS`
  for this TXNID at the amount stored on the attempt. The redirect itself is unsigned.
- **Every attempt is a row** (`connectips_payments`): INITIATED → SUCCESS / FAILED /
  EXPIRED. Callbacks look attempts up by TXNID, so a payment finished in an older
  tab still lands.
- **Exactly-once funding.** The INITIATED → SUCCESS move is an atomic conditional
  update; only the winner funds the escrow. The escrow ledger row is also unique
  per application (`escrow:{appId}`).
- **Pending is not failure.** If NCHL can't be reached, the attempt stays INITIATED,
  the user is told "still confirming", and reconciliation finishes it.
- **Reconciliation** (`jobs/reconcileConnectIps.ts`, every 5 min): re-validates
  attempts open longer than 3 min; expires unpaid ones after 24 h.
- **Paid twice** (two tabs both completed) → second attempt is kept as SUCCESS and a
  `payment.connectips.duplicate_payment` error is reported for a manual refund.
- Generic `PUT /applications/:appId/pay` refuses `esewa`, `khalti`, `connectips`.

NCHL `validatetxn` outcomes (§6): `SUCCESS` → paid; `FAILED` → final failure;
`ERROR / TRANSACTION NOT FOUND` and `ERROR / TRANSACTION INCOMPLETE` → not paid yet
(attempt stays open until it expires, the user may still be finishing).

## Configuration (backend only — nothing in web/mobile)

| Variable | Notes |
|---|---|
| `CONNECTIPS_MERCHANT_ID` | from NCHL |
| `CONNECTIPS_APP_ID` | from NCHL, e.g. `MER-XXXX-APP-1` |
| `CONNECTIPS_APP_NAME` | must match NCHL's registered app name |
| `CONNECTIPS_APP_PASSWORD` | secret — Basic-auth password for validatetxn |
| `CONNECTIPS_PRIVATE_KEY` | secret — PEM from `CREDITOR.pfx`, base64-encoded on one line |
| `CONNECTIPS_GATEWAY_URL` | UAT default `https://uat.connectips.com/connectipswebgw/loginpage` |
| `CONNECTIPS_VALIDATE_URL` | UAT default `https://uat.connectips.com/connectipswebws/api/creditor/validatetxn` |
| `CONNECTIPS_RETURN_BASE_URL` | public origin of this API (local `http://localhost:3000`, Render `https://kolab-api.onrender.com`) |

Convert the certificate (password is supplied by NCHL):

```bash
openssl pkcs12 -in CREDITOR.pfx -nocerts -nodes -legacy -out key.pem
base64 < key.pem | tr -d '\n'     # → CONNECTIPS_PRIVATE_KEY
rm key.pem
```

Never commit `.env`, `.pfx`, `.pem` (git-ignored). Logs record TXNID, amount,
status and statusDesc only — never the token, password or key.

Ask NCHL to register, per app, the success/failure URLs
`<CONNECTIPS_RETURN_BASE_URL>/api/payments/connectips/success` and `/failure`
(one pair per app ID — use a separate app ID for local development).

## Testing

- Unit: `cd backend && npx vitest run src/utils/connectips.test.ts` (signing,
  validatetxn request shape, paisa conversion, status messages).
- UAT: enable connectIPS in admin → Payment Methods, then Pay → connectIPS on a
  business event page with an accepted, unpaid creator.
- Offline: a local NCHL stand-in (form + validatetxn per the spec) can be pointed
  at via `CONNECTIPS_GATEWAY_URL` / `CONNECTIPS_VALIDATE_URL` with a throwaway key.

## Going live

Switch both URLs to NCHL's production hosts and replace merchant ID, app ID, app
name, password and private key with the production values; register the
production success/failure URLs with NCHL. Never mix UAT credentials with
production URLs.

## Open items needing NCHL

- UAT login page returns "403 Not Authorized" for MER-5265-APP-1 — awaiting
  confirmation that the app is active and its success/failure URLs registered.
- UAT test-user login for the payment page.
- Production hosts for the gateway and validatetxn.

-- Competitions that existed before prize payments: the business pays winners
-- itself (never through Kolab). Record that explicitly, with the declared cash
-- pool = what the prizes already allocate. Funding stays NOT_REQUIRED, no
-- payment terms are back-dated, and no payouts are created for results that
-- were already published.
UPDATE "competitions" c
SET "prizePaymentMethod" = 'DIRECT',
    "cashPrizePoolPaisa" = NULLIF((
      SELECT COALESCE(SUM(ROUND(p."amount" * 100)::int * p."recipientCount"), 0)
      FROM "competition_prizes" p
      WHERE p."competitionId" = c."id" AND p."amount" > 0
    ), 0)
WHERE c."prizePaymentMethod" IS NULL;

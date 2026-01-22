import { supabase } from "../../lib/supabaseClient";

export async function createTransactionWithEntries(input: {
  date: string; // YYYY-MM-DD
  description: string;
  debitAccountId: string;
  creditAccountId: string;
  amountCents: number;
}) {
  // 1) criar transaction
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .insert([
      {
        txn_date: input.date,
        description: input.description,
        source: "manual",
      },
    ])
    .select("id")
    .single();

  if (txErr) throw txErr;

  // 2) criar entries (débitos/créditos)
  const { error: enErr } = await supabase.from("entries").insert([
    {
      transaction_id: tx.id,
      account_id: input.debitAccountId,
      side: "DEBIT",
      amount_cents: input.amountCents,
    },
    {
      transaction_id: tx.id,
      account_id: input.creditAccountId,
      side: "CREDIT",
      amount_cents: input.amountCents,
    },
  ]);

  if (enErr) throw enErr;

  return tx.id;
}

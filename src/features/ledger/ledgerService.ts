import { supabase } from "../../lib/supabaseClient";

export async function createTransactionWithEntries(input: {
  date: string; // YYYY-MM-DD
  description: string;
  debitAccountId: string;
  creditAccountId: string;
  amountCents: number;
}) {
  const { data, error } = await supabase.rpc("create_manual_transaction", {
    p_date: input.date,
    p_description: input.description,
    p_debit_account: input.debitAccountId,
    p_credit_account: input.creditAccountId,
    p_amount_cents: input.amountCents,
  });

  if (error) throw error;
  return data as string; // tx id
}

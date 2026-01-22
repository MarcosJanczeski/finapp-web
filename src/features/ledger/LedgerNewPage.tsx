import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

type AccountRow = {
  id: string;
  code: string | null;
  name: string;
  category: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  is_active: boolean;
};

async function listActiveAccounts(): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id,code,name,category,is_active")
    .eq("is_active", true)
    .order("code", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

export function LedgerNewPage() {
  const nav = useNavigate();

  const accountsQ = useQuery({
    queryKey: ["accounts", "active"],
    queryFn: listActiveAccounts,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f6f6f7" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Ledger</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Novo lançamento</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Partidas dobradas (débito = crédito)</div>
          </div>

          <button
            onClick={() => nav("/")}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff" }}
          >
            Voltar
          </button>
        </div>

        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 18, padding: 14 }}>
          <form style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{ fontSize: 13, opacity: 0.8 }}>Data</label>
            <input type="date" style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }} />

            <label style={{ fontSize: 13, opacity: 0.8 }}>Descrição</label>
            <input placeholder="Ex: Aluguel janeiro" style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }} />

            <label style={{ fontSize: 13, opacity: 0.8 }}>Conta Débito</label>
            <select style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}>
              <option value="">Selecione...</option>
              {accountsQ.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.code ? `${a.code} · ` : "") + a.name}
                </option>
              ))}
            </select>

            <label style={{ fontSize: 13, opacity: 0.8 }}>Conta Crédito</label>
            <select style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}>
              <option value="">Selecione...</option>
              {accountsQ.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {(a.code ? `${a.code} · ` : "") + a.name}
                </option>
              ))}
            </select>

            <label style={{ fontSize: 13, opacity: 0.8 }}>Valor (R$)</label>
            <input inputMode="decimal" placeholder="Ex: 1250,00" style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }} />

            <button
              type="button"
              disabled
              style={{
                padding: 12,
                borderRadius: 14,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 900,
                opacity: 0.7,
              }}
              title="No próximo passo vamos habilitar o salvamento"
            >
              Salvar lançamento (em breve)
            </button>

            {accountsQ.isLoading && <div style={{ fontSize: 13, opacity: 0.7 }}>Carregando contas…</div>}
            {accountsQ.isError && (
              <div style={{ fontSize: 13, color: "#b00020" }}>{(accountsQ.error as any)?.message ?? "Erro ao carregar contas"}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

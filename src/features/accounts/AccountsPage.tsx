import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

type AccountRow = {
  id: string;
  parent_id: string | null;
  code: string | null;
  name: string;
  category: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  account_type: string;
  is_active: boolean;
};

async function seedDefaultChart() {
  // chama seu RPC do Supabase
  const { error } = await supabase.rpc("seed_default_chart");
  if (error) throw error;
}

async function listAccounts(): Promise<AccountRow[]> {
  // precisa ter um workspace_id já assegurado por ensure_workspace/seed; aqui só buscamos o que existe
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("code", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

export function AccountsPage() {
  const nav = useNavigate();

  const q = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      await seedDefaultChart();
      return await listAccounts();
    },
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f6f6f7" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Configuração</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Plano de Contas</div>
          </div>
          <button onClick={() => nav("/")} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff" }}>
            Voltar
          </button>
        </div>

        {q.isLoading && <div style={{ padding: 14 }}>Carregando…</div>}
        {q.isError && <div style={{ padding: 14, color: "#b00020" }}>{(q.error as any)?.message ?? "Erro"}</div>}

        {q.data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.data.map((a) => (
              <div key={a.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 18, padding: 14 }}>
                <div style={{ fontWeight: 900 }}>
                  {(a.code ? `${a.code} · ` : "")}
                  {a.name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                  {a.category} · {a.account_type} · {a.is_active ? "Ativa" : "Inativa"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

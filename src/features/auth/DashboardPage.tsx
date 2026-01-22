import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export function DashboardPage() {
  const nav = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    nav("/login", { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f6f7" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>MVP v2 (Ledger-first)</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Dashboard</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => nav("/ledger/new")}
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff" }}
            >
              Novo lançamento
            </button>
            <button onClick={() => nav("/accounts")} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff" }}>
              Plano de contas
            </button>
            <button onClick={signOut} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff" }}>
              Sair
            </button>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 18, padding: 14 }}>
          Próximo passo: seed do plano de contas + listar contas aqui.
        </div>
      </div>
    </div>
  );
}

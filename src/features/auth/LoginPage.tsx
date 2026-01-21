import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setMsg(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      nav("/", { replace: true });
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f6f7" }}>
      <div style={{ width: "min(420px, 92vw)", background: "#fff", border: "1px solid #eee", borderRadius: 18, padding: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>FINAPP</div>
        <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>Entrar</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            type="password"
            style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
          />

          <button
            onClick={signIn}
            disabled={busy}
            style={{ padding: 12, borderRadius: 14, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 900 }}
          >
            {busy ? "Entrando..." : "Entrar"}
          </button>

          {msg && <div style={{ color: "#b00020", fontSize: 13 }}>{msg}</div>}
        </div>
      </div>
    </div>
  );
}

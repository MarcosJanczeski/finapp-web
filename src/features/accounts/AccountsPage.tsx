import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { useEffect } from "react"; // no topo, junto com useMemo/useState

type AccountRow = {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  code: string | null;
  name: string;
  category: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  account_type:
  | "GENERAL"
  | "CASH"
  | "BANK"
  | "CREDIT_CARD"
  | "SAVINGS"
  | "INVESTMENT"
  | "PAYABLE"
  | "RECEIVABLE";
  is_active: boolean;
};

async function seedDefaultChart() {
  const { error } = await supabase.rpc("seed_default_chart");
  if (error) throw error;
}

async function listAccounts(): Promise<AccountRow[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id,workspace_id,parent_id,code,name,category,account_type,is_active")
    .order("code", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AccountRow[];
}

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Usuário não autenticado.");
  return data.user.id;
}

async function createAccount(input: {
  workspaceId: string;
  createdBy: string;
  parentId: string | null;
  code: string | null;
  name: string;
  category: AccountRow["category"];
  accountType: AccountRow["account_type"];
}) {
  const { error } = await supabase.from("accounts").insert([
    {
      workspace_id: input.workspaceId,
      created_by: input.createdBy,
      parent_id: input.parentId,
      code: input.code,
      name: input.name,
      category: input.category,
      account_type: input.accountType,
      is_active: true,
    },
  ]);
  if (error) throw error;
}

async function updateAccount(input: { id: string; name: string; code: string | null }) {
  const { error } = await supabase
    .from("accounts")
    .update({
      name: input.name,
      code: input.code,
    })
    .eq("id", input.id);

  if (error) throw error;
}

async function deleteAccount(id: string) {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}

async function toggleAccountActive(id: string, isActive: boolean) {
  const { error } = await supabase.from("accounts").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

type AddMode = "child" | "sibling";

export function AccountsPage() {
  const nav = useNavigate();

  const q = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      await seedDefaultChart();
      return await listAccounts();
    },
  });

  const workspaceId = useMemo(() => q.data?.[0]?.workspace_id ?? null, [q.data]);

  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // mini form state (inline)
  const [addingForId, setAddingForId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<AddMode>("child");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<AccountRow["category"]>("EXPENSE");
  const [accountType, setAccountType] = useState<AccountRow["account_type"]>("GENERAL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const rows = q.data ?? [];

  useEffect(() => {
    function onDocClick() {
      setOpenMenuId(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }

    if (openMenuId) {
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onKeyDown);
    }

    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenuId]);

  function openAdd(targetId: string, mode: AddMode) {
    setMsg(null);
    setAddingForId(targetId);
    setAddMode(mode);
    setName("");
    setCode("");
    setCategory("EXPENSE");
    setAccountType("GENERAL");
  }

  async function onCreate() {
    setMsg(null);
    if (!workspaceId) return setMsg("Workspace não encontrado (tente recarregar).");
    if (!addingForId) return;

    const target = rows.find((r) => r.id === addingForId);
    if (!target) return setMsg("Conta alvo não encontrada.");

    const n = name.trim();
    if (!n) return setMsg("Informe o nome da conta.");

    const parentId =
      addMode === "child"
        ? target.id
        : target.parent_id; // sibling: mesmo pai

    setBusyId(addingForId);
    try {
      const userId = await getUserId();
      await createAccount({
        workspaceId,
        createdBy: userId,
        parentId,
        code: code.trim() || null,
        name: n,
        category,
        accountType,
      });

      setAddingForId(null);
      await q.refetch();
      setMsg("✅ Conta criada.");
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao criar conta.");
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(a: AccountRow) {
    setMsg(null);
    setEditingId(a.id);
    setEditName(a.name);
    setEditCode(a.code ?? "");
    setAddingForId(null); // fecha add se estiver aberto
  }


  async function onDelete(id: string) {
    setMsg(null);
    setBusyId(id);
    try {
      await deleteAccount(id);
      await q.refetch();
      setMsg("✅ Conta excluída.");
    } catch (e: any) {
      // FK RESTRICT / RLS / etc.
      const m = e?.message ?? "Erro ao excluir.";
      if (String(m).toLowerCase().includes("violates foreign key constraint")) {
        setMsg("Esta conta já foi usada em lançamentos. Não pode excluir — desative a conta.");
      } else {
        setMsg(m);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function onToggle(id: string, nextActive: boolean) {
    setMsg(null);
    setBusyId(id);
    try {
      await toggleAccountActive(id, nextActive);
      await q.refetch();
      setMsg("✅ Atualizado.");
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao atualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function onSaveEdit(id: string) {
    setMsg(null);

    const n = editName.trim();
    if (!n) {
      setMsg("Nome não pode ficar vazio.");
      return;
    }

    setBusyId(id);
    try {
      await updateAccount({
        id,
        name: n,
        code: editCode.trim() || null,
      });

      setEditingId(null);
      await q.refetch();
      setMsg("✅ Conta atualizada.");
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao atualizar conta.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f6f7" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Configuração</div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Plano de Contas</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Crie níveis, filhos e irmãs direto nos cards</div>
          </div>
          <button onClick={() => nav("/")} style={btnLight}>
            Voltar
          </button>
        </div>

        {q.isLoading && <div style={{ padding: 14 }}>Carregando…</div>}
        {q.isError && <div style={{ padding: 14, color: "#b00020" }}>{(q.error as any)?.message ?? "Erro"}</div>}

        {rows.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((a) => (
              <div key={a.id} style={card}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {(a.code ? `${a.code} · ` : "") + a.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                      {a.category} · {a.account_type} · {a.is_active ? "Ativa" : "Inativa"}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ position: "relative" }}>
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={(e) => {
                          e.stopPropagation(); // evita fechar na hora (doc click)
                          setOpenMenuId((cur) => (cur === a.id ? null : a.id));
                        }}
                        style={btnLight}
                        aria-label="Menu de ações"
                        title="Ações"
                      >
                        ⋯
                      </button>

                      {openMenuId === a.id && (
                        <div
                          onClick={(e) => e.stopPropagation()} // clique dentro não fecha pelo document
                          style={menu}
                        >
                          <button type="button" style={menuItem} onClick={() => { setOpenMenuId(null); openAdd(a.id, "child"); }}>
                            + Subconta
                          </button>

                          <button type="button" style={menuItem} onClick={() => { setOpenMenuId(null); openAdd(a.id, "sibling"); }}>
                            + Mesmo nível
                          </button>

                          <button type="button" style={menuItem} onClick={() => { setOpenMenuId(null); openEdit(a); }}>
                            Editar
                          </button>

                          <button type="button" style={menuItem} onClick={() => { setOpenMenuId(null); onToggle(a.id, !a.is_active); }}>
                            {a.is_active ? "Desativar" : "Ativar"}
                          </button>

                          <div style={{ height: 1, background: "#eee", margin: "6px 0" }} />

                          <button
                            type="button"
                            style={{ ...menuItem, color: "#b00020" }}
                            onClick={() => { setOpenMenuId(null); onDelete(a.id); }}
                            title="Só exclui se não tiver vínculos"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {addingForId === a.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 800 }}>
                      {addMode === "child" ? "Adicionar subconta" : "Adicionar conta no mesmo nível"}
                    </div>

                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" style={input} />
                    <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código (opcional)" style={input} />

                    <select value={category} onChange={(e) => setCategory(e.target.value as any)} style={input}>
                      <option value="EXPENSE">Despesa</option>
                      <option value="INCOME">Receita</option>
                      <option value="ASSET">Ativo</option>
                      <option value="LIABILITY">Passivo</option>
                      <option value="EQUITY">PL</option>
                    </select>

                    <select value={accountType} onChange={(e) => setAccountType(e.target.value as any)} style={input}>
                      <option value="GENERAL">Geral</option>
                      <option value="CASH">Caixa</option>
                      <option value="BANK">Banco</option>
                      <option value="CREDIT_CARD">Cartão</option>
                      <option value="SAVINGS">Poupança</option>
                      <option value="INVESTMENT">Investimento</option>
                      <option value="PAYABLE">A Pagar</option>
                      <option value="RECEIVABLE">A Receber</option>
                    </select>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button disabled={busyId === a.id} onClick={onCreate} style={btnPrimary}>
                        {busyId === a.id ? "Criando..." : "Criar"}
                      </button>
                      <button onClick={() => setAddingForId(null)} style={btnLight}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                {editingId === a.id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 800 }}>Editar conta</div>

                    <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome" style={input} />
                    <input value={editCode} onChange={(e) => setEditCode(e.target.value)} placeholder="Código (opcional)" style={input} />

                    <div style={{ display: "flex", gap: 8 }}>
                      <button disabled={busyId === a.id} onClick={() => onSaveEdit(a.id)} style={btnPrimary}>
                        {busyId === a.id ? "Salvando..." : "Salvar"}
                      </button>
                      <button onClick={() => setEditingId(null)} style={btnLight}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {msg && (
          <div style={{ padding: 12, borderRadius: 14, background: "#fff", border: "1px solid #eee", color: msg.startsWith("✅") ? "#0a7a2f" : "#b00020" }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #eee", borderRadius: 18, padding: 14 };
const btnLight: React.CSSProperties = { padding: "8px 10px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", fontWeight: 800 };
const btnPrimary: React.CSSProperties = { padding: "10px 12px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 900 };
const input: React.CSSProperties = { padding: 12, borderRadius: 14, border: "1px solid #ddd" };
const menu: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: "calc(100% + 8px)",
  width: 220,
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  padding: 6,
  zIndex: 20,
};

const menuItem: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "10px 10px",
  borderRadius: 12,
  border: "1px solid transparent",
  background: "transparent",
  fontWeight: 800,
  cursor: "pointer",
};

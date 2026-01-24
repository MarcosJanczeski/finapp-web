import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { useState } from "react";
import { createTransactionWithEntries } from "./ledgerService";

type AccountRow = {
    id: string;
    code: string | null;
    name: string;
    category: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
    is_active: boolean;
    is_postable: boolean;
};

async function listActiveAccounts(): Promise<AccountRow[]> {
    const { data, error } = await supabase
        .from("accounts")
        .select("id,code,name,category,is_active,is_postable")
        .eq("is_active", true)
        .eq("is_postable", true)
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
    const postableAccounts = (accountsQ.data ?? []).filter((a) => a.is_active && a.is_postable);

    const today = new Date().toISOString().slice(0, 10);

    const [date, setDate] = useState(today);
    const [description, setDescription] = useState("");
    const [debitAccountId, setDebitAccountId] = useState("");
    const [creditAccountId, setCreditAccountId] = useState("");
    const [amountText, setAmountText] = useState("");

    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    function parseBRLToCents(text: string): number | null {
        const raw = text.trim();
        if (!raw) return null;

        // remove espaços e "R$"
        const cleaned = raw.replace(/\s/g, "").replace(/^R\$/i, "");

        // Se vier "1.234,56" -> "1234.56"
        const normalized = cleaned.replace(/\./g, "").replace(",", ".");
        const value = Number(normalized);

        if (!Number.isFinite(value) || value <= 0) return null;
        return Math.round(value * 100);
    }

    async function onSave() {
        setMsg(null);

        const cents = parseBRLToCents(amountText);
        if (!date) return setMsg("Informe a data.");
        if (!debitAccountId) return setMsg("Selecione a conta de débito.");
        if (!creditAccountId) return setMsg("Selecione a conta de crédito.");
        if (debitAccountId === creditAccountId) return setMsg("Débito e crédito não podem ser a mesma conta.");
        if (!cents) return setMsg("Informe um valor válido (ex: 1250,00).");

        setBusy(true);
        try {
            const txId = await createTransactionWithEntries({
                date,
                description: description.trim() || "(sem descrição)",
                debitAccountId,
                creditAccountId,
                amountCents: cents,
            });

            setMsg(`✅ Lançamento salvo (${txId.slice(0, 8)}...)`);
            setDescription("");
            setAmountText("");
            setDebitAccountId("");
            setCreditAccountId("");
        } catch (e: any) {
            setMsg(e?.message ?? "Erro ao salvar lançamento.");
        } finally {
            setBusy(false);
        }
    }

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
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            onSave();
                        }}
                        style={{ display: "flex", flexDirection: "column", gap: 10 }}
                    >

                        <label style={{ fontSize: 13, opacity: 0.8 }}>Data</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
                        />

                        <label style={{ fontSize: 13, opacity: 0.8 }}>Descrição</label>
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Aluguel janeiro"
                            style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
                        />

                        <label style={{ fontSize: 13, opacity: 0.8 }}>Conta Débito</label>
                        <select
                            value={debitAccountId}
                            onChange={(e) => setDebitAccountId(e.target.value)}
                            style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
                        >

                            <option value="">Selecione...</option>
                            {postableAccounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {(a.code ? `${a.code} · ` : "") + a.name}
                                </option>
                            ))}
                        </select>

                        <label style={{ fontSize: 13, opacity: 0.8 }}>Conta Crédito</label>
                        <select
                            value={creditAccountId}
                            onChange={(e) => setCreditAccountId(e.target.value)}
                            style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
                        >
                            <option value="">Selecione...</option>
                            {postableAccounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {(a.code ? `${a.code} · ` : "") + a.name}
                                </option>
                            ))}
                        </select>

                        <label style={{ fontSize: 13, opacity: 0.8 }}>Valor (R$)</label>
                        <input
                            inputMode="decimal"
                            value={amountText}
                            onChange={(e) => setAmountText(e.target.value)}
                            placeholder="Ex: 1250,00"
                            style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
                        />

                        <button
                            type="submit"
                            disabled={busy}
                            style={{
                                padding: 12,
                                borderRadius: 14,
                                border: "1px solid #111",
                                background: "#111",
                                color: "#fff",
                                fontWeight: 900,
                                opacity: busy ? 0.7 : 1,
                            }}
                        >
                            {busy ? "Salvando..." : "Salvar lançamento"}
                        </button>
                        {msg && <div style={{ fontSize: 13, color: msg.startsWith("✅") ? "#0a7a2f" : "#b00020" }}>{msg}</div>}
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

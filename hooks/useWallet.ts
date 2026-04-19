"use client";
import { useState, useEffect, useCallback } from "react";
import type { Wallet, WalletTransaction } from "@/types";

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const [walletRes, txRes] = await Promise.all([
        fetch("/api/wallet"),
        fetch("/api/wallet/transactions?limit=20"),
      ]);
      if (!walletRes.ok) throw new Error("Failed to fetch wallet");
      const walletData = await walletRes.json();
      const txData = await txRes.json();
      setWallet(walletData.data);
      setTransactions(txData.data ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWallet(); }, [fetchWallet]);

  const requestWithdrawal = useCallback(async (amount: number, method: string, accountDetails: Record<string, string>) => {
    const res = await fetch("/api/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method, accountDetails }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Withdrawal failed");
    await fetchWallet();
    return json.data;
  }, [fetchWallet]);

  return { wallet, transactions, loading, error, refetch: fetchWallet, requestWithdrawal };
}

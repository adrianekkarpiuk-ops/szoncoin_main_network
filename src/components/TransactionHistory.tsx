import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatAddress } from "@/lib/crypto";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";

interface Transaction {
  id: string;
  from_address: string;
  to_address: string;
  amount: number;
  created_at: string;
  status: string;
}

interface TransactionHistoryProps {
  userAddress: string;
}

export default function TransactionHistory({ userAddress }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userAddress]);

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .or(`from_address.eq.${userAddress},to_address.eq.${userAddress}`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) setTransactions(data);
  };

  return (
    <Card className="border-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-glow-cyan">
          <History className="w-5 h-5" />
          Historia Transakcji
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Brak transakcji
            </p>
          ) : (
            transactions.map((tx) => {
              const isReceived = tx.to_address === userAddress;
              return (
                <div
                  key={tx.id}
                  className="p-3 border border-primary/20 rounded-lg bg-card/30 hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {isReceived ? (
                        <ArrowDownLeft className="w-4 h-4 text-secondary mt-1" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-destructive mt-1" />
                      )}
                      <div className="space-y-1 flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-xs text-muted-foreground">
                            {isReceived ? "Od:" : "Do:"}
                          </span>
                          <span className="text-xs crypto-mono">
                            {formatAddress(isReceived ? tx.from_address : tx.to_address)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-sm font-semibold ${
                              isReceived ? "text-secondary" : "text-destructive"
                            }`}
                          >
                            {isReceived ? "+" : "-"}
                            {tx.amount.toFixed(2)} szC
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString("pl-PL")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

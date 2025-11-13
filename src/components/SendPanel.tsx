import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface SendPanelProps {
  userAddress: string;
  balance: number;
  onTransactionComplete: () => void;
}

export default function SendPanel({ userAddress, balance, onTransactionComplete }: SendPanelProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!recipient.startsWith("SzonC")) {
      toast.error("Adres musi zaczynać się od 'SzonC'");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Wprowadź prawidłową kwotę");
      return;
    }

    if (amountNum > balance) {
      toast.error("Niewystarczające środki");
      return;
    }

    if (recipient === userAddress) {
      toast.error("Nie możesz wysłać do siebie");
      return;
    }

    setLoading(true);

    try {
      // Check if recipient exists
      const { data: recipientProfile } = await supabase
        .from("profiles")
        .select("address")
        .eq("address", recipient)
        .single();

      if (!recipientProfile) {
        toast.error("Odbiorca nie istnieje");
        setLoading(false);
        return;
      }

      // Deduct from sender
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("address", userAddress)
        .single();

      if (senderProfile) {
        const newBalance = parseFloat(senderProfile.balance.toString()) - amountNum;
        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("address", userAddress);
      }

      // Add to recipient
      const { data: receiverProfile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("address", recipient)
        .single();

      if (receiverProfile) {
        const newBalance = parseFloat(receiverProfile.balance.toString()) + amountNum;
        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("address", recipient);
      }

      // Create transaction record
      await supabase.from("transactions").insert({
        from_address: userAddress,
        to_address: recipient,
        amount: amountNum,
        status: "completed",
      });

      toast.success(`Wysłano ${amountNum} szC!`);
      setRecipient("");
      setAmount("");
      onTransactionComplete();
    } catch (error: any) {
      toast.error(error.message || "Błąd transakcji");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-glow-cyan">
          <Send className="w-5 h-5" />
          Wyślij SzonCoin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="recipient">Adres odbiorcy</Label>
          <Input
            id="recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="SzonC..."
            className="crypto-mono"
          />
        </div>

        <div>
          <Label htmlFor="amount">Kwota (szC)</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Dostępne: {balance.toFixed(2)} szC
          </p>
        </div>

        <Button
          onClick={handleSend}
          disabled={loading || !recipient || !amount}
          className="w-full glow-cyan"
          size="lg"
        >
          <Send className="w-4 h-4 mr-2" />
          {loading ? "Wysyłanie..." : "Wyślij"}
        </Button>
      </CardContent>
    </Card>
  );
}

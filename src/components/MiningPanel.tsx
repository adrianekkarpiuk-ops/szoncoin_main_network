import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mineBlock } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pickaxe, Loader2 } from "lucide-react";

interface MiningPanelProps {
  userAddress: string;
  onBlockMined: () => void;
}

export default function MiningPanel({ userAddress, onBlockMined }: MiningPanelProps) {
  const [mining, setMining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentHash, setCurrentHash] = useState("");
  const [blockNumber, setBlockNumber] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mining && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setProgress((prev) => Math.min(prev + (100 / 60), 100));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mining, timeLeft]);

  const startMining = async () => {
    setMining(true);
    setProgress(0);
    setTimeLeft(60);

    try {
      // Get latest block
      const { data: blocks } = await supabase
        .from("blocks")
        .select("block_number, hash")
        .order("block_number", { ascending: false })
        .limit(1);

      const latestBlock = blocks?.[0];
      const newBlockNumber = (latestBlock?.block_number || 0) + 1;
      const previousHash = latestBlock?.hash || "0000000000000000000000000000000000000000000000000000000000000000";

      setBlockNumber(newBlockNumber);

      // Mine the block
      const result = await mineBlock(newBlockNumber, previousHash, userAddress, 4);
      setCurrentHash(result.hash);

      // Submit block to backend
      const { error } = await supabase
        .from("blocks")
        .insert({
          block_number: newBlockNumber,
          hash: result.hash,
          previous_hash: previousHash,
          miner_address: userAddress,
          reward: 10,
          nonce: result.nonce,
          difficulty: 4,
        });

      if (error) throw error;

      // Update user balance (manual)
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("address", userAddress)
        .single();

      if (profile) {
        const newBalance = parseFloat(profile.balance.toString()) + 10;
        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("address", userAddress);
      }

      toast.success(`Blok #${newBlockNumber} wykopany! +10 szC`);
      onBlockMined();
    } catch (error: any) {
      toast.error(error.message || "Błąd podczas kopania");
    } finally {
      setMining(false);
      setProgress(0);
      setTimeLeft(60);
    }
  };

  return (
    <Card className="border-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-glow-green">
          <Pickaxe className="w-5 h-5" />
          Mining Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mining ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Blok #{blockNumber}</span>
                <span className="text-primary">{timeLeft}s</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {currentHash && (
              <div className="p-3 bg-card/50 rounded border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Hash:</p>
                <p className="crypto-mono text-xs break-all text-primary">{currentHash}</p>
              </div>
            )}

            <Button disabled className="w-full" size="lg">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Kopanie...
            </Button>
          </>
        ) : (
          <Button
            onClick={startMining}
            className="w-full glow-green"
            size="lg"
          >
            <Pickaxe className="w-4 h-4 mr-2" />
            Start Mining
          </Button>
        )}

        <div className="text-center text-sm text-muted-foreground">
          Nagroda: <span className="text-secondary font-semibold">10 szC</span> / blok
        </div>
      </CardContent>
    </Card>
  );
}

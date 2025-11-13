import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatAddress } from "@/lib/crypto";
import { Blocks } from "lucide-react";

interface Block {
  id: string;
  block_number: number;
  hash: string;
  miner_address: string;
  reward: number;
  timestamp: string;
}

export default function BlockExplorer() {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    fetchBlocks();

    const channel = supabase
      .channel("blocks-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "blocks",
        },
        () => {
          fetchBlocks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBlocks = async () => {
    const { data } = await supabase
      .from("blocks")
      .select("*")
      .order("block_number", { ascending: false })
      .limit(10);

    if (data) setBlocks(data);
  };

  return (
    <Card className="border-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-glow-purple">
          <Blocks className="w-5 h-5" />
          Block Explorer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="p-3 border border-primary/20 rounded-lg bg-card/30 hover:bg-card/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-primary">
                  Blok #{block.block_number}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(block.timestamp).toLocaleString("pl-PL")}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Hash:</span>
                  <span className="crypto-mono text-primary">
                    {formatAddress(block.hash)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Miner:</span>
                  <span className="crypto-mono text-foreground">
                    {formatAddress(block.miner_address)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Nagroda:</span>
                  <span className="text-secondary font-semibold">
                    {block.reward.toFixed(2)} szC
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

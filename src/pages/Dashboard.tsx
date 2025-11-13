import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Copy, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatAddress } from "@/lib/crypto";
import MiningPanel from "@/components/MiningPanel";
import SendPanel from "@/components/SendPanel";
import BlockExplorer from "@/components/BlockExplorer";
import TransactionHistory from "@/components/TransactionHistory";

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (data) setProfile(data);
  };

  const copyAddress = () => {
    if (profile?.address) {
      navigator.clipboard.writeText(profile.address);
      toast.success("Adres skopiowany!");
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Coins className="w-16 h-16 text-primary text-glow-cyan mx-auto mb-4 animate-pulse" />
          <p className="text-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Coins className="w-10 h-10 text-primary text-glow-cyan" />
            <div>
              <h1 className="text-3xl font-bold text-glow-cyan">SzonCoin</h1>
              <p className="text-sm text-muted-foreground">Portfel kryptowalut</p>
            </div>
          </div>
          <Button onClick={signOut} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Wyloguj
          </Button>
        </div>

        {/* Wallet Info */}
        <Card className="border-glow">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Wallet className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-4xl font-bold text-glow-green">
                    {parseFloat(profile.balance).toFixed(2)} <span className="text-2xl">szC</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-primary/20">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Twój adres:</p>
                <p className="crypto-mono text-sm text-primary break-all">
                  {profile.address}
                </p>
              </div>
              <Button onClick={copyAddress} variant="ghost" size="sm">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <MiningPanel
              userAddress={profile.address}
              onBlockMined={fetchProfile}
            />
            <SendPanel
              userAddress={profile.address}
              balance={parseFloat(profile.balance)}
              onTransactionComplete={fetchProfile}
            />
          </div>
          <div className="space-y-6">
            <TransactionHistory userAddress={profile.address} />
            <BlockExplorer />
          </div>
        </div>
      </div>
    </div>
  );
}

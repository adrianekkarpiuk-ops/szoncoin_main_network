import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateSeedPhrase, generateAddress, hashSHA256 } from "@/lib/crypto";
import { Coins, Copy } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Register state
  const [seedPhrase, setSeedPhrase] = useState("");
  const [generatedAddress, setGeneratedAddress] = useState("");
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  
  // Login state
  const [loginMethod, setLoginMethod] = useState<"seed" | "password">("seed");
  const [loginSeed, setLoginSeed] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleGenerateSeed = async () => {
    const seed = await generateSeedPhrase();
    setSeedPhrase(seed);
    const address = await generateAddress(seed);
    setGeneratedAddress(address);
    setShowSeedPhrase(true);
  };

  const copySeedPhrase = () => {
    navigator.clipboard.writeText(seedPhrase);
    toast.success("Seed phrase skopiowany!");
  };

  const handleRegister = async () => {
    if (!seedPhrase || !generatedAddress) {
      toast.error("Najpierw wygeneruj seed phrase!");
      return;
    }

    setLoading(true);
    try {
      const seedHash = await hashSHA256(seedPhrase);
      const email = `${generatedAddress.toLowerCase()}@szonc.local`;
      const tempPassword = await hashSHA256(seedPhrase + Date.now());

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            address: generatedAddress,
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            address: generatedAddress,
            seed_phrase_hash: seedHash,
            balance: 0,
            has_password: false,
          });

        if (profileError) throw profileError;

        toast.success("Konto utworzone! Zapamiętaj swój seed phrase!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Błąd rejestracji");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithSeed = async () => {
    if (!loginSeed.trim()) {
      toast.error("Wprowadź seed phrase!");
      return;
    }

    setLoading(true);
    try {
      const seedHash = await hashSHA256(loginSeed);
      const address = await generateAddress(loginSeed);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("seed_phrase_hash", seedHash)
        .single();

      if (!profile) {
        toast.error("Nieprawidłowy seed phrase!");
        setLoading(false);
        return;
      }

      const email = `${address.toLowerCase()}@szonc.local`;
      const tempPassword = await hashSHA256(loginSeed + "temp");

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword,
      });

      if (error) {
        const newPassword = await hashSHA256(loginSeed + Date.now());
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (!updateError) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: newPassword,
          });

          if (signInError) throw signInError;
        }
      }

      toast.success("Zalogowano pomyślnie!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Błąd logowania");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithPassword = async () => {
    if (!loginEmail || !loginPassword) {
      toast.error("Wprowadź email i hasło!");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      toast.success("Zalogowano pomyślnie!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Błąd logowania");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-glow">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Coins className="w-16 h-16 text-primary text-glow-cyan" />
          </div>
          <CardTitle className="text-3xl text-glow-cyan">SzonCoin</CardTitle>
          <CardDescription className="text-foreground/80">
            Kryptowaluta proof-of-work
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Logowanie</TabsTrigger>
              <TabsTrigger value="register">Rejestracja</TabsTrigger>
            </TabsList>

            <TabsContent value="register" className="space-y-4">
              {!showSeedPhrase ? (
                <Button
                  onClick={handleGenerateSeed}
                  className="w-full glow-cyan"
                  size="lg"
                >
                  Wygeneruj Seed Phrase
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 border-glow rounded-lg bg-card/50">
                    <Label className="text-secondary text-glow-green mb-2 block">
                      Twój Seed Phrase (zapisz go!)
                    </Label>
                    <p className="crypto-mono text-sm mb-2 text-foreground">{seedPhrase}</p>
                    <Button
                      onClick={copySeedPhrase}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Kopiuj
                    </Button>
                  </div>

                  <div className="p-4 border border-primary/30 rounded-lg">
                    <Label className="text-primary mb-2 block">Twój adres</Label>
                    <p className="crypto-mono text-sm text-foreground">{generatedAddress}</p>
                  </div>

                  <Button
                    onClick={handleRegister}
                    disabled={loading}
                    className="w-full glow-green"
                    size="lg"
                  >
                    {loading ? "Tworzenie konta..." : "Utwórz Konto"}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="login" className="space-y-4">
              <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as any)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="seed">Seed Phrase</TabsTrigger>
                  <TabsTrigger value="password">Hasło</TabsTrigger>
                </TabsList>

                <TabsContent value="seed" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="loginSeed">Seed Phrase</Label>
                    <Input
                      id="loginSeed"
                      value={loginSeed}
                      onChange={(e) => setLoginSeed(e.target.value)}
                      placeholder="wprowadź 12 słów..."
                      className="crypto-mono"
                    />
                  </div>
                  <Button
                    onClick={handleLoginWithSeed}
                    disabled={loading}
                    className="w-full glow-cyan"
                    size="lg"
                  >
                    {loading ? "Logowanie..." : "Zaloguj przez Seed"}
                  </Button>
                </TabsContent>

                <TabsContent value="password" className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="loginEmail">Email</Label>
                    <Input
                      id="loginEmail"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="twoj@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="loginPassword">Hasło</Label>
                    <Input
                      id="loginPassword"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button
                    onClick={handleLoginWithPassword}
                    disabled={loading}
                    className="w-full glow-cyan"
                    size="lg"
                  >
                    {loading ? "Logowanie..." : "Zaloguj przez Hasło"}
                  </Button>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

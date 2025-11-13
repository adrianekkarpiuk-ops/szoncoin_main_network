-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL UNIQUE,
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  seed_phrase_hash TEXT NOT NULL,
  has_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_number BIGINT NOT NULL UNIQUE,
  hash TEXT NOT NULL UNIQUE,
  previous_hash TEXT NOT NULL,
  miner_address TEXT NOT NULL,
  reward DECIMAL(20, 8) NOT NULL DEFAULT 10,
  nonce BIGINT NOT NULL,
  difficulty INT NOT NULL DEFAULT 4,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  block_id UUID REFERENCES public.blocks(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view all addresses and balances"
  ON public.profiles FOR SELECT
  USING (true);

-- RLS Policies for blocks (public read)
CREATE POLICY "Anyone can view blocks"
  ON public.blocks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert blocks"
  ON public.blocks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.address = from_address OR profiles.address = to_address)
    )
  );

CREATE POLICY "Users can view all transactions (public ledger)"
  ON public.transactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_blocks_block_number ON public.blocks(block_number DESC);
CREATE INDEX idx_blocks_miner ON public.blocks(miner_address);
CREATE INDEX idx_transactions_from ON public.transactions(from_address);
CREATE INDEX idx_transactions_to ON public.transactions(to_address);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_profiles_address ON public.profiles(address);

-- Insert genesis block
INSERT INTO public.blocks (
  block_number,
  hash,
  previous_hash,
  miner_address,
  reward,
  nonce,
  difficulty
) VALUES (
  0,
  '0000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000000',
  'SzonCGenesis',
  0,
  0,
  4
);
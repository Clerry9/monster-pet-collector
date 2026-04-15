-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Game state table (cloud save)
CREATE TABLE public.game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  coins INTEGER NOT NULL DEFAULT 50,
  rolls INTEGER NOT NULL DEFAULT 10,
  position INTEGER NOT NULL DEFAULT 0,
  unlocked_monsters TEXT[] NOT NULL DEFAULT ARRAY['gobby'],
  active_monster TEXT NOT NULL DEFAULT 'gobby',
  unlocked_dice_tiers TEXT[] NOT NULL DEFAULT ARRAY['basic'],
  active_dice_tier TEXT NOT NULL DEFAULT 'basic',
  total_steps INTEGER NOT NULL DEFAULT 0,
  cards_collected INTEGER NOT NULL DEFAULT 0,
  monster_taps JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own game state"
  ON public.game_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own game state"
  ON public.game_state FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own game state"
  ON public.game_state FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Purchases table (payment entitlement)
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  paddle_transaction_id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  pack_id TEXT,
  rolls_granted INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage purchases"
  ON public.purchases FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX idx_purchases_transaction ON public.purchases(paddle_transaction_id);
CREATE INDEX idx_game_state_user_id ON public.game_state(user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_game_state_updated_at
  BEFORE UPDATE ON public.game_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
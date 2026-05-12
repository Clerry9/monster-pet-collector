export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements_def: {
        Row: {
          code: string
          created_at: string
          description: string
          enabled: boolean
          reward_amount: number
          reward_kind: string
          sort_order: number
          target: number
          title: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          enabled?: boolean
          reward_amount?: number
          reward_kind: string
          sort_order?: number
          target?: number
          title: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          enabled?: boolean
          reward_amount?: number
          reward_kind?: string
          sort_order?: number
          target?: number
          title?: string
        }
        Relationships: []
      }
      ad_reward_claims: {
        Row: {
          amount: number
          claimed_at: string
          id: string
          reward_kind: string
          user_id: string
        }
        Insert: {
          amount?: number
          claimed_at?: string
          id?: string
          reward_kind: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string
          id?: string
          reward_kind?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmetics_def: {
        Row: {
          asset_key: string | null
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          kind: string
          name: string
          preview_color: string | null
          price_coins: number
          rarity: string
          sort_order: number
        }
        Insert: {
          asset_key?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id: string
          kind: string
          name: string
          preview_color?: string | null
          price_coins?: number
          rarity?: string
          sort_order?: number
        }
        Update: {
          asset_key?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          kind?: string
          name?: string
          preview_color?: string | null
          price_coins?: number
          rarity?: string
          sort_order?: number
        }
        Relationships: []
      }
      daily_missions: {
        Row: {
          claimed_at: string | null
          code: string
          completed_at: string | null
          created_at: string
          id: string
          mission_date: string
          progress: number
          target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          code: string
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_date: string
          progress?: number
          target: number
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          code?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          mission_date?: string
          progress?: number
          target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_streaks: {
        Row: {
          best_streak: number
          created_at: string
          current_streak: number
          last_claim_date: string | null
          total_claims: number
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          last_claim_date?: string | null
          total_claims?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          created_at?: string
          current_streak?: number
          last_claim_date?: string | null
          total_claims?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_state: {
        Row: {
          active_dice_tier: string
          active_monster: string
          bet_multiplier: number
          cards_collected: number
          coins: number
          collected_cards: string[]
          created_at: string
          energy: number
          energy_updated_at: string
          equipped_cosmetics: Json
          id: string
          island_stars: number
          last_spin_at: string | null
          level: number
          monster_taps: Json
          pending_card_flips: number
          position: number
          rolls: number
          total_steps: number
          unlocked_dice_tiers: string[]
          unlocked_monsters: string[]
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          active_dice_tier?: string
          active_monster?: string
          bet_multiplier?: number
          cards_collected?: number
          coins?: number
          collected_cards?: string[]
          created_at?: string
          energy?: number
          energy_updated_at?: string
          equipped_cosmetics?: Json
          id?: string
          island_stars?: number
          last_spin_at?: string | null
          level?: number
          monster_taps?: Json
          pending_card_flips?: number
          position?: number
          rolls?: number
          total_steps?: number
          unlocked_dice_tiers?: string[]
          unlocked_monsters?: string[]
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          active_dice_tier?: string
          active_monster?: string
          bet_multiplier?: number
          cards_collected?: number
          coins?: number
          collected_cards?: string[]
          created_at?: string
          energy?: number
          energy_updated_at?: string
          equipped_cosmetics?: Json
          id?: string
          island_stars?: number
          last_spin_at?: string | null
          level?: number
          monster_taps?: Json
          pending_card_flips?: number
          position?: number
          rolls?: number
          total_steps?: number
          unlocked_dice_tiers?: string[]
          unlocked_monsters?: string[]
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      missions_def: {
        Row: {
          code: string
          created_at: string
          description: string
          enabled: boolean
          reward_amount: number
          reward_kind: string
          target: number
          title: string
          weight: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          enabled?: boolean
          reward_amount?: number
          reward_kind: string
          target?: number
          title: string
          weight?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          enabled?: boolean
          reward_amount?: number
          reward_kind?: string
          target?: number
          title?: string
          weight?: number
        }
        Relationships: []
      }
      pack_analytics: {
        Row: {
          cards_granted: number
          coins_granted: number
          created_at: string
          dice_tier: string | null
          environment: string
          event: string
          id: string
          monsters_granted: string[]
          pack_id: string
          paddle_transaction_id: string | null
          price_id: string | null
          rolls_granted: number
          stars_granted: number
          user_id: string
        }
        Insert: {
          cards_granted?: number
          coins_granted?: number
          created_at?: string
          dice_tier?: string | null
          environment?: string
          event: string
          id?: string
          monsters_granted?: string[]
          pack_id: string
          paddle_transaction_id?: string | null
          price_id?: string | null
          rolls_granted?: number
          stars_granted?: number
          user_id: string
        }
        Update: {
          cards_granted?: number
          coins_granted?: number
          created_at?: string
          dice_tier?: string | null
          environment?: string
          event?: string
          id?: string
          monsters_granted?: string[]
          pack_id?: string
          paddle_transaction_id?: string | null
          price_id?: string | null
          rolls_granted?: number
          stars_granted?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          environment: string
          id: string
          pack_id: string | null
          paddle_transaction_id: string
          price_id: string
          product_id: string
          rolls_granted: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment?: string
          id?: string
          pack_id?: string | null
          paddle_transaction_id: string
          price_id: string
          product_id: string
          rolls_granted?: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          pack_id?: string | null
          paddle_transaction_id?: string
          price_id?: string
          product_id?: string
          rolls_granted?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_pool_overrides: {
        Row: {
          created_at: string
          emoji: string | null
          enabled: boolean
          id: string
          max_amount: number | null
          min_amount: number | null
          static_label: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          enabled?: boolean
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          static_label: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          emoji?: string | null
          enabled?: boolean
          id?: string
          max_amount?: number | null
          min_amount?: number | null
          static_label?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      roulette_spins: {
        Row: {
          claimed_at: string | null
          created_at: string
          id: string
          landed_slot: number
          paid: boolean
          picked_emoji: string
          picked_label: string
          picked_slot: number
          reward_amount: number
          reward_emoji: string
          reward_kind: string
          reward_label: string
          user_id: string
          won: boolean
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          landed_slot: number
          paid: boolean
          picked_emoji: string
          picked_label: string
          picked_slot: number
          reward_amount: number
          reward_emoji: string
          reward_kind: string
          reward_label: string
          user_id: string
          won: boolean
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          id?: string
          landed_slot?: number
          paid?: boolean
          picked_emoji?: string
          picked_label?: string
          picked_slot?: number
          reward_amount?: number
          reward_emoji?: string
          reward_kind?: string
          reward_label?: string
          user_id?: string
          won?: boolean
        }
        Relationships: []
      }
      roulette_state: {
        Row: {
          created_at: string
          last_free_spin_at: string | null
          paid_spin_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_free_spin_at?: string | null
          paid_spin_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          last_free_spin_at?: string | null
          paid_spin_credits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      season_progress: {
        Row: {
          cards_unlocked: string[]
          claimed_tiers: number[]
          created_at: string
          id: string
          pass_purchased: boolean
          season_id: string
          symbols: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cards_unlocked?: string[]
          claimed_tiers?: number[]
          created_at?: string
          id?: string
          pass_purchased?: boolean
          season_id: string
          symbols?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cards_unlocked?: string[]
          claimed_tiers?: number[]
          created_at?: string
          id?: string
          pass_purchased?: boolean
          season_id?: string
          symbols?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          claimed_at: string | null
          code: string
          completed_at: string | null
          id: string
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          code: string
          completed_at?: string | null
          id?: string
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          code?: string
          completed_at?: string | null
          id?: string
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cosmetics: {
        Row: {
          acquired_at: string
          cosmetic_id: string
          id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          cosmetic_id: string
          id?: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          cosmetic_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cosmetics_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "cosmetics_def"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_mission_progress: {
        Args: { p_code: string; p_delta?: number }
        Returns: {
          claimed_at: string | null
          code: string
          completed_at: string | null
          created_at: string
          id: string
          mission_date: string
          progress: number
          target: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "daily_missions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      buy_cosmetic: {
        Args: { p_cosmetic_id: string }
        Returns: {
          acquired_at: string
          cosmetic_id: string
          id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_cosmetics"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      buy_dice_pack: {
        Args: { p_pack_id: string }
        Returns: {
          active_dice_tier: string
          active_monster: string
          bet_multiplier: number
          cards_collected: number
          coins: number
          collected_cards: string[]
          created_at: string
          energy: number
          energy_updated_at: string
          equipped_cosmetics: Json
          id: string
          island_stars: number
          last_spin_at: string | null
          level: number
          monster_taps: Json
          pending_card_flips: number
          position: number
          rolls: number
          total_steps: number
          unlocked_dice_tiers: string[]
          unlocked_monsters: string[]
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "game_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_achievement: {
        Args: { p_code: string }
        Returns: {
          reward_amount: number
          reward_kind: string
        }[]
      }
      claim_ad_reward: {
        Args: { p_kind: string }
        Returns: {
          amount: number
          reward_kind: string
        }[]
      }
      claim_daily_streak: {
        Args: never
        Returns: {
          already_claimed: boolean
          best_streak: number
          current_streak: number
          reward_coins: number
          reward_energy: number
          reward_rolls: number
        }[]
      }
      claim_mission: {
        Args: { p_code: string }
        Returns: {
          reward_amount: number
          reward_kind: string
        }[]
      }
      claim_roulette_spin: {
        Args: { p_spin_id: string }
        Returns: {
          claimed_at: string | null
          created_at: string
          id: string
          landed_slot: number
          paid: boolean
          picked_emoji: string
          picked_label: string
          picked_slot: number
          reward_amount: number
          reward_emoji: string
          reward_kind: string
          reward_label: string
          user_id: string
          won: boolean
        }
        SetofOptions: {
          from: "*"
          to: "roulette_spins"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_paid_roulette_spin: {
        Args: never
        Returns: {
          created_at: string
          last_free_spin_at: string | null
          paid_spin_credits: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "roulette_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      equip_cosmetic: {
        Args: { p_cosmetic_id: string }
        Returns: {
          active_dice_tier: string
          active_monster: string
          bet_multiplier: number
          cards_collected: number
          coins: number
          collected_cards: string[]
          created_at: string
          energy: number
          energy_updated_at: string
          equipped_cosmetics: Json
          id: string
          island_stars: number
          last_spin_at: string | null
          level: number
          monster_taps: Json
          pending_card_flips: number
          position: number
          rolls: number
          total_steps: number
          unlocked_dice_tiers: string[]
          unlocked_monsters: string[]
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "game_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_ad_reward_status: {
        Args: never
        Returns: {
          last_claim_at: string
          reward_kind: string
          today_count: number
        }[]
      }
      get_leaderboard_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          display_name: string
          level: number
          user_id: string
        }[]
      }
      get_or_roll_daily_missions: {
        Args: never
        Returns: {
          claimed_at: string | null
          code: string
          completed_at: string | null
          created_at: string
          id: string
          mission_date: string
          progress: number
          target: number
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "daily_missions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_season_leaderboard: {
        Args: { _limit?: number; _season_id: string }
        Returns: {
          symbols: number
          user_id: string
        }[]
      }
      grant_paid_roulette_spins: {
        Args: { p_amount: number; p_user_id: string }
        Returns: {
          created_at: string
          last_free_spin_at: string | null
          paid_spin_credits: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "roulette_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      spend_coins_rolls: {
        Args: { p_coins: number; p_rolls: number }
        Returns: {
          active_dice_tier: string
          active_monster: string
          bet_multiplier: number
          cards_collected: number
          coins: number
          collected_cards: string[]
          created_at: string
          energy: number
          energy_updated_at: string
          equipped_cosmetics: Json
          id: string
          island_stars: number
          last_spin_at: string | null
          level: number
          monster_taps: Json
          pending_card_flips: number
          position: number
          rolls: number
          total_steps: number
          unlocked_dice_tiers: string[]
          unlocked_monsters: string[]
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "game_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unequip_cosmetic: {
        Args: { p_kind: string }
        Returns: {
          active_dice_tier: string
          active_monster: string
          bet_multiplier: number
          cards_collected: number
          coins: number
          collected_cards: string[]
          created_at: string
          energy: number
          energy_updated_at: string
          equipped_cosmetics: Json
          id: string
          island_stars: number
          last_spin_at: string | null
          level: number
          monster_taps: Json
          pending_card_flips: number
          position: number
          rolls: number
          total_steps: number
          unlocked_dice_tiers: string[]
          unlocked_monsters: string[]
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "game_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unlock_dice_tier: {
        Args: { p_tier_id: string }
        Returns: {
          active_dice_tier: string
          active_monster: string
          bet_multiplier: number
          cards_collected: number
          coins: number
          collected_cards: string[]
          created_at: string
          energy: number
          energy_updated_at: string
          equipped_cosmetics: Json
          id: string
          island_stars: number
          last_spin_at: string | null
          level: number
          monster_taps: Json
          pending_card_flips: number
          position: number
          rolls: number
          total_steps: number
          unlocked_dice_tiers: string[]
          unlocked_monsters: string[]
          updated_at: string
          user_id: string
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "game_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const

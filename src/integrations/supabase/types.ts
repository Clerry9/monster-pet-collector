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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_leaderboard_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          display_name: string
          level: number
          user_id: string
        }[]
      }
      get_season_leaderboard: {
        Args: { _limit?: number; _season_id: string }
        Returns: {
          symbols: number
          user_id: string
        }[]
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
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
      [_ in never]: never
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
    Enums: {},
  },
} as const

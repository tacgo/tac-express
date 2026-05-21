export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          before_state: Json | null
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          before_state?: Json | null
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          before_state?: Json | null
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          ip_address: string | null
          message: string
          name: string
          notification_sent_at: string | null
          notification_status: string
          reason: string
          status: string
          user_agent: string | null
          whatsapp_send_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          message: string
          name: string
          notification_sent_at?: string | null
          notification_status?: string
          reason: string
          status?: string
          user_agent?: string | null
          whatsapp_send_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          message?: string
          name?: string
          notification_sent_at?: string | null
          notification_status?: string
          reason?: string
          status?: string
          user_agent?: string | null
          whatsapp_send_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_leads_whatsapp_send_id_fkey"
            columns: ["whatsapp_send_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          created_at: string
          email: string | null
          gstin: string | null
          id: string
          name: string
          outstanding_balance: number
          phone: string
          state: string
          total_revenue: number
          total_shipments: number
          updated_at: string
          zip: string
        }
        Insert: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name: string
          outstanding_balance?: number
          phone: string
          state?: string
          total_revenue?: number
          total_shipments?: number
          updated_at?: string
          zip?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          email?: string | null
          gstin?: string | null
          id?: string
          name?: string
          outstanding_balance?: number
          phone?: string
          state?: string
          total_revenue?: number
          total_shipments?: number
          updated_at?: string
          zip?: string
        }
        Relationships: []
      }
      exceptions: {
        Row: {
          awb_number: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          shipment_id: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          awb_number?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shipment_id?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          awb_number?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          shipment_id?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exceptions_awb_number_fkey"
            columns: ["awb_number"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["awb_number"]
          },
          {
            foreignKeyName: "exceptions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          advance_paid: number
          awb_number: string | null
          balance: number
          base_freight: number
          created_at: string
          created_by: string | null
          customer_gstin: string | null
          customer_id: string | null
          customer_name: string
          discount: number
          docket_charge: number
          due_date: string | null
          fuel_surcharge: number
          handling_fee: number
          id: string
          insurance: number
          invoice_number: string
          issued_at: string | null
          notes: string | null
          packing_charge: number
          paid_at: string | null
          payment_mode: string
          pdf_path: string | null
          pickup_charge: number
          shipment_id: string | null
          status: string
          tax: Json
          total_amount: number
          updated_at: string
        }
        Insert: {
          advance_paid?: number
          awb_number?: string | null
          balance?: number
          base_freight?: number
          created_at?: string
          created_by?: string | null
          customer_gstin?: string | null
          customer_id?: string | null
          customer_name?: string
          discount?: number
          docket_charge?: number
          due_date?: string | null
          fuel_surcharge?: number
          handling_fee?: number
          id?: string
          insurance?: number
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          packing_charge?: number
          paid_at?: string | null
          payment_mode?: string
          pdf_path?: string | null
          pickup_charge?: number
          shipment_id?: string | null
          status?: string
          tax?: Json
          total_amount?: number
          updated_at?: string
        }
        Update: {
          advance_paid?: number
          awb_number?: string | null
          balance?: number
          base_freight?: number
          created_at?: string
          created_by?: string | null
          customer_gstin?: string | null
          customer_id?: string | null
          customer_name?: string
          discount?: number
          docket_charge?: number
          due_date?: string | null
          fuel_surcharge?: number
          handling_fee?: number
          id?: string
          insurance?: number
          invoice_number?: string
          issued_at?: string | null
          notes?: string | null
          packing_charge?: number
          paid_at?: string | null
          payment_mode?: string
          pdf_path?: string | null
          pickup_charge?: number
          shipment_id?: string | null
          status?: string
          tax?: Json
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_awb_number_fkey"
            columns: ["awb_number"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["awb_number"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      manifest_shipments: {
        Row: {
          added_at: string
          added_by: string | null
          awb_number: string
          id: string
          manifest_id: string
          shipment_id: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          awb_number: string
          id?: string
          manifest_id: string
          shipment_id?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          awb_number?: string
          id?: string
          manifest_id?: string
          shipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manifest_shipments_awb_number_fkey"
            columns: ["awb_number"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["awb_number"]
          },
          {
            foreignKeyName: "manifest_shipments_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_shipments_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      manifests: {
        Row: {
          arrival_date: string | null
          arrived_at: string | null
          arrived_by: string | null
          closed_by: string | null
          created_at: string
          created_by: string | null
          departed_at: string | null
          departed_by: string | null
          departure_date: string | null
          dest_hub: string
          id: string
          manifest_number: string
          notes: string | null
          origin_hub: string
          status: string
          total_pieces: number
          total_shipments: number
          total_weight: number
          transport_mode: string
          updated_at: string
        }
        Insert: {
          arrival_date?: string | null
          arrived_at?: string | null
          arrived_by?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          departed_at?: string | null
          departed_by?: string | null
          departure_date?: string | null
          dest_hub: string
          id?: string
          manifest_number?: string
          notes?: string | null
          origin_hub: string
          status?: string
          total_pieces?: number
          total_shipments?: number
          total_weight?: number
          transport_mode?: string
          updated_at?: string
        }
        Update: {
          arrival_date?: string | null
          arrived_at?: string | null
          arrived_by?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string | null
          departed_at?: string | null
          departed_by?: string | null
          departure_date?: string | null
          dest_hub?: string
          id?: string
          manifest_number?: string
          notes?: string | null
          origin_hub?: string
          status?: string
          total_pieces?: number
          total_shipments?: number
          total_weight?: number
          transport_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          hub_code: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          hub_code?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          hub_code?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          awb_number: string
          cancelled_at: string | null
          chargeable_weight: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          dead_weight: number
          delivered_at: string | null
          description: string | null
          dest_hub: string
          financials: Json | null
          id: string
          manifest_id: string | null
          manifest_number: string | null
          origin_hub: string
          payment_mode: string
          pieces: number
          rate_per_kg: number
          receiver_address: string
          receiver_city: string
          receiver_email: string | null
          receiver_gstin: string | null
          receiver_name: string
          receiver_phone: string
          receiver_pincode: string
          receiver_state: string
          sender_address: string
          sender_city: string
          sender_email: string | null
          sender_gstin: string | null
          sender_name: string
          sender_phone: string
          sender_pincode: string
          sender_state: string
          service_level: string
          status: string
          total_amount: number
          transport_mode: string
          updated_at: string
          volumetric_weight: number
        }
        Insert: {
          awb_number?: string
          cancelled_at?: string | null
          chargeable_weight?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          dead_weight?: number
          delivered_at?: string | null
          description?: string | null
          dest_hub?: string
          financials?: Json | null
          id?: string
          manifest_id?: string | null
          manifest_number?: string | null
          origin_hub?: string
          payment_mode?: string
          pieces?: number
          rate_per_kg?: number
          receiver_address?: string
          receiver_city?: string
          receiver_email?: string | null
          receiver_gstin?: string | null
          receiver_name: string
          receiver_phone: string
          receiver_pincode?: string
          receiver_state?: string
          sender_address?: string
          sender_city?: string
          sender_email?: string | null
          sender_gstin?: string | null
          sender_name: string
          sender_phone: string
          sender_pincode?: string
          sender_state?: string
          service_level?: string
          status?: string
          total_amount?: number
          transport_mode?: string
          updated_at?: string
          volumetric_weight?: number
        }
        Update: {
          awb_number?: string
          cancelled_at?: string | null
          chargeable_weight?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          dead_weight?: number
          delivered_at?: string | null
          description?: string | null
          dest_hub?: string
          financials?: Json | null
          id?: string
          manifest_id?: string | null
          manifest_number?: string | null
          origin_hub?: string
          payment_mode?: string
          pieces?: number
          rate_per_kg?: number
          receiver_address?: string
          receiver_city?: string
          receiver_email?: string | null
          receiver_gstin?: string | null
          receiver_name?: string
          receiver_phone?: string
          receiver_pincode?: string
          receiver_state?: string
          sender_address?: string
          sender_city?: string
          sender_email?: string | null
          sender_gstin?: string | null
          sender_name?: string
          sender_phone?: string
          sender_pincode?: string
          sender_state?: string
          service_level?: string
          status?: string
          total_amount?: number
          transport_mode?: string
          updated_at?: string
          volumetric_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "shipments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_manifest_id_fkey"
            columns: ["manifest_id"]
            isOneToOne: false
            referencedRelation: "manifests"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_events: {
        Row: {
          awb_number: string
          created_at: string
          description: string
          hub_code: string | null
          id: string
          location: string
          metadata: Json | null
          source: string
          staff_id: string | null
          staff_name: string | null
          status: string
        }
        Insert: {
          awb_number: string
          created_at?: string
          description?: string
          hub_code?: string | null
          id?: string
          location?: string
          metadata?: Json | null
          source?: string
          staff_id?: string | null
          staff_name?: string | null
          status: string
        }
        Update: {
          awb_number?: string
          created_at?: string
          description?: string
          hub_code?: string | null
          id?: string
          location?: string
          metadata?: Json | null
          source?: string
          staff_id?: string | null
          staff_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_events_awb_number_fkey"
            columns: ["awb_number"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["awb_number"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_shipment_to_manifest: {
        Args: { p_awb_number: string; p_manifest_id: string; p_staff_id: string }
        Returns: undefined
      }
      arrive_manifest: {
        Args: { p_manifest_id: string; p_staff_id: string }
        Returns: undefined
      }
      close_manifest_atomic: {
        Args: { p_manifest_id: string; p_staff_id: string }
        Returns: undefined
      }
      count_shipments_by_status: { Args: never; Returns: Json }
      depart_manifest: {
        Args: { p_manifest_id: string; p_staff_id: string }
        Returns: undefined
      }
      generate_awb_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_manifest_number: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      update_shipment_status: {
        Args: {
          p_new_status: string
          p_notes?: string
          p_shipment_id: string
          p_staff_id: string
        }
        Returns: undefined
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const

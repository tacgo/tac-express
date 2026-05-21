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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      hubs: {
        Row: {
          city: string
          code: string
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          city: string
          code: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          state: string
          updated_at?: string
        }
        Update: {
          city?: string
          code?: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_payments: {
        Row: {
          amount: number
          attachment_path: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          method: string
          notes: string | null
          received_at: string
          reference: string | null
        }
        Insert: {
          amount: number
          attachment_path?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          method: string
          notes?: string | null
          received_at?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          attachment_path?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          received_at?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
      notes: {
        Row: {
          body: Json
          created_at: string
          created_by: string | null
          entity_id: string
          entity_type: string
          id: string
          text_body: string | null
        }
        Insert: {
          body: Json
          created_at?: string
          created_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          text_body?: string | null
        }
        Update: {
          body?: Json
          created_at?: string
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          text_body?: string | null
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
      rate_cards: {
        Row: {
          created_at: string
          created_by: string | null
          dest_hub: string
          docket_charge: number
          fuel_surcharge_pct: number
          handling_fee: number
          id: string
          is_active: boolean
          origin_hub: string
          rate_per_kg: number
          service_level: string
          updated_at: string
          weight_slab_max: number
          weight_slab_min: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dest_hub: string
          docket_charge?: number
          fuel_surcharge_pct?: number
          handling_fee?: number
          id?: string
          is_active?: boolean
          origin_hub: string
          rate_per_kg: number
          service_level: string
          updated_at?: string
          weight_slab_max?: number
          weight_slab_min?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dest_hub?: string
          docket_charge?: number
          fuel_surcharge_pct?: number
          handling_fee?: number
          id?: string
          is_active?: boolean
          origin_hub?: string
          rate_per_kg?: number
          service_level?: string
          updated_at?: string
          weight_slab_max?: number
          weight_slab_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "rate_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      whatsapp_sends: {
        Row: {
          attempt_no: number
          completed_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          invoice_id: string | null
          original_send_id: string | null
          phone: string
          queued_at: string
          raw_response: Json | null
          status: string
          template_name: string | null
          user_id: string | null
          wamid: string | null
        }
        Insert: {
          attempt_no?: number
          completed_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          original_send_id?: string | null
          phone: string
          queued_at?: string
          raw_response?: Json | null
          status?: string
          template_name?: string | null
          user_id?: string | null
          wamid?: string | null
        }
        Update: {
          attempt_no?: number
          completed_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          original_send_id?: string | null
          phone?: string
          queued_at?: string
          raw_response?: Json | null
          status?: string
          template_name?: string | null
          user_id?: string | null
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sends_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sends_original_send_id_fkey"
            columns: ["original_send_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_sends"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_shipment_to_manifest: {
        Args: {
          p_awb_number: string
          p_manifest_id: string
          p_staff_id: string
        }
        Returns: undefined
      }
      arrive_manifest: {
        Args: { p_manifest_id: string; p_staff_id?: string }
        Returns: undefined
      }
      close_manifest_atomic: {
        Args: { p_manifest_id: string; p_staff_id?: string }
        Returns: undefined
      }
      count_shipments_by_status: { Args: never; Returns: Json }
      depart_manifest: {
        Args: { p_manifest_id: string; p_staff_id?: string }
        Returns: undefined
      }
      generate_awb_number: { Args: never; Returns: string }
      generate_invoice: {
        Args: { p_discount?: number; p_shipment_id: string; p_staff_id: string }
        Returns: string
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_manifest_number: { Args: never; Returns: string }
      get_finance_summary: { Args: never; Returns: Json }
      get_rate_card: {
        Args: {
          p_dest: string
          p_origin: string
          p_service_level: string
          p_weight: number
        }
        Returns: {
          docket_charge: number
          fuel_surcharge_pct: number
          handling_fee: number
          id: string
          rate_per_kg: number
        }[]
      }
      get_user_role: { Args: never; Returns: string }
      record_invoice_payment: {
        Args: {
          p_amount: number
          p_attachment_path?: string
          p_invoice_id: string
          p_method: string
          p_notes?: string
          p_received_at?: string
          p_reference?: string
        }
        Returns: {
          amount: number
          attachment_path: string | null
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          method: string
          notes: string | null
          received_at: string
          reference: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoice_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_exception: {
        Args: {
          p_exception_id: string
          p_resolution: string
          p_staff_id: string
        }
        Returns: undefined
      }
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
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

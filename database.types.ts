export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_id: string
          event_type: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_id?: string
          event_type: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_id?: string
          event_type?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          audit_id: string
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["entity_type_enum"] | null
          is_ai_generated: boolean
          is_ai_updated: boolean
          organization_id: string | null
          performed_by_user_id: string | null
        }
        Insert: {
          action: string
          audit_id?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type_enum"] | null
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          organization_id?: string | null
          performed_by_user_id?: string | null
        }
        Update: {
          action?: string
          audit_id?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type_enum"] | null
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          organization_id?: string | null
          performed_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "audit_logs_performed_by_user_id_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string | null
          is_ai_generated: boolean
          message_content: string
          message_id: string
          sender_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string | null
          is_ai_generated?: boolean
          message_content: string
          message_id?: string
          sender_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          is_ai_generated?: boolean
          message_content?: string
          message_id?: string
          sender_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["chat_id"]
          },
          {
            foreignKeyName: "chat_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          chat_id: string
          created_at: string | null
          is_resolved: boolean
          organization_id: string
          started_by_user_id: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          chat_id?: string
          created_at?: string | null
          is_resolved?: boolean
          organization_id: string
          started_by_user_id?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string | null
          is_resolved?: boolean
          organization_id?: string
          started_by_user_id?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "chat_sessions_started_by_user_id_fkey"
            columns: ["started_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      knowledge_article_versions: {
        Row: {
          article_id: string
          content: string
          created_at: string
          is_ai_generated: boolean
          is_ai_updated: boolean
          title: string
          update_reason: string | null
          updated_by_user_id: string | null
          version_id: string
          version_number: number
        }
        Insert: {
          article_id: string
          content: string
          created_at?: string
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          title: string
          update_reason?: string | null
          updated_by_user_id?: string | null
          version_id?: string
          version_number?: number
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          title?: string
          update_reason?: string | null
          updated_by_user_id?: string | null
          version_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_article_versions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["article_id"]
          },
          {
            foreignKeyName: "knowledge_article_versions_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          article_id: string
          content: string
          created_at: string | null
          created_by_user_id: string | null
          is_ai_generated: boolean
          is_ai_updated: boolean
          is_published: boolean
          organization_id: string
          title: string
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          article_id?: string
          content: string
          created_at?: string | null
          created_by_user_id?: string | null
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          is_published?: boolean
          organization_id: string
          title: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string | null
          created_by_user_id?: string | null
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          is_published?: boolean
          organization_id?: string
          title?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "knowledge_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "knowledge_articles_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      knowledge_embeddings: {
        Row: {
          chunk_index: number
          content: string
          content_embedding: string
          created_at: string
          embedding_id: string
          metadata: Json | null
          organization_id: string
          source_id: string
          source_type: Database["public"]["Enums"]["knowledge_source_enum"]
          updated_at: string
        }
        Insert: {
          chunk_index?: number
          content: string
          content_embedding: string
          created_at?: string
          embedding_id?: string
          metadata?: Json | null
          organization_id: string
          source_id: string
          source_type: Database["public"]["Enums"]["knowledge_source_enum"]
          updated_at?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          content_embedding?: string
          created_at?: string
          embedding_id?: string
          metadata?: Json | null
          organization_id?: string
          source_id?: string
          source_type?: Database["public"]["Enums"]["knowledge_source_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_embeddings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      knowledge_faq_versions: {
        Row: {
          answer: string
          created_at: string | null
          faq_id: string
          is_ai_generated: boolean
          is_ai_updated: boolean
          question: string
          update_reason: string | null
          updated_by_user_id: string | null
          version_id: string
          version_number: number
        }
        Insert: {
          answer: string
          created_at?: string | null
          faq_id: string
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          question: string
          update_reason?: string | null
          updated_by_user_id?: string | null
          version_id?: string
          version_number?: number
        }
        Update: {
          answer?: string
          created_at?: string | null
          faq_id?: string
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          question?: string
          update_reason?: string | null
          updated_by_user_id?: string | null
          version_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_faq_versions_faq_id_fkey"
            columns: ["faq_id"]
            isOneToOne: false
            referencedRelation: "knowledge_faqs"
            referencedColumns: ["faq_id"]
          },
          {
            foreignKeyName: "knowledge_faq_versions_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      knowledge_faqs: {
        Row: {
          answer: string
          created_at: string | null
          created_by_user_id: string | null
          faq_id: string
          is_ai_generated: boolean
          is_ai_updated: boolean
          is_published: boolean
          organization_id: string
          question: string
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          created_by_user_id?: string | null
          faq_id?: string
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          is_published?: boolean
          organization_id: string
          question: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          created_by_user_id?: string | null
          faq_id?: string
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          is_published?: boolean
          organization_id?: string
          question?: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_faqs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "knowledge_faqs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "knowledge_faqs_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      knowledge_files: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          description: string | null
          extracted_text: string
          file_id: string
          is_ai_generated: boolean
          is_ai_updated: boolean
          is_published: boolean
          knowledge_file_id: string
          organization_id: string
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          extracted_text: string
          file_id: string
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          is_published?: boolean
          knowledge_file_id?: string
          organization_id: string
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          extracted_text?: string
          file_id?: string
          is_ai_generated?: boolean
          is_ai_updated?: boolean
          is_published?: boolean
          knowledge_file_id?: string
          organization_id?: string
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_files_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "knowledge_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["file_id"]
          },
          {
            foreignKeyName: "knowledge_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "knowledge_files_updated_by_user_id_fkey"
            columns: ["updated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      message_file_attachments: {
        Row: {
          attachment_id: string
          created_at: string | null
          file_id: string
          message_id: string
          updated_at: string | null
        }
        Insert: {
          attachment_id?: string
          created_at?: string | null
          file_id: string
          message_id: string
          updated_at?: string | null
        }
        Update: {
          attachment_id?: string
          created_at?: string | null
          file_id?: string
          message_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_file_attachments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["file_id"]
          },
          {
            foreignKeyName: "message_file_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["message_id"]
          },
        ]
      }
      notification_assignments: {
        Row: {
          assignment_id: string
          created_at: string
          notification_id: string
          user_id: string
        }
        Insert: {
          assignment_id?: string
          created_at?: string
          notification_id: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_assignments_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["notification_id"]
          },
          {
            foreignKeyName: "notification_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          message: string
          notification_id: string
          notification_type: Database["public"]["Enums"]["notification_type_enum"]
          organization_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          message: string
          notification_id?: string
          notification_type?: Database["public"]["Enums"]["notification_type_enum"]
          organization_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          message?: string
          notification_id?: string
          notification_type?: Database["public"]["Enums"]["notification_type_enum"]
          organization_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      organizations: {
        Row: {
          branding_config: Json | null
          branding_prompt: string | null
          created_at: string | null
          organization_domain: string
          organization_id: string
          organization_name: string
          updated_at: string | null
        }
        Insert: {
          branding_config?: Json | null
          branding_prompt?: string | null
          created_at?: string | null
          organization_domain: string
          organization_id?: string
          organization_name: string
          updated_at?: string | null
        }
        Update: {
          branding_config?: Json | null
          branding_prompt?: string | null
          created_at?: string | null
          organization_domain?: string
          organization_id?: string
          organization_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      read_status: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type_enum"]
          read_at: string
          read_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type_enum"]
          read_at?: string
          read_id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type_enum"]
          read_at?: string
          read_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "read_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sla_policies: {
        Row: {
          created_at: string | null
          is_active: boolean
          organization_id: string
          policy_name: string
          sla_id: string
          time_to_first_response: number
          time_to_resolution: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean
          organization_id: string
          policy_name: string
          sla_id?: string
          time_to_first_response?: number
          time_to_resolution?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          is_active?: boolean
          organization_id?: string
          policy_name?: string
          sla_id?: string
          time_to_first_response?: number
          time_to_resolution?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      support_teams: {
        Row: {
          created_at: string | null
          organization_id: string
          team_description: string | null
          team_id: string
          team_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          organization_id: string
          team_description?: string | null
          team_id?: string
          team_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          organization_id?: string
          team_description?: string | null
          team_id?: string
          team_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to_team_id: string | null
          assigned_to_user_id: string | null
          created_at: string
          created_by_user_id: string
          customer_feedback: string | null
          customer_rating: number | null
          organization_id: string
          origin_chat_id: string | null
          resolution_summary: string | null
          sla_id: string | null
          summary: string | null
          ticket_description: string
          ticket_id: string
          ticket_priority: Database["public"]["Enums"]["ticket_priority_enum"]
          ticket_status: Database["public"]["Enums"]["ticket_status_enum"]
          ticket_title: string
          updated_at: string
        }
        Insert: {
          assigned_to_team_id?: string | null
          assigned_to_user_id?: string | null
          created_at?: string
          created_by_user_id: string
          customer_feedback?: string | null
          customer_rating?: number | null
          organization_id: string
          origin_chat_id?: string | null
          resolution_summary?: string | null
          sla_id?: string | null
          summary?: string | null
          ticket_description: string
          ticket_id?: string
          ticket_priority?: Database["public"]["Enums"]["ticket_priority_enum"]
          ticket_status?: Database["public"]["Enums"]["ticket_status_enum"]
          ticket_title: string
          updated_at?: string
        }
        Update: {
          assigned_to_team_id?: string | null
          assigned_to_user_id?: string | null
          created_at?: string
          created_by_user_id?: string
          customer_feedback?: string | null
          customer_rating?: number | null
          organization_id?: string
          origin_chat_id?: string | null
          resolution_summary?: string | null
          sla_id?: string | null
          summary?: string | null
          ticket_description?: string
          ticket_id?: string
          ticket_priority?: Database["public"]["Enums"]["ticket_priority_enum"]
          ticket_status?: Database["public"]["Enums"]["ticket_status_enum"]
          ticket_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_team_id_fkey"
            columns: ["assigned_to_team_id"]
            isOneToOne: false
            referencedRelation: "support_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_team_id_fkey"
            columns: ["assigned_to_team_id"]
            isOneToOne: false
            referencedRelation: "team_routing_info"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "support_tickets_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "support_tickets_origin_chat_id_fkey"
            columns: ["origin_chat_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["chat_id"]
          },
          {
            foreignKeyName: "support_tickets_sla_id_fkey"
            columns: ["sla_id"]
            isOneToOne: false
            referencedRelation: "sla_policies"
            referencedColumns: ["sla_id"]
          },
        ]
      }
      team_category_specializations: {
        Row: {
          category_id: string
          created_at: string | null
          expertise_level: number
          specialization_id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          expertise_level?: number
          specialization_id?: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          expertise_level?: number
          specialization_id?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_category_specializations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "team_category_specializations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "support_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_category_specializations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_routing_info"
            referencedColumns: ["team_id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string | null
          is_team_lead: boolean
          membership_id: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          is_team_lead?: boolean
          membership_id?: string
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          is_team_lead?: boolean
          membership_id?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "support_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_routing_info"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      team_tag_specializations: {
        Row: {
          created_at: string | null
          expertise_level: number
          specialization_id: string
          tag_id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          expertise_level?: number
          specialization_id?: string
          tag_id: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          expertise_level?: number
          specialization_id?: string
          tag_id?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_tag_specializations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "ticket_tags"
            referencedColumns: ["tag_id"]
          },
          {
            foreignKeyName: "team_tag_specializations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "support_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_tag_specializations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_routing_info"
            referencedColumns: ["team_id"]
          },
        ]
      }
      ticket_categories: {
        Row: {
          category_description: string | null
          category_id: string
          category_name: string
          created_at: string | null
          display_color: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          category_description?: string | null
          category_id?: string
          category_name: string
          created_at?: string | null
          display_color?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          category_description?: string | null
          category_id?: string
          category_name?: string
          created_at?: string | null
          display_color?: string | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      ticket_category_assignments: {
        Row: {
          assignment_id: string
          category_id: string
          created_at: string | null
          is_primary_category: boolean
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          assignment_id?: string
          category_id: string
          created_at?: string | null
          is_primary_category?: boolean
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          category_id?: string
          created_at?: string | null
          is_primary_category?: boolean
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "ticket_category_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ticket_category_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_routing_info"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      ticket_file_attachments: {
        Row: {
          attachment_id: string
          created_at: string
          file_id: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          attachment_id?: string
          created_at?: string
          file_id: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          attachment_id?: string
          created_at?: string
          file_id?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_file_attachments_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["file_id"]
          },
          {
            foreignKeyName: "ticket_file_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ticket_file_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_routing_info"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      ticket_lifecycle: {
        Row: {
          admin_review_notes: string | null
          admin_review_reason: string | null
          created_at: string
          current_error_type:
            | Database["public"]["Enums"]["ticket_error_type_enum"]
            | null
          current_stage: Database["public"]["Enums"]["ticket_lifecycle_stage_enum"]
          error_description: string | null
          error_details: Json | null
          requires_admin_review: boolean
          reviewed_by_user_id: string | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          admin_review_notes?: string | null
          admin_review_reason?: string | null
          created_at?: string
          current_error_type?:
            | Database["public"]["Enums"]["ticket_error_type_enum"]
            | null
          current_stage?: Database["public"]["Enums"]["ticket_lifecycle_stage_enum"]
          error_description?: string | null
          error_details?: Json | null
          requires_admin_review?: boolean
          reviewed_by_user_id?: string | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          admin_review_notes?: string | null
          admin_review_reason?: string | null
          created_at?: string
          current_error_type?:
            | Database["public"]["Enums"]["ticket_error_type_enum"]
            | null
          current_stage?: Database["public"]["Enums"]["ticket_lifecycle_stage_enum"]
          error_description?: string | null
          error_details?: Json | null
          requires_admin_review?: boolean
          reviewed_by_user_id?: string | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_lifecycle_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_lifecycle_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "support_tickets"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ticket_lifecycle_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "ticket_routing_info"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          is_ai_generated: boolean
          is_internal_note: boolean
          message_content: string
          message_id: string
          sender_user_id: string | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_ai_generated?: boolean
          is_internal_note?: boolean
          message_content: string
          message_id?: string
          sender_user_id?: string | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_ai_generated?: boolean
          is_internal_note?: boolean
          message_content?: string
          message_id?: string
          sender_user_id?: string | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_routing_info"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      ticket_routing_decisions: {
        Row: {
          confidence_score: number | null
          created_at: string
          is_orphaned: boolean
          reasoning: string | null
          selected_team_id: string | null
          suggested_categories: string[] | null
          suggested_priority:
            | Database["public"]["Enums"]["ticket_priority_enum"]
            | null
          suggested_tags: string[] | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          is_orphaned?: boolean
          reasoning?: string | null
          selected_team_id?: string | null
          suggested_categories?: string[] | null
          suggested_priority?:
            | Database["public"]["Enums"]["ticket_priority_enum"]
            | null
          suggested_tags?: string[] | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          is_orphaned?: boolean
          reasoning?: string | null
          selected_team_id?: string | null
          suggested_categories?: string[] | null
          suggested_priority?:
            | Database["public"]["Enums"]["ticket_priority_enum"]
            | null
          suggested_tags?: string[] | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_routing_decisions_selected_team_id_fkey"
            columns: ["selected_team_id"]
            isOneToOne: false
            referencedRelation: "support_teams"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "ticket_routing_decisions_selected_team_id_fkey"
            columns: ["selected_team_id"]
            isOneToOne: false
            referencedRelation: "team_routing_info"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "ticket_routing_decisions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "support_tickets"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ticket_routing_decisions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "ticket_routing_info"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      ticket_tag_assignments: {
        Row: {
          assignment_id: string
          created_at: string | null
          tag_id: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          assignment_id?: string
          created_at?: string | null
          tag_id: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          tag_id?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "ticket_tags"
            referencedColumns: ["tag_id"]
          },
          {
            foreignKeyName: "ticket_tag_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "ticket_tag_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_routing_info"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      ticket_tags: {
        Row: {
          created_at: string | null
          display_color: string | null
          organization_id: string
          tag_description: string | null
          tag_id: string
          tag_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_color?: string | null
          organization_id: string
          tag_description?: string | null
          tag_id?: string
          tag_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_color?: string | null
          organization_id?: string
          tag_description?: string | null
          tag_id?: string
          tag_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      uploaded_file_embeddings: {
        Row: {
          chunk_index: number
          content: string
          content_embedding: string
          created_at: string
          embedding_id: string
          file_id: string
          metadata: Json | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          chunk_index?: number
          content: string
          content_embedding: string
          created_at?: string
          embedding_id?: string
          file_id: string
          metadata?: Json | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          content_embedding?: string
          created_at?: string
          embedding_id?: string
          file_id?: string
          metadata?: Json | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_file_embeddings_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["file_id"]
          },
          {
            foreignKeyName: "uploaded_file_embeddings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          created_at: string
          file_content: string | null
          file_content_summary: string | null
          file_id: string
          file_name: string
          file_size: number
          file_type: string | null
          is_processed: boolean
          organization_id: string
          storage_path: string
          updated_at: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          file_content?: string | null
          file_content_summary?: string | null
          file_id?: string
          file_name: string
          file_size?: number
          file_type?: string | null
          is_processed?: boolean
          organization_id: string
          storage_path: string
          updated_at?: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          file_content?: string | null
          file_content_summary?: string | null
          file_id?: string
          file_name?: string
          file_size?: number
          file_type?: string | null
          is_processed?: boolean
          organization_id?: string
          storage_path?: string
          updated_at?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "uploaded_files_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string
          organization_id: string | null
          updated_at: string | null
          user_id: string
          user_role: Database["public"]["Enums"]["user_role_enum"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name: string
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
          user_role?: Database["public"]["Enums"]["user_role_enum"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
          user_role?: Database["public"]["Enums"]["user_role_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
    }
    Views: {
      team_routing_info: {
        Row: {
          organization_id: string | null
          team_categories: Json | null
          team_description: string | null
          team_id: string | null
          team_name: string | null
          team_tags: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "support_teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      ticket_routing_info: {
        Row: {
          branding_prompt: string | null
          file_summaries: Json | null
          organization_categories: Json | null
          organization_id: string | null
          organization_tags: Json | null
          sla_policy: Json | null
          ticket_description: string | null
          ticket_id: string | null
          ticket_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
    }
    Functions: {
      binary_quantize:
        | {
            Args: {
              "": string
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      create_user_and_organization: {
        Args: {
          user_id: string
          full_name: string
          role: string
          org_name?: string
          org_domain?: string
        }
        Returns: undefined
      }
      fn_check_all_ticket_files_processed: {
        Args: {
          _ticket_id: string
        }
        Returns: boolean
      }
      fn_concatenate_ticket_content: {
        Args: {
          _ticket_id: string
        }
        Returns: string
      }
      halfvec_avg: {
        Args: {
          "": number[]
        }
        Returns: unknown
      }
      halfvec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      halfvec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      hnsw_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      hnswhandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      ivfflathandler: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      l2_norm:
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      l2_normalize:
        | {
            Args: {
              "": string
            }
            Returns: string
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
        | {
            Args: {
              "": unknown
            }
            Returns: unknown
          }
      sparsevec_out: {
        Args: {
          "": unknown
        }
        Returns: unknown
      }
      sparsevec_send: {
        Args: {
          "": unknown
        }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
      vector_avg: {
        Args: {
          "": number[]
        }
        Returns: string
      }
      vector_dims:
        | {
            Args: {
              "": string
            }
            Returns: number
          }
        | {
            Args: {
              "": unknown
            }
            Returns: number
          }
      vector_norm: {
        Args: {
          "": string
        }
        Returns: number
      }
      vector_out: {
        Args: {
          "": string
        }
        Returns: unknown
      }
      vector_send: {
        Args: {
          "": string
        }
        Returns: string
      }
      vector_typmod_in: {
        Args: {
          "": unknown[]
        }
        Returns: number
      }
    }
    Enums: {
      entity_type_enum:
        | "ticket"
        | "ticket_message"
        | "organization"
        | "user_profile"
        | "support_team"
        | "sla_policy"
        | "ticket_category"
        | "ticket_tag"
        | "knowledge_faq"
        | "knowledge_article"
        | "knowledge_file"
        | "notification"
        | "chat_session"
        | "chat_message"
      knowledge_source_enum: "faq" | "article" | "file"
      notification_type_enum:
        | "orphan_ticket"
        | "sla_breach"
        | "team_assignment"
        | "admin_alert"
        | "ticket_error"
        | "ticket_assigned_to_team"
        | "ticket_assigned_to_agent"
        | "ticket_created"
        | "ticket_updated"
        | "ticket_closed"
        | "ticket_reopened"
        | "ticket_escalated"
        | "chat_message"
        | "organization_invite"
        | "organization_billing"
        | "user_mention"
      ticket_error_type_enum:
        | "moderation_failed"
        | "file_processing_error"
        | "routing_failed"
        | "ai_processing_error"
        | "sla_breach"
        | "system_error"
      ticket_lifecycle_stage_enum:
        | "creation"
        | "preprocessing"
        | "routing"
        | "support"
        | "post_resolution"
        | "archived"
      ticket_priority_enum: "low" | "normal" | "high" | "urgent"
      ticket_status_enum:
        | "preprocessing"
        | "orphan"
        | "rejected"
        | "open"
        | "in_progress"
        | "waiting_on_customer"
        | "resolved"
        | "closed"
        | "under_review"
        | "error"
      user_role_enum: "customer" | "agent" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never


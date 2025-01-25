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
      category_embeddings: {
        Row: {
          category_id: string
          content_embedding: string
          created_at: string | null
          embedding_id: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          content_embedding: string
          created_at?: string | null
          embedding_id?: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          content_embedding?: string
          created_at?: string | null
          embedding_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_embeddings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "ticket_categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      file_embeddings: {
        Row: {
          content_embedding: string
          created_at: string | null
          embedding_id: string
          extracted_text: string
          file_id: string
          updated_at: string | null
        }
        Insert: {
          content_embedding: string
          created_at?: string | null
          embedding_id?: string
          extracted_text: string
          file_id: string
          updated_at?: string | null
        }
        Update: {
          content_embedding?: string
          created_at?: string | null
          embedding_id?: string
          extracted_text?: string
          file_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_embeddings_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: true
            referencedRelation: "uploaded_files"
            referencedColumns: ["file_id"]
          },
        ]
      }
      knowledge_article_versions: {
        Row: {
          article_id: string
          content: string
          created_at: string | null
          title: string
          update_reason: string | null
          updated_by_user_id: string
          version_id: string
        }
        Insert: {
          article_id: string
          content: string
          created_at?: string | null
          title: string
          update_reason?: string | null
          updated_by_user_id: string
          version_id?: string
        }
        Update: {
          article_id?: string
          content?: string
          created_at?: string | null
          title?: string
          update_reason?: string | null
          updated_by_user_id?: string
          version_id?: string
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
          created_by_user_id: string
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
          created_by_user_id: string
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
          created_by_user_id?: string
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
      knowledge_base_embeddings: {
        Row: {
          chunk_index: number
          content: string
          content_embedding: string
          created_at: string | null
          embedding_id: string
          metadata: Json | null
          organization_id: string
          source_id: string
          source_type: string
          updated_at: string | null
        }
        Insert: {
          chunk_index: number
          content: string
          content_embedding: string
          created_at?: string | null
          embedding_id?: string
          metadata?: Json | null
          organization_id: string
          source_id: string
          source_type: string
          updated_at?: string | null
        }
        Update: {
          chunk_index?: number
          content?: string
          content_embedding?: string
          created_at?: string | null
          embedding_id?: string
          metadata?: Json | null
          organization_id?: string
          source_id?: string
          source_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_embeddings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["organization_id"]
          },
        ]
      }
      knowledge_faqs: {
        Row: {
          answer: string
          created_at: string | null
          created_by_user_id: string
          faq_id: string
          is_published: boolean
          organization_id: string
          question: string
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          created_by_user_id: string
          faq_id?: string
          is_published?: boolean
          organization_id: string
          question: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          created_by_user_id?: string
          faq_id?: string
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
          created_at: string | null
          created_by_user_id: string
          description: string | null
          extracted_text: string
          file_id: string
          file_reference_id: string
          is_published: boolean
          organization_id: string
          title: string
          updated_at: string | null
          updated_by_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id: string
          description?: string | null
          extracted_text: string
          file_id?: string
          file_reference_id: string
          is_published?: boolean
          organization_id: string
          title: string
          updated_at?: string | null
          updated_by_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string
          description?: string | null
          extracted_text?: string
          file_id?: string
          file_reference_id?: string
          is_published?: boolean
          organization_id?: string
          title?: string
          updated_at?: string | null
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
            foreignKeyName: "knowledge_files_file_reference_id_fkey"
            columns: ["file_reference_id"]
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
      message_embeddings: {
        Row: {
          content_embedding: string
          created_at: string | null
          embedding_id: string
          message_id: string
          updated_at: string | null
        }
        Insert: {
          content_embedding: string
          created_at?: string | null
          embedding_id?: string
          message_id: string
          updated_at?: string | null
        }
        Update: {
          content_embedding?: string
          created_at?: string | null
          embedding_id?: string
          message_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_embeddings_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "ticket_messages"
            referencedColumns: ["message_id"]
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
          created_at: string | null
          notification_id: string
          user_id: string
        }
        Insert: {
          assignment_id?: string
          created_at?: string | null
          notification_id: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
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
          created_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          notification_content: string
          notification_id: string
          notification_title: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          notification_content: string
          notification_id?: string
          notification_title: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          notification_content?: string
          notification_id?: string
          notification_title?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          organization_id?: string | null
          updated_at?: string | null
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
          created_at: string | null
          organization_domain: string
          organization_id: string
          organization_logo_file_id: string | null
          organization_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          organization_domain: string
          organization_id?: string
          organization_logo_file_id?: string | null
          organization_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          organization_domain?: string
          organization_id?: string
          organization_logo_file_id?: string | null
          organization_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_organization_logo_file_id_fkey"
            columns: ["organization_logo_file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["file_id"]
          },
        ]
      }
      read_status: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          read_at: string
          read_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          read_at?: string
          read_id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
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
          created_at: string | null
          created_by_user_id: string
          organization_id: string
          ticket_description: string
          ticket_id: string
          ticket_priority: Database["public"]["Enums"]["ticket_priority_type"]
          ticket_status: Database["public"]["Enums"]["ticket_status_type"]
          ticket_title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to_team_id?: string | null
          assigned_to_user_id?: string | null
          created_at?: string | null
          created_by_user_id: string
          organization_id: string
          ticket_description: string
          ticket_id?: string
          ticket_priority?: Database["public"]["Enums"]["ticket_priority_type"]
          ticket_status?: Database["public"]["Enums"]["ticket_status_type"]
          ticket_title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to_team_id?: string | null
          assigned_to_user_id?: string | null
          created_at?: string | null
          created_by_user_id?: string
          organization_id?: string
          ticket_description?: string
          ticket_id?: string
          ticket_priority?: Database["public"]["Enums"]["ticket_priority_type"]
          ticket_status?: Database["public"]["Enums"]["ticket_status_type"]
          ticket_title?: string
          updated_at?: string | null
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
        ]
      }
      tag_embeddings: {
        Row: {
          content_embedding: string
          created_at: string | null
          embedding_id: string
          tag_id: string
          updated_at: string | null
        }
        Insert: {
          content_embedding: string
          created_at?: string | null
          embedding_id?: string
          tag_id: string
          updated_at?: string | null
        }
        Update: {
          content_embedding?: string
          created_at?: string | null
          embedding_id?: string
          tag_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_embeddings_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: true
            referencedRelation: "ticket_tags"
            referencedColumns: ["tag_id"]
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
            foreignKeyName: "team_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
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
        ]
      }
      ticket_embeddings: {
        Row: {
          content_embedding: string
          created_at: string | null
          embedding_id: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          content_embedding: string
          created_at?: string | null
          embedding_id?: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          content_embedding?: string
          created_at?: string | null
          embedding_id?: string
          ticket_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_embeddings_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "support_tickets"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      ticket_file_attachments: {
        Row: {
          attachment_id: string
          created_at: string | null
          file_id: string
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          attachment_id?: string
          created_at?: string | null
          file_id: string
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          attachment_id?: string
          created_at?: string | null
          file_id?: string
          ticket_id?: string
          updated_at?: string | null
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
        ]
      }
      ticket_messages: {
        Row: {
          agent_has_read: boolean
          created_at: string | null
          customer_has_read: boolean
          is_ai_generated: boolean
          is_internal_note: boolean
          message_content: string
          message_id: string
          sender_user_id: string | null
          ticket_id: string
          updated_at: string | null
        }
        Insert: {
          agent_has_read?: boolean
          created_at?: string | null
          customer_has_read?: boolean
          is_ai_generated?: boolean
          is_internal_note?: boolean
          message_content: string
          message_id?: string
          sender_user_id?: string | null
          ticket_id: string
          updated_at?: string | null
        }
        Update: {
          agent_has_read?: boolean
          created_at?: string | null
          customer_has_read?: boolean
          is_ai_generated?: boolean
          is_internal_note?: boolean
          message_content?: string
          message_id?: string
          sender_user_id?: string | null
          ticket_id?: string
          updated_at?: string | null
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
      uploaded_files: {
        Row: {
          created_at: string | null
          file_id: string
          file_name: string
          file_size: number
          file_type: string
          storage_path: string
          updated_at: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_id?: string
          file_name: string
          file_size?: number
          file_type: string
          storage_path: string
          updated_at?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          storage_path?: string
          updated_at?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_file_id: string | null
          created_at: string | null
          display_name: string
          organization_id: string | null
          updated_at: string | null
          user_id: string
          user_role: Database["public"]["Enums"]["user_role_type"]
        }
        Insert: {
          avatar_file_id?: string | null
          created_at?: string | null
          display_name: string
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
          user_role: Database["public"]["Enums"]["user_role_type"]
        }
        Update: {
          avatar_file_id?: string | null
          created_at?: string | null
          display_name?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
          user_role?: Database["public"]["Enums"]["user_role_type"]
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_avatar_file_id_fkey"
            columns: ["avatar_file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["file_id"]
          },
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
      [_ in never]: never
    }
    Functions: {
      create_user_and_organization: {
        Args: {
          user_id: string
          full_name: string
          role: Database["public"]["Enums"]["user_role_type"]
          org_name: string
          org_domain: string
        }
        Returns: undefined
      }
      match_knowledge_base: {
        Args: {
          query_embedding: string
          match_threshold?: number
          match_count?: number
          organization_id?: string
        }
        Returns: {
          embedding_id: string
          source_type: string
          source_id: string
          content: string
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      entity_type:
        | "support_tickets"
        | "ticket_messages"
        | "user_profiles"
        | "organizations"
        | "support_teams"
        | "team_memberships"
        | "ticket_categories"
        | "ticket_tags"
        | "ticket_category_assignments"
        | "ticket_tag_assignments"
        | "uploaded_files"
        | "knowledge_faqs"
        | "knowledge_articles"
        | "knowledge_files"
        | "knowledge_base_embeddings"
        | "knowledge_article_versions"
        | "read_status"
        | "notifications"
        | "notification_assignments"
      notification_type:
        | "orphan_ticket"
        | "high_priority"
        | "sla_breach"
        | "team_assignment"
      ticket_priority_type: "low" | "normal" | "high" | "urgent"
      ticket_status_type:
        | "open"
        | "in_progress"
        | "waiting_on_customer"
        | "resolved"
        | "closed"
      user_role_type: "customer" | "agent" | "admin"
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


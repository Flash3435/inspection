export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          report_template: string;
          site_name: string;
          client_name: string;
          inspector_name: string;
          inspection_date: string | null;
          project_number: string | null;
          report_number: string | null;
          site_address: string | null;
          building_permit_no: string | null;
          contractor_name: string | null;
          prepared_by: string | null;
          reviewed_by: string | null;
          visit_date: string | null;
          report_date: string | null;
          reason_for_visit: string | null;
          weather_conditions: string | null;
          contractor_present: string | null;
          distribution_list: string | null;
          is_sample_project: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          report_template?: string;
          site_name?: string;
          client_name?: string;
          inspector_name?: string;
          inspection_date?: string | null;
          project_number?: string | null;
          report_number?: string | null;
          site_address?: string | null;
          building_permit_no?: string | null;
          contractor_name?: string | null;
          prepared_by?: string | null;
          reviewed_by?: string | null;
          visit_date?: string | null;
          report_date?: string | null;
          reason_for_visit?: string | null;
          weather_conditions?: string | null;
          contractor_present?: string | null;
          distribution_list?: string | null;
          is_sample_project?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      observations: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string;
          location: string;
          status: string;
          discipline: string;
          priority: string | null;
          contractor_action_required: boolean;
          note: string;
          draft_text: string;
          recommended_action: string | null;
          transcripts: Json;
          draft_warnings: Json;
          draft_generated_at: string | null;
          draft_source_summary: string | null;
          draft_manually_edited: boolean;
          observation_number: string | null;
          code_reference_ids: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title: string;
          location?: string;
          status?: string;
          discipline?: string;
          priority?: string | null;
          contractor_action_required?: boolean;
          note?: string;
          draft_text?: string;
          recommended_action?: string | null;
          transcripts?: Json;
          draft_warnings?: Json;
          draft_generated_at?: string | null;
          draft_source_summary?: string | null;
          draft_manually_edited?: boolean;
          observation_number?: string | null;
          code_reference_ids?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["observations"]["Insert"]>;
        Relationships: [];
      };
      media_items: {
        Row: {
          id: string;
          project_id: string;
          observation_id: string;
          user_id: string;
          type: string;
          storage_path: string;
          filename: string;
          mime_type: string;
          size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          observation_id: string;
          user_id: string;
          type: string;
          storage_path: string;
          filename: string;
          mime_type?: string;
          size?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["media_items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type ObservationRow = Database["public"]["Tables"]["observations"]["Row"];
export type MediaItemRow = Database["public"]["Tables"]["media_items"]["Row"];

export interface MediaIdsByObservation {
  photoIds: string[];
  audioIds: string[];
}

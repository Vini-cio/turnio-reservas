export type Role = "provider" | "client";

export type BookingStatus = "confirmed" | "cancelled";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
};

export type Service = {
  id: string;
  provider_id: string;
  name: string;
  duration_min: number;
  price_cents: number;
  created_at: string;
};

export type Slot = {
  id: string;
  provider_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
};

export type Booking = {
  id: string;
  slot_id: string;
  client_id: string;
  status: BookingStatus;
  cancelled_at: string | null;
  created_at: string;
};

/** Fila devuelta por la función `free_slots`. */
export type FreeSlot = {
  id: string;
  service_id: string;
  service_name: string;
  duration_min: number;
  price_cents: number;
  starts_at: string;
  ends_at: string;
};

type ServiceInsert = {
  id?: string;
  provider_id?: string;
  name: string;
  duration_min: number;
  price_cents: number;
  created_at?: string;
};

/** `ends_at` lo calcula el trigger a partir de la duración del servicio. */
type SlotInsert = {
  id?: string;
  provider_id?: string;
  service_id: string;
  starts_at: string;
  ends_at?: string;
  created_at?: string;
};

/** Tipos del esquema `public` para el cliente tipado de Supabase. */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: never;
        Update: Pick<Profile, "full_name">;
        Relationships: [];
      };
      services: {
        Row: Service;
        Insert: ServiceInsert;
        Update: Partial<Pick<Service, "name" | "duration_min" | "price_cents">>;
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      slots: {
        Row: Slot;
        Insert: SlotInsert;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "slots_provider_id_fkey";
            columns: ["provider_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "slots_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: Booking;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "bookings_slot_id_fkey";
            columns: ["slot_id"];
            isOneToOne: false;
            referencedRelation: "slots";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      book_slot: { Args: { p_slot_id: string }; Returns: string };
      cancel_booking: { Args: { p_booking_id: string }; Returns: undefined };
      free_slots: { Args: { p_provider_id: string }; Returns: FreeSlot[] };
      is_provider: { Args: Record<never, never>; Returns: boolean };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

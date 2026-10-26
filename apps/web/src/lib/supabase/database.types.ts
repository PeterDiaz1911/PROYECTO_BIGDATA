export type RoleCode =
  | "admin"
  | "operator"
  | "sorter"
  | "transport"
  | "courier"
  | "analyst"
  | "client";

export type ShipmentStatus =
  | "registered"
  | "classified"
  | "in_transit"
  | "at_destination"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "returned";

export type Profile = {
  id: string;
  full_name: string;
  role_code: RoleCode;
  agency_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type Shipment = {
  id: string;
  tracking_code: string;
  customer_id: string;
  agency_id: string;
  registered_by: string;
  destination: string;
  public_description: string;
  service: "standard" | "express";
  weight_kg: number;
  contents: string;
  status: ShipmentStatus;
  created_at: string;
  updated_at: string;
};

export type ShipmentHistory = {
  id: number;
  shipment_id: string;
  status: ShipmentStatus;
  note: string;
  actor_id: string;
  created_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      roles: Table<{ code: RoleCode; name: string }, { code: RoleCode; name: string }>;
      agencies: Table<
        { id: string; name: string; region: string; city: string; created_at: string },
        { id?: string; name: string; region: string; city: string; created_at?: string }
      >;
      profiles: Table<Profile, Partial<Profile> & Pick<Profile, "id" | "full_name">>;
      customers: Table<
        { user_id: string; full_name: string; email: string; created_at: string },
        { user_id: string; full_name: string; email: string; created_at?: string }
      >;
      shipments: Table<Shipment, Partial<Shipment> & Pick<Shipment, "customer_id" | "agency_id" | "registered_by" | "destination" | "service" | "weight_kg" | "contents">>;
      shipment_history: Table<
        ShipmentHistory,
        Partial<ShipmentHistory> & Pick<ShipmentHistory, "shipment_id" | "status" | "note" | "actor_id">
      >;
      shipment_assignments: Table<
        { shipment_id: string; user_id: string; role_code: "sorter" | "transport" | "courier"; assigned_by: string; created_at: string },
        { shipment_id: string; user_id: string; role_code: "sorter" | "transport" | "courier"; assigned_by: string; created_at?: string }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      current_role: { Args: Record<string, never>; Returns: string | null };
      has_role: { Args: { allowed_roles: string[] }; Returns: boolean };
      create_shipment: {
        Args: {
          p_customer_email: string;
          p_destination: string;
          p_public_description: string;
          p_service: string;
          p_weight_kg: number;
          p_contents: string;
        };
        Returns: Pick<Shipment, "id" | "tracking_code" | "status" | "created_at">[];
      };
      update_shipment_status: {
        Args: { p_tracking_code: string; p_status: string; p_note: string };
        Returns: Pick<Shipment, "id" | "tracking_code" | "status" | "updated_at">[];
      };
      assign_shipment: {
        Args: { p_tracking_code: string; p_staff_id: string; p_role_code: "sorter" | "transport" | "courier" };
        Returns: { tracking_code: string; user_id: string; role_code: "sorter" | "transport" | "courier"; created_at: string }[];
      };
      lookup_public_tracking: {
        Args: { p_tracking_code: string };
        Returns: {
          tracking_code: string;
          status: string;
          agency_name: string;
          city: string;
          created_at: string;
          updated_at: string;
          public_description: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

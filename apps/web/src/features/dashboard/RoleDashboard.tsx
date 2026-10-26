"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/supabase/database.types";
import { ShipmentWorkspace } from "@/features/shipments/ShipmentWorkspace";

export function RoleDashboard({
  client,
  profile,
  activeItem,
}: {
  client: SupabaseClient<Database>;
  profile: Profile;
  activeItem: string;
}) {
  return <ShipmentWorkspace client={client} profile={profile} activeItem={activeItem} />;
}

import type { Database } from "./database.types";

export type PublicTableName = keyof Database["public"]["Tables"];

export type PublicTableRow<Table extends PublicTableName> =
  Database["public"]["Tables"][Table]["Row"];

export type PublicTableInsert<Table extends PublicTableName> =
  Database["public"]["Tables"][Table]["Insert"];

export type PublicTableUpdate<Table extends PublicTableName> =
  Database["public"]["Tables"][Table]["Update"];

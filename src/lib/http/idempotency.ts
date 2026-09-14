import "server-only";
// The repository RPC uses the unique constraint, never a check-then-insert.
export { accept as insertOrReturn } from "@/repositories/integrations";

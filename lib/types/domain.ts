// Domain model barrel. All types are defined in split files for maintainability.
// Re-export everything from the domain-* modules.

export * from "./domain-base";
export * from "./domain-core";
export * from "./domain-rental";
export * from "./domain-charge";
export * from "./domain-sale";
export * from "./domain-condo";
export * from "./domain-crm";
export * from "./domain-whatsapp";
export * from "./domain-calendar";
export * from "./domain-automation";
export * from "./domain-audit";

// Re-export Role from permissions to preserve original import location.
export type { Role } from "./permissions";

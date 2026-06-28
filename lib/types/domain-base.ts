// Shared base entity. All domain entities extend this.

export interface BaseEntity {
  id: string;
  tenancyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

/** Credential metadata returned from the API (no secret value exposed). */
export interface UserAdapterCredential {
  id: string;
  userId: string;
  adapterType: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

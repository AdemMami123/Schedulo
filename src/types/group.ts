export interface Group {
  id: string;
  name: string;
  members: string[]; // Array of user UIDs
  createdAt: number;
  createdBy: string; // UID of creator
}
import { create } from 'zustand';

export interface SelectedSchool {
  id: string;
  name: string;
  udise_code?: string;
  address?: string;
  school_type?: string;
  health_score?: number;
  health_grade?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

interface SchoolState {
  selectedSchool: SelectedSchool | null;
  setSelectedSchool: (school: SelectedSchool | null) => void;
  clearSelectedSchool: () => void;
}

export const useSchoolStore = create<SchoolState>((set) => ({
  selectedSchool: null,
  setSelectedSchool: (school) => set({ selectedSchool: school }),
  clearSelectedSchool: () => set({ selectedSchool: null }),
}));

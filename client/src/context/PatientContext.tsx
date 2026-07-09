import { createContext, useContext, useState } from "react";

export type Patient = "yayo" | "tina";

interface PatientContextType {
  patient: Patient;
  setPatient: (p: Patient) => void;
  isYayo: boolean;
  isTina: boolean;
  patientLabel: string;
  patientAge: string;
  /** Returns true if a study title belongs to the current patient */
  studyBelongsToPatient: (title: string) => boolean;
}

const PatientContext = createContext<PatientContextType | null>(null);

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<Patient>("yayo");

  const isYayo = patient === "yayo";
  const isTina = patient === "tina";
  const patientLabel = isYayo ? "Yayo" : "Tina";
  const patientAge = isYayo ? "54 años · Masculino" : "53 años · Femenino";

  /** Yayo's studies have NO [TINA] prefix. Tina's studies DO have [TINA] prefix. */
  const studyBelongsToPatient = (title: string) => {
    const hasTinaPrefix = title?.startsWith("[TINA]");
    return isTina ? hasTinaPrefix : !hasTinaPrefix;
  };

  return (
    <PatientContext.Provider value={{
      patient, setPatient,
      isYayo, isTina,
      patientLabel, patientAge,
      studyBelongsToPatient,
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error("usePatient must be used within PatientProvider");
  return ctx;
}

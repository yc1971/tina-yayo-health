import {
  type Study, type InsertStudy,
  type LabResult, type InsertLabResult,
  type ImagingFinding, type InsertImagingFinding,
  type HealthAlert, type InsertHealthAlert,
} from "@shared/schema";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://iauxhqenkavakilnzhuw.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdXhocWVua2F2YWtpbG56aHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1ODU0NDQsImV4cCI6MjA5OTE2MTQ0NH0.ZuLPKpvYRtA3CExwgDayOi12xFaPqk63smHfz73rjhM";

function sbHeaders() {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Prefer": "return=representation",
  };
}

async function sbGet<T>(table: string, query = ""): Promise<T[]> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: sbHeaders(),
  });
  if (!resp.ok) throw new Error(`Supabase GET ${table}: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function sbPost<T>(table: string, body: object): Promise<T> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Supabase POST ${table}: ${resp.status} ${await resp.text()}`);
  const rows = await resp.json() as T[];
  return rows[0];
}

async function sbPatch(table: string, id: number, body: object): Promise<void> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: sbHeaders(),
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Supabase PATCH ${table}: ${resp.status} ${await resp.text()}`);
}

async function sbDelete(table: string, filter: string): Promise<void> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: sbHeaders(),
  });
  if (!resp.ok) throw new Error(`Supabase DELETE ${table}: ${resp.status} ${await resp.text()}`);
}

// Map snake_case DB rows to camelCase app types
function mapStudy(r: any): Study {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    studyDate: r.study_date,
    facility: r.facility,
    doctor: r.doctor,
    notes: r.notes,
    fileUrl: r.file_url,
    fileName: r.file_name,
    createdAt: r.created_at,
  };
}

function mapLabResult(r: any): LabResult {
  return {
    id: r.id,
    studyId: r.study_id,
    markerName: r.marker_name,
    value: r.value,
    unit: r.unit,
    referenceMin: r.reference_min,
    referenceMax: r.reference_max,
    status: r.status,
    notes: r.notes,
  };
}

function mapImagingFinding(r: any): ImagingFinding {
  return {
    id: r.id,
    studyId: r.study_id,
    bodyPart: r.body_part,
    finding: r.finding,
    severity: r.severity,
    followUpRequired: r.follow_up_required,
    notes: r.notes,
  };
}

function mapAlert(r: any): HealthAlert {
  return {
    id: r.id,
    studyId: r.study_id,
    type: r.type,
    title: r.title,
    description: r.description,
    resolved: r.resolved,
    createdAt: r.created_at,
  };
}

export interface IStorage {
  getAllStudies(): Promise<Study[]>;
  getStudyById(id: number): Promise<Study | undefined>;
  createStudy(data: InsertStudy): Promise<Study>;
  deleteStudy(id: number): Promise<void>;

  getLabResultsByStudy(studyId: number): Promise<LabResult[]>;
  createLabResult(data: InsertLabResult): Promise<LabResult>;
  deleteLabResultsByStudy(studyId: number): Promise<void>;

  getImagingFindingsByStudy(studyId: number): Promise<ImagingFinding[]>;
  createImagingFinding(data: InsertImagingFinding): Promise<ImagingFinding>;
  deleteImagingFindingsByStudy(studyId: number): Promise<void>;

  getAllAlerts(): Promise<HealthAlert[]>;
  getUnresolvedAlerts(): Promise<HealthAlert[]>;
  createAlert(data: InsertHealthAlert): Promise<HealthAlert>;
  resolveAlert(id: number): Promise<void>;
}

export const storage: IStorage = {
  async getAllStudies() {
    const rows = await sbGet<any>("studies", "order=study_date.desc");
    return rows.map(mapStudy);
  },
  async getStudyById(id) {
    const rows = await sbGet<any>("studies", `id=eq.${id}`);
    return rows.length ? mapStudy(rows[0]) : undefined;
  },
  async createStudy(data) {
    const row = await sbPost<any>("studies", {
      title: data.title,
      category: data.category,
      study_date: data.studyDate,
      facility: data.facility,
      doctor: data.doctor,
      notes: data.notes,
      file_url: data.fileUrl,
      file_name: data.fileName,
      created_at: new Date().toISOString(),
    });
    return mapStudy(row);
  },
  async deleteStudy(id) {
    await sbDelete("studies", `id=eq.${id}`);
  },

  async getLabResultsByStudy(studyId) {
    const rows = await sbGet<any>("lab_results", `study_id=eq.${studyId}`);
    return rows.map(mapLabResult);
  },
  async createLabResult(data) {
    const row = await sbPost<any>("lab_results", {
      study_id: data.studyId,
      marker_name: data.markerName,
      value: data.value,
      unit: data.unit,
      reference_min: data.referenceMin,
      reference_max: data.referenceMax,
      status: data.status,
      notes: data.notes,
    });
    return mapLabResult(row);
  },
  async deleteLabResultsByStudy(studyId) {
    await sbDelete("lab_results", `study_id=eq.${studyId}`);
  },

  async getImagingFindingsByStudy(studyId) {
    const rows = await sbGet<any>("imaging_findings", `study_id=eq.${studyId}`);
    return rows.map(mapImagingFinding);
  },
  async createImagingFinding(data) {
    const row = await sbPost<any>("imaging_findings", {
      study_id: data.studyId,
      body_part: data.bodyPart,
      finding: data.finding,
      severity: data.severity,
      follow_up_required: data.followUpRequired,
      notes: data.notes,
    });
    return mapImagingFinding(row);
  },
  async deleteImagingFindingsByStudy(studyId) {
    await sbDelete("imaging_findings", `study_id=eq.${studyId}`);
  },

  async getAllAlerts() {
    const rows = await sbGet<any>("health_alerts", "order=created_at.desc");
    return rows.map(mapAlert);
  },
  async getUnresolvedAlerts() {
    const rows = await sbGet<any>("health_alerts", "resolved=eq.0&order=created_at.desc");
    return rows.map(mapAlert);
  },
  async createAlert(data) {
    const row = await sbPost<any>("health_alerts", {
      study_id: data.studyId,
      type: data.type,
      title: data.title,
      description: data.description,
      resolved: 0,
      created_at: new Date().toISOString(),
    });
    return mapAlert(row);
  },
  async resolveAlert(id) {
    await sbPatch("health_alerts", id, { resolved: 1 });
  },
};

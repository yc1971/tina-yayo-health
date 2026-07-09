import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Studies table - each medical study/exam
export const studies = sqliteTable("studies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  category: text("category").notNull(), // 'lab', 'scan', 'xray', 'other'
  studyDate: text("study_date").notNull(),
  facility: text("facility"),
  doctor: text("doctor"),
  notes: text("notes"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  createdAt: text("created_at").notNull(),
});

// Lab results - individual markers from blood work
export const labResults = sqliteTable("lab_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studyId: integer("study_id").notNull(),
  markerName: text("marker_name").notNull(),
  value: real("value"),
  unit: text("unit"),
  referenceMin: real("reference_min"),
  referenceMax: real("reference_max"),
  status: text("status"), // 'normal', 'high', 'low', 'critical'
  notes: text("notes"),
});

// Scan/imaging findings
export const imagingFindings = sqliteTable("imaging_findings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studyId: integer("study_id").notNull(),
  bodyPart: text("body_part"),
  finding: text("finding").notNull(),
  severity: text("severity"), // 'normal', 'mild', 'moderate', 'severe'
  followUpRequired: integer("follow_up_required").default(0), // boolean
  notes: text("notes"),
});

// Health alerts and recommendations
export const healthAlerts = sqliteTable("health_alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studyId: integer("study_id"),
  type: text("type").notNull(), // 'warning', 'critical', 'recommendation', 'prevention'
  title: text("title").notNull(),
  description: text("description").notNull(),
  resolved: integer("resolved").default(0),
  createdAt: text("created_at").notNull(),
});

// Insert schemas
export const insertStudySchema = createInsertSchema(studies).omit({ id: true, createdAt: true });
export const insertLabResultSchema = createInsertSchema(labResults).omit({ id: true });
export const insertImagingFindingSchema = createInsertSchema(imagingFindings).omit({ id: true });
export const insertHealthAlertSchema = createInsertSchema(healthAlerts).omit({ id: true, createdAt: true });

// Types
export type Study = typeof studies.$inferSelect;
export type InsertStudy = z.infer<typeof insertStudySchema>;
export type LabResult = typeof labResults.$inferSelect;
export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
export type ImagingFinding = typeof imagingFindings.$inferSelect;
export type InsertImagingFinding = z.infer<typeof insertImagingFindingSchema>;
export type HealthAlert = typeof healthAlerts.$inferSelect;
export type InsertHealthAlert = z.infer<typeof insertHealthAlertSchema>;

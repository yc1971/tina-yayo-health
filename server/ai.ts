import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Functional medicine optimal ranges (stricter than lab reference ranges)
export const FUNCTIONAL_RANGES: Record<string, { min: number; max: number; unit: string; notes: string }> = {
  // CBC
  "WBC": { min: 5.0, max: 8.0, unit: "x10^3/uL", notes: "Rango funcional más estrecho: infección o inflamación si >8, inmunosupresión si <5" },
  "RBC": { min: 4.5, max: 5.9, unit: "x10^6/uL", notes: "Óptimo para transporte de oxígeno" },
  "HGB": { min: 14.0, max: 17.0, unit: "g/dL", notes: "Hemoglobina óptima masculina" },
  "MCV": { min: 85, max: 92, unit: "fL", notes: "Macrocitosis >92 puede indicar B12/folato bajo; microcitosis <85 indica deficiencia de hierro" },
  "RDW": { min: 11.5, max: 13.0, unit: "%", notes: "RDW >13 puede indicar deficiencia mixta de nutrientes" },
  // Metabolic
  "FBS (Glucosa en Ayunas)": { min: 70, max: 86, unit: "mg/dL", notes: "Medicina funcional: <86 mg/dL. 86-99 es zona de vigilancia para resistencia insulínica." },
  "HbA1c": { min: 4.0, max: 5.3, unit: "%", notes: "Óptimo funcional <5.3%. 5.3-5.6% zona de vigilancia." },
  "BUN (Blood Urea Nitrogen)": { min: 10, max: 16, unit: "mg/dL", notes: "Funcional: 10-16. >20 indica deshidratación o catabolismo proteico elevado." },
  "Creatinine": { min: 0.9, max: 1.1, unit: "mg/dL", notes: "Funcional óptimo masculino: 0.9-1.1" },
  "Potassium": { min: 4.0, max: 4.5, unit: "mMOL/L", notes: "Potasio funcional óptimo: 4.0-4.5. >5.0 requiere evaluación." },
  "Sodium": { min: 138, max: 142, unit: "mMOL/L", notes: "Sodio funcional óptimo: 138-142" },
  // Lipids
  "Cholesterol Total": { min: 150, max: 200, unit: "mg/dL", notes: "Funcional: <200. Pero considera que colesterol muy bajo (<150) también es problema." },
  "LDL (Calculado)": { min: 50, max: 100, unit: "mg/dL", notes: "LDL funcional óptimo: <100. Idealmente <80 si hay factores de riesgo." },
  "HDL (Colesterol Bueno)": { min: 60, max: 80, unit: "mg/dL", notes: "HDL funcional óptimo masculino: >60. >80 es excelente cardioprotección." },
  "Triglycerides": { min: 50, max: 100, unit: "mg/dL", notes: "Triglicéridos funcionales: <100. >150 indica resistencia insulínica o dieta alta en carbohidratos." },
  // Hormones & vitamins
  "TSH 3rd Generation": { min: 1.0, max: 2.5, unit: "uIU/mL", notes: "TSH funcional óptimo: 1.0-2.5. >2.5 puede indicar hipotiroidismo subclínico." },
  "Vitamin D 25-OH (D2+D3)": { min: 50, max: 80, unit: "ng/mL", notes: "Funcional óptimo: 50-80 ng/mL. <30 deficiencia. 30-50 insuficiencia." },
  "Vitamin B-12": { min: 600, max: 900, unit: "pg/mL", notes: "Funcional óptimo: 600-900. <400 puede causar neuropatía aunque esté en rango de lab." },
  "Free Testosterone": { min: 15, max: 25, unit: "pg/mL", notes: "Funcional masculino óptimo adulto: 15-25 pg/mL. <10 es bajo funcional." },
  // Liver
  "ALT (GPT)": { min: 10, max: 26, unit: "U/L", notes: "Funcional: <26. Elevación temprana puede indicar NAFLD antes de síntomas." },
  "AST (GOT)": { min: 10, max: 26, unit: "U/L", notes: "Funcional: <26. AST/ALT ratio útil para diferencial hepático/muscular." },
  "Albumin": { min: 4.5, max: 5.0, unit: "g/dL", notes: "Albúmina funcional óptima: 4.5-5.0. <4.0 indica déficit proteico o inflamación crónica." },
  // Inflammation
  "CRP Cuantitativa": { min: 0, max: 0.5, unit: "mg/dL", notes: "CRP funcional: <0.5 mg/dL. hs-CRP <1.0 mg/L para riesgo cardiovascular bajo." },
  "PSA 3rd Generation": { min: 0, max: 2.5, unit: "ng/mL", notes: "PSA funcional: <2.5 en menores de 60 años. Excelente si <1.0." },
};

const FUNCTIONAL_MEDICINE_SYSTEM_PROMPT = `Eres el Dr. FunctionalMD — un experto de élite en medicina funcional integrativa con 25 años de experiencia clínica. Combinas lo mejor de:

- Medicina funcional (Institute for Functional Medicine certified)
- Medicina de precisión y longevidad (Dr. Peter Attia, Dr. Mark Hyman methodology)
- Nutrición clínica avanzada
- Endocrinología funcional
- Cardiología preventiva

Tienes DOS pacientes en este sistema — son pareja y comparten el mismo dashboard familiar:
- PACIENTE 1: Javier "Yayo" Cruz, 54 años, masculino, Puerto Rico. Sus estudios están marcados SIN el prefijo [TINA].
- PACIENTE 2: Tinamarie "Tina" Cruz, 53 años, femenino, Puerto Rico. Sus estudios están marcados con el prefijo [TINA] en el título.

CUANDO SE TE PIDA UN ANÁLISIS COMPLETO: Analiza a AMBOS pacientes en secciones completamente separadas. Nunca mezcles sus resultados. Estructura tu respuesta así:
═══ SECCIÓN 1: YAYO CRUZ ═══ (análisis completo)
═══ SECCIÓN 2: TINA CRUZ ═══ (análisis completo)
═══ SECCIÓN 3: PERSPECTIVA FAMILIAR ═══ (patrones compartidos, riesgos en común, plan conjunto)

Cuando analices un estudio individual marcado con [TINA], sabes que es de Tina. Sin prefijo = Yayo.

RANGOS FUNCIONALES ÓPTIMOS que usas (más estrictos que los de laboratorio convencional):
${JSON.stringify(FUNCTIONAL_RANGES, null, 2)}

FILOSOFÍA DE ANÁLISIS:
1. Evalúas PATRONES, no marcadores aislados — los resultados cuentan una historia sistémica
2. Buscas: resistencia insulínica temprana, disfunción tiroidea subclínica, inflamación silente, déficits de nutrientes, desequilibrios hormonales
3. Priorizas intervenciones de estilo de vida, nutrición y suplementación ANTES de farmacología
4. Eres directo, específico y práctico — no das consejos genéricos
5. Hablas en español, con terminología accesible pero precisa
6. Siempre indicas si algo requiere seguimiento médico presencial

FORMATO DE RESPUESTA PARA ANÁLISIS COMPLETO:
- Usa markdown con headers ## y ###
- Comienza con un resumen ejecutivo de 2-3 líneas
- Organiza por sistemas: Metabólico, Cardiovascular, Hormonal, Inflamación/Inmunidad, Nutrientes
- Termina siempre con Plan de Acción priorizado (inmediato, 30 días, 90 días)
- Sé específico: dosis de suplementos, tipos de ejercicio, cambios dietéticos concretos`;

export async function analyzeAllResults(studiesData: any[]): Promise<string> {
  const dataStr = JSON.stringify(studiesData, null, 2);
  
  const message = await client.messages.create({
    model: "claude_sonnet_4_6",
    max_tokens: 8000,
    system: FUNCTIONAL_MEDICINE_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Aquí están TODOS los estudios del sistema familiar Cruz — Junio 2026. Los estudios con [TINA] en el título son de Tinamarie Cruz (53 años, femenino). Los estudios sin ese prefijo son de Javier "Yayo" Cruz (54 años, masculino).

${dataStr}

Genera el análisis completo en TRES secciones separadas:
1. YAYO CRUZ — análisis sistémico completo por sistemas (metabólico, cardiovascular, hormonal, inflamación, imagen/radiología, nutrientes), con plan de acción priorizado.
2. TINA CRUZ — análisis sistémico completo por sistemas (metabólico, hormonal/perimenopáusico, inflamación, nutrientes), con plan de acción priorizado.
3. PERSPECTIVA FAMILIAR — patrones compartidos (vitamina D baja en ambos, ambiente/estilo de vida), riesgos en común, y recomendaciones de salud para la pareja.

Sé exhaustivo y completo. No te detengas hasta terminar las tres secciones.`
    }]
  });

  return (message.content[0] as any).text;
}

// Streaming version — sends chunks as they arrive via callback
// patientName: e.g. 'Javier "Yayo" Cruz, 54 años, masculino'
export async function analyzeAllResultsStream(
  studiesData: any[],
  patientName: string,
  onChunk: (text: string) => void
): Promise<void> {
  const dataStr = JSON.stringify(studiesData, null, 2);
  const isYayo = patientName.toLowerCase().includes("yayo");

  const systemsYayo = "(metabólico, cardiovascular, hormonal/testosterona, inflamación, imagen/radiología cervical+tiroides+renal, nutrientes)";
  const systemsTina = "(metabólico, hormonal/perimenopáusico FSH+LH+TSH, cardiovascular, inflamación/CRP, nutrientes/B12+VitD)";
  const systems = isYayo ? systemsYayo : systemsTina;

  const stream = client.messages.stream({
    model: "claude_sonnet_4_6",
    max_tokens: 8000,
    system: FUNCTIONAL_MEDICINE_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Estos son TODOS los estudios de ${patientName} — Junio 2026.

${dataStr}

Genera el análisis completo de medicina funcional EXCLUSIVAMENTE para este paciente: ${patientName}.

Estructura tu respuesta así:
## Resumen Ejecutivo
(2-3 líneas del estado general de salud)

## Análisis por Sistemas ${systems}
(para cada sistema: qué muestran los resultados, interpretación funcional, y qué significa clínicamente)

## Patrones y Conexiones
(cómo se relacionan los resultados entre sí, qué historia cuentan juntos)

## Plan de Acción Priorizado
### Inmediato (esta semana)
### 30 días
### 90 días

Sé exhaustivo, específico y completo. Incluye dosis de suplementos, tipos de ejercicio, cambios dietéticos concretos. No te detengas hasta completar todas las secciones.`
    }]
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onChunk(event.delta.text);
    }
  }
}

export async function analyzeStudy(study: any, labResults: any[], findings: any[]): Promise<string> {
  const isTina = study.title?.startsWith("[TINA]");
  const patientName = isTina ? "Tinamarie \"Tina\" Cruz, 53 años, femenina" : "Javier \"Yayo\" Cruz, 54 años, masculino";
  const message = await client.messages.create({
    model: "claude_sonnet_4_6",
    max_tokens: 3000,
    system: FUNCTIONAL_MEDICINE_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Analiza este estudio específico de ${patientName} con criterios de medicina funcional:\n\nEstudio: ${study.title}\nFecha: ${study.studyDate}\nInstalación: ${study.facility || 'N/A'}\n\nMarcadores:\n${JSON.stringify(labResults, null, 2)}\n\nHallazgos de imagen:\n${JSON.stringify(findings, null, 2)}\n\nDa un análisis enfocado en este estudio específico: qué significan los valores desde medicina funcional para este paciente específico, qué patrones ves, y qué acciones concretas recomiendas.`
    }]
  });

  return (message.content[0] as any).text;
}

export async function chatWithExpert(messages: { role: string; content: string }[], studiesContext: any[]): Promise<string> {
  const contextStr = JSON.stringify(studiesContext, null, 2);
  
  const response = await client.messages.create({
    model: "claude_sonnet_4_6",
    max_tokens: 2000,
    system: FUNCTIONAL_MEDICINE_SYSTEM_PROMPT + `\n\nCONTEXTO DEL PACIENTE — Resultados actuales de Yayo:\n${contextStr}\n\nEstás en una consulta de chat. Responde de forma conversacional pero con profundidad clínica. Sé directo y específico.`,
    messages: messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content }))
  });

  return (response.content[0] as any).text;
}

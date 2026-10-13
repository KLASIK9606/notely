export const transcriptionSchema: Record<string, any>;
export const materialsSchema: Record<string, any>;
export function validTranscription(value: any): boolean;
export function validMaterials(value: any, lines: string[]): boolean;
export function validateSchema(value: any, schema: any): boolean;

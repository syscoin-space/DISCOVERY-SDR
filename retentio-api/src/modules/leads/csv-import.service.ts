import { parse as csvParse } from 'csv-parse/sync';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';

// Schema leniente para cada linha do CSV — todos campos opcionais exceto company_name
const csvRowSchema = z.object({
  company_name: z.string().min(1, 'company_name é obrigatório'),
  niche: z.string().max(100).optional().default(''),
  cnpj: z.string().max(18).optional().default(''),
  contact_name: z.string().max(150).optional().default(''),
  contact_role: z.string().max(100).optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  phone: z.string().max(20).optional().default(''),
  whatsapp: z.string().max(20).optional().default(''),
  instagram_handle: z.string().max(50).optional().default(''),
  linkedin_url: z.string().url().optional().or(z.literal('')).default(''),
  website_url: z.string().url().optional().or(z.literal('')).default(''),
  state: z.string().max(2).optional().default(''),
  city: z.string().max(100).optional().default(''),
  ecommerce_platform: z.string().max(50).optional().default(''),
  estimated_base_size: z.coerce.number().int().nonnegative().optional(),
  avg_ticket_estimated: z.coerce.number().nonnegative().optional(),
  notes_import: z.string().optional().default(''),
  source: z.string().max(50).optional().default(''),
});

type CsvRow = z.infer<typeof csvRowSchema>;

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

// Normaliza CNPJ removendo pontuação
function normalizeCnpj(raw: string): string {
  return raw.replace(/\D/g, '');
}

// Converte campos vazios para undefined (Prisma ignora undefined)
function toNullable(val: string | undefined): string | undefined {
  return val && val.trim() !== '' ? val.trim() : undefined;
}

function buildLeadData(row: CsvRow, sdrId: string) {
  const cnpjNorm = row.cnpj ? normalizeCnpj(row.cnpj) : undefined;
  return {
    sdr_id: sdrId,
    company_name: row.company_name.trim(),
    niche: toNullable(row.niche),
    cnpj: cnpjNorm && cnpjNorm !== '' ? cnpjNorm : undefined,
    contact_name: toNullable(row.contact_name),
    contact_role: toNullable(row.contact_role),
    email: toNullable(row.email),
    phone: toNullable(row.phone),
    whatsapp: toNullable(row.whatsapp),
    instagram_handle: toNullable(row.instagram_handle),
    linkedin_url: toNullable(row.linkedin_url),
    website_url: toNullable(row.website_url),
    state: toNullable(row.state),
    city: toNullable(row.city),
    ecommerce_platform: toNullable(row.ecommerce_platform),
    estimated_base_size: row.estimated_base_size ?? undefined,
    avg_ticket_estimated: row.avg_ticket_estimated ?? undefined,
    notes_import: toNullable(row.notes_import),
    source: toNullable(row.source) ?? 'csv_import',
    imported_at: new Date(),
  };
}

export async function importLeadsFromCsv(
  buffer: Buffer,
  sdrId: string,
): Promise<ImportResult> {
  // 1. Parse CSV
  let rawRows: Record<string, string>[];
  try {
    rawRows = csvParse(buffer, {
      columns: true,          // primeira linha = headers
      skip_empty_lines: true,
      trim: true,
      bom: true,              // suporta arquivos BOM UTF-8
    }) as Record<string, string>[];
  } catch (err) {
    throw new Error(`CSV inválido: ${(err as Error).message}`);
  }

  if (rawRows.length === 0) {
    return { total: 0, imported: 0, skipped: 0, errors: [] };
  }

  // 2. Pre-carregar CNPJs existentes deste SDR para dedup eficiente
  const existingCnpjs = new Set<string>();
  const existingRaw = await prisma.lead.findMany({
    where: { sdr_id: sdrId, cnpj: { not: null } },
    select: { cnpj: true },
  });
  for (const r of existingRaw) {
    if (r.cnpj) existingCnpjs.add(normalizeCnpj(r.cnpj));
  }

  // 3. Validar e filtrar linhas
  const toInsert: ReturnType<typeof buildLeadData>[] = [];
  const errors: ImportResult['errors'] = [];
  let skipped = 0;
  const seenCnpjsThisBatch = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2; // linha 1 = header
    const parsed = csvRowSchema.safeParse(rawRows[i]);

    if (!parsed.success) {
      errors.push({
        row: rowNum,
        message: parsed.error.issues.map((e) => `${String(e.path.join('.'))}: ${e.message}`).join('; '),
      });
      continue;
    }

    const row = parsed.data;
    const cnpjNorm = row.cnpj ? normalizeCnpj(row.cnpj) : null;

    // Dedup CNPJ: pula se já existe no banco OU repetido no mesmo CSV
    if (cnpjNorm && cnpjNorm !== '') {
      if (existingCnpjs.has(cnpjNorm) || seenCnpjsThisBatch.has(cnpjNorm)) {
        skipped++;
        continue;
      }
      seenCnpjsThisBatch.add(cnpjNorm);
    }

    toInsert.push(buildLeadData(row, sdrId));
  }

  // 4. Inserir em batch
  let imported = 0;
  if (toInsert.length > 0) {
    const result = await prisma.lead.createMany({
      data: toInsert as any,
      skipDuplicates: true,
    });
    imported = result.count;
    logger.info(`CSV import: ${imported} leads inseridos para sdr ${sdrId}`);
  }

  return {
    total: rawRows.length,
    imported,
    skipped,
    errors,
  };
}

import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { parse as parseDate } from 'date-fns';
import { prisma } from '../../config/prisma';
import { LeadStatus } from '@prisma/client';
import { logger } from '../../config/logger';

export async function importFromBuffer(
  buffer: Buffer, 
  mimetype: string, 
  tenantId: string, 
  membershipId: string, 
  originalname?: string
) {
  let rows: any[] = [];

  const isXlsx = mimetype.includes('spreadsheet') || mimetype.includes('excel') || mimetype.includes('vnd.openxmlformats-officedocument.spreadsheetml.sheet') || originalname?.endsWith('.xlsx');
  const isCsv = mimetype.includes('csv') || originalname?.endsWith('.csv');

  if (isXlsx) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  } else if (isCsv) {
    rows = parse(buffer, {
      skip_empty_lines: true,
      relax_column_count: true,
    });
  } else {
    throw new Error('Formato de arquivo não suportado. Use .csv ou .xlsx');
  }

  // Remove header se existir e validar colunas
  if (rows.length > 0) {
    const firstRow = rows[0];
    if (String(firstRow[0]).toLowerCase().includes('domínio') || String(firstRow[1]).toLowerCase().includes('empresa')) {
      rows.shift();
    }
  }

  const result = {
    importados: 0,
    duplicatas: 0,
    erros: 0,
    total: rows.length,
    leadIds: [] as string[],
  };

  const normalize = (val: any) => {
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    if (str.toLowerCase() === 'desconhecido' || str === '') return null;
    return str;
  };

  const normalizeDate = (val: any) => {
    const str = normalize(val);
    if (!str) return null;
    try {
      return parseDate(str, 'dd/MM/yyyy', new Date());
    } catch {
      return null;
    }
  };

  for (const row of rows) {
    try {
      if (!row[1]) { // Empresa é obrigatório
        result.erros++;
        continue;
      }

      const domain = normalize(row[0]);
      const company_name = normalize(row[1])!;
      const cnpj = normalize(row[2]);
      const segment = normalize(row[3]);
      const company_size = normalize(row[4]);
      // row[5] ignored (old status origin)
      // row[6] ignored (registration date)
      const icp_score = parseInt(row[7]) || null;
      // row[8] ignored (old icp tier)
      
      const iaEval = normalize(row[9]);
      const aboutLead = normalize(row[10]);
      let notes = [iaEval ? `Avaliação IA: ${iaEval}` : '', aboutLead ? `Sobre o Lead: ${aboutLead}` : ''].filter(Boolean).join('\n\n');
      if (!notes) notes = null as any;

      // row[11] ignored (ecommerce platform)
      const whatsapp = normalize(row[12]);
      const email = normalize(row[13]);
      const instagram = normalize(row[14]);
      const linkedin = normalize(row[15]);
      const state = normalize(row[16]);
      const city = normalize(row[17]);
      // row[18/19] can be used for custom metadata if needed

      // Deduplicação por domain ou email no tenant
      const orConditions: any[] = [];
      if (domain) orConditions.push({ domain });
      if (email) orConditions.push({ email });

      let existingLead = null;
      if (orConditions.length > 0) {
        existingLead = await prisma.lead.findFirst({
          where: {
            tenant_id: tenantId,
            OR: orConditions,
          }
        });
      }

      if (existingLead) {
        // IGNORE - user requested to not override duplicates
        result.duplicatas++;
        continue;
      }

      const newLead = await prisma.lead.create({
        data: {
          tenant_id: tenantId,
          // If imported by SDR, assign to them. If by Manager/Owner, goes to pool (BANCO)
          sdr_id: membershipId, // Defaulting to the importer for now, can be changed via Banco de Leads
          status: LeadStatus.BANCO,
          company_name,
          domain,
          cnpj,
          segment,
          company_size,
          email,
          phone: row[12] ? String(row[12]) : null, // Fallback phone
          whatsapp,
          instagram,
          linkedin,
          state,
          city,
          notes,
          icp_score,
          imported_at: new Date(),
        },
      });

      result.importados++;
      result.leadIds.push(newLead.id);
    } catch (error) {
      logger.error('Erro ao importar linha:', { error, row });
      result.erros++;
    }
  }

  return result;
}

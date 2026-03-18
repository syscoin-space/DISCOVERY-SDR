import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { parse as parseDate } from 'date-fns';
import { prisma } from '../../config/prisma';
import { LeadStatus, IcpTier } from '@prisma/client';
import { prrService } from '../prr/prr.service';
import { logger } from '../../config/logger';

// Map spreadsheet ICP tier letters to Prisma enum
const ICP_TIER_MAP: Record<string, IcpTier> = {
  A: IcpTier.CONTRATO_CERTO,
  B: IcpTier.QUENTE,
  C: IcpTier.PARCIAL,
  D: IcpTier.FORA,
};

export async function importFromBuffer(buffer: Buffer, mimetype: string, sdrId: string, originalname?: string) {
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
    // Se a primeira linha parece um header (ex: contém "Domínio" ou "Empresa"), removemos
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

  for (const row of rows) {
    try {
      if (!row[1]) { // Empresa é obrigatório
        result.erros++;
        continue;
      }

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
          // Tenta parsear DD/MM/YYYY
          return parseDate(str, 'dd/MM/yyyy', new Date());
        } catch {
          return null;
        }
      };

      const domain = normalize(row[0]);
      const company_name = normalize(row[1])!;
      const cnpj = normalize(row[2]);
      const niche = normalize(row[3]);
      const company_size = normalize(row[4]);
      const lead_status_origin = normalize(row[5]);
      // row[6] is Data de Registro, ignored for now
      const rawIcpScore = parseInt(row[7]) || 0;
      // If score > 14, treat as percentage and map to 0-14 scale
      const icp_score = rawIcpScore > 14 ? Math.round((rawIcpScore / 100) * 14) : rawIcpScore;
      const rawIcpTier = normalize(row[8]);
      const icp_tier = rawIcpTier ? (ICP_TIER_MAP[rawIcpTier] ?? null) : null;
      
      const iaEval = normalize(row[9]);
      const aboutLead = normalize(row[10]);
      let notes_import = [iaEval ? `Avaliação IA: ${iaEval}` : '', aboutLead ? `Sobre o Lead: ${aboutLead}` : ''].filter(Boolean).join('\n\n');
      if (!notes_import) notes_import = null as any;

      const ecommerce_platform = normalize(row[11]);
      const whatsapp = normalize(row[12]);
      const email = normalize(row[13]);
      const instagram_handle = normalize(row[14]);
      const linkedin_url = normalize(row[15]);
      const state = normalize(row[16]);
      const city = normalize(row[17]);
      const processed_at = normalizeDate(row[18]) || normalizeDate(row[19]);

      // Deduplicação por domain OU email (relativos ao SDR)
      let existingLead = null;
      if (domain) {
        existingLead = await prisma.lead.findUnique({ 
          where: { domain_sdr_id: { domain, sdr_id: sdrId } } 
        });
      }
      if (!existingLead && email) {
        existingLead = await prisma.lead.findUnique({ 
          where: { email_sdr_id: { email, sdr_id: sdrId } } 
        });
      }

      const leadData = {
        domain,
        company_name,
        cnpj,
        niche,
        company_size,
        lead_status_origin,
        icp_score,
        icp_tier,
        ecommerce_platform,
        whatsapp,
        email,
        instagram_handle,
        linkedin_url,
        state,
        city,
        notes_import,
        processed_at,
        sdr_id: sdrId,
        status: LeadStatus.CONTA_FRIA,
        imported_at: new Date(),
      };

      let leadId: string;

      if (existingLead) {
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: leadData,
        });
        result.duplicatas++;
        leadId = existingLead.id;
      } else {
        const newLead = await prisma.lead.create({
          data: leadData,
        });
        result.importados++;
        leadId = newLead.id;
      }

      result.leadIds.push(leadId);

      // Calculate PRR synchronously if prrInputs exist (skip gracefully otherwise)
      try {
        await prrService.calculate(leadId);
      } catch {
        // No PRR inputs available — leave prr_score as null
        logger.debug(`PRR skipped for lead ${leadId}: no inputs`);
      }
    } catch (error) {
      console.error('Erro ao importar linha:', error, row);
      result.erros++;
    }
  }

  return result;
}

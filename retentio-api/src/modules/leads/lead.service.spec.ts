import { leadService } from './lead.service';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/types';
import { LeadStatus } from '@prisma/client';

// Mock do prisma
jest.mock('../../config/prisma', () => ({
  prisma: {
    lead: {
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
    auditLog: {
      create: jest.fn(),
    }
  }
}));

describe('LeadService - Capacidade e bulkAssign', () => {
  const tenantId = 'tenant_123';
  const sdrId = 'sdr_abc';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkSdrLeadLimit (via bulkAssign proxy)', () => {
    it('deve barrar a tentativa se o SDR ja possui 95 leads ativos e tenta puxar mais 10', async () => {
      // Setup finding leads
      const mockedLeads = Array(10).fill({
        id: 'some_id',
        sdr_id: 'other',
        status: LeadStatus.BANCO
      });
      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockedLeads);

      // Setup transaction mock function behavior to immediately execute the callback
      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          lead: {
            count: jest.fn().mockResolvedValue(95), // mock active count inside tx
            updateMany: jest.fn(),
          },
          auditLog: { create: jest.fn() }
        });
      });

      await expect(leadService.bulkAssign(tenantId, ['1','2','3','4','5','6','7','8','9','10'], sdrId))
        .rejects.toThrow(AppError);
        
      try {
        await leadService.bulkAssign(tenantId, ['1','2','3','4','5','6','7','8','9','10'], sdrId);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('SDR_LIMIT_REACHED');
      }
    });

    it('deve permitir a atribuicao se a soma de ativos for menor ou igual a 100', async () => {
      const mockedLeads = Array(5).fill({
        id: 'some_id',
        sdr_id: 'other',
        status: LeadStatus.BANCO
      });
      (prisma.lead.findMany as jest.Mock).mockResolvedValue(mockedLeads);

      (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          lead: {
            count: jest.fn().mockResolvedValue(90), // 90 + 5 = 95 < 100
            updateMany: jest.fn().mockResolvedValue({ count: 5 }),
          },
          auditLog: { create: jest.fn() }
        });
      });

      const res = await leadService.bulkAssign(tenantId, ['1','2','3','4','5'], sdrId);
      expect(res.updated).toBe(5);
    });
  });
});

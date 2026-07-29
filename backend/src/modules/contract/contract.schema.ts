import { z } from 'zod';

export const previewContractSchema = z.object({
  campaignId:   z.string().min(1),
  proposedRate: z.number().min(0),
  timeline:     z.string().min(1).max(120),
});
export type PreviewContractInput = z.infer<typeof previewContractSchema>;

export const updateContractTemplateSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  body:  z.string().min(20).optional(),
}).refine((d) => d.title !== undefined || d.body !== undefined, {
  message: 'Provide a title or body to update',
});
export type UpdateContractTemplateInput = z.infer<typeof updateContractTemplateSchema>;

export const CAMPAIGN_TYPES = ['PAID_CAMPAIGN', 'OPEN_EVENT'] as const;

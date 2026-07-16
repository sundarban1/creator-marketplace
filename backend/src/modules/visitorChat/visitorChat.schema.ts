import { z } from 'zod';

export const startVisitorChatSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('A valid email is required').optional(),
    phone: z.string().min(6, 'A valid phone number is required').optional(),
  })
  .refine((data) => !!data.email || !!data.phone, {
    message: 'Please provide an email or a phone number',
    path: ['email'],
  });

export const sendVisitorMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(4000, 'Message is too long'),
});

export const updateVisitorChatStatusSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']),
});

export type StartVisitorChatInput = z.infer<typeof startVisitorChatSchema>;
export type SendVisitorMessageInput = z.infer<typeof sendVisitorMessageSchema>;

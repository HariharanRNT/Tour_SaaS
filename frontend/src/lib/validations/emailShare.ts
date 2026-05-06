import { z } from 'zod';

export const emailShareSchema = z.object({
  recipientEmail: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .max(254, 'Email cannot exceed 254 characters')
    .email('Please enter a valid email address')
    .refine((email) => !/\.\./.test(email), {
      message: 'Email cannot contain consecutive dots',
    })
    .refine((email) => {
      const parts = email.split('@');
      if (parts.length !== 2) return false;
      const domainParts = parts[1].split('.');
      if (domainParts.length < 2) return false;
      const tld = domainParts[domainParts.length - 1];
      return tld.length >= 2;
    }, {
      message: 'Please enter a valid email address',
    }),
});

export type EmailShareInput = z.infer<typeof emailShareSchema>;

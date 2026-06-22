import { z } from "zod";

export const CardMarketDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  cardNumber: z.string(),
  setName: z.string(),
  artUrl: z.string().url(),
  prices: z.object({
    rawCurrent: z.number().nullable(),
    psa10Current: z.number().nullable(),
    psa10Change7d: z.number().nullable(),
    psa10Change30d: z.number().nullable(),
  }),
});

export type CardMarketData = z.infer<typeof CardMarketDataSchema>;

import { z } from "zod";

export const CardMarketDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  cardNumber: z.string(),
  setName: z.string(),
  artUrl: z.string().url(),
  prices: z.object({
    psa10Current: z.number().nullable(),
    psa10Change30d: z.number().nullable(),
    rawCurrent: z.number().nullable(),
  }),
});

export type CardMarketData = z.infer<typeof CardMarketDataSchema>;

import { z } from "zod";

const iata = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Código IATA inválido");

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD");

const sliceSchema = z.object({
  origin: iata,
  destination: iata,
  departureDate: dateStr,
});

export const flightSearchSchema = z
  .object({
    tripType: z.enum(["one_way", "round_trip", "multi_city"]),
    slices: z.array(sliceSchema).min(1).max(6),
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(8).default(0),
    infants: z.number().int().min(0).max(4).default(0),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]),
    maxStops: z.number().int().min(0).max(3).optional(),
    currency: z.string().trim().toUpperCase().length(3).optional(),
    compareSeparateLegs: z.boolean().optional().default(false),
    market: z.string().trim().toUpperCase().length(2).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.infants > data.adults) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Número de bebês não pode exceder o de adultos.",
        path: ["infants"],
      });
    }
    if (data.tripType === "one_way" && data.slices.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Somente ida exige exatamente 1 trecho.",
        path: ["slices"],
      });
    }
    if (data.tripType === "round_trip" && data.slices.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ida e volta exige origem/destino e data de volta.",
        path: ["slices"],
      });
    }
    if (data.tripType === "multi_city" && data.slices.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Múltiplos trechos exigem ao menos 2 segmentos.",
        path: ["slices"],
      });
    }
    for (const slice of data.slices) {
      if (slice.origin === slice.destination) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Origem e destino devem ser diferentes.",
          path: ["slices"],
        });
      }
    }
  });

export type FlightSearchPayload = z.infer<typeof flightSearchSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(128),
});

export const alertSchema = z.object({
  origin: iata,
  destination: iata,
  departureDateFrom: dateStr,
  departureDateTo: dateStr,
  returnDateFrom: dateStr.optional().nullable(),
  returnDateTo: dateStr.optional().nullable(),
  cabin: z
    .enum(["economy", "premium_economy", "business", "first"])
    .default("economy"),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(8).default(0),
  maxStops: z.number().int().min(0).max(3).optional().nullable(),
  maxPrice: z.number().positive().optional().nullable(),
  currency: z.string().trim().toUpperCase().length(3).default("BRL"),
  active: z.boolean().optional().default(true),
});

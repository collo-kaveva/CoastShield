import { z } from "zod";
import { COUNTIES } from "./categories";

const phone = z.string().trim().refine((v) => !v || /^\+?[0-9][0-9\s-]{7,14}$/.test(v), "Enter a valid phone number, for example 0700 000 000.");

export const businessSchema = z.object({
  name: z.string().trim().min(2, "Enter your business name.").max(80),
  category: z.enum(["FISH_SEAFOOD", "RETAIL_MARKET", "FOOD_HOSPITALITY", "CLOTHING_TAILORING", "REPAIRS_MECHANICS", "TOURISM", "OTHER"], { errorMap: () => ({ message: "Choose the category that fits best." }) }),
  county: z.string().min(1, "Choose your county.").refine((v) => COUNTIES.includes(v) || v.length > 0),
  town: z.string().trim().min(2, "Enter your town or area."),
  description: z.string().trim().min(10, "Write a short sentence about your business (at least 10 characters).").max(400, "Keep it under 400 characters."),
  publicAddress: z.string().trim().max(120),
  phone, whatsapp: phone,
  email: z.string().trim().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email address."),
  showPhone: z.boolean(), showEmail: z.boolean(), showPrices: z.boolean(),
  hours: z.array(z.object({ day: z.string(), open: z.string(), close: z.string(), closed: z.boolean() })),
}).refine((v) => v.phone || v.whatsapp || v.email, { path: ["phone"], message: "Add at least one way for customers to reach you." });

export type BusinessFormValues = z.infer<typeof businessSchema>;

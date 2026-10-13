import { Briefcase, Fish, Scissors, Sailboat, Store, UtensilsCrossed, Wrench, type LucideIcon } from "lucide-react";
import type { Category } from "@/types";

export interface CategoryInfo {
  value: Category; label: string; blurb: string; icon: LucideIcon; tile: string; itemExamples: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { value: "FISH_SEAFOOD", label: "Fish & seafood", blurb: "Fish traders and seafood sellers share today's catch and take pre-orders.", icon: Fish, tile: "bg-sky-100 text-sky-900", itemExamples: "Tilapia, prawns, octopus" },
  { value: "RETAIL_MARKET", label: "Market & retail", blurb: "Market vendors and shops list stock, prices and opening times.", icon: Store, tile: "bg-emerald-100 text-emerald-900", itemExamples: "Groceries, household goods" },
  { value: "FOOD_HOSPITALITY", label: "Food & hospitality", blurb: "Kitchens, cafés and guesthouses show menus and accept requests.", icon: UtensilsCrossed, tile: "bg-orange-100 text-orange-900", itemExamples: "Menu items, catering" },
  { value: "CLOTHING_TAILORING", label: "Clothing & tailoring", blurb: "Tailors present services and take measurement-ready enquiries.", icon: Scissors, tile: "bg-fuchsia-100 text-fuchsia-900", itemExamples: "Alterations, custom outfits" },
  { value: "REPAIRS_MECHANICS", label: "Repairs & mechanics", blurb: "Mechanics and repairers list services and let customers book.", icon: Wrench, tile: "bg-slate-200 text-slate-900", itemExamples: "Servicing, repairs" },
  { value: "TOURISM", label: "Tourism & tours", blurb: "Tour operators share trips, prices and availability.", icon: Sailboat, tile: "bg-cyan-100 text-cyan-900", itemExamples: "Dhow trips, day tours" },
  { value: "OTHER", label: "Other local services", blurb: "Printing, phone repair and other neighbourhood services.", icon: Briefcase, tile: "bg-amber-100 text-amber-900", itemExamples: "Any product or service" },
];

export const categoryInfo = (c: Category) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[CATEGORIES.length - 1];

export const COUNTIES = ["Mombasa", "Kilifi", "Kwale", "Lamu", "Tana River", "Taita-Taveta"];

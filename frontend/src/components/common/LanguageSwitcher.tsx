import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "sw" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition",
        "bg-white border border-sand-300 text-navy-700 hover:bg-sand-50"
      )}
      aria-label="Switch language"
    >
      <Globe className="h-4 w-4" aria-hidden />
      {i18n.language === "en" ? "SW" : "EN"}
    </button>
  );
}

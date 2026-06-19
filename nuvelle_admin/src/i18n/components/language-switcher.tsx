import { Button } from "@/components/ui/button";
import { useI18n, type Locale } from "@/i18n";

const options: Array<{ label: string; shortLabel: string; value: Locale }> = [
  { label: "English", shortLabel: "EN", value: "en" },
  { label: "简体中文", shortLabel: "简", value: "zh" }
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div aria-label={t("language.label")} className="inline-flex rounded-lg border border-white/10 bg-white/6 p-0.5" role="group">
      {options.map((option) => (
        <Button
          key={option.value}
          aria-label={option.label}
          className={locale === option.value ? "h-8 px-2.5" : "h-8 px-2.5 text-[#9aa2c0]"}
          size="sm"
          type="button"
          variant={locale === option.value ? "outline" : "ghost"}
          onClick={() => setLocale(option.value)}
        >
          {option.shortLabel}
        </Button>
      ))}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n";

type BackendSettingsProps = {
  backendUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (url: string) => void;
};

export function BackendSettings({ backendUrl, open, onOpenChange, onSave }: BackendSettingsProps) {
  const { t } = useI18n();
  const [value, setValue] = useState(backendUrl);

  useEffect(() => {
    setValue(backendUrl);
  }, [backendUrl, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("backend.title")}</DialogTitle>
          <DialogDescription>{t("backend.description")}</DialogDescription>
        </DialogHeader>
        <Input value={value} onChange={(event) => setValue(event.target.value)} />
        <DialogFooter>
          <Button variant="gradient" onClick={() => onSave(value)}>
            {t("backend.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

type BackendSettingsProps = {
  backendUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (url: string) => void;
};

export function BackendSettings({ backendUrl, open, onOpenChange, onSave }: BackendSettingsProps) {
  const [value, setValue] = useState(backendUrl);

  useEffect(() => {
    setValue(backendUrl);
  }, [backendUrl, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Backend URL</DialogTitle>
          <DialogDescription>Promo generator and vote sync endpoint.</DialogDescription>
        </DialogHeader>
        <Input value={value} onChange={(event) => setValue(event.target.value)} />
        <DialogFooter>
          <Button variant="gradient" onClick={() => onSave(value)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

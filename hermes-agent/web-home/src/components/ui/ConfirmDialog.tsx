import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useT } from "@/i18n";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  const t = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel ?? t("common.confirm")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--fg-muted)]">{message}</p>
    </Modal>
  );
}

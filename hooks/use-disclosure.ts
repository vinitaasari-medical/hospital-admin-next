'use client';
import * as React from "react";

export function useDisclosure(initial = false) {
  const [open, setOpen] = React.useState(initial);
  return React.useMemo(
    () => ({
      open,
      setOpen,
      onOpen: () => setOpen(true),
      onClose: () => setOpen(false),
      onToggle: () => setOpen((v) => !v),
    }),
    [open],
  );
}

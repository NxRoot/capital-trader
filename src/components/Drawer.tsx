import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function Drawer({ open, onClose, children }: DrawerProps) {
  if (!open) return null;
  return createPortal(
    <div className={`fixed right-0 inset-0 z-[100]`}>
      <button
        type="button"
        className={`absolute inset-0 bg-black/60 transition-opacity ease-out `}
        aria-label="Close drawer"
        onClick={onClose}
      />
      <div
        className={`absolute top-0 right-0 flex h-full w-full lg:max-w-2xl flex-col bg-zinc-900 transition-transform ease-out `}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

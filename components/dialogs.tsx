'use client';

import * as AlertDialog from '@radix-ui/react-alert-dialog';
import React from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content dialog-content--narrow">
          <AlertDialog.Title className="dialog-title">{title}</AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">
            {description}
          </AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel asChild>
              <button className="btn btn-secondary">{cancelText}</button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button onClick={onConfirm} className="btn btn-danger">
                {confirmText}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

interface MessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

export function MessageDialog({
  open,
  onOpenChange,
  title,
  message,
  type = 'info',
}: MessageDialogProps) {
  const titleColor = type === 'error' ? 'var(--color-danger)' : type === 'success' ? 'var(--color-success)' : 'var(--text-primary)';

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog-content dialog-content--narrow">
          <AlertDialog.Title className="dialog-title" style={{ color: titleColor }}>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="dialog-description">{message}</AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Action asChild>
              <button className="btn btn-primary">OK</button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

const buttonBase: React.CSSProperties = {
  padding: '0.625rem 1rem',
  borderRadius: '6px',
  fontWeight: '500',
  fontSize: 'var(--font-body)',
  cursor: 'pointer',
};


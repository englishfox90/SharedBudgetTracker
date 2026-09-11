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
          <AlertDialog.Title style={titleStyle}>{title}</AlertDialog.Title>
          <AlertDialog.Description style={descriptionStyle}>
            {description}
          </AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel asChild>
              <button style={secondaryButtonStyle}>{cancelText}</button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button onClick={onConfirm} style={dangerButtonStyle}>
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
          <AlertDialog.Title style={{ ...titleStyle, color: titleColor }}>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description style={descriptionStyle}>{message}</AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Action asChild>
              <button style={primaryButtonStyle}>OK</button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

const titleStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: '600',
  marginBottom: '0.75rem',
};

const descriptionStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  lineHeight: '1.5',
};

const buttonBase: React.CSSProperties = {
  padding: '0.625rem 1rem',
  borderRadius: '6px',
  fontWeight: '500',
  fontSize: 'var(--font-body)',
  cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--button-bg)',
  color: 'var(--button-text)',
  border: 'none',
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-primary)',
};

const dangerButtonStyle: React.CSSProperties = {
  ...buttonBase,
  background: '#dc2626',
  color: 'white',
  border: 'none',
};

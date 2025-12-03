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
        <AlertDialog.Overlay style={overlayStyle} />
        <AlertDialog.Content style={contentStyle}>
          <AlertDialog.Title style={titleStyle}>{title}</AlertDialog.Title>
          <AlertDialog.Description style={descriptionStyle}>
            {description}
          </AlertDialog.Description>
          <div style={actionsStyle}>
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
  const titleColor = type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#1a1a1a';

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay style={overlayStyle} />
        <AlertDialog.Content style={contentStyle}>
          <AlertDialog.Title style={{ ...titleStyle, color: titleColor }}>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description style={descriptionStyle}>{message}</AlertDialog.Description>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <AlertDialog.Action asChild>
              <button style={primaryButtonStyle}>OK</button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  zIndex: 50,
  animation: 'fadeIn 150ms ease-out',
};

const contentStyle: React.CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'white',
  padding: '1.5rem',
  borderRadius: '8px',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
  maxWidth: '450px',
  width: '90%',
  zIndex: 51,
  animation: 'slideIn 200ms ease-out',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: '600',
  marginBottom: '0.75rem',
};

const descriptionStyle: React.CSSProperties = {
  marginBottom: '1.5rem',
  color: '#666',
  lineHeight: '1.5',
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#1a1a1a',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'white',
  color: '#1a1a1a',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

const dangerButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.875rem',
  fontWeight: '500',
  cursor: 'pointer',
};

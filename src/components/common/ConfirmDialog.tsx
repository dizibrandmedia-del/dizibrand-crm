import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary',
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl flex-shrink-0 ${
          type === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
        }`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition ${
            type === 'danger'
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isLoading ? 'Processing...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};

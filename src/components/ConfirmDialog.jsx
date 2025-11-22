"use client";

export default function ConfirmDialog({ open, title = "Start a new session?", message = "A new chat session will start with the newly uploaded resume.", confirmText = "Start New Session", cancelText = "Cancel", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-soft border border-slate-200">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-slate-600 mt-2">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button className="button-ghost" onClick={onCancel}>{cancelText}</button>
          <button className="button-primary" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

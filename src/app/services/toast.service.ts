import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  message: string;
  type: ToastType;
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = 'success') {
    const id = Date.now();
    const newToast: Toast = { message, type, id };
    
    this._toasts.update(prev => [...prev, newToast]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      this.remove(id);
    }, 4000);
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string) { this.show(msg, 'error'); }
  info(msg: string) { this.show(msg, 'info'); }
  warning(msg: string) { this.show(msg, 'warning'); }

  remove(id: number) {
    this._toasts.update(prev => prev.filter(t => t.id !== id));
  }
}

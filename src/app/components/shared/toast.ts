import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (t of toastService.toasts(); track t.id) {
        <div class="toast-card" [attr.data-type]="t.type" (click)="toastService.remove(t.id)">
          <div class="toast-icon">
            @if (t.type === 'success') { ✅ }
            @else if (t.type === 'error') { ❌ }
            @else if (t.type === 'warning') { ⚠️ }
            @else { ℹ️ }
          </div>
          <div class="toast-message">{{ t.message }}</div>
          <button class="close-btn">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }
    .toast-card {
      pointer-events: auto;
      background: rgba(20, 20, 20, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      max-width: 450px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      transition: all 0.3s;
    }
    .toast-card:hover { transform: translateY(-2px) scale(1.02); background: rgba(30, 30, 30, 0.9); }
    
    .toast-icon { font-size: 18px; flex-shrink: 0; }
    .toast-message { color: #fff; font-size: 14px; font-weight: 500; font-family: 'Outfit', sans-serif; flex: 1; }
    .close-btn { background: none; border: none; color: #666; font-size: 20px; cursor: pointer; padding: 0 4px; }
    
    .toast-card[data-type="success"] { border-left: 4px solid var(--t-lime); }
    .toast-card[data-type="error"] { border-left: 4px solid var(--t-rose); }
    .toast-card[data-type="warning"] { border-left: 4px solid #ffb300; }
    .toast-card[data-type="info"] { border-left: 4px solid var(--t-cyan); }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}

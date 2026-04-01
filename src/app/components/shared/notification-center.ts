import { Component, inject, signal, computed, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgencyService, Notification } from '../../services/agency.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      <button class="bell-btn" [class.has-unread]="agencyService.unreadNotificationCount() > 0" (click)="toggleDropdown($event)">
        <span class="bell-icon">🔔</span>
        @if (agencyService.unreadNotificationCount() > 0) {
          <span class="count-badge">{{ agencyService.unreadNotificationCount() }}</span>
        }
      </button>

      @if (showDropdown()) {
        <div class="notification-dropdown slide-up" (click)="$event.stopPropagation()">
          <div class="dropdown-header">
            <h3>Notifications</h3>
            <button class="mark-all-read" (click)="agencyService.markAllNotificationsRead()">Mark all as read</button>
          </div>
          <div class="notification-list">
            @for (n of sortedNotifications(); track n.id) {
              <div class="notification-item" [class.unread]="!n.isRead" (click)="handleNotificationClick(n)">
                <div class="n-icon" [attr.data-type]="n.type">
                  @if (n.type === 'assignment') { 📋 }
                  @else if (n.type === 'update') { 🔄 }
                  @else { 💬 }
                </div>
                <div class="n-content">
                  <div class="n-title">{{ n.title }}</div>
                  <div class="n-msg">{{ n.message }}</div>
                  <div class="n-time">{{ n.createdAt | date:'shortTime' }}</div>
                </div>
                @if (!n.isRead) { <div class="unread-dot"></div> }
              </div>
            }
            @if (sortedNotifications().length === 0) {
              <div class="empty-notifications">
                <span class="empty-icon">📭</span>
                <p>All caught up!</p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .notification-container { position: relative; }
    .bell-btn { background: rgba(255,255,255,0.03); backdrop-filter: blur(10px); border: 1px solid var(--t-br); border-radius: 12px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; font-size: 19px; cursor: pointer; position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .bell-btn:hover { background: rgba(255,255,255,0.08); border-color: var(--t-brL); transform: scale(1.05); }
    .bell-btn:active { transform: scale(0.95); }
    .bell-btn.has-unread { animation: ring 2s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }
    @keyframes ring { 0% { transform: rotate(0); } 5% { transform: rotate(20deg); } 10% { transform: rotate(-20deg); } 15% { transform: rotate(0); } }
    
    .count-badge { position: absolute; top: -4px; right: -4px; background: var(--t-rose); color: #fff; font-size: 10px; font-weight: 900; min-width: 19px; height: 19px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 2.5px solid var(--t-bg); box-shadow: 0 0 10px rgba(255, 107, 107, 0.4); }
    
    .notification-dropdown { position: absolute; top: 50px; right: 0; width: 320px; background: var(--t-s1); border: 1px solid var(--t-brL); border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); z-index: 1000; overflow: hidden; }
    .dropdown-header { padding: 16px; border-bottom: 1px solid var(--t-br); display: flex; justify-content: space-between; align-items: center; }
    .dropdown-header h3 { font-size: 14px; font-weight: 800; margin: 0; color: #fff; }
    .mark-all-read { background: none; border: none; color: var(--t-t1); font-size: 11px; font-weight: 600; cursor: pointer; }
    .mark-all-read:hover { color: #fff; }
    
    .notification-list { max-height: 400px; overflow-y: auto; }
    .notification-item { padding: 14px; border-bottom: 1px solid var(--t-br); display: flex; gap: 12px; cursor: pointer; transition: all .2s; position: relative; text-align: left; }
    .notification-item:hover { background: rgba(255,255,255,0.02); }
    .notification-item.unread { background: rgba(255,255,255,0.03); }
    
    .n-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--t-s2); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
    .n-icon[data-type="assignment"] { background: rgba(255,255,255,0.1); }
    .n-icon[data-type="update"] { background: rgba(255,255,255,0.05); }
    
    .n-content { flex: 1; min-width: 0; }
    .n-title { font-size: 12px; font-weight: 800; color: #fff; margin-bottom: 2px; }
    .n-msg { font-size: 11px; color: var(--t-t1); line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .n-time { font-size: 9px; color: var(--t-t2); margin-top: 4px; font-weight: 600; }
    
    .unread-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--t-rose); position: absolute; right: 12px; top: 12px; }
    .empty-notifications { padding: 40px 20px; text-align: center; color: var(--t-t1); }
    .empty-icon { font-size: 32px; display: block; margin-bottom: 10px; opacity: 0.3; }
    
    .slide-up { animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class NotificationCenter {
  public agencyService: AgencyService = inject(AgencyService);
  public showDropdown = signal(false);

  sortedNotifications: Signal<Notification[]> = computed(() => {
    const list: Notification[] = this.agencyService.notifications();
    return list
      .filter(n => !n.isRead)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.showDropdown.update(v => !v);
    
    if (this.showDropdown()) {
      const listener = () => {
        this.showDropdown.set(false);
        window.removeEventListener('click', listener);
      };
      window.addEventListener('click', listener);
    }
  }

  handleNotificationClick(n: Notification) {
    this.agencyService.markNotificationRead(n.id);
    if (n.taskId) {
      this.agencyService.setSelectedTask(n.taskId);
    }
    this.showDropdown.set(false);
  }
}

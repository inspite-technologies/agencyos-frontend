import { Component, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgencyService, User } from '../../../services/agency.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <aside class="sidebar" [class.client-mode]="isClient()">
      <div class="sidebar-header">
        <div class="logo">
          @if (isClient()) {
            <div class="client-logo-pill">{{ client()?.name?.charAt(0) || '◈' }}</div>
            <span class="logo-text">{{ client()?.name || 'Portal' }}</span>
          } @else {
            ◈ <span class="logo-text">AGENCYOS</span>
          }
        </div>
        <div class="sub-text">{{ isClient() ? 'Client Dashboard' : 'v4.0' }}</div>
      </div>

      <div class="user-pill-container">
        <div class="user-pill">
          <div class="avatar" [style.background]="avatarBg()">
            @if (user()?.role === 'admin') { 👑 } @else { {{ user()?.avatar }} }
          </div>
          <div class="user-info">
            <div class="user-name">{{ user()?.name || 'User Name' }}</div>
            <div class="user-role">{{ user()?.role }}</div>
          </div>
        </div>
      </div>

      <nav class="nav-links">
        @for (item of filteredNav(); track item.id) {
          <div class="nav-item" [class.active]="currentPage() === item.id" (click)="pageChange.emit(item.id)">
            <span class="icon">{{ item.icon }}</span>
            <span class="label">{{ item.label }}</span>
            @if (item.badge) {
              <span class="badge">{{ item.badge }}</span>
            }
          </div>
        }
      </nav>

      <div class="sidebar-footer">
        <div class="user-email">{{ user()?.email }}</div>
        <button class="logout-btn" (click)="logout()">Sign Out</button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 220px;
      height: 100vh;
      background: var(--t-s1);
      border-right: 1px solid var(--t-br);
      display: flex; flex-direction: column; flex-shrink: 0;
    }

    .sidebar.client-mode {
      background: var(--cp-s1);
      border-right: 1px solid var(--cp-br);
      box-shadow: 2px 0 12px rgba(0,0,0,.07);
    }

    .sidebar-header { padding: 20px 16px 14px; }
    .logo { font-weight: 800; font-size: 18px; color: #fff; display: flex; align-items: center; gap: 8px; }
    .client-mode .logo { color: var(--cp-ink); font-size: 16px; letter-spacing: -0.01em; }
    .client-logo-pill { width: 24px; height: 24px; background: #111; color: #fff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .sub-text { font-size: 9px; color: var(--t-t1); text-transform: uppercase; margin-top: 4px; letter-spacing: .1em; font-weight: 700; opacity: 0.8; }
    .client-mode .sub-text { color: var(--cp-t2); }

    .user-pill-container { margin: 6px 14px 10px; }
    .user-pill {
      padding: 8px 10px; border-radius: 9px; background: var(--t-s2); border: 1px solid var(--t-br);
      display: flex; align-items: center; gap: 8px;
    }
    .client-mode .user-pill { background: var(--cp-s2); border: 1px solid var(--cp-br); }
    
    .avatar {
      width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 11px; color: #111;
    }
    .client-mode .avatar { width: 32px; height: 32px; border-radius: 8px; background: var(--cp-accL) !important; color: var(--cp-acc); }

    .user-name { font-size: 12px; font-weight: 700; color: #fff; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .client-mode .user-name { color: var(--cp-ink); }
    .user-role { font-size: 9px; color: var(--t-t1); text-transform: uppercase; }

    .nav-links { flex: 1; padding: 0 8px; overflow-y: auto; margin-top: 10px; }
    .nav-item {
      display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 9px; cursor: pointer;
      margin-bottom: 2px; color: var(--t-t1); font-size: 13px; transition: all .2s;
    }
    .client-mode .nav-item { color: var(--cp-t1); font-size: 12px; padding: 9px 10px; border-radius: 8px; }
    
    .nav-item:hover { background: rgba(255,255,255,0.05); }
    .nav-item.active { background: rgba(255,255,255,0.1); color: #fff; font-weight: 700; }
    .client-mode .nav-item.active { background: var(--cp-accS); color: var(--cp-acc); font-weight: 600; }

    .badge { margin-left: auto; background: var(--t-rose); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 800; }

    .sidebar-footer { padding: 12px 16px; border-top: 1px solid var(--t-br); }
    .client-mode .sidebar-footer { border-top: 1px solid var(--cp-br); }
    .user-email { font-size: 10px; color: var(--t-t1); margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .logout-btn { width: 100%; padding: 7px; border: 1px solid var(--t-br); border-radius: 7px; background: transparent; color: var(--t-t1); font-size: 11px; font-weight: 600; cursor: pointer; }
    .client-mode .logout-btn { border: 1px solid var(--cp-br); color: var(--cp-t1); }
  `]
})
export class Sidebar {
  agencyService = inject(AgencyService);
  router = inject(Router);
  user = input<User | null>(null);
  currentPage = input<string>('dash');
  pageChange = output<string>();

  client = computed(() => {
    const u = this.user();
    if (!u || u.role !== 'client') return null;
    return this.agencyService.clients().find(c => c.id === u.clientId) || null;
  });

  logout() {
    this.agencyService.logout();
    this.router.navigate(['/login']);
  }

  isClient() { return this.user()?.role === 'client'; }

  avatarBg() {
    const role = this.user()?.role || 'staff';
    const colors: any = { admin: '#FFFFFF', manager: '#D4D4D4', staff: '#ABABAB' };
    return colors[role] || '#888888';
  }

  filteredNav() {
    if (this.isClient()) {
      return [
        { id: 'overview', icon: '◈', label: 'Overview', badge: 0 },
        { id: 'social', icon: '◉', label: 'Social Media', badge: 0 },
        { id: 'gbp', icon: '◎', label: 'Google Business', badge: 0 },
        { id: 'seo', icon: '⬡', label: 'SEO', badge: 0 },
        { id: 'report', icon: '☰', label: 'Monthly Report', badge: 0 },
        { id: 'invoices', icon: '$', label: 'Invoices', badge: 0 },
      ];
    }
    if (this.user()?.role === 'manager') {
      return [
        { id: 'dash', icon: '◈', label: 'My Dashboard', badge: 0 },
        { id: 'clients', icon: '◉', label: 'My Clients', badge: 0 },
        { id: 'tasks', icon: '◻', label: 'Tasks', badge: this.agencyService.tasks().filter(t => t.assigneeId === this.user()?.id && t.status !== 'Done').length },
        { id: 'reports', icon: '☰', label: 'Reports', badge: 0 },
      ];
    }
    if (this.user()?.role === 'staff') {
      return [
        { id: 'tasks', icon: '◻', label: 'My Tasks', badge: this.agencyService.tasks().filter(t => t.assigneeId === this.user()?.id && t.status !== 'Done').length },
        { id: 'kpi', icon: '◈', label: 'Enter KPIs', badge: 0 }
      ];
    }
    return [
      { id: 'dash', icon: '◈', label: 'Dashboard', badge: 0 },
      { id: 'clients', icon: '◉', label: 'Clients', badge: 0 },
      { id: 'tasks', icon: '◻', label: 'All Tasks', badge: this.agencyService.tasks().filter(t => t.status !== 'Done').length },
      { id: 'team', icon: '◎', label: 'Team', badge: 0 },
      { id: 'reports', icon: '☰', label: 'Reports', badge: 0 },
      { id: 'billing', icon: '$', label: 'Subscription', badge: 0 },
    ];
  }
}

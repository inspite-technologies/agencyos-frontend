import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, User } from '../../services/agency.service';
import { ToastService } from '../../services/toast.service';
import { NotificationCenter } from '../shared/notification-center';

@Component({
  selector: 'app-team-view',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationCenter],
  template: `
    <div class="team-view">
      <header class="view-header">
        <div>
          <h1>Team</h1>
          <p>{{ teamMembers().length }} members</p>
        </div>
        <div class="header-actions">
          <app-notification-center />
          <button class="action-btn" (click)="showAddModal.set(true)">+ Add Member</button>
        </div>
      </header>

      <div class="team-grid">
        @for (member of teamMembers(); track member.id) {
          <div class="team-card">
            <div class="card-top">
              <div class="avatar" [style.background]="getAvatarBg(member)">{{ member.avatar }}</div>
              <div class="meta">
                <div class="name">{{ member.name }}</div>
                <div class="title">{{ member.title }}</div>
              </div>
            </div>
            
            <div class="role-badge" [attr.data-role]="member.role">{{ member.role | titlecase }}</div>

            <div class="stats">
              <div class="stat-box clickable" (click)="openDetails(member, 'clients')">
                <div class="val">{{ getClientCount(member) }}</div>
                <div class="lbl">Clients</div>
              </div>
              <div class="stat-box clickable" (click)="openDetails(member, 'tasks')">
                <div class="val">{{ getOpenTasks(member) }}</div>
                <div class="lbl">Tasks</div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Member Detail Modal -->
      @if (selectedMember(); as member) {
        <div class="modal-overlay" (click)="closeDetails()">
          <div class="modal detail-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="header-with-avatar">
                <div class="avatar sm" [style.background]="getAvatarBg(member)">{{ member.avatar }}</div>
                <div>
                  <h3>{{ member.name }} — {{ viewType() | titlecase }}</h3>
                  <p class="auto-note">{{ member.title }} • {{ member.role | titlecase }}</p>
                </div>
              </div>
              <button class="close-btn" (click)="closeDetails()">×</button>
            </div>
            
            <div class="modal-body custom-scroll">
              @if (viewType() === 'clients') {
                <div class="detail-list">
                  @for (c of getMemberClients(member); track c.id) {
                    <div class="detail-item">
                       <div class="item-icon" [style.background]="c.color + '22'" [style.color]="c.color">{{ c.name[0] }}</div>
                       <div class="item-info">
                         <div class="item-name">{{ c.name }}</div>
                         <div class="item-sub">{{ c.industry }} • <span [attr.data-health]="c.health">{{ c.health }}</span></div>
                       </div>
                       <div class="item-val">{{ c.spend | currency:'INR':'symbol':'1.0-0' }}</div>
                    </div>
                  }
                  @if (getMemberClients(member).length === 0) {
                    <p class="empty-state">No clients assigned.</p>
                  }
                </div>
              }

              @if (viewType() === 'tasks') {
                <div class="detail-list">
                  @for (t of getMemberTasks(member); track t.id) {
                    <div class="detail-item">
                       <div class="item-icon task-icon">◻</div>
                       <div class="item-info">
                         <div class="item-name">{{ t.title }}</div>
                         <div class="item-sub">{{ getClientName(t.clientId) }} • Due: {{ t.due || 'No date' }}</div>
                       </div>
                       <div class="item-status" [attr.data-status]="t.status">{{ t.status }}</div>
                    </div>
                  }
                  @if (getMemberTasks(member).length === 0) {
                    <p class="empty-state">No open tasks.</p>
                  }
                </div>
              }
            </div>
            
            <div class="modal-footer">
              <button class="save-btn" (click)="closeDetails()">Close</button>
            </div>
          </div>
        </div>
      }

      <!-- Add Member Modal -->
      @if (showAddModal()) {
        <div class="modal-overlay" (click)="showAddModal.set(false)">
          <div class="modal compact-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>Add Team Member</h3>
                <p class="auto-note">Invite managers or staff to your agency.</p>
              </div>
              <button class="close-btn" (click)="showAddModal.set(false)">×</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-field full">
                  <label>Full Name</label>
                  <input type="text" [(ngModel)]="newUser.name" placeholder="John Doe">
                </div>
                <div class="form-field full">
                  <label>Email Address</label>
                  <input type="email" [(ngModel)]="newUser.email" placeholder="john@youragency.com">
                </div>
                <div class="form-field">
                  <label>Role</label>
                  <select [(ngModel)]="newUser.role" class="form-select">
                    <option value="manager">Manager</option>
                    <option value="staff">Staff (Employee)</option>
                  </select>
                </div>

                <div class="form-field">
                  <label>Title</label>
                  <input type="text" [(ngModel)]="newUser.title" placeholder="Lead Strategist">
                </div>
                <div class="form-field full">
                  <label>Password</label>
                  <input type="password" [(ngModel)]="newUser.password" placeholder="••••••••">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="cancel-btn" (click)="showAddModal.set(false)">Cancel</button>
              <button class="save-btn" (click)="addMember()">Add Member</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .team-view { display: flex; flex-direction: column; }
    .view-header { margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    h1 { font-weight: 800; font-size: 24px; }
    .view-header p { color: var(--t-t1); font-size: 13px; margin-top: 2px; }

    .action-btn { background: #fff; color: #111; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; }

    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .team-card { background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 14px; padding: 18px 20px; }
    
    .card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .avatar {
      width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 14px; color: #111;
    }
    .name { font-weight: 700; font-size: 14px; color: #fff; }
    .title { font-size: 11px; color: var(--t-t1); }

    .role-badge { 
      padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; width: fit-content; margin-bottom: 12px;
      background: rgba(255,255,255,0.05); color: var(--t-t1);
    }
    .role-badge[data-role="admin"] { color: #fff; background: rgba(255,255,255,0.15); }
    .role-badge[data-role="manager"] { color: #D4D4D4; background: rgba(212,212,212,0.1); }
    .role-badge[data-role="staff"] { color: #ABABAB; background: rgba(171,171,171,0.1); }

    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .stat-box { background: var(--t-s2); border-radius: 8px; padding: 10px; text-align: center; }
    .val { font-weight: 800; font-size: 20px; color: #fff; }
    .lbl { font-size: 10px; color: var(--t-t2); margin-top: 2px; }

    /* Modal Styles */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal.compact-modal { background: var(--t-s1); border: 1px solid var(--t-brL); border-radius: 12px; width: 400px; padding: 20px; }
    .modal-header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { font-size: 16px; font-weight: 800; color: #fff; }
    .auto-note { font-size: 10px; color: var(--t-t1); margin-top: 4px; line-height: 1.4; }
    .close-btn { background: none; border: none; color: var(--t-t1); font-size: 22px; cursor: pointer; line-height: 1; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color .2s; }
    .close-btn:hover { color: #fff; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .form-field.full { grid-column: span 2; }
    .form-field label { font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; margin-bottom: 4px; display: block; }
    .form-field input, .form-select { width: 100%; background: var(--t-s2); border: 1px solid var(--t-br); border-radius: 6px; padding: 8px; color: #fff; font-size: 12px; outline: none; }
    .modal-footer { display: flex; gap: 10px; margin-top: 20px; }
    .cancel-btn { flex: 1; background: transparent; border: 1px solid var(--t-br); color: var(--t-t1); padding: 9px; border-radius: 7px; font-size: 12px; cursor: pointer; }
    .save-btn { flex: 2; background: #fff; color: #111; padding: 9px; border-radius: 7px; border: none; font-weight: 800; font-size: 12px; cursor: pointer; }

    /* Detail Modal & Lists */
    .modal.detail-modal { background: var(--t-s1); border: 1px solid var(--t-brL); border-radius: 14px; width: 450px; padding: 24px; max-height: 85vh; display: flex; flex-direction: column; }
    .header-with-avatar { display: flex; align-items: center; gap: 12px; }
    .avatar.sm { width: 32px; height: 32px; font-size: 11px; }
    
    .custom-scroll { overflow-y: auto; padding-right: 4px; }
    .custom-scroll::-webkit-scrollbar { width: 4px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: var(--t-br); border-radius: 4px; }

    .detail-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .detail-item { 
      background: var(--t-s2); padding: 12px; border-radius: 10px; border: 1px solid var(--t-br);
      display: flex; align-items: center; gap: 12px;
    }
    .item-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0; }
    .task-icon { background: rgba(0, 188, 212, 0.1); color: var(--t-cyan); font-size: 16px; }
    
    .item-info { flex: 1; min-width: 0; }
    .item-name { font-weight: 700; font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-sub { font-size: 10px; color: var(--t-t1); margin-top: 2px; }
    .item-val { font-weight: 700; font-size: 12px; color: #fff; }
    .item-status { font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 10px; background: var(--t-s3); color: var(--t-t2); }
    
    [data-health="Healthy"] { color: var(--t-lime); }
    [data-health="At Risk"] { color: var(--t-amber); }
    [data-health="Critical"] { color: var(--t-rose); }
    
    [data-status="In Progress"] { color: var(--t-cyan); }
    [data-status="Done"] { color: var(--t-lime); }
    [data-status="Blocked"] { color: var(--t-rose); }

    .stat-box.clickable { cursor: pointer; transition: all .2s; }
    .stat-box.clickable:hover { background: var(--t-s3); transform: translateY(-2px); }
    
    .empty-state { text-align: center; padding: 30px; color: var(--t-t1); font-size: 12px; font-style: italic; }
  `]
})
export class TeamView {
  agencyService = inject(AgencyService);
  toastService = inject(ToastService);

  showAddModal = signal(false);
  selectedMember = signal<User | null>(null);
  viewType = signal<'clients' | 'tasks' | null>(null);

  newUser: any = { name: '', email: '', role: 'manager', title: '', password: '' };

  teamMembers = computed(() => this.agencyService.users().filter(u => u.role !== 'client'));

  getAvatarBg(u: User) {
    const colors: any = { admin: '#FFFFFF', manager: '#D4D4D4', staff: '#ABABAB' };
    return colors[u.role] || '#888888';
  }

  getClientCount(u: User) {
    return this.getMemberClients(u).length;
  }

  getOpenTasks(u: User) {
    return this.getMemberTasks(u).length;
  }

  getMemberClients(u: User) {
    return this.agencyService.clients().filter(c => c.managerId === u.id || (u.clientIds || []).includes(c.id));
  }

  getMemberTasks(u: User) {
    return this.agencyService.tasks().filter(t => t.assigneeId === u.id && t.status !== 'Done');
  }

  getClientName(id: number | null) {
    if (!id) return 'General';
    return this.agencyService.clients().find(c => c.id === id)?.name || 'Client';
  }

  openDetails(member: User, type: 'clients' | 'tasks') {
    this.selectedMember.set(member);
    this.viewType.set(type);
  }

  closeDetails() {
    this.selectedMember.set(null);
    this.viewType.set(null);
  }

  async addMember() {
    if (!this.newUser.name || !this.newUser.email || !this.newUser.password) return;

    // Auto-generate avatar from name initials
    const parts = this.newUser.name.trim().split(' ');
    const avatar = parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : this.newUser.name.substring(0, 2).toUpperCase();

    try {
      await this.agencyService.addUser({ ...this.newUser, avatar });
      this.showAddModal.set(false);
      this.newUser = { name: '', email: '', role: 'manager', title: '', password: '' };
    } catch (err: any) {
      const msg = err?.error?.error || err?.message || 'Failed to add member. Please try again.';
      this.toastService.error(msg);
    }
  }
}

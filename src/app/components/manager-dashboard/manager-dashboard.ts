import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, Client, User, Task } from '../../services/agency.service';
import { Sidebar } from '../shared/sidebar/sidebar';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  template: `
    <div class="dashboard-root">
      <app-sidebar 
        [user]="agencyService.currentUser()" 
        [currentPage]="page()"
        (pageChange)="page.set($event)">
      </app-sidebar>
      
      <main class="main-content">
        <!-- 1. My Dashboard -->
        @if (page() === 'dash') {
          <div class="dash-view">
            <header class="view-header">
              <div>
                <h1>My Dashboard</h1>
                <p>Managing {{ managerClients().length }} clients</p>
              </div>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="label">My Clients</div>
                <div class="value">{{ managerClients().length }}</div>
                <div class="sub">3 Active</div>
              </div>
              <div class="stat-card">
                <div class="label">Open Tasks</div>
                <div class="value">{{ openTasks().length }} <span class="overdue">({{ overdueCount() }} overdue)</span></div>
                <div class="sub">assigned to you</div>
              </div>
              <div class="stat-card">
                <div class="label">Total Leads</div>
                <div class="value">{{ totalLeads() }}</div>
                <div class="sub">this month</div>
              </div>
            </div>

            <div class="client-cards-grid">
              @for (client of managerClients(); track client.id) {
                <div class="client-card">
                  <div class="card-header">
                    <div>
                      <div class="c-name">{{ client.name }}</div>
                      <div class="c-ind">{{ client.industry }}</div>
                    </div>
                    <span class="health-tag" [attr.data-health]="client.health">{{ client.health }}</span>
                  </div>

                  <div class="pacing-row" [class.alert]="agencyService.calcPacing(client) > 95">
                    <div class="p-info">
                      <span class="p-icon">⚡</span>
                      <span class="p-text">{{ agencyService.calcPacing(client) > 95 ? 'Overpacing' : 'Pacing' }} <strong>{{ agencyService.calcPacing(client) }}%</strong></span>
                    </div>
                    <div class="p-nums">{{ client.spend | currency:'INR':'symbol':'1.0-0' }} of {{ client.budget | currency:'INR':'symbol':'1.0-0' }}</div>
                  </div>

                  <div class="metrics-grid">
                    <div class="m-box">
                      <div class="m-val">{{ client.leads }}</div>
                      <div class="m-lbl">Leads</div>
                    </div>
                    <div class="m-box">
                      <div class="m-val">{{ client.roas }}×</div>
                      <div class="m-lbl">ROAS</div>
                    </div>
                    <div class="m-box">
                      <div class="m-val">\${{ (client.revenue / 1000).toFixed(1) }}k</div>
                      <div class="m-lbl">Revenue</div>
                    </div>
                  </div>

                  <button class="kpi-btn-full" (click)="openKPI(client)">Enter KPIs</button>
                </div>
              }
            </div>
          </div>
        }

        <!-- 2. My Clients -->
        @if (page() === 'clients') {
          <div class="view-container">
            <header class="view-header">
              <div>
                <h1>My Clients</h1>
                <p>{{ managerClients().length }} total</p>
              </div>
              <button class="action-btn" (click)="showOnboard.set(true)">+ Onboard Client</button>
            </header>

            <div class="search-bar">
              <input type="text" [(ngModel)]="clientSearch" (input)="updateSearch()" placeholder="Search clients…">
            </div>

            <div class="panel table-panel">
              <table class="manager-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Manager</th>
                    <th>Budget / Pacing</th>
                    <th>Health</th>
                    <th>Leads</th>
                    <th>ROAS</th>
                    <th>Status</th>
                    <th>Onboarding</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of filteredClients(); track c.id) {
                    <tr>
                      <td>
                        <div class="client-cell">
                          <div class="c-av" [style.background]="c.color + '22'" [style.color]="c.color">{{ c.name[0] }}</div>
                          <div>
                            <div class="c-n">{{ c.name }}</div>
                            <div class="c-i">{{ c.industry }}</div>
                          </div>
                        </div>
                      </td>
                      <td>{{ currentUser()?.name }}</td>
                      <td>
                        <div class="pacing-stack">
                          <div class="p-text" [class.alert]="agencyService.calcPacing(c) > 95">⚡ {{ agencyService.calcPacing(c) }}%</div>
                          <div class="p-sub">{{ c.spend | currency:'INR':'symbol':'1.0-0' }} of {{ c.budget | currency:'INR':'symbol':'1.0-0' }}</div>
                        </div>
                      </td>
                      <td><span class="h-badge" [attr.data-health]="c.health">{{ c.health }}</span></td>
                      <td class="bold">{{ c.leads }}</td>
                      <td class="lime bold">{{ c.roas }}×</td>
                      <td><span class="s-badge text-dim">{{ c.status }}</span></td>
                      <td><span class="o-badge text-lime">✓ Done</span></td>
                      <td><button class="row-action-btn" (click)="openKPI(c)">KPIs</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- 3. Tasks -->
        @if (page() === 'tasks') {
          <div class="view-container">
            <header class="view-header">
              <div>
                <h1>Tasks</h1>
                <p>{{ filteredTasks().length }} open</p>
              </div>
              <div class="header-actions">
                <input type="text" class="search-input" placeholder="Search tasks..." [ngModel]="taskSearch()" (ngModelChange)="taskSearch.set($event)">
                
                <select class="filter-select" [ngModel]="filterStatus()" (ngModelChange)="filterStatus.set($event)">
                  <option value="All">All Statuses</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                  <option value="Blocked">Blocked</option>
                </select>

                <select class="filter-select" [ngModel]="filterPriority()" (ngModelChange)="filterPriority.set($event)">
                  <option value="All">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </header>

            <div class="task-board">
              @for (task of filteredTasks(); track task.id) {
                <div class="task-card-wrapper">
                  <div class="task-card" [class.overdue-border]="calcOverdue(task.due) > 0" (click)="toggleExpand(task.id)">
                    <div class="task-info">
                      <div class="task-title">{{ task.title }}</div>
                      <div class="task-meta">
                         <span class="meta-icon">📁</span> {{ getClientName(task.clientId) }} 
                         <span class="meta-sep">→</span> {{ getAssigneeName(task.assigneeId) }}
                         @if (task.subtasks && task.subtasks.length > 0) {
                           <span class="progress-tag">📊 {{ getCompletedCount(task) }}/{{ task.subtasks.length }}</span>
                         }
                         @if (calcOverdue(task.due) > 0) {
                           <span class="overdue-label">{{ calcOverdue(task.due) }}d overdue</span>
                         }
                         @if (task.comments && task.comments.length > 0) {
                           <span class="comment-count">💬 {{ task.comments.length }}</span>
                         }
                      </div>
                    </div>
                    
                    <div class="task-status-control" (click)="$event.stopPropagation()">
                      <select class="status-select" [attr.data-status]="task.status" [ngModel]="task.status" (ngModelChange)="updateStatus(task.id, $event)">
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </div>

                    <div class="pri-badge" [attr.data-pri]="task.priority">{{ task.priority }}</div>
                    
                    <div class="task-actions" (click)="$event.stopPropagation()">
                      <button class="icon-btn" (click)="toggleExpand(task.id)" title="View Details">👁️</button>
                    </div>
                  </div>
                  
                  @if (expandedTasks().has(task.id)) {
                    <div class="task-detail-panel">
                       <div class="detail-grid">
                         <div class="detail-section">
                           <label>Checklist</label>
                           <div class="subtask-list">
                             @for (st of task.subtasks; track $index) {
                               <div class="subtask-item">
                                 <input type="checkbox" [checked]="st.completed" (change)="toggleSubtask(task, $index)">
                                 <span [class.done]="st.completed">{{ st.title }}</span>
                               </div>
                             }
                             @if (!task.subtasks || task.subtasks.length === 0) {
                               <p class="empty-hint">No checklist defined.</p>
                             }
                             @if (allSubtasksDone(task) && task.status !== 'Done') {
                               <button class="submit-completion-btn" (click)="submitTask(task)">
                                 ✨ Submit Completion
                               </button>
                             }
                           </div>
                         </div>

                         <div class="detail-section">
                           <label>Activity & Issues</label>
                           <div class="comment-thread">
                             @for (c of task.comments; track c.timestamp) {
                               <div class="comment" [class.issue]="c.type === 'issue'">
                                 <div class="comment-meta">
                                   <strong>{{ c.userName }}</strong> • {{ c.timestamp | date:'short' }}
                                   @if (c.type === 'issue') { <span class="issue-badge">ISSUE</span> }
                                 </div>
                                 <div class="comment-text">{{ c.text }}</div>
                               </div>
                             }
                             @if (!task.comments || task.comments.length === 0) {
                               <p class="empty-hint">No activity yet.</p>
                             }
                           </div>
                           <div class="add-comment">
                             <input type="text" #msgInput placeholder="Add a note or reply..." (keydown.enter)="addComment(task, msgInput)">
                             <button (click)="addComment(task, msgInput)">Send</button>
                           </div>
                         </div>
                       </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- 4. Reports -->
        @if (page() === 'reports') {
          <div class="view-container">
            <header class="view-header">
              <div>
                <h1>Reports</h1>
                <p>Monitor client performance</p>
              </div>
            </header>

            <div class="panel table-panel">
              <table class="manager-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Health</th>
                    <th>ROAS</th>
                    <th>Leads</th>
                    <th>Spend</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of managerClients(); track c.id) {
                    <tr>
                      <td>
                        <div class="c-n">{{ c.name }}</div>
                        <div class="c-i">{{ c.industry }}</div>
                      </td>
                      <td><span class="h-badge" [attr.data-health]="c.health">{{ c.health }}</span></td>
                      <td class="lime bold">{{ c.roas }}×</td>
                      <td class="bold">{{ c.leads }}</td>
                      <td>{{ c.spend | currency:'INR':'symbol':'1.0-0' }}</td>
                      <td>
                        <div class="rep-status-cell">
                          <span class="dot" [class.generated]="c.reportGenerated"></span>
                          {{ c.reportGenerated ? 'Generated' : 'Not Generated' }}
                        </div>
                      </td>
                      <td>
                        <div class="row-flex">
                          <button class="ghost-btn" (click)="openKPI(c)">Update KPIs</button>
                          <button class="action-btn sm" (click)="generateReport(c)">Generate</button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </main>

      <!-- MODALS -->
      @if (selectedClient(); as client) {
        <div class="modal-overlay" (click)="selectedClient.set(null)">
          <div class="modal compact-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>Enter KPIs — {{ client.name }}</h3>
                <p class="auto-note">✓ Updates health score and budget pacing.</p>
              </div>
              <button class="close-btn" (click)="selectedClient.set(null)">×</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-field"><label>Ad Spend (₹)</label><input type="number" [(ngModel)]="kpiForm.spend"></div>
                <div class="form-field"><label>Leads</label><input type="number" [(ngModel)]="kpiForm.leads"></div>
                <div class="form-field"><label>Revenue (₹)</label><input type="number" [(ngModel)]="kpiForm.revenue"></div>
                <div class="form-field"><label>ROAS (auto: {{ (kpiForm.revenue / (kpiForm.spend || 1)).toFixed(2) }}×)</label><input type="number" step="0.1" [(ngModel)]="kpiForm.roas"></div>
                
                <div class="form-field">
                  <label>Health Status</label>
                  <select [(ngModel)]="kpiForm.health">
                    <option value="Healthy">Healthy</option>
                    <option value="At Risk">At Risk</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Client Status</label>
                  <select [(ngModel)]="kpiForm.status">
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
                <div class="form-field full section-lbl">Social & GBP</div>
                <div class="form-field"><label>Instagram Followers</label><input type="number" [(ngModel)]="kpiForm.igFollowers"></div>
                <div class="form-field"><label>Facebook Followers</label><input type="number" [(ngModel)]="kpiForm.fbFollowers"></div>
                <div class="form-field"><label>GBP Rating</label><input type="number" step="0.1" [(ngModel)]="kpiForm.gbpRating"></div>
                <div class="form-field"><label>GBP Reviews</label><input type="number" [(ngModel)]="kpiForm.gbpReviews"></div>
              </div>
            </div>
            <div class="modal-footer">
               <button class="cancel-btn" (click)="selectedClient.set(null)">Cancel</button>
               <button class="save-btn" (click)="saveKPIs(client.id)">Save & Update</button>
            </div>
          </div>
        </div>
      }

      @if (showOnboard()) {
        <div class="modal-overlay" (click)="showOnboard.set(false)">
          <div class="modal compact-modal onboard" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>Onboard Client</h3>
                <p class="auto-note">⚡ Auto-creates onboarding task thread.</p>
              </div>
              <button class="close-btn" (click)="showOnboard.set(false)">×</button>
            </div>
            <div class="modal-body">
               <div class="form-grid">
                 <div class="form-field full">
                   <label>Client Name *</label>
                   <input type="text" [(ngModel)]="newClient.name" placeholder="Horizon Realty">
                 </div>
                 <div class="form-field full">
                   <label>Client Login Email *</label>
                   <input type="email" [(ngModel)]="newClient.email" placeholder="client@domain.com">
                 </div>
                 <div class="form-field full">
                   <label>Client Login Password *</label>
                   <input type="text" [(ngModel)]="newClient.password" placeholder="TempPass123!">
                 </div>
                 <div class="form-field">
                   <label>Industry</label>
                   <input type="text" [(ngModel)]="newClient.industry" placeholder="Real Estate">
                 </div>
                 <div class="form-field">
                   <label>Monthly Budget (₹)</label>
                   <input type="number" [(ngModel)]="newClient.budget" placeholder="0">
                 </div>
                 <div class="form-field full">
                   <label>Contract End</label>
                   <input type="date" [(ngModel)]="newClient.contractEnd">
                 </div>
               </div>
               
               <div class="services-section">
                 <label class="section-lbl">Services</label>
                 <div class="services-grid">
                    @for (s of availableServices; track s) {
                      <label class="service-pill">
                        <input type="checkbox" (change)="toggleService(s)">
                        <span>{{ s }}</span>
                      </label>
                    }
                 </div>
               </div>
            </div>
            <div class="modal-footer">
               <button class="cancel-btn" (click)="showOnboard.set(false)">Cancel</button>
               <button class="save-btn" (click)="onboardClient()">Onboard + Create Tasks</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-root { display: flex; height: 100vh; background: var(--t-bg); color: #fff; overflow: hidden; font-family: 'Inter', sans-serif; }
    .main-content { flex: 1; padding: 24px 30px; overflow-y: auto; }
    
    .view-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    h1 { font-weight: 800; font-size: 26px; font-family: 'Outfit', sans-serif; }
    .view-header p { color: var(--t-t1); font-size: 14px; margin-top: 2px; }

    .action-btn { background: var(--t-cyan); color: #111; border: none; padding: 10px 20px; border-radius: 9px; font-weight: 700; font-size: 13px; cursor: pointer; transition: all .2s; }
    .action-btn:hover { background: #fff; transform: translateY(-1px); }
    .action-btn.sm { padding: 6px 14px; font-size: 11px; }

    .search-bar { margin-bottom: 24px; position: relative; }
    .search-bar input { 
      width: 100%; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 12px; padding: 14px 18px; 
      color: #fff; font-size: 13px; outline: none; transition: all .3s ease;
    }
    .search-bar input:focus { border-color: var(--t-cyan); box-shadow: 0 0 0 3px rgba(255,255,255,0.03); }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 24px; }
    .stat-card { background: var(--t-s1); border: 1px solid var(--t-br); padding: 16px 18px; border-radius: 14px; }
    .stat-card .label { font-size: 11px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; margin-bottom: 6px; }
    .stat-card .value { font-size: 24px; font-weight: 800; color: #fff; }
    .stat-card .sub { font-size: 11px; color: var(--t-t2); margin-top: 4px; }
    .overdue { color: var(--t-rose); font-weight: 700; }

    /* Client Cards */
    .client-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 15px; }
    .client-card { background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 16px; padding: 20px; transition: all .2s; }
    .client-card:hover { transform: translateY(-2px); border-color: var(--t-brL); }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .c-name { font-weight: 800; font-size: 17px; color: #fff; }
    .c-ind { font-size: 11px; color: var(--t-t2); }
    .health-tag { font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 20px; text-transform: uppercase; }
    .health-tag[data-health="Healthy"] { background: var(--t-limeD); color: var(--t-lime); }
    .health-tag[data-health="At Risk"] { background: var(--t-roseD); color: var(--t-rose); }

    .pacing-row { background: var(--t-s2); border-radius: 10px; padding: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; border: 1px solid transparent; }
    .pacing-row.alert { border-color: rgba(255, 107, 107, 0.2); background: rgba(255, 107, 107, 0.05); }
    .p-text { font-size: 12px; color: var(--t-t1); }
    .p-text strong { color: #fff; margin-left: 4px; }
    .pacing-row.alert .p-text strong { color: var(--t-rose); }
    .p-nums { font-size: 11px; color: var(--t-t2); }

    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
    .m-box { text-align: center; background: var(--t-s2); padding: 10px; border-radius: 10px; }
    .m-val { font-size: 18px; font-weight: 800; color: #fff; }
    .m-lbl { font-size: 10px; color: var(--t-t2); text-transform: uppercase; margin-top: 2px; }

    .kpi-btn-full { width: 100%; padding: 10px; border-radius: 9px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-weight: 700; font-size: 12px; cursor: pointer; transition: all .2s; }
    .kpi-btn-full:hover { background: rgba(255,255,255,0.1); }

    /* Tables */
    .panel { border-radius: 16px; overflow: hidden; background: var(--t-s1); border: 1px solid var(--t-br); }
    .manager-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .manager-table th { text-align: left; padding: 12px 14px; font-size: 10px; color: var(--t-t1); text-transform: uppercase; border-bottom: 1px solid var(--t-br); background: rgba(255,255,255,0.02); }
    .manager-table td { padding: 14px; border-bottom: 1px solid var(--t-br); }
    .client-cell { display: flex; align-items: center; gap: 10px; }
    .c-av { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; }
    .c-n { font-weight: 700; color: #fff; }
    .c-i { font-size: 11px; color: var(--t-t2); }
    .pacing-stack { display: flex; flex-direction: column; gap: 2px; }
    .p-text { font-size: 13px; font-weight: 700; color: var(--t-t1); }
    .p-text.alert { color: var(--t-rose); }
    .p-sub { font-size: 10px; color: var(--t-t2); }
    .h-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .h-badge[data-health="Healthy"] { color: var(--t-lime); background: var(--t-limeD); }
    .bold { font-weight: 700; color: #fff; }
    .lime { color: var(--t-lime); }
    .text-dim { color: var(--t-t1); }
    .text-lime { color: var(--t-lime); }
    .s-badge { padding: 3px 10px; border-radius: 20px; background: rgba(255,255,255,0.05); }
    .o-badge { font-weight: 700; font-size: 11px; }
    .row-action-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 5px 12px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer; }
    .ghost-btn { background: transparent; border: 1px solid var(--t-br); color: var(--t-t1); padding: 5px 12px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer; }
    .row-flex { display: flex; gap: 8px; }

    /* Task board professional tools */
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .search-input { background: var(--t-s1); border: 1px solid var(--t-brL); color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 13px; outline: none; transition: border-color .2s; width: 220px; }
    .search-input:focus { border-color: var(--t-cyan); }
    .filter-select { background: var(--t-s1); border: 1px solid var(--t-brL); color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; }
    .task-card-wrapper { display: flex; flex-direction: column; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 12px; overflow: hidden; margin-bottom: 8px; }

    .task-board { display: flex; flex-direction: column; gap: 0px; }
    .task-card { 
      padding: 14px 20px; display: grid; grid-template-columns: 1fr 120px 80px 70px; gap: 20px; align-items: center; 
      transition: all .2s; background: transparent; border: none; border-radius: 0; cursor: pointer;
    }
    .task-card:hover { background: rgba(255,255,255,0.02); }
    .task-card.overdue-border { border-left: 3px solid var(--t-rose); padding-left: 17px; }
    
    .task-info { min-width: 0; }
    .task-title { font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .task-meta { font-size: 11px; color: var(--t-t1); display: flex; align-items: center; gap: 12px; }
    
    .status-select { 
      background: var(--t-s3); color: var(--t-t1); border: 1px solid transparent; border-radius: 20px; 
      padding: 5px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; cursor: pointer; outline: none; appearance: none; text-align: center;
      width: 110px; transition: all .2s;
    }
    .status-select:hover { border-color: var(--t-brL); background: var(--t-s2); color: #fff; }
    .status-select[data-status="In Progress"] { color: var(--t-cyan); background: rgba(0, 188, 212, 0.1); }
    .status-select[data-status="Done"] { color: var(--t-lime); background: rgba(26, 255, 178, 0.08); }
    .status-select[data-status="Blocked"] { color: var(--t-rose); background: rgba(255, 107, 107, 0.1); }

    .pri-badge { font-size: 11px; font-weight: 800; text-transform: uppercase; width: 80px; text-align: center; border-radius: 6px; padding: 2px 0; background: rgba(255,255,255,0.03); color: var(--t-t2); }
    .pri-badge[data-pri="High"] { color: var(--t-rose); background: rgba(255, 107, 107, 0.05); }
    .pri-badge[data-pri="Medium"] { color: var(--t-cyan); background: rgba(0, 188, 212, 0.05); }

    .task-actions { display: flex; align-items: center; gap: 10px; justify-content: flex-end; width: 70px; }
    .icon-btn { background: var(--t-s3); border: 1px solid var(--t-br); border-radius: 8px; color: var(--t-t1); display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; font-size: 13px; cursor: pointer; transition: all .2s; }
    .icon-btn:hover { background: #fff; color: #000; border-color: #fff; }
    .delete-icon { background: none; border: none; color: var(--t-t1); font-size: 18px; cursor: pointer; opacity: 0.3; transition: all .2s; padding: 4px; }
    .delete-icon:hover { opacity: 1; color: var(--t-rose); transform: scale(1.1); }

    .task-detail-panel { padding: 20px; background: var(--t-s2); border-top: 1px solid var(--t-br); }
    .detail-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; }
    .detail-section label { display: block; font-size: 10px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; }
    
    .subtask-list { display: flex; flex-direction: column; gap: 10px; }
    .subtask-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #eee; }
    .subtask-item input { width: 16px; height: 16px; accent-color: var(--t-cyan); cursor: pointer; }
    .subtask-item .done { text-decoration: line-through; opacity: 0.5; flex: 1; }
    .remove-st-icon { background: none; border: none; color: var(--t-t1); cursor: pointer; opacity: 0.3; font-size: 14px; }
    .remove-st-icon:hover { opacity: 1; color: var(--t-rose); }

    .subtask-add-inline { display: flex; gap: 8px; margin-top: 8px; }
    .subtask-add-inline input { flex: 1; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 6px; padding: 6px 10px; color: #fff; font-size: 12px; outline: none; }
    .subtask-add-inline button { background: var(--t-br); color: #fff; border: none; padding: 0 10px; border-radius: 6px; font-weight: 700; cursor: pointer; }

    .submit-completion-btn { 
      width: 100%; margin-top: 15px; padding: 12px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #00bcd4, #00ff9d); color: #080808;
      font-weight: 800; font-size: 12px; text-transform: uppercase; cursor: pointer; 
      transition: all .2s; box-shadow: 0 4px 20px rgba(0, 255, 157, 0.3);
      display: block; text-align: center;
    }
    .submit-completion-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(0, 255, 157, 0.5); filter: brightness(1.1); }

    .comment-thread { max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .comment { background: var(--t-s1); padding: 12px; border-radius: 10px; border-left: 3px solid var(--t-br); }
    .comment.issue { border-left-color: var(--t-rose); background: rgba(255, 107, 107, 0.05); }
    .comment-meta { font-size: 11px; color: var(--t-t1); margin-bottom: 4px; }
    .comment-text { font-size: 13px; line-height: 1.5; color: #fff; }
    .issue-badge { background: var(--t-rose); color: #fff; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 900; margin-left: 6px; }

    .add-comment { display: flex; gap: 10px; }
    .add-comment input { flex: 1; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 8px; padding: 10px; color: #fff; font-size: 13px; outline: none; }
    .add-comment button { background: #fff; color: #000; border: none; padding: 0 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; }

    .empty-hint { font-size: 12px; color: var(--t-t2); font-style: italic; }

    .modal.task-modal { width: 500px; }
    .subtask-input-group { background: var(--t-s2); border: 1px solid var(--t-br); padding: 12px; border-radius: 8px; margin-bottom: 10px; }
    .st-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 6px; color: #eee; }
    .st-row button { background: none; border: none; color: var(--t-t1); cursor: pointer; font-size: 16px; }
    .st-add { display: flex; gap: 8px; margin-top: 10px; }
    .st-add input { flex: 1; background: var(--t-s1) !important; border-radius: 6px !important; padding: 8px !important; }
    .st-add button { background: var(--t-br); color: #fff; border: none; padding: 0 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }

    /* Reports */
    .rep-status-cell { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--t-t1); }
    .rep-status-cell .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--t-t2); }
    .rep-status-cell .dot.generated { background: var(--t-lime); }

    /* Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 3000; }
    .modal { background: var(--t-s1); border: 1px solid var(--t-brL); border-radius: 14px; padding: 24px; width: 420px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { font-size: 17px; font-weight: 800; }
    .close-btn { background: none; border: none; color: var(--t-t1); font-size: 24px; cursor: pointer; line-height: 1; display: flex; align-items: center; justify-content: center; transition: color .2s; }
    .close-btn:hover { color: #fff; }
    .form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .form-field label { font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; }
    .form-field input, .form-field select { background: var(--t-s2); border: 1px solid var(--t-br); border-radius: 8px; padding: 10px; color: #fff; font-size: 13px; outline: none; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-footer { display: flex; gap: 12px; margin-top: 24px; }
    .save-btn { flex: 2; padding: 11px; border-radius: 9px; border: none; background: #fff; color: #111; font-weight: 800; cursor: pointer; transition: all .2s; }
    .save-btn:hover { background: var(--t-cyan); transform: translateY(-1px); }
    .cancel-btn { flex: 1; padding: 11px; border-radius: 9px; border: 1px solid var(--t-br); background: transparent; color: var(--t-t1); font-weight: 700; cursor: pointer; }

    /* Services refinement */
    .services-section { margin-top: 20px; border-top: 1px solid var(--t-br); padding-top: 20px; }
    .section-lbl { font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; margin-bottom: 12px; display: block; }
    .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .service-pill { 
      display: flex; align-items: center; gap: 8px; background: var(--t-s2); border: 1px solid var(--t-br); 
      padding: 8px 10px; border-radius: 8px; font-size: 11px; color: var(--t-t1); cursor: pointer; transition: all .2s;
    }
    .service-pill:hover { border-color: var(--t-brL); color: #fff; }
    .service-pill input { accent-color: var(--t-cyan); cursor: pointer; }
  `]
})
export class ManagerDashboard {
  agencyService = inject(AgencyService);
  page = signal('dash');

  // Search signals
  clientSearch = signal('');
  taskSearch = signal('');

  // Modals
  showAddTask = signal(false);
  showOnboard = signal(false);
  selectedClient = signal<Client | null>(null);
  kpiForm: any = {};
  newTask: any = { title: '', clientId: null, assigneeId: '', priority: 'Medium', due: '' };
  newTaskSubtasks: string[] = [];
  newClient: any = { name: '', email: '', password: '', industry: '', managerId: 'm1', budget: 0, services: [], contractEnd: '', notes: '' };

  currentUser = computed(() => this.agencyService.currentUser());
  availableServices = ['Meta Ads', 'Google Ads', 'SEO', 'Social', 'Email', 'GBP'];
  managerClients = computed(() => this.agencyService.clients().filter(c => c.managerId === this.currentUser()?.id));
  
  openTasks = computed(() => {
    const myClientIds = this.managerClients().map(c => c.id);
    return this.agencyService.tasks().filter(t => 
      (t.clientId && myClientIds.includes(t.clientId)) || 
      t.assigneeId === this.currentUser()?.id
    ).filter(t => t.status !== 'Done');
  });

  filteredClients = computed(() => {
    const q = this.clientSearch().toLowerCase();
    return this.managerClients().filter(c => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q));
  });

  filteredTasks = computed(() => {
    let tasks = this.openTasks();
    const q = this.taskSearch().toLowerCase();
    const pri = this.filterPriority();
    const status = this.filterStatus();
    
    if (q) {
      tasks = tasks.filter(t => 
        t.title.toLowerCase().includes(q) || 
        this.getClientName(t.clientId).toLowerCase().includes(q)
      );
    }
    if (pri !== 'All') {
      tasks = tasks.filter(t => t.priority === pri);
    }
    if (status !== 'All') {
      tasks = tasks.filter(t => t.status === status);
    }
    return tasks;
  });

  filterPriority = signal('All');
  filterStatus = signal('All');
  expandedTasks = signal<Set<number>>(new Set());

  toggleExpand(id: number) {
    const updated = new Set(this.expandedTasks());
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    this.expandedTasks.set(updated);
  }

  updateStatus(id: number, newStatus: string) {
    this.agencyService.updateTask(id, { status: newStatus });
  }

  getCompletedCount(task: Task) {
    return task.subtasks?.filter(s => s.completed).length || 0;
  }

  toggleSubtask(task: Task, index: number) {
    const subtasks = [...(task.subtasks || [])];
    subtasks[index] = { ...subtasks[index], completed: !subtasks[index].completed };
    this.agencyService.updateTask(task.id, { subtasks });
  }

  addComment(task: Task, input: HTMLInputElement) {
    const text = input.value.trim();
    if (!text) return;
    
    const comments = [...(task.comments || [])];
    comments.push({
      userId: this.currentUser()?.id || '',
      userName: this.currentUser()?.name || 'Manager',
      text,
      timestamp: new Date().toISOString(),
      type: 'note'
    });
    
    this.agencyService.updateTask(task.id, { comments });
    input.value = '';
  }

  allSubtasksDone(task: Task) {
    return task.subtasks && task.subtasks.length > 0 && task.subtasks.every(s => s.completed);
  }

  submitTask(task: Task) {
    this.agencyService.updateTask(task.id, { status: 'Done' });
  }

  addSubtaskToNew(input: HTMLInputElement) {
    const title = input.value.trim();
    if (title) {
      this.newTaskSubtasks = [...this.newTaskSubtasks, title];
      input.value = '';
    }
  }

  removeSubtaskFromNew(index: number) {
    this.newTaskSubtasks = this.newTaskSubtasks.filter((_, i) => i !== index);
  }

  addSubtaskToExisting(task: Task, input: HTMLInputElement) {
    const title = input.value.trim();
    if (!title) return;
    const subtasks = [...(task.subtasks || []), { title, completed: false }];
    this.agencyService.updateTask(task.id, { subtasks });
    input.value = '';
  }

  removeSubtaskFromExisting(task: Task, index: number) {
    const subtasks = task.subtasks?.filter((_, i) => i !== index);
    this.agencyService.updateTask(task.id, { subtasks });
  }

  overdueCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.openTasks().filter(t => t.due < today).length;
  });

  totalLeads = computed(() => this.managerClients().reduce((acc, c) => acc + c.leads, 0));
  team = computed(() => this.agencyService.users().filter(u => u.role !== 'client'));

  updateSearch() {
    // Handled by signals automatically
  }

  getClientName(id: number | null) {
    if (!id) return 'Internal';
    return this.agencyService.clients().find(c => c.id === id)?.name || 'Client';
  }

  getAssigneeName(id: string) {
    return this.agencyService.users().find(u => u.id === id)?.name || 'Unassigned';
  }

  calcOverdue(due: string) {
    const diff = new Date().getTime() - new Date(due).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  openKPI(c: Client) {
    this.selectedClient.set(c);
    this.kpiForm = { ...c };
  }

  saveKPIs(id: number) {
    this.agencyService.enterKPIs(id, this.kpiForm);
    this.selectedClient.set(null);
  }

  addTask() {
    if (!this.newTask.title) return;
    this.agencyService.addTask({
      ...this.newTask,
      status: 'To Do',
      type: 'custom',
      subtasks: this.newTaskSubtasks.map(t => ({ title: t, completed: false })),
      comments: []
    });
    this.showAddTask.set(false);
    this.newTask = { title: '', clientId: null, assigneeId: '', priority: 'Medium', due: '' };
    this.newTaskSubtasks = [];
  }


  async onboardClient() {
    if (!this.newClient.name || !this.newClient.email || !this.newClient.password) {
      alert("Name, Email, and Password are required to onboard a client with credentials.");
      return;
    }

    const newUser = await this.agencyService.addUser({
      name: this.newClient.name,
      email: this.newClient.email,
      password: this.newClient.password,
      role: 'client'
    });

    if (!newUser) return;

    const mid = this.currentUser()?.id || 'm1';
    const clientData = { ...this.newClient, managerId: mid };
    delete clientData.email;
    delete clientData.password;

    await this.agencyService.addClient({ ...clientData, userId: newUser.id });
    
    this.showOnboard.set(false);
    this.newClient = { name: '', email: '', password: '', industry: '', managerId: '', budget: 0, services: [], contractEnd: '', notes: '' };
  }

  toggleService(s: string) {
    const idx = this.newClient.services.indexOf(s);
    if (idx > -1) this.newClient.services.splice(idx, 1);
    else this.newClient.services.push(s);
  }

  generateReport(c: Client) {
    this.agencyService.updateClient(c.id, { reportGenerated: true });
  }
}

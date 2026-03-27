import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, Client, User, Task } from '../../services/agency.service';
import { Sidebar } from '../shared/sidebar/sidebar';

// Sub-portal views
import { AdminClients } from '../admin-portal/admin-clients';
import { TaskBoard } from '../admin-portal/task-board';
import { TeamView } from '../admin-portal/team-view';
import { ReportsHub } from '../admin-portal/reports-hub';
import { BillingPage } from '../admin-portal/billing-page';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, AdminClients, TaskBoard, TeamView, ReportsHub, BillingPage],
  template: `
    <div class="dashboard-root">
      <app-sidebar 
        [user]="agencyService.currentUser()" 
        [currentPage]="page()"
        (pageChange)="page.set($event)"
      />
      
      <main class="main-content">
        @if (page() === 'dash') {
          <div class="dash-view">
            <header class="view-header">
              <div>
                <h1>Admin Dashboard</h1>
                <p>Full agency overview</p>
              </div>
              <button class="action-btn" (click)="showOnboard.set(true)">+ Onboard Client</button>
            </header>

            @if (overpacingClients().length > 0) {
              <div class="alert-banner overpacing">
                <span class="pulse-dot"></span>
                <strong>Budget Pacing Alert — </strong>
                <span>{{ overpacingClients().join(', ') }} (Overpacing)</span>
              </div>
            }

            <div class="stats-grid">
              <div class="stat-card">
                <div class="label">Active Clients</div>
                <div class="value">{{ activeClientsCount() }}</div>
                <div class="sub">of 20 on Growth</div>
              </div>
              <div class="stat-card">
                <div class="label">Monthly MRR</div>
                <div class="value">\${{ mrr().toFixed(1) }}k</div>
                <div class="sub">recurring revenue</div>
              </div>
              <div class="stat-card">
                <div class="label">Total Leads</div>
                <div class="value">{{ totalLeads() }}</div>
                <div class="sub">this month</div>
              </div>
              <div class="stat-card">
                <div class="label">Open Tasks</div>
                <div class="value">{{ openTasksCount() }} <span class="overdue">({{ overdueTasksCount() }} overdue)</span></div>
                <div class="sub">across all clients</div>
              </div>
              <div class="stat-card">
                <div class="label">Team Members</div>
                <div class="value">{{ teamCount() }}</div>
                <div class="sub">managers & staff</div>
              </div>
            </div>

            <div class="content-row">
              <div class="panel client-health-panel">
                <div class="panel-header">
                  <h3>Client Health & Pacing</h3>
                </div>
                <table class="health-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Status / Health</th>
                      <th>Pacing</th>
                      <th>Budget Spent</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (client of agencyService.clients(); track client.id) {
                      <tr>
                        <td>
                          <div class="client-name">{{ client.name }}</div>
                        </td>
                        <td>
                           <div class="health-row">
                             <span class="status-dot" [attr.data-status]="client.status"></span>
                             <span class="health-text" [attr.data-health]="client.health">{{ client.health }}</span>
                           </div>
                        </td>
                        <td>
                           <div class="pacing-cell" [class.alert]="agencyService.calcPacing(client) > 90">
                             <span class="pct">{{ agencyService.calcPacing(client) > 90 ? '⚡ Overpacing' : '⚠️ Underpacing' }}</span>
                             <span class="val">{{ agencyService.calcPacing(client) }}%</span>
                           </div>
                        </td>
                        <td>
                          <div class="budget-cell">
                            <strong>{{ client.spend | currency:'INR':'symbol':'1.0-0' }}</strong>
                            <span>of {{ client.budget | currency:'INR':'symbol':'1.0-0' }}</span>
                          </div>
                        </td>
                        <td>
                          <button class="kpi-row-btn" (click)="setKPIClient(client)">Enter KPIs</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="side-panels">
                <div class="panel sub-panel">
                   <h3>Subscription — Growth</h3>
                   <div class="sub-progress">
                     <div class="prog-top">
                       <span>{{ activeClientsCount() }} / 20 clients</span>
                       <span>{{ Math.round((activeClientsCount() / 20) * 100) }}%</span>
                     </div>
                     <div class="bar-bg"><div class="bar-fill" [style.width.%]="(activeClientsCount() / 20) * 100"></div></div>
                   </div>
                   <div class="sub-meta">$129/mo · Growth Plan</div>
                </div>

                <div class="panel tasks-panel">
                  <h3>Overdue Tasks</h3>
                  <div class="overdue-list">
                    @for (task of overdueTasks(); track task.id) {
                      <div class="overdue-item">
                        <div class="task-t">{{ task.title }}</div>
                        <div class="task-d">{{ calcOverdueDays(task.due) }}d overdue</div>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        }

        @if (page() === 'clients') { <app-admin-clients /> }
        @if (page() === 'tasks') { <app-task-board /> }
        @if (page() === 'team') { <app-team-view /> }
        @if (page() === 'reports') { <app-reports-hub /> }
        @if (page() === 'billing') { <app-billing-page /> }
      </main>

      <!-- Modals -->
       @if (selectedClient(); as client) {
        <div class="modal-overlay" (click)="selectedClient.set(null)">
          <div class="modal compact-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>Enter KPIs — {{ client.name }}</h3>
                <p class="auto-note">✓ Updates health score, budget pacing, and report automatically.</p>
              </div>
              <button class="close-btn" (click)="selectedClient.set(null)">×</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-field">
                  <label>Ad Spend (₹)</label>
                  <input type="number" [(ngModel)]="kpiForm.spend">
                </div>
                <div class="form-field">
                  <label>Leads</label>
                  <input type="number" [(ngModel)]="kpiForm.leads">
                </div>
                <div class="form-field">
                  <label>Revenue (₹)</label>
                  <input type="number" [(ngModel)]="kpiForm.revenue">
                </div>
                <div class="form-field">
                  <label>ROAS (auto: {{ (kpiForm.revenue / (kpiForm.spend || 1)).toFixed(2) }}×)</label>
                  <input type="number" step="0.1" [(ngModel)]="kpiForm.roas">
                </div>
                <div class="form-field">
                  <label>Health Status</label>
                  <select [(ngModel)]="kpiForm.health" class="form-select">
                    <option value="Healthy">Healthy</option>
                    <option value="At Risk">At Risk</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Client Status</label>
                  <select [(ngModel)]="kpiForm.status" class="form-select">
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>IG Followers</label>
                  <input type="number" [(ngModel)]="kpiForm.igFollowers">
                </div>
                <div class="form-field">
                  <label>FB Followers</label>
                  <input type="number" [(ngModel)]="kpiForm.fbFollowers">
                </div>
                <div class="form-field">
                  <label>GBP Rating</label>
                  <input type="number" step="0.1" min="0" max="5" [(ngModel)]="kpiForm.gbpRating">
                </div>
                <div class="form-field">
                  <label>GBP Reviews</label>
                  <input type="number" [(ngModel)]="kpiForm.gbpReviews">
                </div>
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
                <p class="auto-note">⚡ Auto-creates 8 onboarding tasks assigned to manager.</p>
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
                   <label>Manager</label>
                   <select [(ngModel)]="newClient.managerId" class="form-select">
                     @for (m of managers(); track m.id) { <option [value]="m.id">{{ m.name }}</option> }
                   </select>
                 </div>
                 <div class="form-field">
                   <label>Budget (₹)</label>
                   <input type="number" [(ngModel)]="newClient.budget">
                 </div>
                 <div class="form-field">
                   <label>Contract End</label>
                   <input type="date" [(ngModel)]="newClient.contractEnd">
                 </div>
               </div>
               <div class="services-mini" style="margin-top: 15px;">
                 <label class="section-label">Services</label>
                 <div class="mini-grid">
                    @for (s of availableServices; track s) {
                      <label class="mini-check"><input type="checkbox" (change)="toggleService(s)"><span>{{ s }}</span></label>
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
    .dashboard-root { display: flex; height: 100vh; background: var(--t-bg); color: #fff; overflow: hidden; }
    .main-content { flex: 1; padding: 24px 30px; overflow-y: auto; }
    
    .view-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    h1 { font-weight: 800; font-size: 26px; }
    .view-header p { color: var(--t-t1); font-size: 14px; margin-top: 2px; }

    .action-btn { background: var(--t-cyan); color: #111; border: none; padding: 10px 20px; border-radius: 9px; font-weight: 700; font-size: 13px; cursor: pointer; }

    /* Alert Banner */
    .alert-banner { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; margin-bottom: 24px; font-size: 12px; }
    .alert-banner.overpacing { background: rgba(255, 107, 107, 0.08); border: 1px solid rgba(255, 107, 107, 0.2); }
    .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--t-rose); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } 100% { opacity: 1; transform: scale(1); } }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 24px; }
    .stat-card { background: var(--t-s1); border: 1px solid var(--t-br); padding: 16px 18px; border-radius: 14px; }
    .stat-card .label { font-size: 11px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
    .stat-card .value { font-size: 24px; font-weight: 800; color: #fff; }
    .stat-card .sub { font-size: 11px; color: var(--t-t2); margin-top: 4px; }
    .overdue { color: var(--t-rose); font-weight: 700; }

    /* Layout Panel */
    .content-row { display: grid; grid-template-columns: 1fr 280px; gap: 20px; align-items: flex-start; }
    .panel { background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 16px; padding: 20px; }
    .panel-header { margin-bottom: 18px; }
    .panel h3 { font-size: 15px; font-weight: 800; }

    /* Health Table */
    .health-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .health-table th { text-align: left; padding: 8px 10px; font-size: 10px; color: var(--t-t1); text-transform: uppercase; border-bottom: 1px solid var(--t-br); }
    .health-table td { padding: 14px 10px; border-bottom: 1px solid var(--t-br); }
    
    .client-name { font-weight: 700; color: #fff; }
    .health-row { display: flex; align-items: center; gap: 8px; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--t-t1); }
    .status-dot[data-status="Active"] { background: var(--t-lime); }
    .status-dot[data-status="On Hold"] { background: var(--t-amber); }
    .health-text { font-weight: 700; font-size: 12px; }
    .health-text[data-health="Healthy"] { color: var(--t-lime); }
    .health-text[data-health="At Risk"] { color: var(--t-amber); }
    .health-text[data-health="Critical"] { color: var(--t-rose); }

    .pacing-cell { display: flex; flex-direction: column; }
    .pacing-cell .pct { font-size: 11px; color: var(--t-t1); }
    .pacing-cell.alert .pct { color: var(--t-rose); font-weight: 700; }
    .pacing-cell .val { font-size: 14px; font-weight: 800; }

    .budget-cell { display: flex; flex-direction: column; line-height: 1.3; }
    .budget-cell strong { font-size: 14px; color: #fff; }
    .budget-cell span { font-size: 11px; color: var(--t-t2); }

    .kpi-row-btn { background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 5px 12px; border-radius: 7px; font-size: 11px; font-weight: 700; cursor: pointer; }

    /* Side Panels */
    .side-panels { display: flex; flex-direction: column; gap: 20px; }
    .sub-progress { margin: 15px 0 8px; }
    .prog-top { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 5px; }
    .bar-bg { height: 6px; background: var(--t-s3); border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; background: var(--t-lime); }
    .sub-meta { font-size: 11px; color: var(--t-t2); }

    .overdue-list { display: flex; flex-direction: column; gap: 10px; margin-top: 15px; }
    .overdue-item { border-left: 2px solid var(--t-rose); padding-left: 10px; }
    .task-t { font-size: 12px; font-weight: 600; color: #fff; }
    .task-d { font-size: 10px; color: var(--t-rose); font-weight: 700; margin-top: 2px; }

    /* Compact Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal.compact-modal { background: var(--t-s1); border: 1px solid var(--t-brL); border-radius: 12px; width: 400px; padding: 20px; }
    .modal-header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .modal-header h3 { font-size: 16px; font-weight: 800; }
    .auto-note { font-size: 10px; color: var(--t-t1); margin-top: 4px; line-height: 1.4; }
    .close-btn { background: none; border: none; color: var(--t-t1); font-size: 22px; cursor: pointer; line-height: 1; padding: 4px; display: flex; align-items: center; justify-content: center; transition: color .2s; }
    .close-btn:hover { color: #fff; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .form-field.full { grid-column: span 2; }
    .form-field label { font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; margin-bottom: 4px; display: block; }
    .form-field input, .form-select { width: 100%; background: var(--t-s2); border: 1px solid var(--t-br); border-radius: 6px; padding: 8px; color: #fff; font-size: 12px; outline: none; }
    .mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .mini-check { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--t-t1); }
    .section-label { font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; margin-bottom: 6px; display: block; }
    .modal-footer { display: flex; gap: 10px; margin-top: 20px; }
    .cancel-btn { flex: 1; background: transparent; border: 1px solid var(--t-br); color: var(--t-t1); padding: 9px; border-radius: 7px; font-size: 12px; cursor: pointer; }
    .save-btn { flex: 2; background: #fff; color: #111; padding: 9px; border-radius: 7px; border: none; font-weight: 800; font-size: 12px; cursor: pointer; }
  `]
})
export class AdminDashboard {
  agencyService = inject(AgencyService);
  page = signal('dash');
  Math = Math;

  // Modal signals
  showOnboard = signal(false);
  selectedClient = signal<Client | null>(null);
  kpiForm: any = {};
  newClient: any = { name: '', email: '', password: '', industry: '', managerId: 'm1', budget: 0, services: [], contractEnd: '', notes: '' };
  availableServices = ['Meta Ads', 'Google Ads', 'SEO', 'Social', 'Email', 'GBP'];

  activeClientsCount = computed(() => this.agencyService.clients().filter(c => c.status === 'Active').length);
  mrr = computed(() => this.agencyService.clients().reduce((acc, c) => acc + (c.budget / 1000), 0));
  totalLeads = computed(() => this.agencyService.clients().reduce((acc, c) => acc + c.leads, 0));
  openTasksCount = computed(() => this.agencyService.tasks().filter(t => t.status !== 'Done').length);
  overdueTasksCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.agencyService.tasks().filter(t => t.status !== 'Done' && t.due < today).length;
  });
  teamCount = computed(() => this.agencyService.users().filter(u => u.role !== 'client').length);

  overpacingClients = computed(() =>
    this.agencyService.clients()
      .filter(c => this.agencyService.calcPacing(c) > 90)
      .map(c => c.name)
  );

  overdueTasks = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.agencyService.tasks()
      .filter(t => t.status !== 'Done' && t.due < today)
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 4);
  });

  managers = computed(() => this.agencyService.users().filter(u => u.role === 'manager' || u.role === 'admin'));

  calcOverdueDays(due: string) {
    const d = new Date(due);
    const today = new Date();
    const diff = today.getTime() - d.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  setKPIClient(c: Client) {
    this.selectedClient.set(c);
    this.kpiForm = { ...c };
  }

  saveKPIs(id: number) {
    this.agencyService.enterKPIs(id, this.kpiForm);
    this.selectedClient.set(null);
  }

  toggleService(s: string) {
    const idx = this.newClient.services.indexOf(s);
    if (idx > -1) this.newClient.services.splice(idx, 1);
    else this.newClient.services.push(s);
  }

  async onboardClient() {
    if (!this.newClient.name || !this.newClient.email || !this.newClient.password) {
      alert("Name, Email, and Password are required to onboard a client with credentials.");
      return;
    }

    // 1. Create User
    const newUser = await this.agencyService.addUser({
      name: this.newClient.name,
      email: this.newClient.email,
      password: this.newClient.password,
      role: 'client'
    });

    if (!newUser) return;

    // 2. Create Client Profile & Link it immediately
    const clientData = { ...this.newClient };
    delete clientData.email;
    delete clientData.password;

    await this.agencyService.addClient({ ...clientData, userId: newUser.id });

    this.showOnboard.set(false);
    this.newClient = { name: '', email: '', password: '', industry: '', managerId: 'm1', budget: 0, services: [], contractEnd: '', notes: '' };
  }
}

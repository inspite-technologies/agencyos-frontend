import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, Client } from '../../services/agency.service';

@Component({
  selector: 'app-admin-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-clients">
      <header class="view-header">
        <div>
          <h1>Clients</h1>
          <p>{{ agencyService.clients().length }} total · {{ activeCount() }} active</p>
        </div>
        <button class="action-btn" (click)="showOnboard.set(true)">+ Onboard Client</button>
      </header>

      <div class="search-bar">
        <input type="text" [(ngModel)]="searchQuery" placeholder="Search clients…">
      </div>

      <div class="card table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Manager</th>
              <th>Budget / Pacing</th>
              <th>Health</th>
              <th>Leads</th>
              <th>ROAS</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (client of filteredClients(); track client.id) {
              <tr>
                <td>
                  <div class="client-info">
                    <div class="client-avatar" [style.background]="client.color + '22'" [style.color]="client.color">
                      {{ client.name[0] }}
                    </div>
                    <div>
                      <div class="name">{{ client.name }}</div>
                      <div class="industry">{{ client.industry }}</div>
                    </div>
                  </div>
                </td>
                <td>{{ getManagerName(client.managerId) }}</td>
                <td>
                  <div class="pacing-container">
                    <div class="pacing-bar"><div class="fill" [style.width.%]="agencyService.calcPacing(client)"></div></div>
                    <div class="pacing-meta">{{ client.spend | currency:'INR':'symbol':'1.0-0' }} / {{ client.budget | currency:'INR':'symbol':'1.0-0' }}</div>
                  </div>
                </td>
                <td><span class="health-badge" [attr.data-health]="client.health">{{ client.health }}</span></td>
                <td class="bold">{{ client.leads }}</td>
                <td class="lime bold">{{ client.roas }}×</td>
                <td><span class="status-badge">{{ client.status }}</span></td>
                <td><button class="kpi-btn" (click)="setClient(client)">KPIs</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- KPI Modal -->
      @if (selectedClient(); as client) {
        <div class="modal-overlay" (click)="selectedClient.set(null)">
          <div class="modal compact-modal" (click)="$event.stopPropagation()">
             <div class="modal-header">
               <div>
                 <h3>Enter KPIs — {{ client.name }}</h3>
                 <p class="auto-note">✓ Updates health score and report automatically.</p>
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

      <!-- Onboard Modal -->
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
                  <label>Client Account Name *</label>
                  <input type="text" [(ngModel)]="newClient.clientLoginName" placeholder="Full Name (e.g. John Doe)">
                </div>
                <div class="form-field">
                  <label>Login Email *</label>
                  <input type="email" [(ngModel)]="newClient.clientEmail" placeholder="client@example.com">
                </div>
                <div class="form-field">
                  <label>Login Password *</label>
                  <input type="password" [(ngModel)]="newClient.clientPassword" placeholder="Set a temporary password">
                </div>
                <div class="form-field full" style="margin-top: 10px;">
                  <label>Business Name *</label>
                  <input type="text" [(ngModel)]="newClient.name" placeholder="Horizon Realty">
                </div>
                <div class="form-field">
                  <label>Industry</label>
                  <input type="text" [(ngModel)]="newClient.industry" placeholder="Real Estate">
                </div>
                <div class="form-field">
                  <label>Manager</label>
                  <select [(ngModel)]="newClient.managerId" class="form-select">
                    @for (mgr of managers(); track mgr.id) {
                      <option [value]="mgr.id">{{ mgr.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-field">
                  <label>Monthly Budget (₹)</label>
                  <input type="number" [(ngModel)]="newClient.budget">
                </div>
                <div class="form-field">
                   <label>Contract End</label>
                   <input type="date" [(ngModel)]="newClient.contractEnd">
                </div>
              </div>

              <div class="services-mini" style="margin-top: 15px;">
                <label>Services</label>
                <div class="mini-grid">
                  @for (srv of availableServices; track srv) {
                    <label class="mini-check">
                      <input type="checkbox" (change)="toggleService(srv)">
                      <span>{{ srv }}</span>
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
    .admin-clients { display: flex; flex-direction: column; height: 100%; }
    .view-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
    h1 { font-weight: 800; font-size: 24px; }
    .view-header p { color: var(--t-t1); font-size: 13px; margin-top: 2px; }

    .action-btn { background: var(--t-cyan); color: #111; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; }
    
    .search-bar { margin-bottom: 12px; }
    .search-bar input { width: 100%; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 8px; padding: 10px 12px; color: #fff; font-size: 13px; outline: none; }

    .table-card { padding: 0; overflow: hidden; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 14px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { text-align: left; padding: 11px 14px; font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; border-bottom: 1px solid var(--t-br); background: var(--t-bg); }
    .data-table td { padding: 12px 14px; border-bottom: 1px solid var(--t-br); color: var(--t-t1); }
    
    .client-info { display: flex; align-items: center; gap: 8px; }
    .client-avatar { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 10px; }
    .client-info .name { font-weight: 600; color: #fff; }
    .client-info .industry { font-size: 10px; color: var(--t-t2); }

    .pacing-container { min-width: 140px; }
    .pacing-bar { height: 5px; background: var(--t-s3); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
    .pacing-bar .fill { height: 100%; background: var(--t-lime); }
    .pacing-meta { font-size: 10px; color: var(--t-t2); }

    .health-badge { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .health-badge[data-health="Healthy"] { color: var(--t-lime); background: var(--t-limeD); }
    .health-badge[data-health="At Risk"] { color: var(--t-amber); background: var(--t-amberD); }
    .health-badge[data-health="Critical"] { color: var(--t-rose); background: var(--t-roseD); }

    .status-badge { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; background: var(--t-s3); color: var(--t-t1); }
    .bold { font-weight: 700; color: #fff; }
    .lime { color: var(--t-lime); }

    .kpi-btn { background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; }

    /* Compact Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal.compact-modal { background: var(--t-s1); border: 1px solid var(--t-brL); border-radius: 12px; width: 420px; padding: 20px; }
    .modal-header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .modal-header h3 { font-size: 16px; font-weight: 800; }
    .auto-note { font-size: 11px; color: var(--t-t1); margin-top: 4px; }
    .close-btn { background: none; border: none; color: var(--t-t1); font-size: 20px; cursor: pointer; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .form-field.full { grid-column: span 2; }
    .form-field label { font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; margin-bottom: 4px; display: block; }
    .form-field input, .form-select { width: 100%; background: var(--t-s2); border: 1px solid var(--t-br); border-radius: 6px; padding: 8px; color: #fff; font-size: 12px; outline: none; }
    .mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .mini-check { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--t-t1); }
    .modal-footer { display: flex; gap: 10px; margin-top: 20px; }
    .cancel-btn { flex: 1; background: transparent; border: 1px solid var(--t-br); color: var(--t-t1); padding: 9px; border-radius: 7px; font-size: 12px; }
    .save-btn { flex: 2; background: #fff; color: #111; padding: 9px; border-radius: 7px; border: none; font-weight: 800; font-size: 12px; }

    /* Custom Dropdown Styles */
    .dropdown-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--t-s2); border: 1px solid var(--t-brL); border-radius: 8px; max-height: 180px; overflow-y: auto; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    .dropdown-item { padding: 10px 14px; cursor: pointer; font-size: 12px; color: #fff; border-bottom: 1px solid var(--t-br); transition: background .2s; }
    .dropdown-item:last-child { border-bottom: none; }
    .dropdown-item:hover { background: var(--t-s3); }
    .dropdown-item.empty { cursor: default; background: transparent; color: var(--t-t1); font-style: italic; text-align: center; }
  `]
})
export class AdminClients {
  agencyService = inject(AgencyService);
  searchQuery = '';
  selectedClient = signal<Client | null>(null);
  showOnboard = signal(false);
  kpiForm: any = {};
  newClient: any = { name: '', industry: '', managerId: 'm1', budget: 0, services: [], contractEnd: '', notes: '', clientLoginName: '', clientEmail: '', clientPassword: '' };

  availableServices = ['Meta Ads', 'Google Ads', 'SEO', 'Social', 'Email', 'GBP'];

  activeCount = computed(() => this.agencyService.clients().filter(c => c.status === 'Active').length);
  managers = computed(() => this.agencyService.users().filter(u => u.role === 'manager' || u.role === 'admin'));

  setClient(c: Client) {
    this.selectedClient.set(c);
    this.kpiForm = { ...c };
  }

  saveKPIs(id: number) {
    this.agencyService.enterKPIs(id, this.kpiForm);
    this.selectedClient.set(null);
  }

  toggleService(srv: string) {
    const idx = this.newClient.services.indexOf(srv);
    if (idx > -1) this.newClient.services.splice(idx, 1);
    else this.newClient.services.push(srv);
  }

  async onboardClient() {
    if (!this.newClient.clientEmail || !this.newClient.clientPassword || !this.newClient.name) {
      alert('Please fill in all required fields (Name, Email, Password, Business Name)');
      return;
    }

    try {
      // 1. Create the Client User Account
      const newUser = await this.agencyService.addUser({
        name: this.newClient.clientLoginName || this.newClient.name,
        email: this.newClient.clientEmail,
        password: this.newClient.clientPassword,
        role: 'client',
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(this.newClient.clientLoginName || this.newClient.name)}&background=random`
      });

      // 2. Create the Client/Business Profile linked to this user
      const clientData = { ...this.newClient, userId: newUser.id };
      await this.agencyService.addClient(clientData);

      // 3. Reset and Close
      this.showOnboard.set(false);
      this.newClient = { name: '', industry: '', managerId: 'm1', budget: 0, services: [], contractEnd: '', notes: '', clientLoginName: '', clientEmail: '', clientPassword: '' };
      await this.agencyService.refreshData(); // Sync everything
    } catch (err) {
      console.error('Onboarding failed:', err);
      alert('Failed to onboard client. Please check logs.');
    }
  }

  filteredClients = computed(() => {
    const query = this.searchQuery.toLowerCase();
    return this.agencyService.clients().filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.industry.toLowerCase().includes(query)
    );
  });

  getManagerName(id: string) {
    return this.agencyService.users().find(u => u.id === id)?.name || '—';
  }
}

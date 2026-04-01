import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, Client, User, Task, Invoice } from '../../services/agency.service';
import { ToastService } from '../../services/toast.service';
import { Sidebar } from '../shared/sidebar/sidebar';

// Sub-portal views
import { AdminClients } from '../admin-portal/admin-clients';
import { TaskBoard } from '../admin-portal/task-board';
import { TeamView } from '../admin-portal/team-view';
import { ReportsHub } from '../admin-portal/reports-hub';
import { BillingPage } from '../admin-portal/billing-page';
import { NotificationCenter } from '../shared/notification-center';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, AdminClients, TaskBoard, TeamView, ReportsHub, BillingPage, NotificationCenter],
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
              <div class="header-actions">
                <app-notification-center />
                <button class="action-btn" (click)="showOnboard.set(true)">+ Onboard Client</button>
              </div>
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
                <div class="label">Monthly Agency Revenue</div>
                <div class="value">₹{{ (monthlyAgencyRevenue() / 1000).toFixed(1) }}k</div>
                <div class="sub">active client agency charges</div>
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
                      <th>Budget Spent</th>
                      <th style="width: 80px;">Details</th>
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
                          <div style="display: flex; gap: 8px;">
                            <button class="kpi-row-btn" (click)="setKPIClient(client)">Edit</button>
                          </div>
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

        <!-- Invoices View -->
        @if (page() === 'invoices') {
          <div class="view-container">
            <header class="view-header">
              <div>
                <h1>Invoices</h1>
                <p>Global agency billing management</p>
              </div>
              <button class="action-btn" (click)="showAddInvoice.set(true)">+ Create Invoice</button>
            </header>

            <div class="panel table-panel">
              <table class="health-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (inv of agencyService.invoices(); track inv.id) {
                    <tr>
                      <td class="bold">{{ inv.invoiceNumber }}</td>
                      <td>{{ getClientName(inv.clientId) }}</td>
                      <td>{{ inv.issueDate | date:'shortDate' }}</td>
                      <td [class.overdue-text]="isOverdue(inv.dueDate) && inv.status !== 'Paid'">{{ inv.dueDate | date:'shortDate' }}</td>
                      <td class="bold">{{ inv.total | currency:'INR':'symbol':'1.0-0' }}</td>
                      <td>
                        <select class="status-select-sm" [attr.data-status]="inv.status" [ngModel]="inv.status" (ngModelChange)="updateInvoiceStatus(inv, $event)">
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>
                      <td>
                        <div class="row-flex" style="display: flex; gap: 8px;">
                          <button class="ghost-btn-sm" (click)="editInvoice(inv)">Edit</button>
                          <button class="ghost-btn-sm" (click)="agencyService.downloadInvoice(inv)">Download</button>
                          <button class="delete-btn-sm" (click)="deleteInvoice(inv.id)">Delete</button>
                        </div>
                      </td>
                    </tr>
                  }
                  @if (agencyService.invoices().length === 0) {
                    <tr>
                      <td colspan="7" class="empty-hint" style="text-align: center; padding: 40px;">No invoices generated yet.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </main>

      <!-- Modals -->
      @if (selectedClient(); as client) {
        <div class="modal-overlay" (click)="selectedClient.set(null)">
          <div class="modal compact-modal" style="width: 500px;" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>Edit Client — {{ client.name }}</h3>
                <p class="auto-note">✓ Update performance metrics and agency revenue.</p>
              </div>
              <button class="close-btn" (click)="selectedClient.set(null)">×</button>
            </div>
            <div class="modal-body">
              <div class="form-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                <div class="form-field full" style="grid-column: span 3;"><label>Industry</label><input type="text" [(ngModel)]="kpiForm.industry"></div>
                <div class="form-field"><label>Monthly Budget (₹)</label><input type="number" [(ngModel)]="kpiForm.budget"></div>
                <div class="form-field"><label>Agency Charges (₹)</label><input type="number" [(ngModel)]="kpiForm.agencyCharges"></div>
                <div class="form-field"><label>Contract End</label><input type="date" [(ngModel)]="kpiForm.contractEnd"></div>
                
                <div class="form-field">
                  <label>Health Score</label>
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
                <div class="form-field"></div> <!-- Spacer -->

                <div class="form-field full section-label" style="grid-column: span 3; margin-top: 8px; border-top: 1px solid var(--t-br); padding-top: 10px;">Performance Metrics</div>
                <div class="form-field">
                  <label>Spend / Leads</label>
                  <div style="display: flex; gap: 5px;">
                    <input type="number" [(ngModel)]="kpiForm.spend" placeholder="Spend">
                    <input type="number" [(ngModel)]="kpiForm.leads" placeholder="Leads">
                  </div>
                </div>
                <div class="form-field">
                  <label>Revenue / ROAS</label>
                  <div style="display: flex; gap: 5px;">
                    <input type="number" [(ngModel)]="kpiForm.revenue" placeholder="Revenue">
                    <input type="number" step="0.1" [(ngModel)]="kpiForm.roas" placeholder="ROAS">
                  </div>
                </div>
                <div class="form-field">
                  <label>Notes</label>
                  <textarea [(ngModel)]="kpiForm.notes" rows="1" placeholder="Notes..."></textarea>
                </div>
                
                <div class="form-field full section-label" style="grid-column: span 3; margin-top: 8px; border-top: 1px solid var(--t-br); padding-top: 10px;">Social & GBP</div>
                <div class="form-field">
                  <div style="display: flex; gap: 5px;">
                    <div style="flex: 1;"><label>IG</label><input type="number" [(ngModel)]="kpiForm.igFollowers"></div>
                    <div style="flex: 1;"><label>FB</label><input type="number" [(ngModel)]="kpiForm.fbFollowers"></div>
                  </div>
                </div>
                <div class="form-field">
                  <div style="display: flex; gap: 5px;">
                    <div style="flex: 1;"><label>GBP Rating</label><input type="number" step="0.1" [(ngModel)]="kpiForm.gbpRating"></div>
                    <div style="flex: 1;"><label>Reviews</label><input type="number" [(ngModel)]="kpiForm.gbpReviews"></div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
               <button class="cancel-btn" (click)="selectedClient.set(null)">Cancel</button>
               <button class="save-btn" (click)="saveKPIs(client.id)">Save Changes</button>
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
                   <label>Business Name *</label>
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
               </div>
               <div class="services-mini" style="margin-top: 15px;">
                 <label class="section-label">Services</label>
                 <div class="mini-grid">
                    @for (s of availableServices; track s) {
                      <label class="mini-check"><input type="checkbox" [checked]="newClient.services.includes(s)" (change)="toggleService(s)"><span>{{ s }}</span></label>
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

      <!-- Invoice Modal -->
      @if (showAddInvoice()) {
        <div class="modal-overlay" (click)="showAddInvoice.set(false)">
          <div class="modal compact-modal invoice-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>{{ isEditingInvoice ? 'Edit Invoice' : 'Create New Invoice' }}</h3>
                <p class="auto-note">Professional billing for your clients.</p>
              </div>
              <button class="close-btn" (click)="showAddInvoice.set(false)">×</button>
            </div>
            <div class="modal-body" style="padding-top: 10px;">
              <div class="form-grid">
                <div class="form-field full">
                  <label>Client *</label>
                  <select [(ngModel)]="newInvoice.clientId" class="form-select">
                    <option [ngValue]="null">Select a client...</option>
                    @for (c of agencyService.clients(); track c.id) {
                      <option [ngValue]="c.id">{{ c.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-field">
                  <label>Issue Date</label>
                  <input type="date" [(ngModel)]="newInvoice.issueDate">
                </div>
                <div class="form-field">
                  <label>Due Date</label>
                  <input type="date" [(ngModel)]="newInvoice.dueDate">
                </div>

                <div class="form-field full" style="margin-top: 15px;">
                  <label class="section-label">Invoice Items</label>
                  <div class="invoice-items-box">
                    <div class="items-header">
                      <span style="flex: 1;">Description</span>
                      <span style="width: 60px; text-align: center;">Qty</span>
                      <span style="width: 100px; text-align: right;">Price</span>
                      <span style="width: 30px;"></span>
                    </div>
                    <div class="items-list">
                      @for (item of invoiceItems(); track $index) {
                        <div class="inv-item-row">
                          <input type="text" [(ngModel)]="item.description" placeholder="Service description..." style="flex: 1;">
                          <input type="number" [(ngModel)]="item.quantity" placeholder="1" style="width: 60px; text-align: center;">
                          <input type="number" [(ngModel)]="item.amount" placeholder="0" style="width: 100px; text-align: right;">
                          <button class="remove-item" (click)="removeInvoiceItem($index)" style="width: 30px;">×</button>
                        </div>
                      }
                    </div>
                    <button class="add-item-btn" (click)="addInvoiceItem()">+ Add Item</button>
                  </div>
                </div>

                <div class="form-field full" style="margin-top: 10px; border-top: 1px solid var(--t-br); padding-top: 15px;">
                   <div class="invoice-total">
                     <span class="total-label">TOTAL AMOUNT</span>
                     <span class="total-value">₹{{ calculateInvoiceTotal() | number:'1.2-2' }}</span>
                   </div>
                 </div>
               </div>
            </div>
            <div class="modal-footer">
               <button class="cancel-btn" (click)="showAddInvoice.set(false)">Cancel</button>
               <button class="save-btn" (click)="isEditingInvoice ? updateInvoice() : createInvoice()">{{ isEditingInvoice ? 'Save Changes' : 'Generate Professional Invoice' }}</button>
            </div>
          </div>
        </div>
      }

      <!-- Detailed View Modal -->
      @if (clientDetail(); as client) {
        <div class="modal-overlay" (click)="clientDetail.set(null)">
          <div class="modal compact-modal detail-view" (click)="$event.stopPropagation()" style="width: 500px; padding: 30px;">
            <div class="modal-header">
              <div style="display: flex; align-items: center; gap: 15px;">
                  <div class="c-av" [style.background]="client.color + '22'" [style.color]="client.color" style="width: 50px; height: 50px; font-size: 20px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">{{ client.name[0] }}</div>
                  <div>
                    <h3 style="margin: 0; font-size: 20px;">{{ client.name }}</h3>
                    <p style="margin: 4px 0 0; color: var(--t-t1); font-size: 13px;">{{ client.industry }} · Since {{ client.startDate | date:'mediumDate' }}</p>
                  </div>
              </div>
              <button class="close-btn" (click)="clientDetail.set(null)">×</button>
            </div>
            
            <div class="modal-body" style="margin-top: 25px;">
                <div class="detail-stats" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px;">
                    <div class="d-stat-box" style="background: var(--t-s2); padding: 15px; border-radius: 12px; border: 1px solid var(--t-br);">
                        <div style="font-size: 10px; font-weight: 800; color: var(--t-t2); text-transform: uppercase;">Monthly Budget</div>
                        <div style="font-size: 18px; font-weight: 800; margin-top: 5px;">{{ client.budget | currency:'INR':'symbol':'1.0-0' }}</div>
                    </div>
                    <div class="d-stat-box" style="background: var(--t-s2); padding: 15px; border-radius: 12px; border: 1px solid var(--t-br);">
                        <div style="font-size: 10px; font-weight: 800; color: var(--t-t2); text-transform: uppercase;">Current Spend</div>
                        <div style="font-size: 18px; font-weight: 800; margin-top: 5px;">{{ client.spend | currency:'INR':'symbol':'1.0-0' }}</div>
                    </div>
                    <div class="d-stat-box" style="background: var(--t-s2); padding: 15px; border-radius: 12px; border: 1px solid var(--t-br);">
                        <div style="font-size: 10px; font-weight: 800; color: var(--t-t2); text-transform: uppercase;">Pacing</div>
                        <div style="font-size: 18px; font-weight: 800; margin-top: 5px; color: var(--t-cyan);">{{ agencyService.calcPacing(client) }}%</div>
                    </div>
                    <div class="d-stat-box" style="background: var(--t-s2); padding: 15px; border-radius: 12px; border: 1px solid var(--t-br);">
                        <div style="font-size: 10px; font-weight: 800; color: var(--t-t2); text-transform: uppercase;">Leads / ROAS</div>
                        <div style="font-size: 18px; font-weight: 800; margin-top: 5px;">{{ client.leads }} · {{ client.roas }}x</div>
                    </div>
                </div>

                <div class="detail-section" style="margin-bottom: 25px;">
                    <label style="display: block; font-size: 11px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; margin-bottom: 10px;">Subscribed Services</label>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        @for (s of client.services; track s) {
                            <span style="padding: 6px 14px; background: rgba(0, 188, 212, 0.1); color: var(--t-cyan); border: 1px solid rgba(0, 188, 212, 0.3); border-radius: 20px; font-size: 11px; font-weight: 700;">{{ s }}</span>
                        }
                    </div>
                </div>

                @if (client.notes) {
                    <div class="detail-section">
                        <label style="display: block; font-size: 11px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; margin-bottom: 10px;">Internal Notes</label>
                        <p style="font-size: 13px; color: var(--t-t1); line-height: 1.6; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--t-br);">{{ client.notes }}</p>
                    </div>
                }
            </div>

            <div class="modal-footer" style="margin-top: 30px; display: flex; justify-content: flex-end;">
                <button class="cancel-btn" (click)="clientDetail.set(null)" style="flex: none; min-width: 120px;">Close</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-root { display: flex; height: 100vh; background: var(--t-bg); color: #fff; overflow: hidden; }
    .main-content { flex: 1; padding: 24px 30px; overflow-y: auto; }
    
    .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
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
    .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .form-field.full { grid-column: span 3; }
    .form-field label { font-size: 9px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; margin-bottom: 3px; display: block; }
    .form-field input, .form-select { 
      width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.15); border-radius: 5px; padding: 6px 10px; color: #fff; font-size: 11px; outline: none; transition: all .2s;
    }
    .form-field input:focus, .form-select:focus { border-color: var(--t-cyan); background: rgba(0,0,0,0.4); }
    .mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .mini-check { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--t-t1); }
    .section-label { font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; margin-bottom: 6px; display: block; }
    .modal-footer { display: flex; gap: 10px; margin-top: 20px; }
    .cancel-btn { flex: 1; background: transparent; border: 1px solid var(--t-br); color: var(--t-t1); padding: 9px; border-radius: 7px; font-size: 12px; cursor: pointer; }
    .save-btn { flex: 2; background: #fff; color: #111; padding: 9px; border-radius: 7px; border: none; font-weight: 800; font-size: 12px; cursor: pointer; }

    /* Invoice Specific Styles */
    .invoice-modal { width: 580px !important; }
    .invoice-items-box { background: var(--t-s1); border-radius: 8px; }
    .items-header { display: flex; gap: 10px; margin-bottom: 8px; padding: 0 5px; }
    .items-header span { font-size: 10px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; letter-spacing: .05em; }
    .items-list { display: flex; flex-direction: column; gap: 8px; }
    .inv-item-row { display: flex; gap: 10px; align-items: center; }
    .inv-item-row input { background: var(--t-s2); border: 1px solid var(--t-br); border-radius: 8px; padding: 10px; color: #fff; font-size: 13px; outline: none; }
    .invoice-total { display: flex; justify-content: flex-end; align-items: center; gap: 20px; }
    .total-label { font-size: 11px; font-weight: 800; color: var(--t-t2); }
    .total-value { font-size: 24px; font-weight: 800; color: var(--t-cyan); }
    .remove-item { background: none; border: none; color: var(--t-rose); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .add-item-btn { margin-top: 12px; background: var(--t-s3); border: 1px solid var(--t-br); color: var(--t-cyan); padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .2s; }
    .add-item-btn:hover { background: var(--t-brL); }
    .status-select-sm { 
      background: var(--t-s3); color: var(--t-t1); border: 1px solid transparent; border-radius: 20px; 
      padding: 4px 0; font-size: 9px; font-weight: 800; text-transform: uppercase; cursor: pointer; outline: none; appearance: none; text-align: center;
      width: 90px;
    }
    .status-select-sm[data-status="Paid"] { color: var(--t-lime); background: rgba(26, 255, 178, 0.08); }
    .status-select-sm[data-status="Unpaid"] { color: var(--t-amber); background: rgba(255, 193, 7, 0.1); }
    .status-select-sm[data-status="Overdue"] { color: var(--t-rose); background: rgba(255, 107, 107, 0.1); }
    .status-select-sm[data-status="Overdue"] { color: var(--t-rose); background: rgba(255, 107, 107, 0.1); }
    .ghost-btn-sm { background: transparent; border: 1px solid var(--t-br); color: var(--t-t1); font-size: 10px; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
    .ghost-btn-sm:hover { border-color: #fff; color: #fff; }
    .delete-btn-sm { background: transparent; border: 1px solid var(--t-br); color: var(--t-rose); font-size: 10px; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
    .delete-btn-sm:hover { background: var(--t-rose); color: #fff; }
    .overdue-text { color: var(--t-rose); font-weight: 700; }
    .bold { font-weight: 700; color: #fff; }
    .mt-10 { margin-top: 10px; }
    .mt-20 { margin-top: 20px; }
    .empty-hint { font-size: 12px; color: var(--t-t2); font-style: italic; }
  `]
})
export class AdminDashboard {
  agencyService = inject(AgencyService);
  toastService = inject(ToastService);
  page = signal('dash');
  Math = Math;

  // Modal signals
  showOnboard = signal(false);
  selectedClient = signal<Client | null>(null);
  kpiForm: any = {};
  newClient: any = { name: '', email: '', password: '', industry: '', managerId: 'm1', budget: 0, agencyCharges: 0, services: [], contractEnd: '', notes: '' };
  availableServices = ['Meta Ads', 'Google Ads', 'SEO', 'Social', 'Email', 'GBP'];

  // Invoice Logic
  showAddInvoice = signal(false);
  isEditingInvoice = false;
  editingInvoiceId: number | null = null;
  invoiceItems = signal<{description: string, amount: number, quantity: number}[]>([{description: '', amount: 0, quantity: 1}]);
  newInvoice: any = { clientId: null, issueDate: new Date().toISOString().split('T')[0], dueDate: '', notes: '' };

  activeClientsCount = computed(() => this.agencyService.clients().filter(c => c.status === 'Active').length);
  monthlyAgencyRevenue = computed(() => this.agencyService.clients()
    .filter(c => c.status === 'Active')
    .reduce((acc, c) => acc + (Number(c.agencyCharges) || 0), 0));
  
  clientDetail = signal<Client | null>(null);

  viewDetails(c: Client) {
    this.clientDetail.set(c);
  }

  totalLeads = computed(() => this.agencyService.clients()
    .reduce((acc, c) => acc + (Number(c.leads) || 0), 0));
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

  async saveKPIs(id: number) {
    await this.agencyService.updateClient(id, this.kpiForm);
    this.selectedClient.set(null);
  }

  toggleService(s: string) {
    const idx = this.newClient.services.indexOf(s);
    if (idx > -1) this.newClient.services.splice(idx, 1);
    else this.newClient.services.push(s);
  }

  async onboardClient() {
    if (!this.newClient.name || !this.newClient.email || !this.newClient.password) {
      this.toastService.warning("Name, Email, and Password are required to onboard a client with credentials.");
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
    this.newClient = { name: '', email: '', password: '', industry: '', managerId: 'm1', budget: 0, agencyCharges: 0, services: [], contractEnd: '', notes: '' };
  }

  // Invoice Methods
  getClientName(id: number | null) {
    if (!id) return 'Internal';
    return this.agencyService.clients().find(c => c.id === id)?.name || 'Client';
  }

  addInvoiceItem() {
    this.invoiceItems.update(prev => [...prev, { description: '', amount: 0, quantity: 1 }]);
  }

  removeInvoiceItem(idx: number) {
    this.invoiceItems.update(prev => prev.filter((_, i) => i !== idx));
  }

  calculateInvoiceTotal() {
    return this.invoiceItems().reduce((sum, item) => sum + ((item.amount || 0) * (item.quantity || 1)), 0);
  }

  async createInvoice() {
    if (!this.newInvoice.clientId) {
      this.toastService.warning('Please select a client.');
      return;
    }

    const nextNum = this.agencyService.invoices().length + 1;
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${nextNum.toString().padStart(3, '0')}`;

    await this.agencyService.addInvoice({
      ...this.newInvoice,
      invoiceNumber,
      items: this.invoiceItems(),
      total: this.calculateInvoiceTotal(),
      status: 'Unpaid'
    });

    this.showAddInvoice.set(false);
    this.invoiceItems.set([{ description: '', amount: 0, quantity: 1 }]);
    this.newInvoice = { clientId: null, issueDate: new Date().toISOString().split('T')[0], dueDate: '', notes: '' };
  }

  editInvoice(inv: Invoice) {
    this.isEditingInvoice = true;
    this.editingInvoiceId = inv.id;
    this.newInvoice = { ...inv };
    this.invoiceItems.set(inv.items.map(item => ({ ...item })));
    this.showAddInvoice.set(true);
  }

  async updateInvoice() {
    if (!this.editingInvoiceId) return;
    await this.agencyService.updateInvoice(this.editingInvoiceId, {
      ...this.newInvoice,
      items: this.invoiceItems(),
      total: this.calculateInvoiceTotal()
    });
    this.showAddInvoice.set(false);
    this.isEditingInvoice = false;
    this.editingInvoiceId = null;
    this.invoiceItems.set([{ description: '', amount: 0, quantity: 1 }]);
    this.newInvoice = { clientId: null, issueDate: new Date().toISOString().split('T')[0], dueDate: '', notes: '' };
  }

  updateInvoiceStatus(inv: Invoice, status: any) {
    this.agencyService.updateInvoice(inv.id, { status });
  }

  deleteInvoice(id: number) {
    if (confirm('Delete this invoice?')) {
      this.agencyService.deleteInvoice(id);
    }
  }

  isOverdue(dueDate: string) {
    return new Date(dueDate) < new Date();
  }
}

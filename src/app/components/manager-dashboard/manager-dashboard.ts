import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, Client, User, Task, Invoice } from '../../services/agency.service';
import { ToastService } from '../../services/toast.service';
import { Sidebar } from '../shared/sidebar/sidebar';
import { ReportsHub } from '../admin-portal/reports-hub';
import { NotificationCenter } from '../shared/notification-center';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, ReportsHub, NotificationCenter],
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
              <div class="header-actions">
                <app-notification-center />
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
                <div class="value">{{ managerTasks().filter(t => t.status !== 'Done').length }} <span class="overdue">({{ overdueCount() }} overdue)</span></div>
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
                      <div class="m-val">{{ client.roas }}x</div>
                      <div class="m-lbl">ROAS</div>
                    </div>
                    <div class="m-box">
                      <div class="m-val">₹{{ (client.revenue / 1000).toFixed(1) }}k</div>
                      <div class="m-lbl">Revenue</div>
                    </div>
                  </div>

                  <div class="card-services" style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 15px;">
                    @for (s of client.services; track s) {
                      <span class="service-tag-sm" style="font-size: 9px; padding: 2px 6px; background: rgba(0, 188, 212, 0.05); border-radius: 4px; color: var(--t-cyan); border: 1px solid rgba(0, 188, 212, 0.2);">{{ s }}</span>
                    }
                  </div>

                  <div style="display: flex; gap: 8px;">
                    <button class="kpi-btn-full" (click)="openEdit(client)">Edit Client</button>
                  </div>
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
              <div class="header-actions">
                <app-notification-center />
                <button class="action-btn" (click)="showOnboard.set(true)">+ Onboard Client</button>
              </div>
            </header>

            <div class="search-bar">
              <input type="text" [(ngModel)]="clientSearch" (input)="updateSearch()" placeholder="Search clients…">
            </div>

            <div class="panel table-panel">
              <table class="manager-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Services</th>
                    <th>Manager</th>
                    <th>Budget / Pacing</th>
                    <th>Health</th>
                    <th>Status</th>
                    <th>Actions</th>
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
                      <td>
                        <div class="services-list" style="display: flex; gap: 4px; flex-wrap: wrap;">
                          @for (s of c.services; track s) {
                            <span class="service-tag-sm" style="font-size: 9px; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px; color: var(--t-cyan); border: 1px solid rgba(0, 188, 212, 0.2);">{{ s }}</span>
                          }
                          @if (!c.services || c.services.length === 0) {
                            <span style="font-size: 10px; color: var(--t-t2); font-style: italic;">None</span>
                          }
                        </div>
                      </td>
                      <td>{{ currentUser()?.name }}</td>
                      <td>
                        <div class="pacing-stack">
                          <div class="p-text" [class.alert]="agencyService.calcPacing(c) > 95">⚡ {{ agencyService.calcPacing(c) }}%</div>
                          <div class="p-sub">{{ c.spend | currency:'INR':'symbol':'1.0-0' }} / {{ c.budget | currency:'INR':'symbol':'1.0-0' }}</div>
                        </div>
                      </td>
                      <td><span class="h-badge" [attr.data-health]="c.health">{{ c.health }}</span></td>
                      <td><span class="s-badge text-dim">{{ c.status }}</span></td>
                      <td>
                        <div style="display: flex; gap: 8px;">
                          <button class="row-action-btn" (click)="openEdit(c)">Edit</button>
                        </div>
                      </td>
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
                <p>{{ filteredTasks().length }} tasks</p>
              </div>
              <div class="header-actions">
                <app-notification-center />
                <button class="action-btn sm" (click)="showAddTask.set(true)">+ Add Task</button>
                <div class="quick-add-group">
                  <input type="text" class="quick-add-input" placeholder="Quick add task title..." #quickTitle (keydown.enter)="quickAddTask(quickTitle)">
                  <button class="quick-add-btn text-btn" (click)="quickAddTask(quickTitle)">Add Task</button>
                </div>
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
                  <div class="task-card" [class.overdue-border]="calcOverdue(task.due) > 0" [attr.data-task-id]="task.id" (click)="toggleExpand(task.id)">
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
                      <div class="status-wrapper">
                        <span class="status-label">Update Status</span>
                        <select class="status-select" [attr.data-status]="task.status" [ngModel]="task.status" (ngModelChange)="updateStatus(task.id, $event)">
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                      </div>
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
                                 <button class="remove-st-btn" (click)="removeSubtaskFromExisting(task, $index)">×</button>
                               </div>
                             }
                             @if (!task.subtasks || task.subtasks.length === 0) {
                               <p class="empty-hint">No checklist defined.</p>
                             }
                             <div class="inline-add-st">
                               <textarea #stInput placeholder="Add steps (one per line)..." (keydown.enter)="onSubtaskKeyDown($any($event), task, stInput)"></textarea>
                               <button class="st-confirm-btn" (click)="addSubtasksToExisting(task, stInput)">Add Checklist Items</button>
                             </div>
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
          <app-reports-hub />
        }

        <!-- 5. Invoices -->
        @if (page() === 'invoices') {
          <div class="view-container">
            <header class="view-header">
              <div>
                <h1>Invoices</h1>
                <p>Manage client billing</p>
              </div>
              <div class="header-actions">
                <app-notification-center />
                <button class="action-btn" (click)="showAddInvoice.set(true)">+ Create Invoice</button>
              </div>
            </header>

            <div class="panel table-panel">
              <table class="manager-table">
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
                        <select class="status-select sm" [attr.data-status]="inv.status" [ngModel]="inv.status" (ngModelChange)="updateInvoiceStatus(inv, $event)">
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>
                      <td>
                        <div class="row-flex">
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

      <!-- Edit Client Details Modal -->
      @if (selectedClient(); as client) {
        <div class="modal-overlay" (click)="selectedClient.set(null)">
          <div class="modal compact-modal edit-modal" (click)="$event.stopPropagation()">
             <div class="modal-header">
               <div>
                 <h3>Edit Client — {{ client.name }}</h3>
                 <p class="auto-note">Manage core business details and performance settings.</p>
               </div>
               <button class="close-btn" (click)="selectedClient.set(null)">×</button>
             </div>
             
              <div class="modal-body">
                <div class="form-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                  <div class="form-field full" style="grid-column: span 3;">
                    <label>Client Real Name</label>
                    <input type="text" [(ngModel)]="editForm.name">
                  </div>
                  <div class="form-field full" style="grid-column: span 1.5; grid-column: 1 / 3;">
                    <label>Login Email</label>
                    <input type="email" [(ngModel)]="editForm.email">
                  </div>
                  <div class="form-field full" style="grid-column: span 1.5; grid-column: 3 / 4;">
                    <label>Login Password</label>
                    <input type="password" [(ngModel)]="editForm.password" placeholder="••••••••">
                  </div>
                  <div class="form-field full" style="grid-column: span 3;">
                    <label>Industry</label>
                    <input type="text" [(ngModel)]="editForm.industry">
                  </div>
                  <div class="form-field">
                    <label>Monthly Budget (₹)</label>
                    <input type="number" [(ngModel)]="editForm.budget">
                  </div>
                  <div class="form-field">
                    <label>Agency Charges (₹)</label>
                    <input type="number" [(ngModel)]="editForm.agencyCharges">
                  </div>
                  <div class="form-field">
                    <label>Contract End</label>
                    <input type="date" [(ngModel)]="editForm.contractEnd">
                  </div>
                  
                  <div class="form-field">
                    <label>Health Score</label>
                    <select [(ngModel)]="editForm.health" class="form-select">
                      <option value="Healthy">Healthy</option>
                      <option value="At Risk">At Risk</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label>Client Status</label>
                    <select [(ngModel)]="editForm.status" class="form-select">
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                  <div class="form-field"></div> <!-- Spacer -->

                  <div class="form-field full section-lbl" style="grid-column: span 3; margin-top: 8px; border-top: 1px solid var(--t-br); padding-top: 10px; color: var(--t-cyan); font-size: 10px; font-weight: 800; text-transform: uppercase;">Performance Metrics</div>
                  <div class="form-field">
                    <label>Spend / Leads</label>
                    <div style="display: flex; gap: 5px;">
                      <input type="number" [(ngModel)]="editForm.spend" placeholder="Spend">
                      <input type="number" [(ngModel)]="editForm.leads" placeholder="Leads">
                    </div>
                  </div>
                  <div class="form-field">
                    <label>Revenue / ROAS</label>
                    <div style="display: flex; gap: 5px;">
                      <input type="number" [(ngModel)]="editForm.revenue" placeholder="Revenue">
                      <input type="number" step="0.1" [(ngModel)]="editForm.roas" placeholder="ROAS">
                    </div>
                  </div>
                  <div class="form-field">
                    <label>Notes</label>
                    <textarea [(ngModel)]="editForm.notes" rows="1" placeholder="Notes..."></textarea>
                  </div>

                  <div class="form-field full section-lbl" style="grid-column: span 3; margin-top: 8px; border-top: 1px solid var(--t-br); padding-top: 10px; color: var(--t-cyan); font-size: 10px; font-weight: 800; text-transform: uppercase;">Services</div>
                  <div class="form-field full" style="grid-column: span 3;">
                     <div class="services-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                         @for (s of availableServices; track s) {
                           <label class="service-pill" [class.active]="editForm.services?.includes(s)" style="display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: rgba(255,255,255,0.03); border: 1px solid var(--t-br); border-radius: 6px; font-size: 11px; cursor: pointer;">
                             <input type="checkbox" [checked]="editForm.services?.includes(s)" (change)="toggleEditService(s)" style="accent-color: var(--t-cyan);">
                             <span>{{ s }}</span>
                           </label>
                         }
                     </div>
                  </div>
                </div>
              </div>

             <div class="modal-footer">
               <button class="cancel-btn" (click)="selectedClient.set(null)">Cancel</button>
               <button class="save-btn" (click)="saveClient(client.id)">Save Changes</button>
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
                <div class="form-field full">
                  <label>Client Name *</label>
                  <input type="text" [(ngModel)]="newClient.name" placeholder="Business or Client Name">
                </div>
                <div class="form-field full">
                  <label>Login Email *</label>
                  <input type="email" [(ngModel)]="newClient.email" placeholder="client@agency.com">
                </div>
                <div class="form-field full">
                  <label>Login Password *</label>
                  <input type="password" [(ngModel)]="newClient.password" placeholder="SecurePass123">
                </div>
                
                <div class="services-section">
                  <label class="section-lbl">Subscribed Services</label>
                  <div class="services-grid">
                     @for (s of availableServices; track s) {
                       <label class="service-pill" [class.active]="newClient.services?.includes(s)">
                         <input type="checkbox" [checked]="newClient.services?.includes(s)" (change)="toggleService(s)">
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
                     @for (c of managerClients(); track c.id) {
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
                   <label class="section-label" style="font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; margin-bottom: 8px; display: block;">Invoice Items</label>
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
               </div>
            </div>
            <div class="modal-footer">
               <button class="cancel-btn" (click)="showAddInvoice.set(false)">Cancel</button>
               <button class="save-btn" (click)="isEditingInvoice ? updateInvoice() : createInvoice()">{{ isEditingInvoice ? 'Save Changes' : 'Generate Professional Invoice' }}</button>
            </div>
          </div>
        </div>
      }

      <!-- Add Task Modal -->
      @if (showAddTask()) {
        <div class="modal-overlay" (click)="showAddTask.set(false)">
          <div class="modal compact-modal task-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>Create New Task</h3>
                <p class="auto-note">Assign tasks to your team or yourself.</p>
              </div>
              <button class="close-btn" (click)="showAddTask.set(false)">×</button>
            </div>
            <div class="modal-body">
              <div class="form-field full">
                <label>Task Title</label>
                <input type="text" [(ngModel)]="newTask.title" placeholder="e.g. Schedule Social Posts">
              </div>
              
              <div class="form-field full">
                <div class="subtask-input-group bulk">
                  <div class="st-header">
                    <span>Active Checklist Items ({{ newTaskSubtasks.length }})</span>
                    @if (newTaskSubtasks.length > 0) {
                      <button class="clear-all" (click)="newTaskSubtasks = []">Clear All</button>
                    }
                  </div>
                  <div class="st-chips-scroll">
                    @for (st of newTaskSubtasks; track $index) {
                      <div class="st-chip">
                        <span>{{ st }}</span>
                        <button (click)="removeSubtaskFromNew($index)">×</button>
                      </div>
                    }
                  </div>
                  <div class="st-bulk-add">
                    <label class="bulk-label">Add multiple tasks (one per line):</label>
                    <textarea [(ngModel)]="bulkSubtaskText" placeholder="Task 1&#10;Task 2&#10;Task 3..." rows="3" (keydown.enter)="onBulkSubtaskKeyDown($any($event), null)"></textarea>
                    <button class="bulk-btn" (click)="addSubtasksBulk()">Confirm List items</button>
                  </div>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-field">
                  <label>Client</label>
                  <select [(ngModel)]="newTask.clientId">
                    <option [ngValue]="null">Internal / General</option>
                    @for (c of managerClients(); track c.id) {
                      <option [ngValue]="c.id">{{ c.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-field">
                  <label>Assignee</label>
                  <select [(ngModel)]="newTask.assigneeId">
                    @for (u of team(); track u.id) {
                      <option [value]="u.id">{{ u.name }} ({{ u.role }})</option>
                    }
                  </select>
                </div>
                <div class="form-field">
                  <label>Priority</label>
                  <select [(ngModel)]="newTask.priority">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Due Date</label>
                  <input type="date" [(ngModel)]="newTask.due">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="cancel-btn" (click)="showAddTask.set(false)">Cancel</button>
              <button class="save-btn" (click)="addTask()">Create Task</button>
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
    .dashboard-root { display: flex; height: 100vh; background: var(--t-bg); color: #fff; overflow: hidden; font-family: 'Inter', sans-serif; }
    .main-content { flex: 1; padding: 24px 30px; overflow-y: auto; }
    
    .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
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
    .icon-btn-sm { background: var(--t-s3); border: 1px solid var(--t-br); border-radius: 6px; color: var(--t-t1); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; font-size: 14px; cursor: pointer; transition: all .2s; }
    .icon-btn-sm:hover { color: #fff; border-color: var(--t-brL); transform: scale(1.1); }
    
    .sync-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--t-br); border-radius: 12px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; transition: all .3s; }
    .sync-btn:hover { background: rgba(0, 188, 212, 0.1); border-color: var(--t-cyan); transform: rotate(180deg); }

    .row-flex { display: flex; gap: 8px; }

    /* Task board professional tools */
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .search-input { background: var(--t-s1); border: 1px solid var(--t-brL); color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 13px; outline: none; transition: border-color .2s; width: 220px; }
    .search-input:focus { border-color: var(--t-cyan); }
    .filter-select { background: var(--t-s1); border: 1px solid var(--t-brL); color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; }
    
    .quick-add-group { display: flex; align-items: center; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 8px; padding: 2px; }
    .quick-add-input { background: transparent; border: none; color: #fff; padding: 7px 12px; font-size: 13px; outline: none; width: 180px; }
    .quick-add-btn { background: var(--t-cyan); color: #000; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 800; cursor: pointer; font-size: 11px; transition: all .2s; }
    .quick-add-btn:hover { background: #fff; transform: translateY(-1px); }

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
    
    .status-wrapper { display: flex; flex-direction: column; gap: 4px; align-items: center; }
    .status-label { font-size: 8px; font-weight: 800; color: var(--t-t2); text-transform: uppercase; letter-spacing: 0.05em; }

    .status-select { 
      background: var(--t-s3); color: var(--t-t1); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; 
      padding: 5px 25px 5px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; cursor: pointer; outline: none; appearance: none; text-align: center;
      width: 125px; transition: all .2s;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
    }
    .status-select:hover { border-color: var(--t-cyan); background-color: var(--t-s2); color: #fff; transform: translateY(-1px); }
    .status-select[data-status="In Progress"] { color: var(--t-cyan); background-color: rgba(0, 188, 212, 0.1); border-color: rgba(0, 188, 212, 0.2); }
    .status-select[data-status="Done"] { color: var(--t-lime); background-color: rgba(26, 255, 178, 0.08); border-color: rgba(26, 255, 178, 0.2); }
    .status-select[data-status="Blocked"] { color: var(--t-rose); background-color: rgba(255, 107, 107, 0.1); border-color: rgba(255, 107, 107, 0.2); }

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
    .remove-st-btn { background: none; border: none; color: var(--t-t1); cursor: pointer; opacity: 0.3; font-size: 14px; padding: 2px 6px; }
    .remove-st-btn:hover { opacity: 1; color: var(--t-rose); }

    .inline-add-st { display: flex; flex-direction: column; gap: 8px; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; }
    .inline-add-st textarea { background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 6px; padding: 10px; color: #fff; font-size: 12px; resize: vertical; min-height: 50px; outline: none; }
    .inline-add-st textarea:focus { border-color: var(--t-cyan); }
    .st-confirm-btn { align-self: flex-end; background: var(--t-cyan); color: #000; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; transition: all .2s; }
    .st-confirm-btn:hover { background: #fff; transform: scale(1.02); }

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
    .subtask-input-group.bulk { background: var(--t-s2); border: 1px solid var(--t-brL); padding: 16px; border-radius: 12px; margin-bottom: 15px; }
    .st-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .st-header span { font-size: 10px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; }
    .clear-all { background: none; border: none; color: var(--t-rose); font-size: 9px; font-weight: 800; text-transform: uppercase; cursor: pointer; padding: 0; }
    
    .st-chips-scroll { display: flex; flex-wrap: wrap; gap: 6px; max-height: 80px; overflow-y: auto; margin-bottom: 15px; }
    .st-chip { background: rgba(255,255,255,0.05); border: 1px solid var(--t-br); padding: 4px 10px; border-radius: 100px; display: flex; align-items: center; gap: 8px; font-size: 11px; }
    .st-chip button { background: none; border: none; color: var(--t-t2); cursor: pointer; font-size: 14px; padding: 0; display: flex; align-items: center; }
    .st-chip button:hover { color: var(--t-rose); }

    .st-bulk-add { display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--t-br); padding-top: 15px; }
    .bulk-label { font-size: 10px; font-weight: 700; color: var(--t-cyan); margin-bottom: 2px; }
    .st-bulk-add textarea { background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 8px; padding: 10px; font-size: 12px; line-height: 1.5; min-height: 80px; }
    .bulk-btn { background: #fff; color: #000; border: none; padding: 8px; border-radius: 8px; font-weight: 800; font-size: 11px; cursor: pointer; align-self: flex-end; }
    .bulk-btn:hover { background: var(--t-cyan); }

    /* Reports */
    .rep-status-cell { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--t-t1); }
    .rep-status-cell .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--t-t2); }
    .rep-status-cell .dot.generated { background: var(--t-lime); }

    /* Modals */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 3000; }
    .modal.compact-modal { background: var(--t-s1); border: 1px solid var(--t-brL); border-radius: 16px; width: 440px; padding: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .modal.edit-modal { width: 680px; padding: 20px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { font-size: 17px; font-weight: 800; }
    .close-btn { background: none; border: none; color: var(--t-t1); font-size: 24px; cursor: pointer; line-height: 1; display: flex; align-items: center; justify-content: center; transition: color .2s; }
    .close-btn:hover { color: #fff; }
    .form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .form-field label { font-size: 9px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; margin-bottom: 3px; display: block; letter-spacing: .05em; }
    .form-field input, .form-select, .form-field textarea { 
      width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.15); border-radius: 5px; padding: 6px 10px; 
      color: #fff; font-size: 11px; outline: none; transition: border-color .2s;
    }
    .form-field input:focus, .form-select:focus, .form-field textarea:focus { border-color: var(--t-cyan); background: rgba(0,0,0,0.4); }
    .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
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

    /* Invoice Specific Styles */
    .invoice-modal { width: 580px; }
    .invoice-items-box { background: var(--t-s1); border-radius: 8px; }
    .items-header { display: flex; gap: 10px; margin-bottom: 8px; padding: 0 5px; }
    .items-header span { font-size: 10px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; letter-spacing: .05em; }
    .items-list { display: flex; flex-direction: column; gap: 8px; }
    .inv-item-row { display: flex; gap: 10px; align-items: center; }
    .inv-item-row input { background: var(--t-s2); border: 1px solid var(--t-br); border-radius: 6px; padding: 8px; color: #fff; font-size: 12px; outline: none; }
    .invoice-total { display: flex; justify-content: flex-end; align-items: center; gap: 20px; }
    .total-label { font-size: 11px; font-weight: 800; color: var(--t-t2); }
    .total-value { font-size: 24px; font-weight: 800; color: var(--t-cyan); }
    .remove-item { background: none; border: none; color: var(--t-rose); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .add-item-btn { margin-top: 12px; background: var(--t-s3); border: 1px solid var(--t-br); color: var(--t-cyan); padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .2s; }
    .add-item-btn:hover { background: var(--t-br); }
    .status-select.sm { width: 90px; padding: 3px 0; font-size: 9px; }
    .ghost-btn-sm { background: transparent; border: 1px solid var(--t-br); color: var(--t-t1); font-size: 10px; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
    .ghost-btn-sm:hover { border-color: #fff; color: #fff; }
    .delete-btn-sm { background: transparent; border: 1px solid var(--t-br); color: var(--t-rose); font-size: 10px; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
    .delete-btn-sm:hover { background: var(--t-rose); color: #fff; }
    .overdue-text { color: var(--t-rose); font-weight: 700; }
    .mt-10 { margin-top: 10px; }
    .mt-20 { margin-top: 20px; }
  `]
})
export class ManagerDashboard {
  agencyService = inject(AgencyService);
  toastService = inject(ToastService);
  
  constructor() {
    effect(() => {
      const id = this.agencyService.selectedTaskId();
      if (id) {
        // Ensure we are on the tasks page
        this.page.set('tasks');
        
        this.expandedTasks.update(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        
        setTimeout(() => {
          const el = document.querySelector(`[data-task-id="${id}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (el) (el as HTMLElement).style.boxShadow = '0 0 0 2px var(--t-cyan)';
          
          // Clear signal so it can be re-triggered for the same task
          this.agencyService.setSelectedTask(null);
        }, 100);
      }
    });
  }
  page = signal('dash');

  // Search signals
  clientSearch = signal('');
  taskSearch = signal('');

  // Modals
  showAddTask = signal(false);
  showOnboard = signal(false);
  selectedClient = signal<Client | null>(null);
  clientDetail = signal<Client | null>(null);
  editForm: any = {};
  kpiForm: any = {};
  newTask: any = { title: '', clientId: null, assigneeId: '', priority: 'Medium', due: '' };
  newTaskSubtasks: string[] = [];
  newClient: any = { name: '', email: '', password: '', industry: '', managerId: 'm1', budget: 0, agencyCharges: 0, services: [], contractEnd: '', notes: '' };

  // Invoice Logic
  showAddInvoice = signal(false);
  isEditingInvoice = false;
  editingInvoiceId: number | null = null;
  invoiceItems = signal<{description: string, amount: number, quantity: number}[]>([{description: '', amount: 0, quantity: 1}]);
  bulkSubtaskText = '';
  newInvoice: any = { clientId: null, issueDate: new Date().toISOString().split('T')[0], dueDate: '', notes: '' };

  currentUser = computed(() => this.agencyService.currentUser());
  availableServices = ['Meta Ads', 'Google Ads', 'SEO', 'Social', 'Email', 'GBP'];
  managerClients = computed(() => this.agencyService.clients().filter(c => c.managerId === this.currentUser()?.id));
  
  managerTasks = computed(() => {
    const myClientIds = this.managerClients().map(c => c.id);
    return this.agencyService.tasks().filter(t => 
      (t.clientId && myClientIds.includes(t.clientId)) || 
      t.assigneeId === this.currentUser()?.id
    );
  });

  filteredClients = computed(() => {
    const q = this.clientSearch().toLowerCase();
    return this.managerClients().filter(c => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q));
  });

  filteredTasks = computed(() => {
    let tasks = this.managerTasks();
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

  onBulkSubtaskKeyDown(event: KeyboardEvent, input: any) {
    if (event.shiftKey) return;
    event.preventDefault();
    this.addSubtasksBulk();
  }

  addSubtasksBulk() {
    const text = this.bulkSubtaskText.trim();
    if (!text) return;
    
    const newItems = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    this.newTaskSubtasks = [...this.newTaskSubtasks, ...newItems];
    this.bulkSubtaskText = '';
  }

  quickAddTask(input: HTMLInputElement) {
    const title = input.value.trim();
    if (!title) return;
    
    this.agencyService.addTask({
      title,
      clientId: null,
      assigneeId: this.currentUser()?.id || '',
      priority: 'Medium',
      due: new Date().toISOString().split('T')[0],
      status: 'To Do',
      type: 'custom',
      subtasks: [],
      comments: []
    });
    
    input.value = '';
  }

  removeSubtaskFromNew(index: number) {
    this.newTaskSubtasks = this.newTaskSubtasks.filter((_, i) => i !== index);
  }

  onSubtaskKeyDown(event: KeyboardEvent, task: Task, input: HTMLTextAreaElement) {
    if (event.shiftKey) return;
    event.preventDefault();
    this.addSubtasksToExisting(task, input);
  }

  addSubtasksToExisting(task: Task, input: HTMLTextAreaElement) {
    const text = input.value.trim();
    if (!text) return;
    
    const newItems = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(title => ({ title, completed: false }));
      
    if (newItems.length === 0) return;
    
    const subtasks = [...(task.subtasks || []), ...newItems];
    this.agencyService.updateTask(task.id, { subtasks });
    input.value = '';
  }

  removeSubtaskFromExisting(task: Task, index: number) {
    const subtasks = task.subtasks?.filter((_, i) => i !== index);
    this.agencyService.updateTask(task.id, { subtasks });
  }

  overdueCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.managerTasks().filter(t => t.status !== 'Done' && t.due < today).length;
  });

  totalLeads = computed(() => this.managerClients().reduce((acc, c) => acc + (Number(c.leads) || 0), 0));
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

  openEdit(c: Client) {
    this.selectedClient.set(c);
    const user = this.agencyService.users().find(u => u.clientId === c.id || u.id === (c as any).userId);
    this.editForm = { 
      ...c,
      email: user?.email || '',
      password: '' // Don't show password for security, leave empty to not update
    };
  }

  viewDetails(c: Client) {
    this.clientDetail.set(c);
  }

  async saveClient(id: number) {
    // 1. Update Client
    await this.agencyService.updateClient(id, this.editForm);
    
    // 2. Update User if email or password changed
    const user = this.agencyService.users().find(u => u.clientId === id || u.id === (this.editForm as any).userId);
    if (user) {
      const userUpdates: any = {};
      if (this.editForm.email && this.editForm.email !== user.email) {
        userUpdates.email = this.editForm.email;
      }
      if (this.editForm.password) {
        userUpdates.password = this.editForm.password;
      }
      if (this.editForm.name && this.editForm.name !== user.name) {
        userUpdates.name = this.editForm.name;
      }

      if (Object.keys(userUpdates).length > 0) {
        await this.agencyService.updateUser(user.id, userUpdates);
      }
    }

    this.selectedClient.set(null);
  }

  toggleEditService(s: string) {
    if (!this.editForm.services) this.editForm.services = [];
    const idx = this.editForm.services.indexOf(s);
    if (idx > -1) this.editForm.services.splice(idx, 1);
    else this.editForm.services.push(s);
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
    
    // Auto-process any text currently in the bulk textarea
    this.addSubtasksBulk();

    this.agencyService.addTask({
      ...this.newTask,
      status: 'To Do',
      type: 'custom',
      subtasks: this.newTaskSubtasks.map(t => ({ title: t, completed: false })),
      comments: []
    });
    this.showAddTask.set(false);
    this.newTask = { title: '', priority: 'Medium', status: 'To Do', dueDate: '', type: 'feature', clientId: null, assigneeId: '' };
    this.newTaskSubtasks = [];
    this.showAddTask.set(false);
    this.bulkSubtaskText = '';
  }


  async onboardClient() {
    if (!this.newClient.name || !this.newClient.email || !this.newClient.password) {
      this.toastService.warning("Name, Email, and Password are required to onboard a client with credentials.");
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
    this.newClient = { name: '', email: '', password: '', industry: '', managerId: '', budget: 0, agencyCharges: 0, services: [], contractEnd: '', notes: '' };
  }

  toggleService(s: string) {
    const idx = this.newClient.services.indexOf(s);
    if (idx > -1) this.newClient.services.splice(idx, 1);
    else this.newClient.services.push(s);
  }

  generateReport(c: Client) {
    this.agencyService.updateClient(c.id, { reportGenerated: true });
  }

  // Invoice Methods
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

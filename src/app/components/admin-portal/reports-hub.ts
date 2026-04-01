import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, Client } from '../../services/agency.service';
import { NotificationCenter } from '../shared/notification-center';

@Component({
  selector: 'app-reports-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationCenter],
  template: `
    <div class="reports-hub" [class.client-theme]="isClient()">
      <header class="view-header">
        <div>
          <h1>Reports Hub</h1>
          <p>{{ isClient() ? 'View and download your official performance reports' : 'Professional KPI tracking, specific interval filtering, and PDF exports' }}</p>
        </div>
        <div class="header-actions" *ngIf="!isClient()">
          <app-notification-center />
        </div>
      </header>

      <!-- Main Client Table (Hidden for Clients) -->
      @if (!isClient()) {
        <div class="card table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Health & Actions</th>
                <th>Performance Metrics</th>
              </tr>
            </thead>
            <tbody>
              @for (client of filteredClients(); track client.id) {
                <tr [class.editing]="editingId() === client.id" [class.selected]="selectedClientId() === client.id">
                  <td>
                    <div class="client-name">{{ client.name }}</div>
                    <div class="industry">{{ client.industry }}</div>
                  </td>
                  <td>
                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch; max-width: 140px;">
                        <span class="health-badge" [attr.data-health]="client.health" style="text-align: center;">{{ client.health }}</span>
                        <div class="actions" style="flex-direction: column; gap: 6px; align-items: stretch;">
                          @if (editingId() === client.id) {
                            <button class="save-btn" (click)="saveKPIs(client.id)" style="height: 30px; font-size: 11px;">Save</button>
                            <button class="ghost-btn" (click)="cancelEdit()" style="height: 30px; font-size: 11px;">Cancel</button>
                          } @else {
                            <button class="ghost-btn" (click)="startEdit(client)" style="padding: 0 12px; height: 30px; font-size: 11px; justify-content: flex-start;">Update</button>
                            <button class="primary-btn" (click)="viewReport(client)" style="padding: 0 12px; height: 30px; font-size: 11px; justify-content: flex-start;">View Report</button>
                          }
                        </div>
                    </div>
                  </td>
                  <td>
                    @if (editingId() === client.id) {
                      <div class="edit-row-ctrls">
                        <div class="ctrl-group">
                          <label>ROAS</label>
                          <input type="number" [(ngModel)]="tempKPIs.roas" class="edit-input" step="0.1">
                        </div>
                        <div class="ctrl-group">
                          <label>Leads</label>
                          <input type="number" [(ngModel)]="tempKPIs.leads" class="edit-input">
                        </div>
                        <div class="ctrl-group">
                          <label>Spend</label>
                          <div class="spend-input-wrapper">
                            <span>₹</span>
                            <input type="number" [(ngModel)]="tempKPIs.spend" class="edit-input">
                          </div>
                        </div>
                        <div class="ctrl-group">
                          <label>Date</label>
                          <input type="date" [ngModel]="tempDate()" (ngModelChange)="tempDate.set($event)" class="edit-input date-input" style="width: 120px !important;">
                        </div>
                      </div>
                    } @else {
                       <div class="row-metrics">
                          <span class="lime bold">{{ client.roas || 0 }}×</span>
                          <span class="sep">/</span>
                          <span class="bold">{{ client.leads || 0 }}</span>
                          <span class="sep">/</span>
                          <span>{{ client.spend | currency:'INR':'symbol':'1.0-0' }}</span>
                       </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Professional Reporting Section -->
      @if (selectedClientId()) {
        <div class="report-section slide-up" [class.mt-8]="!isClient()">
          <div class="report-header">
            <div class="report-title-group">
              <div class="client-dot" [style.background]="selectedClient()?.color"></div>
              <div>
                <h2>{{ selectedClient()?.name }} Performance</h2>
                <p>Data visualization for selected interval</p>
              </div>
            </div>
            
            <div class="report-header-actions">
              <div class="period-tabs">
                <button [class.active]="selectedPeriod() === 'daily'" (click)="setPeriod('daily')">Daily</button>
                <button [class.active]="selectedPeriod() === 'monthly'" (click)="setPeriod('monthly')">Monthly</button>
                <button [class.active]="selectedPeriod() === 'yearly'" (click)="setPeriod('yearly')">Yearly</button>
              </div>
              <button class="download-btn" (click)="downloadPDF()" [disabled]="loading() || reportData().length === 0">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export PDF
              </button>
            </div>
          </div>

          <!-- Granular Filter Controls -->
          <div class="filters-bar card mb-6" [class.client-mode]="isClient()">
            <div class="filter-group">
              @if (selectedPeriod() === 'daily') {
                <div class="input-ctrl">
                  <label>Selected Date</label>
                  <input type="date" [ngModel]="selectedDate()" (ngModelChange)="selectedDate.set($event); refreshReport()">
                </div>
              } @else if (selectedPeriod() === 'monthly') {
                <div class="input-ctrl">
                  <label>Select Month</label>
                  <select [ngModel]="selectedMonth()" (ngModelChange)="selectedMonth.set($event); refreshReport()">
                    @for (m of months; track m.id) {
                      <option [value]="m.id">{{ m.name }}</option>
                    }
                  </select>
                </div>
                <div class="input-ctrl">
                  <label>Select Year</label>
                  <select [ngModel]="selectedYear()" (ngModelChange)="selectedYear.set($event); refreshReport()">
                    @for (year of years(); track year) {
                      <option [value]="year">{{ year }}</option>
                    }
                  </select>
                </div>
              } @else {
                <div class="input-ctrl">
                  <label>Select Year</label>
                  <select [ngModel]="selectedYear()" (ngModelChange)="selectedYear.set($event); refreshReport()">
                    @for (year of years(); track year) {
                      <option [value]="year">{{ year }}</option>
                    }
                  </select>
                </div>
              }
            </div>
            <div class="filter-summary">
              Showing reports for <strong>{{ reportData().length }}</strong> intervals
            </div>
          </div>

          <div class="card report-card" [class.client-mode]="isClient()">
            @if (loading()) {
              <div class="loading-state">
                <div class="spinner"></div>
                <span>Syncing performance data...</span>
              </div>
            } @else if (reportData().length === 0) {
              <div class="empty-state">
                <p>No historical data available for this selection.</p>
                <small>Try selecting another date or period.</small>
              </div>
            } @else {
              <table class="report-table" [class.client-mode]="isClient()">
                <thead>
                  <tr>
                    <th>Report Interval</th>
                    <th class="text-right">Leads</th>
                    <th class="text-right">Avg. ROAS</th>
                    <th class="text-right">Total Spend</th>
                    <th class="text-right">Est. Revenue</th>
                    <th style="width: 150px">Performance Trend</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of reportData(); track ($index)) {
                    <tr>
                      <td class="bold">
                        @if (selectedPeriod() === 'daily') {
                          {{ row.date | date:'MMMM d, y' }}
                        } @else if (selectedPeriod() === 'monthly') {
                          {{ row.date | date:'MMMM yyyy' }}
                        } @else {
                          YEAR {{ row._id.year }}
                        }
                      </td>
                      <td class="text-right">{{ row.leads }}</td>
                      <td class="text-right lime bold" [style.color]="isClient() ? 'var(--cp-acc)' : '#a3e635'">{{ (row.roas || 0) | number:'1.2-2' }}×</td>
                      <td class="text-right">₹{{ (row.spend || 0).toLocaleString() }}</td>
                      <td class="text-right bold" [style.color]="isClient() ? '#111' : '#fff'">₹{{ (row.revenue || 0).toLocaleString() }}</td>
                      <td>
                        <div class="mini-bar-bg">
                          <div class="mini-bar" [style.width.%]="calcBarWidth(row.leads)" [style.background]="isClient() ? 'var(--cp-acc)' : ''"></div>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .reports-hub { display: flex; flex-direction: column; padding-bottom: 60px; }
    .view-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .header-actions { padding-top: 4px; }
    h1 { font-weight: 800; font-size: 28px; letter-spacing: -0.5px; }
    .view-header p { color: var(--t-t2); font-size: 14px; margin-top: 4px; }

    .card { background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
    .card.client-mode { background: #fff; border-color: var(--cp-br); box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .table-card { padding: 0; overflow: hidden; }
    
    .data-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .data-table th { text-align: left; padding: 14px 18px; font-size: 11px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; border-bottom: 1px solid var(--t-br); background: rgba(255,255,255,0.02); }
    .data-table td { padding: 16px 18px; border-bottom: 1px solid var(--t-br); vertical-align: middle; }
    .data-table tr:hover { background: rgba(255,255,255,0.01); }
    .data-table tr.selected { background: rgba(255,255,255,0.03); border-left: 4px solid var(--t-rose); }

    .client-name { font-weight: 700; color: #fff; font-size: 15px; }
    .industry { font-size: 11px; color: var(--t-t2); margin-top: 2px; }
    
    .health-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap; display: inline-block; }
    .health-badge[data-health="Healthy"] { color: #4ade80; background: rgba(74, 222, 128, 0.1); }
    .health-badge[data-health="At Risk"] { color: #fbbf24; background: rgba(251, 191, 36, 0.1); }
    .health-badge[data-health="Critical"] { color: #f87171; background: rgba(248, 113, 113, 0.1); }

    .lime { color: #a3e635; }
    .bold { font-weight: 700; }
    .text-right { text-align: right; }
    
    .actions { display: flex; gap: 8px; justify-content: flex-end; white-space: nowrap; }
    .ghost-btn { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 0 16px; height: 32px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; justify-content: center; }
    .ghost-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
    
    .primary-btn { background: #fff; color: #111; border: 1px solid transparent; padding: 0 16px; height: 32px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; justify-content: center; }
    .primary-btn:hover { background: #e5e5e5; transform: translateY(-1px); }
    
    .save-btn { background: #a3e635; color: #111; border: 1px solid transparent; padding: 0 18px; height: 32px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; }

    .report-section { animation: slideUp 0.4s ease-out; }
    .report-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; padding: 0 4px; }
    .report-header-actions { display: flex; align-items: center; gap: 12px; }
    .report-title-group { display: flex; align-items: center; gap: 16px; }
    .client-dot { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px currentColor; }
    h2 { font-size: 24px; font-weight: 800; color: #fff; margin: 0; letter-spacing: -0.5px; }
    .client-theme h2 { color: #111; }
    .client-theme .report-header p { color: var(--cp-t2); }
    .report-header p { color: var(--t-t2); font-size: 14px; margin-top: 4px; }

    .period-tabs { display: flex; background: var(--t-s2); padding: 4px; border-radius: 12px; border: 1px solid var(--t-br); }
    .client-theme .period-tabs { background: var(--cp-s2); border: 1px solid var(--cp-br); }
    .period-tabs button { background: none; border: none; color: var(--t-t2); padding: 7px 16px; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
    .client-theme .period-tabs button { color: var(--cp-t2); }
    .period-tabs button.active { background: #fff; color: #111; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .client-theme .period-tabs button.active { background: var(--cp-acc); color: #fff; }

    .download-btn { 
      background: var(--t-rose); 
      color: #fff; 
      border: none; 
      padding: 8px 16px; 
      border-radius: 12px; 
      font-size: 12px; 
      font-weight: 700; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      gap: 8px;
      transition: all 0.2s;
    }
    .client-theme .download-btn { background: var(--cp-acc); }

    .filters-bar { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
    .filter-group { display: flex; gap: 20px; }
    .input-ctrl { display: flex; flex-direction: column; gap: 4px; }
    .input-ctrl label { font-size: 10px; font-weight: 700; color: var(--t-t2); text-transform: uppercase; letter-spacing: 0.5px; }
    .client-theme .input-ctrl label { color: var(--cp-t2); }
    .input-ctrl input, .input-ctrl select { 
      background: rgba(0,0,0,0.2); 
      border: 1px solid var(--t-br); 
      color: #fff; 
      padding: 6px 12px; 
      border-radius: 8px; 
      font-size: 13px; 
      font-weight: 600;
      min-width: 120px;
    }
    .client-theme .input-ctrl input, .client-theme .input-ctrl select { background: #fff; border: 1px solid var(--cp-br); color: #111; }

    .filter-summary { font-size: 12px; color: var(--t-t2); }
    .client-theme .filter-summary { color: var(--cp-t2); }
    .client-theme .filter-summary strong { color: #111; }
    .filter-summary strong { color: #fff; }

    .report-card { padding: 0; overflow: hidden; min-height: 200px; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 14px; font-variant-numeric: tabular-nums; }
    .report-table th { text-align: left; padding: 16px 20px; font-size: 11px; font-weight: 700; color: var(--t-t2); text-transform: uppercase; border-bottom: 1px solid var(--t-br); }
    .report-table th.text-right { text-align: right; }
    .report-table.client-mode th { color: var(--cp-t2); border-bottom: 1px solid var(--cp-br); }
    .report-table td { padding: 18px 20px; border-bottom: 1px solid var(--t-br); color: var(--t-t1); }
    .report-table.client-mode td { border-bottom: 1px solid var(--cp-br); color: var(--cp-ink); }
    .report-table td.text-right { text-align: right; }
    
    .mini-bar-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
    .client-theme .mini-bar-bg { background: #f1f5f9; }
    .mini-bar { height: 100%; background: linear-gradient(90deg, var(--t-rose), #ec4899); border-radius: 3px; }

    .loading-state, .empty-state { padding: 60px; text-align: center; color: var(--t-t2); display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; }
    .client-theme .spinner { border: 3px solid #f1f5f9; border-top-color: var(--cp-acc); }

    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }

    .mt-8 { margin-top: 32px; }
    .mb-6 { margin-bottom: 24px; }

    .edit-input { 
      background: rgba(0,0,0,0.3); 
      border: 1px solid var(--t-br); 
      color: #fff; 
      padding: 7px 11px; 
      border-radius: 8px; 
      width: 85px; 
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .edit-input:focus { outline: none; border-color: #a3e635; box-shadow: 0 0 0 2px rgba(163, 230, 53, 0.2); }

    .spend-input-wrapper { display: flex; align-items: center; gap: 6px; }
    .spend-input-wrapper span { color: var(--t-t2); font-weight: 700; }
    
    .edit-row-ctrls { display: flex; gap: 15px; }
    .ctrl-group { display: flex; flex-direction: column; gap: 4px; }
    .ctrl-group label { font-size: 10px; font-weight: 700; color: var(--t-t2); text-transform: uppercase; margin-bottom: 2px; }
    .date-input { width: 130px !important; }
    .row-metrics { display: flex; gap: 12px; align-items: center; white-space: nowrap; }
    .row-metrics span { font-size: 14px; }
    .sep { color: var(--t-br); margin: 0 4px; opacity: 0.3; }
  `]
})
export class ReportsHub implements OnInit {
  agencyService = inject(AgencyService);
  
  editingId = signal<number | null>(null);
  selectedClientId = signal<number | null>(null);
  selectedPeriod = signal<'daily' | 'monthly' | 'yearly'>('daily');
  reportData = signal<any[]>([]);
  loading = signal(false);

  // Re-designed Filters
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  selectedMonth = signal<number>(new Date().getMonth() + 1);
  selectedYear = signal<number>(new Date().getFullYear());
  
  years = signal<number[]>([2024, 2025, 2026]);
  months = [
    { id: 1, name: 'January' }, { id: 2, name: 'February' }, { id: 3, name: 'March' },
    { id: 4, name: 'April' }, { id: 5, name: 'May' }, { id: 6, name: 'June' },
    { id: 7, name: 'July' }, { id: 8, name: 'August' }, { id: 9, name: 'September' },
    { id: 10, name: 'October' }, { id: 11, name: 'November' }, { id: 12, name: 'December' }
  ];

  tempKPIs = { roas: 0, leads: 0, spend: 0 };
  tempDate = signal<string>(new Date().toISOString().split('T')[0]);

  ngOnInit() {
    const user = this.agencyService.currentUser();
    if (user?.role === 'client' && user.clientId) {
      this.selectedClientId.set(user.clientId);
      this.refreshReport();
    }
  }

  isClient() {
    return this.agencyService.currentUser()?.role === 'client';
  }

  filteredClients = computed(() => {
    const clients = this.agencyService.clients();
    const user = this.agencyService.currentUser();
    if (user && user.role === 'manager') {
      return clients.filter(c => c.managerId === user.id);
    }
    return clients;
  });

  selectedClient = computed(() => 
    this.filteredClients().find(c => c.id === this.selectedClientId())
  );

  startEdit(client: Client) {
    this.editingId.set(client.id);
    this.tempKPIs = {
      roas: client.roas || 0,
      leads: client.leads || 0,
      spend: client.spend || 0
    };
    this.tempDate.set(new Date().toISOString().split('T')[0]);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  async saveKPIs(clientId: number) {
    await this.agencyService.enterKPIs(clientId, this.tempKPIs, this.tempDate());
    this.editingId.set(null);
    if (this.selectedClientId() === clientId) {
      await this.refreshReport();
    }
  }

  async viewReport(client: Client) {
    this.selectedClientId.set(client.id);
    await this.refreshReport();
  }

  async setPeriod(period: 'daily' | 'monthly' | 'yearly') {
    this.selectedPeriod.set(period);
    await this.refreshReport();
  }

  async refreshReport() {
    const id = this.selectedClientId();
    if (!id) return;
    
    this.loading.set(true);
    try {
      const filters: any = {};
      if (this.selectedPeriod() === 'daily') {
        filters.date = this.selectedDate();
      } else if (this.selectedPeriod() === 'monthly') {
        filters.year = this.selectedYear();
        filters.month = this.selectedMonth();
      } else {
        filters.year = this.selectedYear();
      }

      const data = await this.agencyService.getReports(id, this.selectedPeriod(), filters);
      this.reportData.set(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      this.loading.set(false);
    }
  }

  downloadPDF() {
    const client = this.selectedClient();
    if (!client) return;
    this.agencyService.downloadReport(client, this.selectedPeriod(), this.reportData());
  }

  calcBarWidth(leads: number): number {
    if (!leads) return 0;
    const max = Math.max(...this.reportData().map(r => r.leads || 0), 1);
    return (leads / max) * 100;
  }
}

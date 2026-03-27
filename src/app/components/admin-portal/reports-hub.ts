import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, Client } from '../../services/agency.service';

@Component({
  selector: 'app-reports-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-hub">
      <header class="view-header">
        <h1>Reports</h1>
        <p>Generate and manage monthly client reports</p>
      </header>

      <div class="card table-card">
        <table class="data-table">
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
            @for (client of agencyService.clients(); track client.id) {
              <tr [class.editing]="editingId() === client.id">
                <td>
                  <div class="client-name">{{ client.name }}</div>
                  <div class="industry">{{ client.industry }}</div>
                </td>
                <td><span class="health-badge" [attr.data-health]="client.health">{{ client.health }}</span></td>
                
                <td class="lime bold">
                  @if (editingId() === client.id) {
                    <input type="number" [(ngModel)]="tempKPIs.roas" class="edit-input" step="0.1">
                  } @else {
                    {{ client.roas }}×
                  }
                </td>
                
                <td class="bold">
                  @if (editingId() === client.id) {
                    <input type="number" [(ngModel)]="tempKPIs.leads" class="edit-input">
                  } @else {
                    {{ client.leads }}
                  }
                </td>
                
                <td>
                  @if (editingId() === client.id) {
                    <div class="spend-input-wrapper">
                      <span>$</span>
                      <input type="number" [(ngModel)]="tempKPIs.spend" class="edit-input">
                    </div>
                  } @else {
                    {{ client.spend | currency:'INR':'symbol':'1.0-0' }}
                  }
                </td>

                <td>
                  <span class="gen-status" [class.ready]="client.reportGenerated">
                    {{ client.reportGenerated ? '✓ Generated' : '⋯ Not Generated' }}
                  </span>
                </td>
                
                <td>
                  <div class="actions">
                    @if (editingId() === client.id) {
                      <button class="save-btn" (click)="saveKPIs(client.id)">Save</button>
                      <button class="ghost-btn" (click)="cancelEdit()">Cancel</button>
                    } @else {
                      <button class="ghost-btn" (click)="startEdit(client)">Update KPIs</button>
                      <button class="primary-btn">Generate</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .reports-hub { display: flex; flex-direction: column; }
    .view-header { margin-bottom: 22px; }
    h1 { font-weight: 800; font-size: 24px; }
    .view-header p { color: var(--t-t1); font-size: 13px; margin-top: 2px; }

    .table-card { padding: 0; overflow: hidden; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 14px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { text-align: left; padding: 11px 14px; font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; border-bottom: 1px solid var(--t-br); background: var(--t-bg); }
    .data-table td { padding: 13px 14px; border-bottom: 1px solid var(--t-br); }

    .client-name { font-weight: 600; color: #fff; }
    .industry { font-size: 10px; color: var(--t-t2); }
    
    .health-badge { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .health-badge[data-health="Healthy"] { color: var(--t-lime); background: var(--t-limeD); }
    .health-badge[data-health="At Risk"] { color: var(--t-amber); background: var(--t-amberD); }
    .health-badge[data-health="Critical"] { color: var(--t-rose); background: var(--t-roseD); }

    .lime { color: var(--t-lime); }
    .bold { font-weight: 700; color: #fff; }
    
    .gen-status { font-size: 11px; font-weight: 700; color: var(--t-amber); }
    .gen-status.ready { color: var(--t-lime); }

    .actions { display: flex; gap: 8px; justify-content: flex-end; }
    .ghost-btn { background: rgba(255,255,255,0.06); color: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; }
    .primary-btn { background: #fff; color: #111; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
    
    .save-btn { background: var(--t-lime); color: #111; border: none; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }

    .editing { background: rgba(255,255,255,0.02); }
    .edit-input { 
      background: rgba(0,0,0,0.2); 
      border: 1px solid var(--t-br); 
      color: #fff; 
      padding: 4px 8px; 
      border-radius: 4px; 
      width: 70px; 
      font-size: 12px;
      font-weight: 600;
    }
    .edit-input:focus { outline: 1px solid var(--t-lime); border-color: var(--t-lime); }

    .spend-input-wrapper { display: flex; align-items: center; gap: 4px; }
    .spend-input-wrapper span { color: var(--t-t2); font-size: 12px; }

    /* Hide arrows/spinners on number inputs */
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
  `]
})
export class ReportsHub {
  agencyService = inject(AgencyService);
  editingId = signal<number | null>(null);
  tempKPIs = { roas: 0, leads: 0, spend: 0 };

  startEdit(client: Client) {
    this.editingId.set(client.id);
    this.tempKPIs = {
      roas: client.roas,
      leads: client.leads,
      spend: client.spend
    };
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveKPIs(clientId: number) {
    this.agencyService.enterKPIs(clientId, this.tempKPIs);
    this.editingId.set(null);
  }
}


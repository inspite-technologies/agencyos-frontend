import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgencyService } from '../../services/agency.service';
import { NotificationCenter } from '../shared/notification-center';

@Component({
  selector: 'app-billing-page',
  standalone: true,
  imports: [CommonModule, NotificationCenter],
  template: `
    <div class="billing-page">
      <header class="view-header">
        <div>
          <h1>Subscription</h1>
          <p>Manage your AgencyOS plan</p>
        </div>
        <div class="header-actions">
          <app-notification-center />
        </div>
      </header>

      <div class="tiers-grid">
        @for (tier of agencyService.TIERS; track tier.id) {
          <div class="tier-card" [class.current]="isCurrent(tier.id)" [style.border-color]="isCurrent(tier.id) ? tier.color : 'transparent'">
            @if (isCurrent(tier.id)) {
              <div class="current-badge">CURRENT PLAN</div>
            }
            <div class="tier-name" [style.color]="tier.color">{{ tier.name }}</div>
            <div class="tier-price">
              \${{ tier.price }}<span class="period">/mo</span>
            </div>
            <div class="tier-limit">{{ tier.clientLimit === 999 ? 'Unlimited' : tier.clientLimit }} active clients</div>
            
            <div class="divider"></div>
            
            <ul class="feature-list">
              @for (feat of tier.features; track feat) {
                <li><span class="check" [style.color]="tier.color">✓</span> {{ feat }}</li>
              }
            </ul>

            <div class="card-footer">
              @if (isCurrent(tier.id)) {
                <div class="status-msg" [style.background]="tier.color + '22'" [style.color]="tier.color">
                  Active · {{ activeCount() }} clients
                </div>
              } @else {
                <button class="upgrade-btn">Upgrade</button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .billing-page { display: flex; flex-direction: column; }
    .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    h1 { font-weight: 800; font-size: 24px; }
    .view-header p { color: var(--t-t1); font-size: 13px; margin-top: 2px; }

    .tiers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .tier-card { 
      background: var(--t-s1); border: 2px solid transparent; border-radius: 14px; padding: 22px 20px; position: relative;
      transition: all .3s ease;
    }
    .tier-card.current { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

    .current-badge { position: absolute; top: -1px; left: 20px; background: #fff; color: #111; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 0 0 7px 7px; }
    
    .tier-name { font-weight: 800; font-size: 18px; margin-bottom: 4px; }
    .tier-price { font-weight: 800; font-size: 32px; color: #fff; margin-bottom: 4px; }
    .period { font-size: 14px; color: var(--t-t1); font-weight: 400; }
    .tier-limit { font-size: 12px; color: var(--t-t1); margin-bottom: 14px; }
    
    .divider { height: 1px; background: var(--t-br); margin-bottom: 14px; }

    .feature-list { list-style: none; display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .feature-list li { font-size: 12px; color: #fff; display: flex; align-items: center; gap: 8px; }
    .check { font-weight: 700; font-size: 12px; }

    .status-msg { padding: 10px; border-radius: 8px; text-align: center; font-size: 12px; font-weight: 700; }
    .upgrade-btn { width: 100%; background: #111; color: #fff; border: 1px solid var(--t-br); padding: 10px; border-radius: 8px; font-weight: 700; cursor: pointer; }
  `]
})
export class BillingPage {
  agencyService = inject(AgencyService);

  activeCount = computed(() => this.agencyService.clients().filter(c => c.status === 'Active').length);

  isCurrent(id: string) {
    return this.agencyService.subscription().tier === id;
  }
}

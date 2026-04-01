import { Component, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgencyService, Client } from '../../services/agency.service';
import { Sidebar } from '../shared/sidebar/sidebar';
import { ReportsHub } from '../admin-portal/reports-hub';

@Component({
  selector: 'CCard',
  standalone: true,
  template: `
    <div class="ccard">
      <div class="cc-val" [style.color]="color()">{{ value() || '—' }}</div>
      <div class="cc-lbl">{{ label() }}</div>
    </div>
  `,
  styles: [`
    .ccard { background: #fff; border: 1px solid var(--cp-br); border-radius: 16px; padding: 24px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .cc-val { font-size: 32px; font-weight: 800; margin-bottom: 4px; }
    .cc-lbl { font-size: 12px; color: var(--cp-t2); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
  `]
})
export class CCard {
  label = input<string | number>('');
  value = input<string | number | undefined>('');
  color = input<string>('#111');
}

@Component({
  selector: 'TrendChart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <div class="chart-header">
        <div class="chart-title">Performance Trend</div>
        <div class="chart-legend">
          <div class="legend-item"><span class="dot rev"></span> Revenue</div>
          <div class="legend-item"><span class="dot spend"></span> Ad Spend</div>
        </div>
      </div>
      
      <svg viewBox="0 0 700 240" preserveAspectRatio="none" class="main-svg">
        <!-- Gradients -->
        <defs>
          <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--cp-acc)" stop-opacity="0.15" />
            <stop offset="100%" stop-color="var(--cp-acc)" stop-opacity="0" />
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        <line x1="0" y1="60" x2="700" y2="60" stroke="#f1f5f9" stroke-width="1" />
        <line x1="0" y1="120" x2="700" y2="120" stroke="#f1f5f9" stroke-width="1" />
        <line x1="0" y1="180" x2="700" y2="180" stroke="#f1f5f9" stroke-width="1" />

        <!-- Revenue Area & Line -->
        <path [attr.d]="revAreaPath()" fill="url(#gradRev)" />
        <path [attr.d]="revLinePath()" fill="none" stroke="var(--cp-acc)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Spend Line -->
        <path [attr.d]="spnLinePath()" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 4" stroke-linecap="round" />
      </svg>
      
      <div class="x-axis">
        @for (m of months(); track m) {
          <span>{{ m }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .chart-container { background: #fff; border: 1px solid var(--cp-br); border-radius: 20px; padding: 24px; margin-top: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .chart-title { font-size: 14px; font-weight: 800; color: #111; text-transform: uppercase; letter-spacing: 0.05em; }
    .chart-legend { display: flex; gap: 16px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--cp-t2); }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot.rev { background: var(--cp-acc); }
    .dot.spend { background: #94a3b8; }
    
    .main-svg { width: 100%; height: 240px; overflow: visible; }
    .x-axis { display: flex; justify-content: space-between; margin-top: 15px; padding: 0 10px; }
    .x-axis span { font-size: 10px; font-weight: 700; color: var(--cp-t2); text-transform: uppercase; }
  `]
})
export class TrendChart {
  data = input<any[]>([]);
  months = computed(() => this.data().map(d => d.month || '???'));

  // Real dynamic SVG generation
  revLinePath = computed(() => this.generatePath(this.data().map(d => d.revenue || 0), 240, 700));
  revAreaPath = computed(() => this.revLinePath() + " L 700 240 L 0 240 Z");
  spnLinePath = computed(() => this.generatePath(this.data().map(d => d.spend || 0), 240, 700));

  private generatePath(values: number[], height: number, width: number): string {
    if (values.length < 2) return `M 0 ${height} L ${width} ${height}`;

    const max = Math.max(...values, 1000); // 1000 floor for scaling
    const step = width / (values.length - 1);

    return values.map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * (height * 0.8) - (height * 0.1); // 10% padding
      return (i === 0 ? 'M' : 'L') + ` ${x} ${y}`;
    }).join(' ');
  }
}

@Component({
  selector: 'app-client-portal',
  standalone: true,
  imports: [CommonModule, Sidebar, CCard, TrendChart, ReportsHub],
  template: `
    <div class="client-portal">
      <app-sidebar 
        [user]="agencyService.currentUser()" 
        [currentPage]="page()"
        (pageChange)="page.set($event)"
      />
      
      <main class="main-content">
        @if (page() === 'overview') {
          <div class="view-container">
            <header class="view-header">
              <div class="header-main">
                <div>
                  <div class="client-badge">{{ client()?.industry || 'Client' }} Dashboard</div>
                  <h1>{{ client()?.name || 'Horizon Realty' }}</h1>
                  <div class="header-meta">
                    <span class="welcome">Welcome back 👋</span>
                    <span class="dot">·</span>
                    <span class="date">{{ today }}</span>
                  </div>
                </div>
                
                @if (manager()) {
                  <div class="manager-mini-card">
                    <div class="manager-avatar">{{ manager()?.avatar }}</div>
                    <div class="manager-info">
                      <span class="m-label">Account Manager</span>
                      <span class="m-name">{{ manager()?.name }}</span>
                    </div>
                  </div>
                }
              </div>
            </header>

            <div class="top-row-grid">
              <div class="card pacing-card">
                <div class="pacing-header">
                  <span class="p-label">Monthly Budget Pacing</span>
                  <span class="p-val">{{ pacingPercent() }}%</span>
                </div>
                <div class="pacing-bar-bg">
                  <div class="pacing-bar" [style.width.%]="pacingPercent()"></div>
                </div>
                <div class="pacing-footer">
                  Spent <strong>{{ (client()?.spend || 0) | currency:'INR':'symbol':'1.0-0' }}</strong> 
                  of <strong>{{ (client()?.budget || 0) | currency:'INR':'symbol':'1.0-0' }}</strong> target
                </div>
              </div>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Ad Spend</div>
                <div class="stat-value">{{ (client()?.spend || 0) | currency:'INR':'symbol':'1.0-0' }}</div>
                <div class="stat-delta" [class.down]="getDelta('spend') < 0">
                  {{ getDelta('spend') > 0 ? '↑' : '↓' }} {{ Math.abs(getDelta('spend')) }}% vs last month
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Leads</div>
                <div class="stat-value">{{ client()?.leads || 0 }}</div>
                <div class="stat-delta" [class.down]="getDelta('leads') < 0">
                  {{ getDelta('leads') > 0 ? '↑' : '↓' }} {{ Math.abs(getDelta('leads')) }}% vs last month
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Revenue</div>
                <div class="stat-value">{{ (client()?.revenue || 0) | currency:'INR':'symbol':'1.0-0' }}</div>
                <div class="stat-delta" [class.down]="getDelta('revenue') < 0">
                  {{ getDelta('revenue') > 0 ? '↑' : '↓' }} {{ Math.abs(getDelta('revenue')) }}% vs last month
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">ROAS</div>
                <div class="stat-value accent">{{ client()?.roas || 0 }}×</div>
                <div class="stat-sub">return on ad spend</div>
              </div>
            </div>
            
            <TrendChart [data]="client()?.monthlyData || []" />
          </div>
        }

        @if (page() === 'social') {
          <div class="view-container">
            <header class="view-header">
              <h1>Social Media</h1>
              <p>Instagram & Facebook insights</p>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">IG Followers</div>
                <div class="stat-value">{{ client()?.igFollowers | number }}</div>
                <div class="stat-sub">total followers</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">IG Engagement</div>
                <div class="stat-value">4.8%</div>
                <div class="stat-sub">industry avg 1-3%</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">FB Followers</div>
                <div class="stat-value">{{ client()?.fbFollowers | number }}</div>
                <div class="stat-sub">page likes</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">FB Reach</div>
                <div class="stat-value">{{ (client()?.fbFollowers || 0) * 5 | number }}</div>
                <div class="stat-sub">monthly reach</div>
              </div>
            </div>
          </div>
        }

        @if (page() === 'gbp') {
          <div class="view-container">
            <header class="view-header">
              <h1>Google Business Profile</h1>
              <p>Local visibility & reputation</p>
            </header>

            <div class="card gbp-hero-card">
              <div class="gbp-hero-flex">
                <div class="rating-display">
                  <span class="rating-label">Google Rating</span>
                  <div class="rating-row">
                    <span class="rating-val">{{ client()?.gbpRating || '0.0' }}</span>
                    <div class="rating-stars">
                      <div class="stars-gold">★★★★★</div>
                      <div class="reviews-count">{{ client()?.gbpReviews || 0 }} total reviews</div>
                    </div>
                  </div>
                </div>
                <div class="gbp-stats-mini-grid">
                  <div class="gbp-stat"><strong>{{ client()?.gbpMonthlyViews || 0 | number }}</strong><span>Monthly Views</span></div>
                  <div class="gbp-stat"><strong>{{ client()?.gbpCalls || 0 | number }}</strong><span>Calls</span></div>
                  <div class="gbp-stat"><strong>{{ client()?.gbpSearches || 0 | number }}</strong><span>Searches</span></div>
                  <div class="gbp-stat"><strong>{{ client()?.gbpDirections || 0 | number }}</strong><span>Directions</span></div>
                </div>
              </div>
            </div>

            <div class="grid-4">
              <CCard label="Rating" [value]="(client()?.gbpRating || '0.0') + '/5.0'" color="#0D9488"></CCard>
              <CCard label="Reviews" [value]="client()?.gbpReviews || 0" color="#111"></CCard>
              <CCard label="Response Rate" [value]="client()?.gbpResponseRate || '—'" color="#16A34A"></CCard>
              <CCard label="Avg Response" [value]="client()?.gbpAvgResponse || '—'" color="#D97706"></CCard>
            </div>
          </div>
        }

        @if (page() === 'seo') {
          <div class="view-container">
            <header class="view-header">
              <h1>SEO Insights</h1>
              <p>Organic search performance</p>
            </header>

            <div class="grid-5">
              <div class="seo-box"><strong>{{ client()?.seoDomainAuthority || 0 }}</strong><span>Domain Authority</span></div>
              <div class="seo-box"><strong>{{ (client()?.seoKeywords || 0) | number }}</strong><span>Keywords</span></div>
              <div class="seo-box green"><strong>{{ client()?.seoTop3 || 0 }}</strong><span>Top 3</span></div>
              <div class="seo-box dark"><strong>{{ client()?.seoTop10 || 0 }}</strong><span>Top 10</span></div>
              <div class="seo-box"><strong>{{ (client()?.seoBacklinks || 0) | number }}</strong><span>Backlinks</span></div>
            </div>

            <div class="card">
              <div class="card-title">Keyword Rankings</div>
              <table class="cp-table">
                <thead>
                  <tr><th>Keyword</th><th>Position</th><th>Change</th><th>Volume/mo</th></tr>
                </thead>
                <tbody>
                  @for (kw of client()?.keywordRankings || []; track kw.keyword) {
                    <tr>
                      <td>{{ kw.keyword }}</td>
                      <td class="pos-cell" [class.pos-3]="kw.position === '3' || kw.position === '#3'" [class.pos-5]="kw.position === '5' || kw.position === '#5'">
                        {{ kw.position.startsWith('#') ? kw.position : '#' + kw.position }}
                      </td>
                      <td [class.up]="kw.change.includes('+')" [class.down]="kw.change.includes('-')" [class.flat]="kw.change === '—'">
                        {{ kw.change }}
                      </td>
                      <td>{{ kw.volume }}</td>
                    </tr>
                  }
                  @if ((client()?.keywordRankings || []).length === 0) {
                    <tr><td colspan="4" style="text-align: center; color: var(--cp-t2); font-style: italic;">No rankings tracking yet...</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        @if (page() === 'report') {
          <app-reports-hub />
        }

        @if (page() === 'invoices') {
          <div class="view-container">
            <header class="view-header">
              <h1>Invoices</h1>
              <p>Billing history</p>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Billed</div>
                <div class="stat-value">{{ totalBilled() | currency:'INR':'symbol':'1.0-0' }}</div>
                <div class="stat-sub">all time</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Amount Paid</div>
                <div class="stat-value">{{ totalPaid() | currency:'INR':'symbol':'1.0-0' }}</div>
                <div class="stat-sub">all cleared</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Outstanding</div>
                <div class="stat-value accent">{{ outstanding() | currency:'INR':'symbol':'1.0-0' }}</div>
                <div class="stat-sub">{{ outstanding() > 0 ? 'payment due' : 'nothing due' }}</div>
              </div>
            </div>

            <div class="card">
              <table class="cp-table">
                <thead><tr><th>Invoice #</th><th>Due Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  @for (inv of clientInvoices(); track inv.id) {
                    <tr>
                      <td class="bold">{{ inv.invoiceNumber }}</td>
                      <td>{{ inv.dueDate | date:'mediumDate' }}</td>
                      <td class="bold">{{ inv.total | currency:'INR':'symbol':'1.0-0' }}</td>
                      <td>
                        <span [class]="inv.status === 'Paid' ? 'paid-badge' : 'unpaid-badge'">
                          {{ inv.status }}
                        </span>
                      </td>
                      <td>
                        <button class="download-btn" (click)="agencyService.downloadInvoice(inv)">Download PDF</button>
                      </td>
                    </tr>
                  }
                  @if (clientInvoices().length === 0) {
                    <tr><td colspan="5" style="text-align: center; color: var(--cp-t2); padding: 40px; font-style: italic;">No billing history available yet.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .client-portal { display: flex; min-height: 100vh; background: var(--cp-bg); color: var(--cp-ink); font-family: 'Inter', sans-serif; }
    .main-content { flex: 1; padding: 32px 40px; overflow-y: auto; }
    .view-header { margin-bottom: 32px; }
    .client-badge { display: inline-block; padding: 4px 10px; background: var(--cp-accS); color: var(--cp-acc); border-radius: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
    h1 { font-weight: 800; font-size: 36px; color: var(--cp-ink); letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 8px; }
    .header-meta { display: flex; align-items: center; gap: 10px; color: var(--cp-t1); font-size: 14px; font-weight: 500; }
    .header-meta .dot { opacity: 0.5; }
    .header-meta .welcome { color: var(--cp-ink); font-weight: 700; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
    .stat-card { background: var(--cp-s1); border: 1px solid var(--cp-br); border-radius: 16px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
    .stat-label { font-size: 10px; font-weight: 700; color: var(--cp-t2); text-transform: uppercase; letter-spacing: .12em; margin-bottom: 8px; }
    .stat-value { font-weight: 800; font-size: 26px; line-height: 1; color: var(--cp-ink); }
    .stat-value.accent { color: #0D9488; }
    .stat-sub { font-size: 11px; color: var(--cp-t2); margin-top: 6px; }
    .stat-delta { font-size: 11px; font-weight: 700; color: #16A34A; margin-top: 6px; }
    .stat-delta.down { color: #DC2626; }
    .card { background: var(--cp-s1); border: 1px solid var(--cp-br); border-radius: 16px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.04); margin-bottom: 24px; }
    .card-title { font-weight: 800; font-size: 15px; margin-bottom: 16px; color: var(--cp-ink); }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
    .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin-bottom: 24px; }
    .gbp-hero-card { background: linear-gradient(135deg, #111 0%, #333 100%); color: #fff; border: none; }
    .gbp-hero-flex { display: flex; align-items: center; justify-content: space-between; }
    .rating-label { font-size: 10px; font-weight: 700; opacity: 0.7; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 8px; display: block; }
    .rating-val { font-size: 64px; font-weight: 800; line-height: 1; }
    .rating-stars { margin-left: 20px; }
    .stars-gold { color: #F59E0B; font-size: 24px; letter-spacing: 2px; }
    .reviews-count { font-size: 12px; opacity: 0.8; margin-top: 4px; }
    .gbp-stats-mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .gbp-stat { background: rgba(255,255,255,0.1); padding: 12px 18px; border-radius: 12px; text-align: center; }
    .gbp-stat strong { display: block; font-size: 20px; font-weight: 800; }
    .gbp-stat span { font-size: 10px; opacity: 0.7; text-transform: uppercase; }
    .seo-box { background: var(--cp-s1); border: 1px solid var(--cp-br); border-radius: 14px; padding: 16px; text-align: center; }
    .seo-box strong { display: block; font-size: 22px; font-weight: 800; color: var(--cp-ink); }
    .seo-box.green strong { color: #16A34A; }
    .seo-box.dark strong { color: #111; }
    .seo-box span { font-size: 10px; color: var(--cp-t2); font-weight: 700; margin-top: 4px; }
    .cp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .cp-table th { text-align: left; padding: 12px; font-size: 10px; color: var(--cp-t2); text-transform: uppercase; letter-spacing: .1em; border-bottom: 1px solid var(--cp-br); }
    .cp-table td { padding: 14px 12px; border-bottom: 1px solid var(--cp-br); }
    .pos-cell { font-weight: 800; font-size: 16px; }
    .pos-3 { color: #0D9488; }
    .pos-5 { color: #111; }
    .up { color: #16A34A; font-weight: 700; }
    .down { color: #DC2626; font-weight: 700; }
    .bold { font-weight: 700; color: #111; }
    .report-canvas { background: #fff; border: 1px solid var(--cp-br); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
    .report-hero { background: linear-gradient(135deg, #111 0%, #444 100%); color: #fff; padding: 40px; }
    .report-meta { font-size: 10px; font-weight: 800; opacity: 0.7; letter-spacing: .15em; margin-bottom: 6px; }
    .report-title { font-size: 32px; font-weight: 800; margin-bottom: 4px; }
    .report-subtitle { font-size: 14px; opacity: 0.8; margin-bottom: 30px; }
    .report-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .report-summary-box { background: rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; }
    .report-summary-box strong { display: block; font-size: 22px; font-weight: 800; }
    .report-summary-box span { font-size: 11px; opacity: 0.8; margin-top: 4px; display: block; }
    .report-section { padding: 30px 40px; }
    .section-title { font-weight: 800; font-size: 16px; margin-bottom: 18px; display: flex; align-items: center; gap: 10px; }
    .mom-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .mom-card { background: #F9FAFB; border: 1px solid var(--cp-br); border-radius: 12px; padding: 16px; text-align: center; }
    .mom-val { font-size: 18px; font-weight: 800; }
    .mom-lbl { font-size: 10px; color: var(--cp-t2); text-transform: uppercase; letter-spacing: .1em; margin: 4px 0; }
    .mom-delta { font-size: 12px; font-weight: 700; }
    .bullet-list { list-style: none; padding: 0; margin: 0; }
    .bullet-list li { display: flex; gap: 12px; margin-bottom: 12px; font-size: 14px; font-weight: 500; }
    .bullet-list .check { color: #16A34A; font-weight: 800; }
    .bullet-list .arrow { color: #D97706; font-weight: 800; }
    .report-card-light { background: #F9FAFB; border: 1px solid var(--cp-br); border-radius: 16px; padding: 24px; }
    .mt-20 { margin: 0 40px 40px; margin-top: -10px; }
    .paid-badge { background: #DCFCE7; color: #166534; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; }
    .unpaid-badge { background: #FEF3F2; color: #B91C1C; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px; }
    .download-btn { background: var(--cp-acc); color: #fff; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: opacity .2s; }
    .download-btn:hover { opacity: 0.9; }

    /* Account Details UI */
    .header-main { display: flex; justify-content: space-between; align-items: flex-end; }
    .manager-mini-card { display: flex; align-items: center; gap: 12px; background: #fff; padding: 10px 16px; border-radius: 12px; border: 1px solid var(--cp-br); box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    .manager-avatar { width: 36px; height: 36px; background: var(--cp-acc); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; }
    .manager-info { display: flex; flex-direction: column; }
    .m-label { font-size: 9px; font-weight: 700; color: var(--cp-t2); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .m-name { font-size: 13px; font-weight: 800; color: var(--cp-ink); }

    .top-row-grid { margin-bottom: 24px; }
    .pacing-card { padding: 20px 24px; }
    .pacing-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
    .p-label { font-size: 11px; font-weight: 800; color: var(--cp-ink); text-transform: uppercase; letter-spacing: 0.05em; }
    .p-val { font-size: 14px; font-weight: 900; color: var(--cp-acc); }
    .pacing-bar-bg { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
    .pacing-bar { height: 100%; background: linear-gradient(90deg, var(--cp-acc), #7C3AED); border-radius: 4px; transition: width 0.6s ease-out; }
    .pacing-footer { font-size: 12px; color: var(--cp-t2); }
    .pacing-footer strong { color: var(--cp-ink); }
  `]
})
export class ClientPortal {
  agencyService = inject(AgencyService);
  Math = Math;

  page = signal('overview');
  today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  client = computed(() => {
    const user = this.agencyService.currentUser();
    if (!user || user.role !== 'client') return null;
    return this.agencyService.clients().find(c => c.id === user.clientId) || null;
  });

  clientInvoices = computed(() => {
    const c = this.client();
    if (!c) return [];
    return this.agencyService.invoices().filter(i => i.clientId === c.id);
  });

  totalBilled = computed(() => this.clientInvoices().reduce((s, i) => s + i.total, 0));
  totalPaid = computed(() => this.clientInvoices().filter(i => i.status === 'Paid').reduce((s, i) => s + i.total, 0));
  outstanding = computed(() => this.totalBilled() - this.totalPaid());
  
  manager = computed(() => {
    const cid = this.client()?.managerId;
    return this.agencyService.users().find(u => u.id === cid) || null;
  });

  pacingPercent = computed(() => {
    const c = this.client();
    if (!c || !c.budget) return 0;
    return Math.min(Math.round((c.spend / c.budget) * 100), 100);
  });

  getDelta(key: string): number {
    const data = this.client()?.monthlyData || [];
    if (data.length < 2) return 0;
    const curr = (data[data.length - 1] as any)[key];
    const prev = (data[data.length - 2] as any)[key];
    if (!prev) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  }
}

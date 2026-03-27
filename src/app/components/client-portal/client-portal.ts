import { Component, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgencyService, Client } from '../../services/agency.service';
import { Sidebar } from '../shared/sidebar/sidebar';

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
  selector: 'app-client-portal',
  standalone: true,
  imports: [CommonModule, Sidebar, CCard],
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
              <div class="client-badge">{{ client()?.industry || 'Client' }} Dashboard</div>
              <h1>{{ client()?.name || 'Horizon Realty' }}</h1>
              <div class="header-meta">
                <span class="welcome">Welcome back 👋</span>
                <span class="dot">·</span>
                <span class="date">{{ today }}</span>
              </div>
            </header>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Ad Spend</div>
                <div class="stat-value">{{ (client()?.spend || 0) | currency:'USD':'symbol':'1.0-0' }}</div>
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
                <div class="stat-value">{{ (client()?.revenue || 0) | currency:'USD':'symbol':'1.0-0' }}</div>
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
          <div class="view-container">
            <header class="view-header">
              <h1>Monthly Report</h1>
              <p>Generated by your agency</p>
            </header>

            <div class="report-canvas">
              <div class="report-hero">
                <div class="report-meta">MONTHLY PERFORMANCE REPORT</div>
                <h1 class="report-title">{{ client()?.name || 'Client' }}</h1>
                <p class="report-subtitle">June 2025 · Managed by your agency</p>
                <div class="report-summary-grid">
                  <div class="report-summary-box"><strong>{{ (client()?.spend || 0) | currency:'INR':'symbol':'1.0-0' }}</strong><span>Ad Spend</span></div>
                  <div class="report-summary-box"><strong>{{ client()?.leads || 0 }}</strong><span>Total Leads</span></div>
                  <div class="report-summary-box"><strong>{{ (client()?.revenue || 0) | currency:'INR':'symbol':'1.0-0' }}</strong><span>Revenue</span></div>
                  <div class="report-summary-box"><strong>{{ client()?.roas || 0 }}×</strong><span>ROAS</span></div>
                </div>
              </div>

              <div class="report-section">
                <h3 class="section-title">Month-on-Month</h3>
                <div class="mom-grid">
                  <div class="mom-card">
                    <div class="mom-val">{{ (client()?.spend || 0) | currency:'INR':'symbol':'1.0-0' }}</div>
                    <div class="mom-lbl">Spend</div>
                    <div class="mom-delta up">↑ 2.8%</div>
                  </div>
                  <div class="mom-card">
                    <div class="mom-val">{{ client()?.leads || 0 }}</div>
                    <div class="mom-lbl">Leads</div>
                    <div class="mom-delta up">↑ 4.4%</div>
                  </div>
                  <div class="mom-card">
                    <div class="mom-val">{{ (client()?.revenue || 0) | currency:'INR':'symbol':'1.0-0' }}</div>
                    <div class="mom-lbl">Revenue</div>
                    <div class="mom-delta up">↑ 5.9%</div>
                  </div>
                  <div class="mom-card">
                    <div class="mom-val">{{ client()?.roas || 0 }}×</div>
                    <div class="mom-lbl">ROAS</div>
                    <div class="mom-delta up">↑ 2.4%</div>
                  </div>
                </div>
              </div>

              <div class="grid-2 mt-20">
                <div class="report-card-light">
                  <h3 class="section-title">🏆 Key Wins</h3>
                  <ul class="bullet-list">
                    <li><span class="check">✓</span> Best-ever ROAS this month</li>
                    <li><span class="check">✓</span> Leads increased month-on-month</li>
                    <li><span class="check">✓</span> Campaign cost-per-lead improved</li>
                  </ul>
                </div>
                <div class="report-card-light">
                  <h3 class="section-title">🚀 Next Month</h3>
                  <ul class="bullet-list">
                    <li><span class="arrow">→</span> Scale top-performing campaigns</li>
                    <li><span class="arrow">→</span> Test new creative formats</li>
                    <li><span class="arrow">→</span> Expand keyword coverage</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
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
                <div class="stat-value">$25,500</div>
                <div class="stat-sub">all time</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Amount Paid</div>
                <div class="stat-value">$25,500</div>
                <div class="stat-sub">all cleared</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Outstanding</div>
                <div class="stat-value accent">$0</div>
                <div class="stat-sub">nothing due</div>
              </div>
            </div>

            <div class="card">
              <table class="cp-table">
                <thead><tr><th>Invoice</th><th>Period</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td class="bold">INV-001</td><td>June 2025</td><td>2025-06-01</td><td class="bold">$8,500</td><td><span class="paid-badge">Paid</span></td></tr>
                  <tr><td class="bold">INV-002</td><td>May 2025</td><td>2025-05-01</td><td class="bold">$8,500</td><td><span class="paid-badge">Paid</span></td></tr>
                  <tr><td class="bold">INV-003</td><td>April 2025</td><td>2025-04-01</td><td class="bold">$8,500</td><td><span class="paid-badge">Paid</span></td></tr>
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

  getDelta(key: string): number {
    const data = this.client()?.monthlyData || [];
    if (data.length < 2) return 0;
    const curr = (data[data.length - 1] as any)[key];
    const prev = (data[data.length - 2] as any)[key];
    if (!prev) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  }
}

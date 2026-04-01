import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AgencyService } from '../../services/agency.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="brand">
          <div class="logo">◈ <span class="logo-text">AGENCYOS</span></div>
          <div class="version">Platform v4.0</div>
        </div>

        <div class="portal-tabs">
          <button [class.active]="portal() === 'agency'" (click)="setPortal('agency')">
            <i class="portal-icon">🏢</i> Agency Portal
          </button>
          <button [class.active]="portal() === 'client'" (click)="setPortal('client')">
            <i class="portal-icon">🤝</i> Client Portal
          </button>
        </div>

        <div class="login-form">
          <h2>{{ portal() === 'agency' ? 'Staff Sign In' : 'Client Access' }}</h2>
          <p class="subtitle">
            {{ portal() === 'agency' ? 'Manage your agency operations' : 'Access your campaign growth dashboard' }}
          </p>

          <div class="fields">
            @if (portal() === 'agency') {
              <div class="field">
                <label>Staff Role</label>
                <select [(ngModel)]="selectedRole" class="form-select">
                  <option value="admin">Administrator</option>
                  <option value="manager">Agency Manager</option>
                  <option value="staff">Staff Member</option>
                </select>
              </div>
            }

            <div class="field">
              <label>Work Email</label>
              <input type="email" [(ngModel)]="email" placeholder="you@example.com">
            </div>
            <div class="field">
              <label>Password</label>
              <input type="password" [(ngModel)]="password" placeholder="••••••••" (keydown.enter)="handleLogin()">
            </div>

            @if (error()) {
              <div class="error">{{ error() }}</div>
            }

            <button class="submit-btn" [disabled]="loading()" (click)="handleLogin()">
              @if (loading()) { <span class="spin"></span> } @else { 
                {{ portal() === 'agency' ? 'Sign In to Agency →' : 'Enter Client Portal →' }}
              }
            </button>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: radial-gradient(circle at top right, #1a1a1a, #0a0a0a);
      color: var(--t-t0);
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 440px;
      padding: 40px;
      background: rgba(20, 20, 20, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    }

    .brand { text-align: center; margin-bottom: 32px; }
    .logo { font-weight: 800; font-size: 26px; color: #fff; letter-spacing: -0.02em; }
    .logo-text { background: linear-gradient(to right, #fff, #888); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .version { font-size: 10px; color: #666; letter-spacing: .12em; text-transform: uppercase; margin-top: 6px; opacity: 0.6; }

    .portal-tabs {
      display: flex;
      background: rgba(0,0,0,0.2);
      padding: 4px;
      border-radius: 14px;
      margin-bottom: 30px;
      border: 1px solid rgba(255,255,255,0.03);
    }

    .portal-tabs button {
      flex: 1;
      padding: 12px;
      border: none;
      background: transparent;
      color: #777;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 10px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      position: relative;
      z-index: 10;
    }

    .portal-tabs button.active {
      background: rgba(255,255,255,0.08);
      color: #fff;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }

    .portal-icon { font-style: normal; font-size: 14px; }

    .login-form { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    h2 { font-weight: 800; font-size: 24px; margin-bottom: 8px; text-align: center; color: #fff; }
    .subtitle { color: #888; font-size: 14px; margin-bottom: 32px; text-align: center; line-height: 1.5; }

    .fields { display: flex; flex-direction: column; gap: 18px; position: relative; }
    .field { width: 100%; display: block; }
    .field label { display: block; font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
    .field input, .form-select { 
      width: 100%; 
      background: rgba(255,255,255,0.05); 
      border: 1px solid rgba(255,255,255,0.15); 
      border-radius: 12px; 
      padding: 14px 16px; 
      color: #fff; 
      font-size: 15px; 
      outline: none; 
      transition: all .2s; 
      display: block;
    }
    .form-select { 
      cursor: pointer;
      /* Removed appearance: none to ensure browser default visibility */
    }
    .form-select option { background: #1a1a1a; color: #fff; }
    .field input:focus, .form-select:focus { border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); }
    
    .error { font-size: 13px; color: #ff6b6b; background: rgba(255, 107, 107, 0.1); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255, 107, 107, 0.2); }
    
    .submit-btn {
      padding: 16px; 
      background: #fff; 
      border: none; 
      border-radius: 14px; 
      color: #000; 
      font-weight: 700; 
      font-size: 15px; 
      cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 10px; 
      margin-top: 12px; 
      transition: all .2s;
    }
    .submit-btn:hover:not(:disabled) { background: #e0e0e0; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(255,255,255,0.1); }
    .submit-btn:active { transform: translateY(0); }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .spin { width: 18px; height: 18px; border: 2px solid #000; border-top-color: transparent; border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class Login {
  private agencyService = inject(AgencyService);
  private router = inject(Router);

  portal = signal<'agency' | 'client'>('agency');
  selectedRole = 'admin';
  email = '';
  password = '';
  error = signal('');
  loading = signal(false);

  setPortal(type: 'agency' | 'client') {
    console.log('Switching to portal:', type);
    this.portal.set(type);
    this.selectedRole = type === 'client' ? 'client' : 'admin';
    this.error.set(''); // Clear any errors when switching portals
  }

  async handleLogin() {
    this.error.set('');
    this.loading.set(true);

    try {
      const user = await this.agencyService.login(this.email, this.password);
      
      if (user) {
        // Double check authorization for the selected portal
        if (user.role === this.selectedRole) {
          if (user.role === 'admin') this.router.navigate(['/admin']);
          else if (user.role === 'manager') this.router.navigate(['/manager']);
          else if (user.role === 'staff') this.router.navigate(['/staff']);
          else if (user.role === 'client') this.router.navigate(['/client']);
        } else {
          const portalName = this.portal() === 'agency' ? 'Agency Portal' : 'Client Portal';
          this.error.set(`Access denied. This account is not authorized for the ${portalName}.`);
          this.agencyService.logout();
        }
      } else {
        this.error.set('Invalid email or password.');
      }
    } catch (err: any) {
      this.error.set(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}

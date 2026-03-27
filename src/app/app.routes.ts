import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { ManagerDashboard } from './components/manager-dashboard/manager-dashboard';
import { StaffDashboard } from './components/staff-dashboard/staff-dashboard';
import { ClientPortal } from './components/client-portal/client-portal';

import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login, canActivate: [authGuard] },
  { path: 'admin', component: AdminDashboard, canActivate: [authGuard] },
  { path: 'manager', component: ManagerDashboard, canActivate: [authGuard] },
  { path: 'staff', component: StaffDashboard, canActivate: [authGuard] },
  { path: 'client', component: ClientPortal, canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];

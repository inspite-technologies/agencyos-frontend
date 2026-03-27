import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface User {
  id: string;
  role: 'admin' | 'manager' | 'staff' | 'client';
  name: string;
  email: string;
  password?: string;
  avatar: string;
  title?: string;
  clientIds?: number[];
  clientId?: number;
}

export interface Client {
  id: number;
  name: string;
  industry: string;
  managerId: string;
  budget: number;
  spend: number;
  status: string;
  health: string;
  services: string[];
  tags: string[];
  startDate: string;
  contractEnd: string;
  notes: string;
  leads: number;
  roas: number;
  revenue: number;
  igFollowers: number;
  fbFollowers: number;
  gbpRating: number;
  gbpReviews: number;
  gbpMonthlyViews: number;
  gbpCalls: number;
  gbpSearches: number;
  gbpDirections: number;
  gbpResponseRate: string;
  gbpAvgResponse: string;
  seoDomainAuthority: number;
  seoKeywords: number;
  seoTop3: number;
  seoTop10: number;
  seoBacklinks: number;
  keywordRankings: { keyword: string, position: string, change: string, volume: string }[];
  onboardingComplete: boolean;
  reportGenerated: boolean;
  color: string;
  monthlyData: any[];
}

export interface Task {
  id: number;
  title: string;
  clientId: number | null;
  assigneeId: string;
  priority: string;
  due: string;
  status: string;
  type: string;
  notes?: string;
  subtasks?: { title: string, completed: boolean }[];
  comments?: { userId: string, userName: string, text: string, timestamp: string, type: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class AgencyService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api';

  // State Signals
  private readonly _users = signal<User[]>([]);
  private readonly _clients = signal<Client[]>([]);
  private readonly _tasks = signal<Task[]>([]);
  private readonly _currentUser = signal<User | null>(null);
  private readonly _initialized = signal(false);

  // Readonly exposures
  readonly users = this._users.asReadonly();
  readonly clients = this._clients.asReadonly();
  readonly tasks = this._tasks.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  readonly subscription = signal({ tier: 'growth', activeClients: 5 });

  readonly TIERS = [
    { id: 'growth', name: 'Growth', price: 499, color: '#FFFFFF', clientLimit: 5, features: ['Core Dashboard', 'Basic Reports', '5 Clients Max', 'Email Support'] },
    { id: 'scale', name: 'Scale', price: 999, color: '#3B82F6', clientLimit: 15, features: ['Advanced KPI Tracking', 'Custom Branding', '15 Clients Max', 'Priority Support'] },
    { id: 'enterprise', name: 'Enterprise', price: 2499, color: '#A855F7', clientLimit: 999, features: ['Unlimited Clients', 'White-label Portal', 'Dedicated Manager', 'API Access'] }
  ];

  constructor() {
    this.init();
  }

  private async init() {
    try {
      await Promise.all([
        this.refreshData(),
        this.loadFromStorage()
      ]);
    } finally {
      this._initialized.set(true);
    }
  }

  async refreshData() {
    try {
      const [users, clients, tasks] = await Promise.all([
        firstValueFrom(this.http.get<User[]>(`${this.API_URL}/users`)),
        firstValueFrom(this.http.get<Client[]>(`${this.API_URL}/clients`)),
        firstValueFrom(this.http.get<Task[]>(`${this.API_URL}/tasks`))
      ]);
      this._users.set(users);
      this._clients.set(clients);
      this._tasks.set(tasks);
    } catch (err) {
      console.error('Failed to sync with backend:', err);
    }
  }

  private async loadFromStorage() {
    const token = sessionStorage.getItem('aos_token');
    if (token) {
      try {
        const user = await firstValueFrom(this.http.get<User>(`${this.API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }));
        this._currentUser.set(user);
      } catch (err) {
        this.logout();
      }
    }
  }

  // Auth Methods
  async login(email: string, pass: string): Promise<User | null> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string, user: User }>(`${this.API_URL}/auth/login`, { email, password: pass })
      );
      this._currentUser.set(response.user);
      sessionStorage.setItem('aos_token', response.token);

      // Refresh all data immediately after login to ensure dashboard is populated
      await this.refreshData();

      return response.user;
    } catch (err) {
      return null;
    }
  }

  logout() {
    this._currentUser.set(null);
    sessionStorage.removeItem('aos_token');
  }

  // Client Methods
  async addClient(c: any) {
    const response = await firstValueFrom(this.http.post<Client>(`${this.API_URL}/clients`, c));
    this._clients.update(prev => [response, ...prev]);

    if (c.userId) {
      this._users.update(prev => prev.map(u => u.id === c.userId ? { ...u, clientId: response.id } : u));
    }
  }

  async updateClient(id: number, data: Partial<Client>) {
    const response = await firstValueFrom(this.http.patch<Client>(`${this.API_URL}/clients/${id}`, data));
    this._clients.update(prev => prev.map(c => c.id === id ? response : c));
  }

  async enterKPIs(clientId: number, kpiData: any) {
    const response = await firstValueFrom(this.http.post<Client>(`${this.API_URL}/reports/${clientId}`, kpiData));
    this._clients.update(prev => prev.map(c => c.id === clientId ? response : c));
  }

  async addUser(u: Partial<User>) {
    const response = await firstValueFrom(this.http.post<User>(`${this.API_URL}/users`, u));
    this._users.update(prev => [...prev, response]);
    return response;
  }

  // Utils
  calcPacing(c: Client): number {
    return Math.round((c.spend / (c.budget || 1)) * 100);
  }

  // Task Methods
  async addTask(data: Partial<Task>) {
    const response = await firstValueFrom(this.http.post<Task>(`${this.API_URL}/tasks`, data));
    this._tasks.update(prev => [...prev, response]);
  }

  async updateTask(id: number, data: Partial<Task>) {
    const response = await firstValueFrom(this.http.patch<Task>(`${this.API_URL}/tasks/${id}`, data));
    this._tasks.update(prev => prev.map(t => t.id === id ? response : t));
  }

  async deleteTask(id: number) {
    await firstValueFrom(this.http.delete(`${this.API_URL}/tasks/${id}`));
    this._tasks.update(prev => prev.filter(t => t.id !== id));
  }

  async deleteAllTasks() {
    await firstValueFrom(this.http.delete(`${this.API_URL}/tasks`));
    this._tasks.set([]);
  }
}

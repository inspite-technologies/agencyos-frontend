import { Injectable, signal, computed, inject, Signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  agencyCharges: number;
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

export interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  items: { description: string, amount: number, quantity: number }[];
  total: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  fromId: string;
  fromName: string;
  type: 'assignment' | 'update' | 'comment';
  title: string;
  message: string;
  taskId?: number;
  isRead: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgencyService {
  private http = inject(HttpClient);
  private readonly API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://agencyos-backend-cqwy.onrender.com/api';

  // State Signals
  private readonly _users = signal<User[]>([]);
  private readonly _clients = signal<Client[]>([]);
  private readonly _tasks = signal<Task[]>([]);
  private readonly _invoices = signal<Invoice[]>([]);
  private readonly _notifications = signal<Notification[]>([]);
  private readonly _currentUser = signal<User | null>(null);
  private readonly _initialized = signal(false);

  // Readonly exposures
  readonly users = this._users.asReadonly();
  readonly clients = this._clients.asReadonly();
  readonly tasks = this._tasks.asReadonly();
  readonly invoices = this._invoices.asReadonly();
  readonly notifications: Signal<Notification[]> = this._notifications.asReadonly();
  readonly unreadNotificationCount: Signal<number> = computed(() => this._notifications().filter(n => !n.isRead).length);
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
        this.loadFromStorage(),
        this.fetchNotifications()
      ]);
      setInterval(() => {
        if (this.currentUser()) this.fetchNotifications();
      }, 10000); // Poll every 10s
    } finally {
      this._initialized.set(true);
    }
  }

  async refreshData() {
    try {
      const [users, clients, tasks, invoices] = await Promise.all([
        this.authGet<User[]>(`${this.API_URL}/users`),
        this.authGet<Client[]>(`${this.API_URL}/clients`),
        this.authGet<Task[]>(`${this.API_URL}/tasks`),
        this.authGet<Invoice[]>(`${this.API_URL}/invoices`)
      ]);
      this._users.set(users);
      this._clients.set(clients);
      this._tasks.set(tasks);
      this._invoices.set(invoices);
      this.fetchNotifications();
    } catch (err) {
      console.error('Failed to sync with backend:', err);
    }
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${sessionStorage.getItem('aos_token') || ''}`
    });
  }

  private authGet<T>(url: string) {
    return firstValueFrom(this.http.get<T>(url, { headers: this.headers }));
  }

  private authPost<T>(url: string, body: any) {
    return firstValueFrom(this.http.post<T>(url, body, { headers: this.headers }));
  }

  private authPatch<T>(url: string, body: any) {
    return firstValueFrom(this.http.patch<T>(url, body, { headers: this.headers }));
  }

  private authDelete<T>(url: string) {
    return firstValueFrom(this.http.delete<T>(url, { headers: this.headers }));
  }

  // --- Core Sync ---
  private lastNotificationCount = 0;
  async fetchNotifications() {
    const user = this.currentUser();
    if (!user) return;
    try {
      const data = await this.authGet<Notification[]>(`${this.API_URL}/notifications`);
      
      // Reactive Sync: If we have new notifications, refresh all tasks/data
      const unreadCount = data.filter(n => !n.isRead).length;
      if (unreadCount > this.lastNotificationCount) {
        this.refreshData();
      }
      this.lastNotificationCount = unreadCount;
      
      this._notifications.set(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }

  async markNotificationRead(id: string) {
    try {
      await this.authPatch(`${this.API_URL}/notifications/${id}/read`, {});
      this._notifications.update(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  }

  async markAllNotificationsRead() {
    try {
      await this.authPatch(`${this.API_URL}/notifications/read-all`, {});
      this._notifications.update(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
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
    } catch (err: any) {
      const errorMsg = err.error?.error || 'Invalid email or password.';
      throw new Error(errorMsg);
    }
  }

  // Deep Linking / Navigation Helpers
  private _selectedTaskId = signal<number | null>(null);
  readonly selectedTaskId = this._selectedTaskId.asReadonly();

  setSelectedTask(id: number | null) {
    this._selectedTaskId.set(id);
  }

  logout() {
    this._currentUser.set(null);
    sessionStorage.removeItem('aos_token');
  }

  // Client Methods
  async addClient(c: any) {
    const response = await this.authPost<Client>(`${this.API_URL}/clients`, c);
    this._clients.update(prev => [response, ...prev]);

    if (c.userId) {
      this._users.update(prev => prev.map(u => u.id === c.userId ? { ...u, clientId: response.id } : u));
    }
  }

  async updateClient(id: number, data: Partial<Client>) {
    const response = await this.authPatch<Client>(`${this.API_URL}/clients/${id}`, data);
    this._clients.update(prev => prev.map(c => c.id === id ? response : c));
  }

  async enterKPIs(clientId: number, kpiData: any, date?: string) {
    const body = { ...kpiData };
    if (date) body.date = date;
    const response = await this.authPost<Client>(`${this.API_URL}/reports/${clientId}`, body);
    this._clients.update(prev => prev.map(c => c.id === clientId ? response : c));
  }

  async getReports(clientId: number, period: 'daily' | 'monthly' | 'yearly', filters?: any) {
    let url = `${this.API_URL}/reports/${clientId}?period=${period}`;
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) url += `&${key}=${filters[key]}`;
      });
    }
    return await this.authGet<any[]>(url);
  }

  async addUser(u: Partial<User>) {
    const response = await this.authPost<User>(`${this.API_URL}/users`, u);
    this._users.update(prev => [...prev, response]);
    return response;
  }

  async updateUser(id: string, data: Partial<User>) {
    const response = await this.authPatch<User>(`${this.API_URL}/users/${id}`, data);
    this._users.update(prev => prev.map(u => u.id === id ? response : u));
    return response;
  }

  // Utils
  calcPacing(c: Client): number {
    return Math.round((c.spend / (c.budget || 1)) * 100);
  }

  // Task Methods
  async addTask(data: Partial<Task>) {
    const response = await this.authPost<Task>(`${this.API_URL}/tasks`, data);
    this._tasks.update(prev => [...prev, response]);
  }

  async updateTask(id: number, data: Partial<Task>) {
    const response = await this.authPatch<Task>(`${this.API_URL}/tasks/${id}`, data);
    this._tasks.update(prev => prev.map(t => t.id === id ? response : t));
  }

  async deleteTask(id: number) {
    await this.authDelete(`${this.API_URL}/tasks/${id}`);
    this._tasks.update(prev => prev.filter(t => t.id !== id));
  }

  async deleteAllTasks() {
    await this.authDelete(`${this.API_URL}/tasks`);
    this._tasks.set([]);
  }

  // Invoice Methods
  async addInvoice(data: Partial<Invoice>) {
    const response = await this.authPost<Invoice>(`${this.API_URL}/invoices`, data);
    this._invoices.update(prev => [response, ...prev]);
  }

  async updateInvoice(id: number, data: Partial<Invoice>) {
    const response = await firstValueFrom(this.http.patch<Invoice>(`${this.API_URL}/invoices/${id}`, data));
    this._invoices.update(prev => prev.map(inv => inv.id === id ? response : inv));
  }

  async deleteInvoice(id: number) {
    await firstValueFrom(this.http.delete(`${this.API_URL}/invoices/${id}`));
    this._invoices.update(prev => prev.filter(inv => inv.id !== id));
  }

  downloadInvoice(inv: Invoice) {
    const client = this.clients().find(c => c.id === inv.clientId);
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    // 1. Header & Branding
    doc.setTextColor(194, 24, 91); // Dark Pink
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('INSPITE TECHNOLOGIES', 15, 30);
    
    // Professional subtle separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(15, 35, 195, 35);

    // 2. Invoice Meta Details (Right Aligned - Professional Black)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 195, 25, { align: 'right' });
    
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Number: ${inv.invoiceNumber}`, 195, 45, { align: 'right' });
    doc.text(`Date: ${new Date(inv.issueDate).toLocaleDateString()}`, 195, 50, { align: 'right' });
    doc.text(`Due: ${new Date(inv.dueDate).toLocaleDateString()}`, 195, 55, { align: 'right' });

    // 3. Bill To Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', 15, 50);
    doc.setFontSize(12);
    doc.text(client?.name || 'Valued Client', 15, 56);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(client?.industry || 'Business Partner', 15, 62);

    // 4. Items Table
    const tableData = inv.items.map(item => [
      item.description,
      item.quantity || 1,
      `INR ${item.amount.toLocaleString()}`,
      `INR ${((item.amount || 0) * (item.quantity || 1)).toLocaleString()}`
    ]);

    (doc as any).autoTable({
      startY: 75,
      head: [['DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5, textColor: [0, 0, 0] },
      headStyles: { fillColor: [0, 0, 0], textColor: 255, fontStyle: 'bold' }, // Black background
      columnStyles: {
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 40 },
        3: { halign: 'right', cellWidth: 40 }
      },
      margin: { left: 15, right: 15 }
    });

    // 5. Summary Section
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    // Subtotal area
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Subtotal:', 140, finalY);
    doc.text(`INR ${inv.total.toLocaleString()}`, 195, finalY, { align: 'right' });
    
    // Grand Total (Professional Black for high contrast)
    const totalY = finalY + 10;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(130, totalY - 5, 195, totalY - 5);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); // Bold Black for contrast
    doc.setFont('helvetica', 'bold');
    doc.text('GRAND TOTAL:', 140, totalY + 2);
    doc.text(`INR ${inv.total.toLocaleString()}`, 195, totalY + 2, { align: 'right' });

    // 6. Footer & Terms
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text('Thank you for choosing Inspite Technologies.', 15, 270);
    doc.text('Payment is due within the specified timeframe.', 15, 275);
    
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated document.', 105, 285, { align: 'center' });
    doc.save(`${inv.invoiceNumber}.pdf`);
  }

  downloadReport(client: Client, period: string, data: any[]) {
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();

    // 1. Header & Branding (Professional centered approach)
    doc.setTextColor(194, 24, 91); // Dark Pink
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('INSPITE TECHNOLOGIES', 105, 25, { align: 'center' });
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Performance & Growth Management Portal', 105, 31, { align: 'center' });

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(15, 38, 195, 38);

    // 2. Report Summary Box (Professional alignment)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 45, 180, 25, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('CLIENT NAME', 25, 53);
    doc.text('REPORT TYPE', 85, 53);
    doc.text('GENERATED ON', 145, 53);

    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(client.name.toUpperCase(), 25, 60);
    doc.text(`${period.toUpperCase()} PERFORMANCE`, 85, 60);
    doc.text(new Date().toLocaleDateString('en-IN'), 145, 60);

    // 3. Data Table (Structured & Aligned)
    const tableHeaders = [['PERIOD', 'LEADS', 'AVG. ROAS', 'TOTAL SPEND', 'EST. REVENUE']];
    const tableRows = data.map(row => {
      let periodStr = '';
      if (period === 'daily') {
        periodStr = new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } else if (period === 'monthly') {
        const d = new Date(row.date);
        periodStr = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      } else {
        periodStr = `YEAR ${row._id.year}`;
      }

      return [
        periodStr,
        row.leads || 0,
        `${(row.roas || 0).toFixed(2)}x`,
        `INR ${(row.spend || 0).toLocaleString()}`,
        `INR ${(row.revenue || 0).toLocaleString()}`
      ];
    });

    (doc as any).autoTable({
      startY: 80,
      head: tableHeaders,
      body: tableRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [0, 0, 0], 
        textColor: 255, 
        fontSize: 10, 
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 9, 
        cellPadding: 5, 
        lineColor: [240, 240, 240],
        lineWidth: 0.1 
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 40 },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 40 },
        4: { halign: 'right', cellWidth: 40 }
      },
      margin: { left: 15, right: 15 }
    });

    // 4. Totals (Optional but professional)
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    if (data.length > 0) {
      const totalLeads = data.reduce((sum, r) => sum + (r.leads || 0), 0);
      const totalSpend = data.reduce((sum, r) => sum + (r.spend || 0), 0);
      const totalRev = data.reduce((sum, r) => sum + (r.revenue || 0), 0);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTALS:', 15, finalY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Leads: ${totalLeads}`, 15, finalY + 12);
      doc.text(`Total Spend: INR ${totalSpend.toLocaleString()}`, 85, finalY + 12);
      doc.text(`Total Revenue: INR ${totalRev.toLocaleString()}`, 145, finalY + 12);
    }

    // 5. Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text('Generated by Inspite Technologies Agency Management System', 105, 285, { align: 'center' });
    doc.text('Page 1 of 1', 195, 285, { align: 'right' });

    doc.save(`${client.name}_${period}_report.pdf`);
  }
}

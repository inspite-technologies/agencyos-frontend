import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, Client, User, Task } from '../../services/agency.service';
import { Sidebar } from '../shared/sidebar/sidebar';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar],
  template: `
    <div class="dashboard-root">
      <app-sidebar 
        [user]="agencyService.currentUser()" 
        [currentPage]="page()"
        (pageChange)="page.set($event)"
      />
      
      <main class="main-content">
        <!-- 1. My Tasks -->
        @if (page() === 'tasks') {
          <div class="view-container">
            <header class="view-header">
              <div>
                <h1>My Tasks</h1>
                <p>{{ openTasks().length }} open · {{ doneTasks().length }} done</p>
              </div>
              <div class="header-actions">
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
                  <div class="task-card" [class.overdue-border]="calcOverdue(task.due) > 0" [class.done]="task.status === 'Done'" (click)="toggleExpand(task.id)">
                    <div class="task-info">
                      <div class="task-title">{{ task.title }}</div>
                      <div class="task-meta">
                         <span class="meta-icon">📁</span> {{ getClientName(task.clientId) }} 
                         @if (task.subtasks && task.subtasks.length > 0) {
                           <span class="progress-label">📊 {{ getCompletedCount(task) }}/{{ task.subtasks.length }}</span>
                         }
                         @if (calcOverdue(task.due) > 0 && task.status !== 'Done') {
                           <span class="overdue-label">{{ calcOverdue(task.due) }}d overdue</span>
                         }
                         @if (task.comments && task.comments.length > 0) {
                           <span class="comment-indicator">💬 {{ task.comments.length }}</span>
                         }
                      </div>
                    </div>

                    <div class="task-status-control" (click)="$event.stopPropagation()">
                      <select class="status-select" [attr.data-status]="task.status" [ngModel]="task.status" (ngModelChange)="updateStatus(task.id, $event)">
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                        <option value="Blocked">Blocked</option>
                      </select>
                    </div>

                    <div class="pri-badge" [attr.data-pri]="task.priority">{{ task.priority }}</div>
                    
                    <div class="task-actions" (click)="$event.stopPropagation()">
                      <button class="icon-btn" (click)="toggleExpand(task.id)" title="View/Edit Details">👁️</button>
                    </div>
                  </div>
                  
                  @if (expandedTasks().has(task.id)) {
                    <div class="task-detail-panel">
                       <div class="detail-columns">
                         <!-- Subtasks -->
                         <div class="detail-col">
                           <label>My Checklist</label>
                             <div class="subtask-list">
                               @for (st of task.subtasks; track $index) {
                                 <div class="subtask-item">
                                   <input type="checkbox" [checked]="st.completed" (change)="toggleSubtask(task, $index)">
                                   <span [class.strike]="st.completed">{{ st.title }}</span>
                                 </div>
                               }
                               @if (!task.subtasks || task.subtasks.length === 0) {
                                 <div class="empty-hint">No checklist provided.</div>
                               }
                               @if (allSubtasksDone(task) && task.status !== 'Done') {
                                 <button class="submit-completion-btn" (click)="submitTask(task)">
                                   ✨ Submit Completion
                                 </button>
                               }
                             </div>
                         </div>

                         <!-- Comments & Issues -->
                         <div class="detail-col">
                           <label>Updates & Issues</label>
                           <div class="comment-thread">
                             @for (c of task.comments; track c.timestamp) {
                               <div class="comment" [class.is-issue]="c.type === 'issue'">
                                 <div class="c-header">
                                   <strong>{{ c.userName }}</strong> • {{ c.timestamp | date:'shortTime' }}
                                   @if (c.type === 'issue') { <span class="issue-tag">ISSUE</span> }
                                 </div>
                                 <div class="c-body">{{ c.text }}</div>
                               </div>
                             }
                           </div>
                           <div class="comment-actions">
                             <input type="text" #staffMsg placeholder="Message admin..." (keydown.enter)="addComment(task, staffMsg, 'note')">
                             <button class="send-btn" (click)="addComment(task, staffMsg, 'note')">Send</button>
                             <button class="issue-btn" (click)="addComment(task, staffMsg, 'issue')" title="Report as Blocker">🚩 Issue</button>
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

        <!-- 2. Enter KPIs -->
        @if (page() === 'kpi') {
          <div class="view-container">
            <header class="view-header">
              <div>
                <h1>Enter KPIs</h1>
                <p>Update performance data for your assigned clients</p>
              </div>
            </header>

            <div class="kpi-form-panel">
              <div class="form-section">
                <label class="section-label">Select Client</label>
                <select class="client-select" [(ngModel)]="selectedClientId" (change)="loadClientKPIs()">
                  <option [value]="0" disabled>— Select Client —</option>
                  @for (c of myClients(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>

              @if (selectedClientId() > 0) {
                <div class="form-grid kpi-active">
                  <div class="form-field"><label>Ad Spend (₹)</label><input type="number" [(ngModel)]="kpiForm.spend"></div>
                  <div class="form-field"><label>Leads</label><input type="number" [(ngModel)]="kpiForm.leads"></div>
                  <div class="form-field"><label>Revenue (₹)</label><input type="number" [(ngModel)]="kpiForm.revenue"></div>
                  <div class="form-field"><label>ROAS (auto: {{ (kpiForm.revenue / (kpiForm.spend || 1)).toFixed(2) }}×)</label><input type="number" step="0.1" [(ngModel)]="kpiForm.roas"></div>
                  <div class="form-field">
                    <label>Health Status</label>
                    <select [(ngModel)]="kpiForm.health" class="client-select" style="padding: 12px; height: auto;">
                      <option value="Healthy">Healthy</option>
                      <option value="At Risk">At Risk</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label>Client Status</label>
                    <select [(ngModel)]="kpiForm.status" class="client-select" style="padding: 12px; height: auto;">
                      <option value="Active">Active</option>
                      <option value="Paused">Paused</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                  <div class="form-field"><label>IG Followers</label><input type="number" [(ngModel)]="kpiForm.igFollowers"></div>
                  <div class="form-field"><label>FB Followers</label><input type="number" [(ngModel)]="kpiForm.fbFollowers"></div>
                  <div class="form-field full">
                    <button class="save-kpi-btn" (click)="saveKPIs()">Save KPIs</button>
                  </div>
                </div>
              } @else {
                <div class="empty-state">
                  <div class="empty-icon">📊</div>
                  <p>Choose a client to start entering performance data</p>
                </div>
              }
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .dashboard-root { display: flex; height: 100vh; background: var(--t-bg); color: #fff; overflow: hidden; }
    .main-content { flex: 1; padding: 24px 30px; overflow-y: auto; }
    
    .view-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
    h1 { font-weight: 800; font-size: 26px; font-family: 'Outfit', sans-serif; }
    .view-header p { color: var(--t-t1); font-size: 14px; margin-top: 2px; }

    /* Task board professional tools */
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .search-input { background: var(--t-s1); border: 1px solid var(--t-brL); color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 13px; outline: none; transition: border-color .2s; width: 220px; }
    .search-input:focus { border-color: var(--t-cyan); }
    .filter-select { background: var(--t-s1); border: 1px solid var(--t-brL); color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; }
    .task-card-wrapper { display: flex; flex-direction: column; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 14px; overflow: hidden; margin-bottom: 8px; }

    .task-board { display: flex; flex-direction: column; gap: 0px; }
    .task-card { 
      padding: 14px 20px; display: grid; grid-template-columns: 1fr 120px 80px 40px; gap: 20px; align-items: center; 
      transition: all .2s; background: transparent; border: none; border-radius: 0; cursor: pointer;
    }
    .task-card.done { opacity: 0.6; filter: grayscale(0.5); }
    .task-card:hover { background: rgba(255,255,255,0.02); }
    .task-card.overdue-border { border-left: 3px solid var(--t-rose); padding-left: 17px; }
    
    .task-info { min-width: 0; }
    .task-title { font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .task-meta { font-size: 11px; color: var(--t-t1); display: flex; align-items: center; gap: 12px; }
    
    .status-select { 
      background: var(--t-s3); color: var(--t-t1); border: 1px solid transparent; border-radius: 20px; 
      padding: 5px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; cursor: pointer; outline: none; appearance: none; text-align: center;
      width: 110px; transition: all .2s;
    }
    .status-select:hover { border-color: var(--t-brL); background: var(--t-s2); color: #fff; }
    .status-select[data-status="In Progress"] { color: var(--t-cyan); background: rgba(0, 188, 212, 0.1); }
    .status-select[data-status="Done"] { color: var(--t-lime); background: rgba(26, 255, 178, 0.08); }
    .status-select[data-status="Blocked"] { color: var(--t-rose); background: rgba(255, 107, 107, 0.1); }

    .task-detail-panel { padding: 20px 24px; background: var(--t-s2); border-top: 1px solid var(--t-br); border-radius: 0 0 14px 14px; }
    .detail-columns { display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; }
    .detail-col label { display: block; font-size: 10px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; }
    
    .subtask-list { display: flex; flex-direction: column; gap: 10px; }
    .subtask-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #eee; margin-bottom: 8px; }
    .subtask-item input { width: 16px; height: 16px; accent-color: var(--t-lime); cursor: pointer; }
    .subtask-item .strike { text-decoration: line-through; opacity: 0.5; flex: 1; }
    .remove-st-icon { background: none; border: none; color: var(--t-t1); cursor: pointer; opacity: 0.3; font-size: 14px; }
    .remove-st-icon:hover { opacity: 1; color: var(--t-rose); }

    .subtask-add-inline { display: flex; gap: 8px; margin-top: 8px; margin-bottom: 12px; }
    .subtask-add-inline input { flex: 1; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 6px; padding: 6px 10px; color: #fff; font-size: 12px; outline: none; }
    .subtask-add-inline button { background: var(--t-br); color: #fff; border: none; padding: 0 10px; border-radius: 6px; font-weight: 700; cursor: pointer; }

    .submit-completion-btn { 
      width: 100%; margin-top: 15px; padding: 12px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #00bcd4, #00ff9d); color: #080808;
      font-weight: 800; font-size: 12px; text-transform: uppercase; cursor: pointer; 
      transition: all .2s; box-shadow: 0 4px 20px rgba(0, 255, 157, 0.3);
      display: block; text-align: center;
    }
    .submit-completion-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(0, 255, 157, 0.5); filter: brightness(1.1); }

    .comment-thread { max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
    .comment { background: var(--t-s1); padding: 10px 14px; border-radius: 10px; border-left: 3px solid var(--t-br); }
    .comment.is-issue { border-left-color: var(--t-rose); background: rgba(255, 107, 107, 0.05); }
    .c-header { font-size: 11px; color: var(--t-t1); margin-bottom: 4px; }
    .c-body { font-size: 13px; color: #fff; line-height: 1.4; }
    .issue-tag { background: var(--t-rose); color: #fff; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 900; margin-left: 6px; }

    .comment-actions { display: flex; gap: 8px; }
    .comment-actions input { flex: 1; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 8px; padding: 10px; color: #fff; font-size: 13px; outline: none; }
    .comment-actions button { border: none; padding: 0 14px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; transition: all .2s; }
    .send-btn { background: #fff; color: #000; }
    .issue-btn { background: rgba(255, 107, 107, 0.1); color: var(--t-rose); border: 1px solid rgba(255, 107, 107, 0.2) !important; }
    .issue-btn:hover { background: var(--t-rose); color: #fff; }

    .empty-hint { font-size: 12px; color: var(--t-t2); font-style: italic; }

    .pri-badge { font-size: 11px; font-weight: 800; text-transform: uppercase; width: 60px; text-align: right; }
    .pri-badge[data-pri="High"] { color: var(--t-rose); }
    .pri-badge[data-pri="Low"] { color: var(--t-violet); }

    .task-actions { display: flex; align-items: center; gap: 8px; margin-left: 10px; }
    .icon-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--t-br); border-radius: 6px; color: var(--t-t1); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; font-size: 14px; cursor: pointer; transition: all .2s; }
    .icon-btn:hover { background: var(--t-s3); color: #fff; border-color: var(--t-brL); }

    /* KPI Form */
    .kpi-form-panel { background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 16px; padding: 30px; max-width: 600px; }
    .form-section { margin-bottom: 24px; }
    .section-label { font-size: 11px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; margin-bottom: 10px; display: block; }
    .client-select { width: 100%; background: var(--t-s2); border: 1px solid var(--t-br); border-radius: 10px; padding: 14px; color: #fff; font-size: 14px; outline: none; appearance: none; cursor: pointer; }
    
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; border-top: 1px solid var(--t-br); padding-top: 30px; }
    .form-field { display: flex; flex-direction: column; gap: 8px; }
    .form-field label { font-size: 11px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; }
    .form-field input { background: var(--t-s2); border: 1px solid var(--t-br); border-radius: 10px; padding: 12px; color: #fff; font-size: 14px; outline: none; }
    .form-field.full { grid-column: span 2; margin-top: 10px; }

    .save-kpi-btn { background: #fff; color: #000; border: none; padding: 14px; border-radius: 10px; font-weight: 800; font-size: 14px; cursor: pointer; transition: all .2s; }
    .save-kpi-btn:hover { background: var(--t-cyan); transform: translateY(-1px); }

    .empty-state { text-align: center; padding: 60px 0; color: var(--t-t2); }
    .empty-icon { font-size: 40px; margin-bottom: 15px; opacity: 0.3; }
  `]
})
export class StaffDashboard {
  Math = Math;
  agencyService = inject(AgencyService);
  page = signal('tasks');
  selectedClientId = signal(0);
  kpiForm: any = {};

  currentUser = computed(() => this.agencyService.currentUser());
  
  allMyTasks = computed(() => this.agencyService.tasks().filter(t => t.assigneeId === this.currentUser()?.id));
  openTasks = computed(() => this.allMyTasks().filter(t => t.status !== 'Done'));
  doneTasks = computed(() => this.allMyTasks().filter(t => t.status === 'Done'));

  taskSearch = signal('');
  filterPriority = signal('All');
  filterStatus = signal('All');
  expandedTasks = signal<Set<number>>(new Set());

  filteredTasks = computed(() => {
    let tasks = this.allMyTasks();
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

  allSubtasksDone(task: Task): boolean {
    return !!task.subtasks && task.subtasks.length > 0 && task.subtasks.every(s => s.completed);
  }

  submitTask(task: Task) {
    this.agencyService.updateTask(task.id, { status: 'Done' });
  }

  addSubtaskToExisting(task: Task, input: HTMLInputElement) {
    const title = input.value.trim();
    if (!title) return;
    const subtasks = [...(task.subtasks || []), { title, completed: false }];
    this.agencyService.updateTask(task.id, { subtasks });
    input.value = '';
  }

  removeSubtaskFromExisting(task: Task, index: number) {
    const subtasks = task.subtasks?.filter((_, i) => i !== index);
    this.agencyService.updateTask(task.id, { subtasks });
  }

  addComment(task: Task, input: HTMLInputElement, type: 'note' | 'issue' = 'note') {
    const text = input.value.trim();
    if (!text) return;

    const comments = [...(task.comments || [])];
    comments.push({
      userId: this.currentUser()?.id || '',
      userName: this.currentUser()?.name || 'Staff',
      text,
      timestamp: new Date().toISOString(),
      type
    });

    const updates: Partial<Task> = { comments };
    if (type === 'issue') {
      updates.status = 'Blocked';
    }

    this.agencyService.updateTask(task.id, updates);
    input.value = '';
  }

  // In a real app, staff might see clients they have tasks for or explicit assignments
  // For this demo, let's show clients for which they have tasks
  myClients = computed(() => {
    const clientIds = new Set(this.allMyTasks().map(t => t.clientId).filter(id => id !== null));
    return this.agencyService.clients().filter(c => clientIds.has(c.id));
  });

  getClientName(id: number | null) {
    if (!id) return 'Internal';
    return this.agencyService.clients().find(c => c.id === id)?.name || 'Client';
  }

  getAssigneeName(id: string) {
    return this.agencyService.users().find(u => u.id === id)?.name || 'Unassigned';
  }

  calcOverdue(due: string) {
    const diff = new Date().getTime() - new Date(due).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  loadClientKPIs() {
    const client = this.agencyService.clients().find(c => c.id === Number(this.selectedClientId()));
    if (client) {
      this.kpiForm = { ...client };
    }
  }

  saveKPIs() {
    this.agencyService.enterKPIs(Number(this.selectedClientId()), this.kpiForm);
    alert('KPIs saved successfully!');
  }

  completeTask(task: Task) {
    this.agencyService.updateTask(task.id, { status: 'Done' });
  }
}

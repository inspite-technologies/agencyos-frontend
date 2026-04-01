import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, Client, User, Task } from '../../services/agency.service';
import { ToastService } from '../../services/toast.service';
import { Sidebar } from '../shared/sidebar/sidebar';
import { NotificationCenter } from '../shared/notification-center';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, Sidebar, NotificationCenter],
  template: `
    <div class="dashboard-root">
      <app-sidebar 
        [user]="agencyService.currentUser()" 
        [currentPage]="page()"
        (pageChange)="page.set($event)">
      </app-sidebar>
      
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
                <app-notification-center />
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
                  <div class="task-card" [class.overdue-border]="calcOverdue(task.due) > 0" [class.done]="task.status === 'Done'" [attr.data-task-id]="task.id" (click)="toggleExpand(task.id)">
                    <div class="task-info">
                      <div class="task-title">{{ task.title }}</div>
                      <div class="task-meta">
                          <span class="meta-icon">📁</span> {{ getClientName(task.clientId) }} 
                          @if (task.subtasks && task.subtasks.length > 0) {
                            <span class="progress-tag">📊 {{ getCompletedCount(task) }}/{{ task.subtasks.length }}</span>
                          }
                          @if (calcOverdue(task.due) > 0 && task.status !== 'Done') {
                            <span class="overdue-label">{{ calcOverdue(task.due) }}d overdue</span>
                          }
                          @if (task.comments && task.comments.length > 0) {
                            <span class="comment-count">💬 {{ task.comments.length }}</span>
                          }
                      </div>
                    </div>

                    <div class="task-status-control" (click)="$event.stopPropagation()">
                      <div class="status-wrapper">
                        <span class="status-label">Update Status</span>
                        <select class="status-select" [attr.data-status]="task.status" [ngModel]="task.status" (ngModelChange)="updateStatus(task.id, $event)">
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                      </div>
                    </div>

                    <div class="pri-badge" [attr.data-pri]="task.priority">{{ task.priority }}</div>
                    
                    <div class="task-actions" (click)="$event.stopPropagation()">
                      <button class="icon-btn" (click)="toggleExpand(task.id)" title="View/Edit Details">
                        {{ expandedTasks().has(task.id) ? '▾' : '▸' }}
                      </button>
                    </div>
                  </div>

                   @if (expandedTasks().has(task.id)) {
                    <div class="task-detail-panel">
                       <div class="detail-grid">
                         <div class="detail-section">
                           <label>Checklist</label>
                           <div class="subtask-list">
                             @for (st of task.subtasks; track $index) {
                               <div class="subtask-item">
                                 <input type="checkbox" [checked]="st.completed" (change)="toggleSubtask(task, $index)">
                                 <span [class.done]="st.completed">{{ st.title }}</span>
                                 <button class="remove-st-btn" (click)="removeSubtaskFromExisting(task, $index)">×</button>
                               </div>
                             }
                             @if (!task.subtasks || task.subtasks.length === 0) {
                               <p class="empty-hint">No checklist defined.</p>
                             }
                             <div class="inline-add-st">
                               <textarea #stInput placeholder="Add steps (one per line)..." (keydown.enter)="onSubtaskKeyDown($any($event), task, stInput)"></textarea>
                               <button class="st-confirm-btn" (click)="addSubtasksToExisting(task, stInput)">Add Checklist Items</button>
                             </div>
                             @if (allSubtasksDone(task) && task.status !== 'Done') {
                               <button class="submit-completion-btn" (click)="submitTask(task)">
                                 ✨ Submit Completion
                               </button>
                             }
                           </div>
                         </div>

                         <div class="detail-section">
                           <label>Activity & Issues</label>
                           <div class="comment-thread">
                             @for (c of task.comments; track c.timestamp) {
                               <div class="comment" [class.issue]="c.type === 'issue'">
                                 <div class="comment-meta">
                                   <strong>{{ c.userName }}</strong> • {{ c.timestamp | date:'short' }}
                                   @if (c.type === 'issue') { <span class="issue-badge">ISSUE</span> }
                                 </div>
                                 <div class="comment-text">{{ c.text }}</div>
                               </div>
                             }
                             @if (!task.comments || task.comments.length === 0) {
                               <p class="empty-hint">No activity yet.</p>
                             }
                           </div>
                           <div class="add-comment">
                             <input type="text" #msgInput placeholder="Add a note or reply..." (keydown.enter)="addComment(task, msgInput)">
                             <button (click)="addComment(task, msgInput)">Send</button>
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
                <h1>Clients</h1>
                <p>Update performance data for your assigned clients</p>
              </div>
              <div class="header-actions">
                <app-notification-center />
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
    
    .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    h1 { font-weight: 800; font-size: 26px; font-family: 'Outfit', sans-serif; }
    .view-header p { color: var(--t-t1); font-size: 14px; margin-top: 2px; }

    .sync-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--t-br); border-radius: 12px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; transition: all .3s; }
    .sync-btn:hover { background: rgba(0, 188, 212, 0.1); border-color: var(--t-cyan); transform: rotate(180deg); }

    /* Task board professional tools */
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .search-input { background: var(--t-s1); border: 1px solid var(--t-brL); color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 13px; outline: none; transition: border-color .2s; width: 220px; }
    .search-input:focus { border-color: var(--t-cyan); }
    .filter-select { background: var(--t-s1); border: 1px solid var(--t-brL); color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; }
    .task-card-wrapper { display: flex; flex-direction: column; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 14px; overflow: hidden; margin-bottom: 8px; }

    .task-board { display: flex; flex-direction: column; gap: 0px; }
    .task-card { 
      padding: 14px 20px; display: grid; grid-template-columns: 1fr 120px 80px 70px; gap: 20px; align-items: center; 
      transition: all .2s; background: transparent; border: none; border-radius: 0; cursor: pointer;
    }
    .task-card.done { opacity: 0.6; filter: grayscale(0.5); }
    .task-card:hover { background: rgba(255,255,255,0.02); }
    .task-card.overdue-border { border-left: 3px solid var(--t-rose); padding-left: 17px; }
    
    .task-info { min-width: 0; }
    .task-title { font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .task-meta { font-size: 11px; color: var(--t-t1); display: flex; align-items: center; gap: 12px; }
    
    .task-actions { display: flex; align-items: center; gap: 8px; margin-left: 10px; }
    .icon-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--t-br); border-radius: 6px; color: var(--t-t1); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; font-size: 14px; cursor: pointer; transition: all .2s; }
    
    .progress-tag { background: rgba(0, 188, 212, 0.1); color: var(--t-cyan); padding: 2px 8px; border-radius: 12px; font-weight: 800; font-size: 10px; border: 1px solid rgba(0, 188, 212, 0.2); }
    .comment-count { font-size: 10px; color: var(--t-t1); opacity: 0.8; }

    .status-wrapper { display: flex; flex-direction: column; gap: 4px; align-items: center; }
    .status-label { font-size: 8px; font-weight: 800; color: var(--t-t2); text-transform: uppercase; letter-spacing: 0.05em; }

    .status-select { 
      background: var(--t-s3); color: var(--t-t1); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; 
      padding: 5px 25px 5px 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; cursor: pointer; outline: none; appearance: none; text-align: center;
      width: 125px; transition: all .2s;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
    }
    .status-select:hover { border-color: var(--t-cyan); background-color: var(--t-s2); color: #fff; transform: translateY(-1px); }
    .status-select[data-status="In Progress"] { color: var(--t-cyan); background-color: rgba(0, 188, 212, 0.1); border-color: rgba(0, 188, 212, 0.2); }
    .status-select[data-status="Done"] { color: var(--t-lime); background-color: rgba(26, 255, 178, 0.08); border-color: rgba(26, 255, 178, 0.2); }
    .status-select[data-status="Blocked"] { color: var(--t-rose); background-color: rgba(255, 107, 107, 0.1); border-color: rgba(255, 107, 107, 0.2); }

    .pri-badge { font-size: 11px; font-weight: 800; text-transform: uppercase; width: 80px; text-align: center; border-radius: 6px; padding: 2px 0; background: rgba(255,255,255,0.03); color: var(--t-t2); }
    .pri-badge[data-pri="High"] { color: var(--t-rose); }
    .pri-badge[data-pri="Low"] { color: var(--t-violet); }

    .task-detail-panel { padding: 0 24px 24px; background: var(--t-s2); border-top: 1px solid var(--t-br); }
    .detail-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 40px; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 0 0 12px 12px; border: 1px solid var(--t-br); border-top: none; }
    .detail-section label { display: block; font-size: 10px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; }
    
    .subtask-list { display: flex; flex-direction: column; gap: 8px; }
    .subtask-item { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #fff; padding: 6px 10px; background: rgba(255,255,255,0.02); border: 1px solid transparent; border-radius: 8px; transition: all .2s; }
    .subtask-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
    .subtask-item input[type="checkbox"] { accent-color: var(--t-cyan); cursor: pointer; }
    .subtask-item .done { text-decoration: line-through; opacity: 0.5; flex: 1; }
    .subtask-item span { flex: 1; }
    .remove-st-btn { background: none; border: none; color: var(--t-rose); cursor: pointer; opacity: 0.4; font-size: 16px; padding: 0 4px; }
    .remove-st-btn:hover { opacity: 1; }

    .inline-add-st { display: flex; flex-direction: column; gap: 8px; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; }
    .inline-add-st textarea { background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 6px; padding: 10px; color: #fff; font-size: 12px; resize: vertical; min-height: 50px; outline: none; }
    .inline-add-st textarea:focus { border-color: var(--t-cyan); }
    .st-confirm-btn { align-self: flex-end; background: var(--t-cyan); color: #000; border: none; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer; transition: all .2s; }
    .st-confirm-btn:hover { background: #fff; transform: scale(1.02); }

    .submit-completion-btn { 
      width: 100%; margin-top: 15px; padding: 12px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #00bcd4, #00ff9d); color: #080808;
      font-weight: 800; font-size: 11px; text-transform: uppercase; cursor: pointer; 
      transition: all .2s; box-shadow: 0 4px 20px rgba(0, 255, 157, 0.2);
    }
    .submit-completion-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(0, 255, 157, 0.4); filter: brightness(1.1); }

    .comment-thread { display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px; max-height: 300px; overflow-y: auto; padding-right: 5px; }
    .comment { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border-left: 3px solid var(--t-br); }
    .comment.issue { border-left-color: var(--t-rose); background: rgba(255, 107, 107, 0.05); }
    .comment-meta { font-size: 10px; color: var(--t-t1); margin-bottom: 5px; }
    .comment-text { font-size: 13px; color: #eee; line-height: 1.4; }
    .issue-badge { background: var(--t-rose); color: #fff; font-size: 8px; padding: 1px 4px; border-radius: 4px; margin-left: 5px; font-weight: 900; }

    .add-comment { display: flex; gap: 8px; }
    .add-comment input { flex: 1; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 8px; padding: 10px 14px; color: #fff; font-size: 13px; outline: none; }
    .add-comment button { background: #fff; color: #000; border: none; padding: 0 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; }

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
  toastService = inject(ToastService);
  
  constructor() {
    effect(() => {
      const id = this.agencyService.selectedTaskId();
      if (id) {
        // Ensure we are on the tasks page
        this.page.set('tasks');
        
        this.expandedTasks.update(prev => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        
        setTimeout(() => {
          const el = document.querySelector(`[data-task-id="${id}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (el) (el as HTMLElement).style.boxShadow = '0 0 0 2px var(--t-cyan)';
          
          // Clear signal so it can be re-triggered for the same task
          this.agencyService.setSelectedTask(null);
        }, 100);
      }
    });
  }
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

  onSubtaskKeyDown(event: KeyboardEvent, task: Task, input: HTMLTextAreaElement) {
    if (event.shiftKey) return;
    event.preventDefault();
    this.addSubtasksToExisting(task, input);
  }

  addSubtasksToExisting(task: Task, input: HTMLTextAreaElement) {
    const text = input.value.trim();
    if (!text) return;
    
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    const newSTs = lines.map(line => ({ title: line, completed: false }));
    const subtasks = [...(task.subtasks || []), ...newSTs];
    
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
    this.toastService.success('KPIs saved successfully!');
  }

  completeTask(task: Task) {
    this.agencyService.updateTask(task.id, { status: 'Done' });
  }
}

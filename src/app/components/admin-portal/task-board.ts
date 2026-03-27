import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgencyService, Task, User } from '../../services/agency.service';

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="task-board-view">
      <header class="view-header">
        <div>
          <h1>Tasks</h1>
          <p>{{ filteredTasks().length }} active tasks across all clients</p>
        </div>
        <div class="header-actions">
           <input type="text" class="search-input" placeholder="Search tasks or clients..." [ngModel]="taskSearch()" (ngModelChange)="taskSearch.set($event)">
           
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
           <button class="action-btn" (click)="showAddTask.set(true)">+ Add Task</button>
           <button class="delete-all-btn" (click)="deleteAllTasks()">🗑️ Delete All</button>
        </div>
      </header>

      <div class="task-list">
        @for (task of filteredTasks(); track task.id) {
          <div class="task-card-wrapper">
            <div class="task-card" [class.overdue]="isOverdue(task)" (click)="toggleExpand(task.id)">
              <div class="task-info">
                <div class="task-title">{{ task.title }}</div>
                <div class="task-meta">
                   <span class="client-tag">📁 {{ getClientName(task.clientId) }}</span>
                   <span class="assignee-tag">→ {{ getAssigneeName(task.assigneeId) }}</span>
                   @if (task.subtasks && task.subtasks.length > 0) {
                     <span class="progress-tag">
                       📊 {{ getCompletedCount(task) }}/{{ task.subtasks.length }}
                     </span>
                   }
                   @if (task.comments && task.comments.length > 0) {
                     <span class="comment-count">💬 {{ task.comments.length }}</span>
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
              
              <div class="task-priority" [attr.data-pri]="task.priority">{{ task.priority }}</div>
              
              <div class="task-actions" (click)="$event.stopPropagation()">
                <button class="icon-btn" (click)="toggleExpand(task.id)" title="View Task Details">👁️</button>
                <button class="delete-btn-prof" (click)="agencyService.deleteTask(task.id)">Delete</button>
              </div>
            </div>
            
            @if (expandedTasks().has(task.id)) {
              <div class="task-detail-panel">
                <div class="detail-grid">
                  <!-- Subtasks Section -->
                  <div class="detail-section">
                    <label>Sub-tasks Checklist</label>
                    <div class="subtask-list">
                      @for (st of task.subtasks; track $index) {
                        <div class="subtask-item">
                          <input type="checkbox" [checked]="st.completed" (change)="toggleSubtask(task, $index)">
                          <span [class.done]="st.completed">{{ st.title }}</span>
                          <button class="remove-st-icon" (click)="removeSubtaskFromExisting(task, $index)">×</button>
                        </div>
                      }
                      <div class="subtask-add-inline">
                        <input type="text" #newST placeholder="Add sub-task..." (keydown.enter)="addSubtaskToExisting(task, newST)">
                        <button (click)="addSubtaskToExisting(task, newST)">+</button>
                      </div>
                      @if (!task.subtasks || task.subtasks.length === 0) {
                        <p class="empty-hint">No sub-tasks defined.</p>
                      }
                      @if (allSubtasksDone(task) && task.status !== 'Done') {
                          <button class="submit-completion-btn" (click)="submitTask(task)">
                            ✨ Submit Completion
                          </button>
                        }
                    </div>
                  </div>

                  <!-- Comments Section -->
                  <div class="detail-section">
                    <label>Activity & Comments</label>
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
                       <input type="text" #commentInput placeholder="Add a note or reply..." (keydown.enter)="addComment(task, commentInput)">
                       <button (click)="addComment(task, commentInput)">Send</button>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Add Task Modal -->
      @if (showAddTask()) {
        <div class="modal-overlay" (click)="showAddTask.set(false)">
          <div class="modal compact-modal task-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3>Create New Task</h3>
                <p class="auto-note">Break down the work into manageable steps.</p>
              </div>
              <button class="close-btn" (click)="showAddTask.set(false)">×</button>
            </div>
            <div class="modal-body">
              <div class="form-field full">
                <label>Task Title</label>
                <input type="text" [(ngModel)]="newTask.title" placeholder="e.g. Launch Spring Campaign">
              </div>
              
              <div class="form-field full">
                <label>Checklist (Sub-tasks)</label>
                <div class="subtask-input-group">
                  @for (st of newTaskSubtasks; track $index) {
                    <div class="st-row">
                      <span>• {{ st }}</span>
                      <button (click)="removeSubtaskFromNew($index)">×</button>
                    </div>
                  }
                  <div class="st-add">
                    <input type="text" #stInput placeholder="Add a step..." (keydown.enter)="addSubtaskToNew(stInput)">
                    <button (click)="addSubtaskToNew(stInput)">Add</button>
                  </div>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-field">
                  <label>Client</label>
                  <select [(ngModel)]="newTask.clientId">
                    <option [value]="null">Internal / General</option>
                    @for (c of agencyService.clients(); track c.id) {
                      <option [value]="c.id">{{ c.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-field">
                  <label>Assignee</label>
                  <select [(ngModel)]="newTask.assigneeId">
                    @for (u of managersAndStaff(); track u.id) {
                      <option [value]="u.id">{{ u.name }} ({{ u.role }})</option>
                    }
                  </select>
                </div>
                <div class="form-field">
                  <label>Priority</label>
                  <select [(ngModel)]="newTask.priority">
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Due Date</label>
                  <input type="date" [(ngModel)]="newTask.due">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="cancel-btn" (click)="showAddTask.set(false)">Cancel</button>
              <button class="save-btn" (click)="addTask()">Create Task</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .task-board-view { display: flex; flex-direction: column; }
    .view-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
    h1 { font-weight: 800; font-size: 24px; }
    .view-header p { color: var(--t-t1); font-size: 13px; margin-top: 2px; }

    .header-actions { display: flex; gap: 10px; align-items: center; }
    .search-input { background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 8px; padding: 10px 14px; color: #fff; font-size: 13px; outline: none; width: 220px; transition: border-color .2s; }
    .search-input:focus { border-color: var(--t-cyan); }
    .filter-select { background: var(--t-s1); border: 1px solid var(--t-br); color: #fff; padding: 9px 14px; border-radius: 8px; font-size: 13px; outline: none; cursor: pointer; }
    .action-btn { background: #fff; color: #111; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; transition: all .2s; }
    .action-btn:hover { background: var(--t-cyan); transform: translateY(-1px); }
    
    .delete-all-btn { background: rgba(255, 107, 107, 0.1); color: var(--t-rose); border: 1px solid rgba(255, 107, 107, 0.2); padding: 9px 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; transition: all .2s; }
    .delete-all-btn:hover { background: var(--t-rose); color: #fff; transform: translateY(-1px); }

    .task-list { display: flex; flex-direction: column; gap: 0px; }
    .task-card-wrapper { display: flex; flex-direction: column; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 12px; overflow: hidden; margin-bottom: 8px; }
    
    .task-card { 
      padding: 14px 20px; display: grid; grid-template-columns: 1fr 120px 80px 90px; gap: 20px; align-items: center; 
      transition: all .2s; background: transparent; border: none; border-radius: 0; cursor: pointer;
    }
    .task-card:hover { background: rgba(255,255,255,0.02); }
    .task-card.overdue { border-left: 3px solid var(--t-rose); padding-left: 17px; background: rgba(255, 107, 107, 0.02); }

    .status-indicator { display: none; } /* Replaced by border or integrated status */

    .task-info { min-width: 0; }
    .task-title { font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .task-meta { display: flex; gap: 14px; font-size: 11px; color: var(--t-t1); align-items: center; }
    .progress-tag { color: var(--t-cyan); font-weight: 700; }
    .comment-count { opacity: 0.6; }

    .task-due { font-size: 12px; color: var(--t-t2); width: 85px; text-align: right; }
    .overdue-text { color: var(--t-rose); font-weight: 700; }

    .status-select { 
      background: var(--t-s3); color: var(--t-t1); border: 1px solid transparent; border-radius: 20px; 
      padding: 5px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; cursor: pointer; outline: none; appearance: none; text-align: center;
      width: 110px; transition: all .2s;
    }
    .status-select:hover { border-color: var(--t-brL); background: var(--t-s2); color: #fff; }
    .status-select[data-status="In Progress"] { color: var(--t-cyan); background: rgba(0, 188, 212, 0.1); }
    .status-select[data-status="Done"] { color: var(--t-lime); background: rgba(26, 255, 178, 0.08); }
    .status-select[data-status="Blocked"] { color: var(--t-rose); background: rgba(255, 107, 107, 0.1); }

    .task-priority { font-size: 11px; font-weight: 800; text-transform: uppercase; width: 80px; text-align: center; border-radius: 6px; padding: 2px 0; background: rgba(255,255,255,0.03); color: var(--t-t2); }
    .task-priority[data-pri="High"] { color: var(--t-rose); background: rgba(255, 107, 107, 0.05); }
    .task-priority[data-pri="Medium"] { color: var(--t-cyan); background: rgba(0, 188, 212, 0.05); }

    .task-detail-panel { padding: 20px; background: var(--t-s2); border-top: 1px solid var(--t-br); }
    .detail-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; }
    .detail-section label { display: block; font-size: 10px; font-weight: 800; color: var(--t-t1); text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; }
    
    .subtask-list { display: flex; flex-direction: column; gap: 10px; }
    .subtask-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #eee; }
    .subtask-item input { width: 16px; height: 16px; accent-color: var(--t-cyan); }
    .subtask-item .done { text-decoration: line-through; opacity: 0.5; flex: 1; }
    .remove-st-icon { background: none; border: none; color: var(--t-t1); cursor: pointer; opacity: 0.3; font-size: 14px; }
    .remove-st-icon:hover { opacity: 1; color: var(--t-rose); }

    .subtask-add-inline { display: flex; gap: 8px; margin-top: 8px; }
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

    .comment-thread { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
    .comment { background: var(--t-s1); padding: 12px; border-radius: 10px; border-left: 3px solid var(--t-br); }
    .comment.issue { border-left-color: var(--t-rose); background: rgba(255, 107, 107, 0.05); }
    .comment-meta { font-size: 11px; color: var(--t-t1); margin-bottom: 4px; }
    .comment-text { font-size: 13px; line-height: 1.5; color: #fff; }
    .issue-badge { background: var(--t-rose); color: #fff; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 900; margin-left: 6px; }

    .add-comment { display: flex; gap: 10px; }
    .add-comment input { flex: 1; background: var(--t-s1); border: 1px solid var(--t-br); border-radius: 8px; padding: 10px; color: #fff; font-size: 13px; }
    .add-comment button { background: #fff; color: #000; border: none; padding: 0 16px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; }

    .empty-hint { font-size: 12px; color: var(--t-t2); font-style: italic; }

    .task-actions { display: flex; align-items: center; gap: 8px; }
    .icon-btn { background: rgba(255,255,255,0.05); border: 1px solid var(--t-br); border-radius: 6px; color: var(--t-t1); display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; font-size: 12px; cursor: pointer; transition: all .2s; }
    .icon-btn:hover { background: var(--t-s3); color: #fff; border-color: var(--t-brL); }
    
    .delete-btn-prof { 
      background: rgba(255, 107, 107, 0.05); border: 1px solid rgba(255, 107, 107, 0.2); 
      color: var(--t-rose); padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; 
      cursor: pointer; transition: all .2s;
    }
    .delete-btn-prof:hover { background: var(--t-rose); color: #fff; border-color: var(--t-rose); }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .modal.task-modal { background: var(--t-s1); border: 1px solid var(--t-brL); border-radius: 12px; width: 500px; padding: 24px; }
    
    .subtask-input-group { background: var(--t-s2); border: 1px solid var(--t-br); padding: 12px; border-radius: 8px; margin-bottom: 10px; }
    .st-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 6px; color: #eee; }
    .st-row button { background: none; border: none; color: var(--t-t1); cursor: pointer; font-size: 16px; }
    .st-add { display: flex; gap: 8px; margin-top: 10px; }
    .st-add input { flex: 1; background: var(--t-s1) !important; border-radius: 6px !important; padding: 8px !important; }
    .st-add button { background: var(--t-br); color: #fff; border: none; padding: 0 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }

    .modal-header { margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; }
    .modal-header h3 { font-size: 17px; font-weight: 800; color: #fff; }
    .auto-note { font-size: 11px; color: var(--t-t1); margin-top: 4px; }
    .close-btn { background: none; border: none; color: var(--t-t1); font-size: 22px; cursor: pointer; }
    .form-field { margin-bottom: 16px; }
    .form-field label { font-size: 10px; font-weight: 700; color: var(--t-t1); text-transform: uppercase; margin-bottom: 5px; display: block; }
    .form-field input, .form-field select { width: 100%; background: var(--t-s2); border: 1px solid var(--t-br); border-radius: 8px; padding: 10px; color: #fff; font-size: 13px; outline: none; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-footer { display: flex; gap: 12px; margin-top: 24px; }
    .cancel-btn { flex: 1; background: transparent; border: 1px solid var(--t-br); color: var(--t-t1); padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 12px; }
    .save-btn { flex: 2; background: #fff; color: #111; border: none; padding: 10px; border-radius: 8px; font-weight: 800; cursor: pointer; font-size: 12px; }
  `]
})
export class TaskBoard {
  agencyService = inject(AgencyService);

  taskSearch = signal('');
  filterPriority = signal('All');
  filterStatus = signal('All');
  expandedTasks = signal<Set<number>>(new Set());
  showAddTask = signal(false);

  currentUser = computed(() => this.agencyService.currentUser());
  newTask: any = { title: '', clientId: null, assigneeId: '', priority: 'Medium', due: '' };
  newTaskSubtasks: string[] = [];

  managersAndStaff = computed(() => this.agencyService.users().filter(u => u.role !== 'client'));

  filteredTasks = computed(() => {
    let tasks = this.agencyService.tasks();
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
    if (updated.has(id)) updated.delete(id);
    else updated.add(id);
    this.expandedTasks.set(updated);
  }

  isOverdue(task: Task) {
    if (task.status === 'Done') return false;
    const today = new Date().toISOString().slice(0, 10);
    return task.due < today;
  }

  updateStatus(id: number, newStatus: string) {
    this.agencyService.updateTask(id, { status: newStatus });
  }

  getClientName(id: number | null) {
    if (!id) return 'General';
    return this.agencyService.clients().find(c => c.id === id)?.name || 'Client';
  }

  getAssigneeName(id: string) {
    return this.agencyService.users().find(u => u.id === id)?.name || 'Unassigned';
  }

  getCompletedCount(task: Task) {
    return task.subtasks?.filter(s => s.completed).length || 0;
  }

  toggleSubtask(task: Task, index: number) {
    const subtasks = [...(task.subtasks || [])];
    subtasks[index] = { ...subtasks[index], completed: !subtasks[index].completed };
    this.agencyService.updateTask(task.id, { subtasks });
  }

  addComment(task: Task, input: HTMLInputElement) {
    const text = input.value.trim();
    if (!text) return;
    
    const comments = [...(task.comments || [])];
    comments.push({
      userId: this.currentUser()?.id || '',
      userName: this.currentUser()?.name || 'Admin',
      text,
      timestamp: new Date().toISOString(),
      type: 'note'
    });
    
    this.agencyService.updateTask(task.id, { comments });
    input.value = '';
  }

  allSubtasksDone(task: Task) {
    return task.subtasks && task.subtasks.length > 0 && task.subtasks.every(s => s.completed);
  }

  submitTask(task: Task) {
    this.agencyService.updateTask(task.id, { status: 'Done' });
  }

  addSubtaskToNew(input: HTMLInputElement) {
    const title = input.value.trim();
    if (title) {
      this.newTaskSubtasks = [...this.newTaskSubtasks, title];
      input.value = '';
    }
  }

  removeSubtaskFromNew(index: number) {
    this.newTaskSubtasks = this.newTaskSubtasks.filter((_, i) => i !== index);
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

  addTask() {
    if (!this.newTask.title) return;
    this.agencyService.addTask({
      ...this.newTask,
      status: 'To Do',
      type: 'custom',
      subtasks: this.newTaskSubtasks.map(t => ({ title: t, completed: false })),
      comments: []
    });
    this.showAddTask.set(false);
    this.newTask = { title: '', clientId: null, assigneeId: '', priority: 'Medium', due: '' };
    this.newTaskSubtasks = [];
  }

  async deleteAllTasks() {
    if (confirm('Are you sure you want to delete ALL tasks? This cannot be undone.')) {
      await this.agencyService.deleteAllTasks();
      this.expandedTasks.set(new Set());
    }
  }
}

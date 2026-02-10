// Data storage
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let budgetItems = JSON.parse(localStorage.getItem('budgetItems')) || [];
let habits = JSON.parse(localStorage.getItem('habits')) || [];
let projects = JSON.parse(localStorage.getItem('projects')) || [];
let currentView = 'todo';
let currentCategory = 'all';
let projectFilters = { app: 'all', status: 'all', devops: 'all' };
let viewModes = { todo: 'card', projects: 'card' };
let selectedTasks = new Set();
let selectedProjects = new Set();

function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('budgetItems', JSON.stringify(budgetItems));
    localStorage.setItem('habits', JSON.stringify(habits));
    localStorage.setItem('projects', JSON.stringify(projects));
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    const burger = document.getElementById('burgerMenu');
    
    menu.classList.toggle('active');
    overlay.classList.toggle('active');
    burger.classList.toggle('active');
}

function switchView(view) {
    currentView = view;
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(view + 'View').classList.add('active');
    
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.menu-item').classList.add('active');
    
    const titles = {
        todo: '📝 To-Do List',
        budget: '💰 Budget Tracker',
        habit: '🎯 Habit Tracker',
        projects: '📊 Projects'
    };
    document.getElementById('pageTitle').textContent = titles[view];
    
    toggleMenu();
    
    if (view === 'todo') renderTasks();
    else if (view === 'budget') renderBudget();
    else if (view === 'habit') renderHabits();
    else if (view === 'projects') renderProjects();
}

function toggleAdditional(type) {
    const content = document.getElementById(type + 'AdditionalContent');
    const toggle = document.getElementById(type + 'AdditionalToggle');
    content.classList.toggle('expanded');
    toggle.classList.toggle('expanded');
}

function toggleReasonField() {
    const devops = document.getElementById('projectDevOpsInput').value;
    const reasonGroup = document.getElementById('reasonGroup');
    reasonGroup.style.display = devops === 'yes' ? 'block' : 'none';
}

// View mode toggle
function toggleViewMode(section, mode) {
    viewModes[section] = mode;
    
    // Update button states
    document.getElementById(`${section}CardView`).classList.toggle('active', mode === 'card');
    document.getElementById(`${section}TableView`).classList.toggle('active', mode === 'table');
    
    // Toggle content visibility
    document.getElementById(`${section}Content`).classList.toggle('hidden', mode === 'table');
    document.getElementById(`${section}TableContent`).classList.toggle('hidden', mode === 'card');
    document.getElementById(`${section}Filters`).style.display = mode === 'card' ? 'block' : 'none';
    
    // Render appropriate view
    if (section === 'todo') {
        if (mode === 'table') renderTodoTable();
        else renderTasks();
    } else if (section === 'projects') {
        if (mode === 'table') renderProjectsTable();
        else renderProjects();
    }
}

// Multi-select functions for To-Do
function toggleTaskSelection(id) {
    if (selectedTasks.has(id)) {
        selectedTasks.delete(id);
    } else {
        selectedTasks.add(id);
    }
    updateTodoSelection();
}

function selectAllTodo() {
    const filtered = tasks.filter(task => {
        if (currentCategory !== 'all' && task.category !== currentCategory) return false;
        return true;
    });
    filtered.forEach(task => selectedTasks.add(task.id));
    updateTodoSelection();
}

function deselectAllTodo() {
    selectedTasks.clear();
    updateTodoSelection();
}

function updateTodoSelection() {
    document.getElementById('todoSelectedCount').textContent = `${selectedTasks.size} selected`;
    document.getElementById('todoBulkActions').classList.toggle('show', selectedTasks.size > 0);
    renderTodoTable();
}

function markTodoClosed() {
    if (selectedTasks.size === 0) return;
    
    selectedTasks.forEach(id => {
        const task = tasks.find(t => t.id === id);
        if (task) task.closed = true;
    });
    
    selectedTasks.clear();
    saveData();
    renderTodoTable();
    updateTodoSelection();
    showToast(`✅ ${selectedTasks.size} tasks marked as closed!`);
}

// Multi-select functions for Projects
function toggleProjectSelection(id) {
    if (selectedProjects.has(id)) {
        selectedProjects.delete(id);
    } else {
        selectedProjects.add(id);
    }
    updateProjectSelection();
}

function selectAllProjects() {
    const filtered = projects.filter(p => {
        if (projectFilters.app !== 'all' && p.application !== projectFilters.app) return false;
        if (projectFilters.status !== 'all' && p.status !== projectFilters.status) return false;
        if (projectFilters.devops !== 'all' && p.devopsUpdated !== projectFilters.devops) return false;
        return true;
    });
    filtered.forEach(project => selectedProjects.add(project.id));
    updateProjectSelection();
}

function deselectAllProjects() {
    selectedProjects.clear();
    updateProjectSelection();
}

function updateProjectSelection() {
    document.getElementById('projectsSelectedCount').textContent = `${selectedProjects.size} selected`;
    document.getElementById('projectsBulkActions').classList.toggle('show', selectedProjects.size > 0);
    renderProjectsTable();
}

function markProjectsClosed() {
    if (selectedProjects.size === 0) return;
    
    let count = 0;
    selectedProjects.forEach(id => {
        const project = projects.find(p => p.id === id);
        if (project) {
            project.closed = true;
            count++;
        }
    });
    
    selectedProjects.clear();
    saveData();
    renderProjectsTable();
    updateProjectSelection();
    showToast(`✅ ${count} projects marked as closed!`);
}

// Handle category change for work-related fields
function handleCategoryChange() {
    const category = document.getElementById('categorySelect').value;
    const workFields = document.getElementById('workFields');
    
    if (category === 'work') {
        workFields.classList.remove('hidden');
        updateProjectsList();
    } else {
        workFields.classList.add('hidden');
    }
}

// Update projects list based on selected application
function updateProjectsList() {
    const app = document.getElementById('todoAppSelect').value;
    const projectSelect = document.getElementById('todoProjectSelect');
    
    // Clear existing options
    projectSelect.innerHTML = '<option value="">Select Project</option>';
    
    if (!app) return;
    
    // Filter projects by application
    const filteredProjects = projects.filter(p => p.application === app);
    
    filteredProjects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = `#${project.projectId} - ${project.projectName}`;
        projectSelect.appendChild(option);
    });
}

// === TO-DO LIST FUNCTIONS ===
function addTask() {
    const input = document.getElementById('taskInput');
    const category = document.getElementById('categorySelect');
    const date = document.getElementById('dateInput');
    const recurring = document.getElementById('recurringSelect');
    const description = document.getElementById('descriptionInput');
    
    if (!input.value.trim()) return;
    
    const newTask = {
        id: Date.now(),
        text: input.value,
        category: category.value,
        dueDate: date.value || null,
        recurring: recurring.value,
        description: description.value || '',
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    // Add work-related fields if category is work
    if (category.value === 'work') {
        const app = document.getElementById('todoAppSelect').value;
        const projectId = document.getElementById('todoProjectSelect').value;
        
        if (app) newTask.application = app;
        if (projectId) {
            newTask.projectId = projectId;
            const project = projects.find(p => p.id == projectId);
            if (project) newTask.projectName = project.projectName;
        }
    }
    
    tasks.push(newTask);
    
    input.value = '';
    date.value = '';
    recurring.value = 'none';
    description.value = '';
    document.getElementById('todoAppSelect').value = '';
    document.getElementById('todoProjectSelect').innerHTML = '<option value="">Select Project</option>';
    
    saveData();
    renderTasks();
    showToast('✅ Task added!');
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    
    const workFieldsHtml = task.category === 'work' ? `
        <div class="input-group">
            <label>Application</label>
            <select id="editTaskApp" onchange="updateEditProjectsList()">
                <option value="">Select Application</option>
                <option value="indi" ${task.application === 'indi' ? 'selected' : ''}>Indi Claims</option>
                <option value="group" ${task.application === 'group' ? 'selected' : ''}>Group Claims</option>
                <option value="epic" ${task.application === 'epic' ? 'selected' : ''}>EPIC</option>
            </select>
        </div>
        <div class="input-group">
            <label>Project</label>
            <select id="editTaskProject">
                <option value="">Select Project</option>
            </select>
        </div>
    ` : '';
    
    content.innerHTML = `
        <h2 style="margin-bottom: 20px;">Edit Task</h2>
        <div class="input-group">
            <label>Task</label>
            <input type="text" id="editTaskText" value="${task.text}">
        </div>
        <div class="input-group">
            <label>Category</label>
            <select id="editTaskCategory" onchange="handleEditCategoryChange()">
                <option value="work" ${task.category === 'work' ? 'selected' : ''}>💼 Work</option>
                <option value="personal" ${task.category === 'personal' ? 'selected' : ''}>👤 Personal</option>
                <option value="family" ${task.category === 'family' ? 'selected' : ''}>👨‍👩‍👧 Family</option>
            </select>
        </div>
        <div id="editWorkFields">${workFieldsHtml}</div>
        <div class="input-group">
            <label>Due Date</label>
            <input type="date" id="editTaskDate" value="${task.dueDate || ''}">
        </div>
        <div class="input-group">
            <label>Description</label>
            <textarea id="editTaskDesc">${task.description || ''}</textarea>
        </div>
        <div class="input-group">
            <label>Frequency</label>
            <select id="editTaskRecurring">
                <option value="none" ${task.recurring === 'none' ? 'selected' : ''}>No Repeat</option>
                <option value="daily" ${task.recurring === 'daily' ? 'selected' : ''}>🔁 Every Day</option>
                <option value="weekly" ${task.recurring === 'weekly' ? 'selected' : ''}>📅 Every Week</option>
                <option value="biweekly" ${task.recurring === 'biweekly' ? 'selected' : ''}>📅 Every Alternate Week</option>
                <option value="monthly" ${task.recurring === 'monthly' ? 'selected' : ''}>📆 Every Month</option>
            </select>
        </div>
        <button class="save-btn" onclick="saveTaskEdit(${id})">Save Changes</button>
        <button class="cancel-btn" onclick="closeModal()">Cancel</button>
    `;
    
    modal.classList.add('active');
    
    // If work category, populate projects
    if (task.category === 'work' && task.application) {
        setTimeout(() => updateEditProjectsList(task.projectId), 100);
    }
}

function handleEditCategoryChange() {
    const category = document.getElementById('editTaskCategory').value;
    const workFieldsDiv = document.getElementById('editWorkFields');
    
    if (category === 'work') {
        workFieldsDiv.innerHTML = `
            <div class="input-group">
                <label>Application</label>
                <select id="editTaskApp" onchange="updateEditProjectsList()">
                    <option value="">Select Application</option>
                    <option value="indi">Indi Claims</option>
                    <option value="group">Group Claims</option>
                    <option value="epic">EPIC</option>
                </select>
            </div>
            <div class="input-group">
                <label>Project</label>
                <select id="editTaskProject">
                    <option value="">Select Project</option>
                </select>
            </div>
        `;
    } else {
        workFieldsDiv.innerHTML = '';
    }
}

function updateEditProjectsList(selectedProjectId) {
    const appSelect = document.getElementById('editTaskApp');
    if (!appSelect) return;
    
    const app = appSelect.value;
    const projectSelect = document.getElementById('editTaskProject');
    
    projectSelect.innerHTML = '<option value="">Select Project</option>';
    
    if (!app) return;
    
    const filteredProjects = projects.filter(p => p.application === app);
    
    filteredProjects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = `#${project.projectId} - ${project.projectName}`;
        if (selectedProjectId && project.id == selectedProjectId) {
            option.selected = true;
        }
        projectSelect.appendChild(option);
    });
}

function saveTaskEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    task.text = document.getElementById('editTaskText').value;
    task.category = document.getElementById('editTaskCategory').value;
    task.dueDate = document.getElementById('editTaskDate').value || null;
    task.description = document.getElementById('editTaskDesc').value;
    task.recurring = document.getElementById('editTaskRecurring').value;
    
    // Handle work fields
    if (task.category === 'work') {
        const appSelect = document.getElementById('editTaskApp');
        const projectSelect = document.getElementById('editTaskProject');
        
        if (appSelect && appSelect.value) {
            task.application = appSelect.value;
            
            if (projectSelect && projectSelect.value) {
                task.projectId = projectSelect.value;
                const project = projects.find(p => p.id == projectSelect.value);
                if (project) task.projectName = project.projectName;
            } else {
                delete task.projectId;
                delete task.projectName;
            }
        } else {
            delete task.application;
            delete task.projectId;
            delete task.projectName;
        }
    } else {
        delete task.application;
        delete task.projectId;
        delete task.projectName;
    }
    
    saveData();
    closeModal();
    renderTasks();
    showToast('✅ Task updated!');
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveData();
        renderTasks();
    }
}

function deleteTask(id) {
    if (confirm('Delete this task?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveData();
        renderTasks();
        showToast('🗑️ Task deleted!');
    }
}

function toggleExpand(id, type) {
    const element = document.getElementById(`expand-${type}-${id}`);
    const btn = document.getElementById(`btn-${type}-${id}`);
    if (element.classList.contains('expanded')) {
        element.classList.remove('expanded');
        btn.textContent = '▼';
    } else {
        element.classList.add('expanded');
        btn.textContent = '▲';
    }
}

function renderTasks() {
    const filtersHtml = `
        <button class="filter-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterByCategory('all')">All</button>
        <button class="filter-btn ${currentCategory === 'work' ? 'active' : ''}" onclick="filterByCategory('work')">💼 Work</button>
        <button class="filter-btn ${currentCategory === 'personal' ? 'active' : ''}" onclick="filterByCategory('personal')">👤 Personal</button>
        <button class="filter-btn ${currentCategory === 'family' ? 'active' : ''}" onclick="filterByCategory('family')">👨‍👩‍👧 Family</button>
    `;
    document.getElementById('todoFilters').innerHTML = filtersHtml;
    
    const active = tasks.filter(t => !t.completed).length;
    document.getElementById('stats').innerHTML = `<span class="stat-badge">${active} active</span>`;
    
    let filteredTasks = tasks.filter(task => {
        if (currentCategory !== 'all' && task.category !== currentCategory) return false;
        return true;
    });
    
    let html = '';
    if (filteredTasks.length === 0) {
        html = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 10px;">📝</div><div>No tasks yet</div></div>';
    } else {
        const categoryLabels = { work: '💼 Work', personal: '👤 Personal', family: '👨‍👩‍👧 Family' };
        const appLabels = { indi: 'Indi Claims', group: 'Group Claims', epic: 'EPIC' };
        
        filteredTasks.forEach(task => {
            const hasDetails = task.description || task.dueDate || task.recurring !== 'none' || task.application;
            html += `
                <div class="task">
                    <div class="item-header">
                        <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></div>
                        <div class="item-content">
                            <div class="item-text ${task.completed ? 'completed' : ''}">${task.text}</div>
                            <div class="item-meta">
                                <span class="badge category-${task.category}">${categoryLabels[task.category]}</span>
                                ${task.application ? `<span class="badge app-${task.application}">${appLabels[task.application]}</span>` : ''}
                                ${task.projectName ? `<span class="badge status-badge">${task.projectName}</span>` : ''}
                            </div>
                        </div>
                        <div class="item-actions">
                            ${hasDetails ? `<button class="btn-icon expand-btn" id="btn-task-${task.id}" onclick="toggleExpand(${task.id}, 'task')">▼</button>` : ''}
                            <button class="btn-icon edit-btn" onclick="editTask(${task.id})">✏️</button>
                            <button class="btn-icon delete-btn" onclick="deleteTask(${task.id})">🗑️</button>
                        </div>
                    </div>
                    ${hasDetails ? `
                        <div class="expandable-content" id="expand-task-${task.id}">
                            ${task.dueDate ? `<div class="detail-row"><span class="detail-label">Due Date:</span><span class="detail-value">${new Date(task.dueDate).toLocaleDateString()}</span></div>` : ''}
                            ${task.recurring !== 'none' ? `<div class="detail-row"><span class="detail-label">Recurring:</span><span class="detail-value">${task.recurring}</span></div>` : ''}
                            ${task.description ? `<div class="detail-row"><span class="detail-label">Description:</span><span class="detail-value">${task.description}</span></div>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        });
    }
    
    document.getElementById('todoContent').innerHTML = html;
}

function filterByCategory(category) {
    currentCategory = category;
    renderTasks();
}

// Render To-Do table view
function renderTodoTable() {
    let filteredTasks = tasks.filter(task => {
        if (currentCategory !== 'all' && task.category !== currentCategory) return false;
        return true;
    });
    
    const categoryLabels = { work: 'Work', personal: 'Personal', family: 'Family' };
    const appLabels = { indi: 'Indi Claims', group: 'Group Claims', epic: 'EPIC' };
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th class="checkbox-cell"><input type="checkbox" class="select-checkbox" onchange="if(this.checked) selectAllTodo(); else deselectAllTodo();"></th>
                    <th>Task</th>
                    <th>Category</th>
                    <th>Application</th>
                    <th>Project</th>
                    <th>Due Date</th>
                    <th>Recurring</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    if (filteredTasks.length === 0) {
        html += '<tr><td colspan="10" style="text-align: center; padding: 40px;">No tasks yet</td></tr>';
    } else {
        filteredTasks.forEach(task => {
            const isSelected = selectedTasks.has(task.id);
            html += `
                <tr class="${isSelected ? 'selected' : ''}">
                    <td class="checkbox-cell">
                        <input type="checkbox" class="select-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleTaskSelection(${task.id})">
                    </td>
                    <td>${task.text}</td>
                    <td>${categoryLabels[task.category]}</td>
                    <td>${task.application ? appLabels[task.application] : '-'}</td>
                    <td>${task.projectName || '-'}</td>
                    <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
                    <td>${task.recurring !== 'none' ? task.recurring : '-'}</td>
                    <td style="max-width: 200px; white-space: normal;">${task.description || '-'}</td>
                    <td>${task.closed ? '<span class="status-closed">Closed</span>' : (task.completed ? 'Completed' : 'Active')}</td>
                    <td>
                        <button class="btn-icon edit-btn" onclick="editTask(${task.id})" style="margin-right: 5px;">✏️</button>
                        <button class="btn-icon delete-btn" onclick="deleteTask(${task.id})">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }
    
    html += '</tbody></table>';
    document.getElementById('todoTableContent').innerHTML = html;
}

// === BUDGET FUNCTIONS ===
function addBudgetItem() {
    const desc = document.getElementById('budgetDescInput');
    const amount = document.getElementById('budgetAmountInput');
    const type = document.getElementById('budgetTypeSelect');
    const category = document.getElementById('budgetCategorySelect');
    const date = document.getElementById('budgetDateInput');
    
    if (!desc.value.trim() || !amount.value || !date.value) {
        showToast('⚠️ Please fill all fields!');
        return;
    }
    
    budgetItems.push({
        id: Date.now(),
        description: desc.value,
        amount: parseFloat(amount.value),
        type: type.value,
        category: category.value,
        date: date.value,
        createdAt: new Date().toISOString()
    });
    
    desc.value = '';
    amount.value = '';
    
    saveData();
    renderBudget();
    showToast('✅ Transaction added!');
}

function editBudgetItem(id) {
    const item = budgetItems.find(b => b.id === id);
    if (!item) return;
    
    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    
    content.innerHTML = `
        <h2 style="margin-bottom: 20px;">Edit Transaction</h2>
        <div class="input-group">
            <label>Description</label>
            <input type="text" id="editBudgetDesc" value="${item.description}">
        </div>
        <div class="input-group">
            <label>Amount</label>
            <input type="number" id="editBudgetAmount" value="${item.amount}" step="0.01">
        </div>
        <div class="input-group">
            <label>Type</label>
            <select id="editBudgetType">
                <option value="income" ${item.type === 'income' ? 'selected' : ''}>💰 Income</option>
                <option value="expense" ${item.type === 'expense' ? 'selected' : ''}>💸 Expense</option>
            </select>
        </div>
        <div class="input-group">
            <label>Category</label>
            <select id="editBudgetCategory">
                <option value="salary" ${item.category === 'salary' ? 'selected' : ''}>💼 Salary</option>
                <option value="food" ${item.category === 'food' ? 'selected' : ''}>🍔 Food</option>
                <option value="transport" ${item.category === 'transport' ? 'selected' : ''}>🚗 Transport</option>
                <option value="bills" ${item.category === 'bills' ? 'selected' : ''}>📄 Bills</option>
                <option value="entertainment" ${item.category === 'entertainment' ? 'selected' : ''}>🎬 Entertainment</option>
                <option value="shopping" ${item.category === 'shopping' ? 'selected' : ''}>🛍️ Shopping</option>
                <option value="health" ${item.category === 'health' ? 'selected' : ''}>💊 Health</option>
                <option value="other" ${item.category === 'other' ? 'selected' : ''}>📌 Other</option>
            </select>
        </div>
        <div class="input-group">
            <label>Date</label>
            <input type="date" id="editBudgetDate" value="${item.date}">
        </div>
        <button class="save-btn" onclick="saveBudgetEdit(${id})">Save Changes</button>
        <button class="cancel-btn" onclick="closeModal()">Cancel</button>
    `;
    
    modal.classList.add('active');
}

function saveBudgetEdit(id) {
    const item = budgetItems.find(b => b.id === id);
    if (!item) return;
    
    item.description = document.getElementById('editBudgetDesc').value;
    item.amount = parseFloat(document.getElementById('editBudgetAmount').value);
    item.type = document.getElementById('editBudgetType').value;
    item.category = document.getElementById('editBudgetCategory').value;
    item.date = document.getElementById('editBudgetDate').value;
    
    saveData();
    closeModal();
    renderBudget();
    showToast('✅ Transaction updated!');
}

function deleteBudgetItem(id) {
    if (confirm('Delete this transaction?')) {
        budgetItems = budgetItems.filter(item => item.id !== id);
        saveData();
        renderBudget();
        showToast('🗑️ Transaction deleted!');
    }
}

function renderBudget() {
    const income = budgetItems.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0);
    const expense = budgetItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);
    const balance = income - expense;
    
    document.getElementById('budgetSummary').innerHTML = `
        <div class="summary-row">
            <span>Total Income</span>
            <span>$${income.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Total Expenses</span>
            <span>$${expense.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span>Balance</span>
            <span>$${balance.toFixed(2)}</span>
        </div>
    `;
    
    document.getElementById('stats').innerHTML = `<span class="stat-badge">Balance: $${balance.toFixed(2)}</span>`;
    
    const sorted = [...budgetItems].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = '';
    if (sorted.length === 0) {
        html = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 10px;">💰</div><div>No transactions yet</div></div>';
    } else {
        sorted.forEach(item => {
            html += `
                <div class="budget-item">
                    <div class="item-header">
                        <div class="item-content">
                            <div class="item-text">${item.description}</div>
                            <div class="item-meta">
                                <span class="badge">${item.category}</span>
                                <span class="badge">${new Date(item.date).toLocaleDateString()}</span>
                                <span style="font-weight: 600; color: ${item.type === 'income' ? '#2e7d32' : '#c62828'}">${item.type === 'income' ? '+' : '-'}$${item.amount.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon edit-btn" onclick="editBudgetItem(${item.id})">✏️</button>
                            <button class="btn-icon delete-btn" onclick="deleteBudgetItem(${item.id})">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    document.getElementById('budgetContent').innerHTML = html;
}

// === HABIT FUNCTIONS ===
function addHabit() {
    const input = document.getElementById('habitInput');
    const category = document.getElementById('habitCategorySelect');
    const goal = document.getElementById('habitGoalSelect');
    
    if (!input.value.trim()) return;
    
    habits.push({
        id: Date.now(),
        name: input.value,
        category: category.value,
        goal: goal.value,
        streak: 0,
        lastCompleted: null,
        history: [],
        createdAt: new Date().toISOString()
    });
    
    input.value = '';
    
    saveData();
    renderHabits();
    showToast('✅ Habit added!');
}

function editHabit(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    
    content.innerHTML = `
        <h2 style="margin-bottom: 20px;">Edit Habit</h2>
        <div class="input-group">
            <label>Habit Name</label>
            <input type="text" id="editHabitName" value="${habit.name}">
        </div>
        <div class="input-group">
            <label>Category</label>
            <select id="editHabitCategory">
                <option value="health" ${habit.category === 'health' ? 'selected' : ''}>💪 Health</option>
                <option value="productivity" ${habit.category === 'productivity' ? 'selected' : ''}>⚡ Productivity</option>
                <option value="learning" ${habit.category === 'learning' ? 'selected' : ''}>📚 Learning</option>
                <option value="mindfulness" ${habit.category === 'mindfulness' ? 'selected' : ''}>🧘 Mindfulness</option>
                <option value="other" ${habit.category === 'other' ? 'selected' : ''}>📌 Other</option>
            </select>
        </div>
        <div class="input-group">
            <label>Goal</label>
            <select id="editHabitGoal">
                <option value="daily" ${habit.goal === 'daily' ? 'selected' : ''}>Daily</option>
                <option value="weekly" ${habit.goal === 'weekly' ? 'selected' : ''}>3x per week</option>
                <option value="custom" ${habit.goal === 'custom' ? 'selected' : ''}>Custom</option>
            </select>
        </div>
        <button class="save-btn" onclick="saveHabitEdit(${id})">Save Changes</button>
        <button class="cancel-btn" onclick="closeModal()">Cancel</button>
    `;
    
    modal.classList.add('active');
}

function saveHabitEdit(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    habit.name = document.getElementById('editHabitName').value;
    habit.category = document.getElementById('editHabitCategory').value;
    habit.goal = document.getElementById('editHabitGoal').value;
    
    saveData();
    closeModal();
    renderHabits();
    showToast('✅ Habit updated!');
}

function toggleHabit(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    const today = new Date().toISOString().split('T')[0];
    const alreadyDone = habit.history.includes(today);
    
    if (alreadyDone) {
        habit.history = habit.history.filter(d => d !== today);
        habit.streak = Math.max(0, habit.streak - 1);
    } else {
        habit.history.push(today);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (habit.lastCompleted === yesterdayStr || habit.streak === 0) {
            habit.streak++;
        } else {
            habit.streak = 1;
        }
        
        habit.lastCompleted = today;
    }
    
    saveData();
    renderHabits();
}

function deleteHabit(id) {
    if (confirm('Delete this habit?')) {
        habits = habits.filter(h => h.id !== id);
        saveData();
        renderHabits();
        showToast('🗑️ Habit deleted!');
    }
}

function renderHabits() {
    const totalHabits = habits.length;
    const todayCompleted = habits.filter(h => {
        const today = new Date().toISOString().split('T')[0];
        return h.history.includes(today);
    }).length;
    
    document.getElementById('stats').innerHTML = `
        <span class="stat-badge">${totalHabits} habits</span>
        <span class="stat-badge">${todayCompleted} done today</span>
    `;
    
    let html = '';
    if (habits.length === 0) {
        html = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 10px;">🎯</div><div>No habits yet</div></div>';
    } else {
        const categoryLabels = {
            health: '💪 Health',
            productivity: '⚡ Productivity',
            learning: '📚 Learning',
            mindfulness: '🧘 Mindfulness',
            other: '📌 Other'
        };
        
        habits.forEach(habit => {
            const today = new Date().toISOString().split('T')[0];
            const isDoneToday = habit.history.includes(today);
            
            html += `
                <div class="habit-item">
                    <div class="item-header">
                        <div class="habit-checkbox ${isDoneToday ? 'checked' : ''}" onclick="toggleHabit(${habit.id})"></div>
                        <div class="item-content">
                            <div class="item-text">${habit.name}</div>
                            <div class="item-meta">
                                <span class="badge">${categoryLabels[habit.category]}</span>
                                <span class="badge" style="background: #ffd54f; color: #f57f17;">🔥 ${habit.streak} day streak</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon edit-btn" onclick="editHabit(${habit.id})">✏️</button>
                            <button class="btn-icon delete-btn" onclick="deleteHabit(${habit.id})">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    document.getElementById('habitContent').innerHTML = html;
}

// === PROJECTS FUNCTIONS ===
function addProject() {
    const app = document.getElementById('projectAppInput');
    const projectId = document.getElementById('projectIdInput');
    const name = document.getElementById('projectNameInput');
    const status = document.getElementById('projectStatusInput');
    const devops = document.getElementById('projectDevOpsInput');
    const reason = document.getElementById('projectReasonInput');
    const remarks = document.getElementById('projectRemarksInput');
    
    if (!projectId.value || !name.value.trim()) {
        showToast('⚠️ Please fill Project ID and Name!');
        return;
    }
    
    projects.push({
        id: Date.now(),
        application: app.value,
        projectId: parseInt(projectId.value),
        projectName: name.value,
        status: status.value,
        devopsUpdated: devops.value,
        reason: devops.value === 'yes' ? reason.value : '',
        remarks: remarks.value,
        createdAt: new Date().toISOString()
    });
    
    projectId.value = '';
    name.value = '';
    reason.value = '';
    remarks.value = '';
    devops.value = 'no';
    status.selectedIndex = 0;
    toggleReasonField();
    
    saveData();
    renderProjects();
    showToast('✅ Project added!');
}

function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    const modal = document.getElementById('editModal');
    const content = document.getElementById('editModalContent');
    
    content.innerHTML = `
        <h2 style="margin-bottom: 20px;">Edit Project</h2>
        <div class="input-group">
            <label>Application</label>
            <select id="editProjectApp">
                <option value="indi" ${project.application === 'indi' ? 'selected' : ''}>Indi Claims</option>
                <option value="group" ${project.application === 'group' ? 'selected' : ''}>Group Claims</option>
                <option value="epic" ${project.application === 'epic' ? 'selected' : ''}>EPIC</option>
            </select>
        </div>
        <div class="input-group">
            <label>Project ID</label>
            <input type="number" id="editProjectId" value="${project.projectId}">
        </div>
        <div class="input-group">
            <label>Project Name</label>
            <input type="text" id="editProjectName" value="${project.projectName}">
        </div>
        <div class="input-group">
            <label>Status</label>
            <select id="editProjectStatus" size="3">
                <option value="requirement" ${project.status === 'requirement' ? 'selected' : ''}>Requirement</option>
                <option value="rab" ${project.status === 'rab' ? 'selected' : ''}>RAB Approved</option>
                <option value="analysis" ${project.status === 'analysis' ? 'selected' : ''}>Analysis</option>
                <option value="cab" ${project.status === 'cab' ? 'selected' : ''}>CAB Approved</option>
                <option value="development" ${project.status === 'development' ? 'selected' : ''}>Development</option>
                <option value="uat" ${project.status === 'uat' ? 'selected' : ''}>UAT</option>
                <option value="release" ${project.status === 'release' ? 'selected' : ''}>Release</option>
                <option value="warranty" ${project.status === 'warranty' ? 'selected' : ''}>Warranty</option>
            </select>
        </div>
        <div class="input-group">
            <label>DevOps Status Updated</label>
            <select id="editProjectDevOps" onchange="toggleEditReasonField()">
                <option value="no" ${project.devopsUpdated === 'no' ? 'selected' : ''}>No</option>
                <option value="yes" ${project.devopsUpdated === 'yes' ? 'selected' : ''}>Yes</option>
            </select>
        </div>
        <div class="input-group" id="editReasonGroup" style="display: ${project.devopsUpdated === 'yes' ? 'block' : 'none'};">
            <label>Reason</label>
            <textarea id="editProjectReason">${project.reason || ''}</textarea>
        </div>
        <div class="input-group">
            <label>Current Remarks</label>
            <textarea id="editProjectRemarks">${project.remarks || ''}</textarea>
        </div>
        <button class="save-btn" onclick="saveProjectEdit(${id})">Save Changes</button>
        <button class="cancel-btn" onclick="closeModal()">Cancel</button>
    `;
    
    modal.classList.add('active');
}

function toggleEditReasonField() {
    const devops = document.getElementById('editProjectDevOps').value;
    const reasonGroup = document.getElementById('editReasonGroup');
    reasonGroup.style.display = devops === 'yes' ? 'block' : 'none';
}

function saveProjectEdit(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    
    project.application = document.getElementById('editProjectApp').value;
    project.projectId = parseInt(document.getElementById('editProjectId').value);
    project.projectName = document.getElementById('editProjectName').value;
    project.status = document.getElementById('editProjectStatus').value;
    project.devopsUpdated = document.getElementById('editProjectDevOps').value;
    project.reason = project.devopsUpdated === 'yes' ? document.getElementById('editProjectReason').value : '';
    project.remarks = document.getElementById('editProjectRemarks').value;
    
    saveData();
    closeModal();
    renderProjects();
    showToast('✅ Project updated!');
}

function deleteProject(id) {
    if (confirm('Delete this project?')) {
        projects = projects.filter(p => p.id !== id);
        saveData();
        renderProjects();
        showToast('🗑️ Project deleted!');
    }
}

function filterProjects(filterType, value) {
    projectFilters[filterType] = value;
    renderProjects();
}

function renderProjects() {
    // Render filters with Status filter
    const filtersHtml = `
        <button class="filter-btn ${projectFilters.app === 'all' ? 'active' : ''}" onclick="filterProjects('app', 'all')">All Apps</button>
        <button class="filter-btn ${projectFilters.app === 'indi' ? 'active' : ''}" onclick="filterProjects('app', 'indi')">Indi Claims</button>
        <button class="filter-btn ${projectFilters.app === 'group' ? 'active' : ''}" onclick="filterProjects('app', 'group')">Group Claims</button>
        <button class="filter-btn ${projectFilters.app === 'epic' ? 'active' : ''}" onclick="filterProjects('app', 'epic')">EPIC</button>
        <br>
        <button class="filter-btn ${projectFilters.status === 'all' ? 'active' : ''}" onclick="filterProjects('status', 'all')">All Status</button>
        <button class="filter-btn ${projectFilters.status === 'requirement' ? 'active' : ''}" onclick="filterProjects('status', 'requirement')">Requirement</button>
        <button class="filter-btn ${projectFilters.status === 'development' ? 'active' : ''}" onclick="filterProjects('status', 'development')">Development</button>
        <button class="filter-btn ${projectFilters.status === 'uat' ? 'active' : ''}" onclick="filterProjects('status', 'uat')">UAT</button>
        <button class="filter-btn ${projectFilters.status === 'release' ? 'active' : ''}" onclick="filterProjects('status', 'release')">Release</button>
        <br>
        <button class="filter-btn ${projectFilters.devops === 'all' ? 'active' : ''}" onclick="filterProjects('devops', 'all')">All DevOps</button>
        <button class="filter-btn ${projectFilters.devops === 'yes' ? 'active' : ''}" onclick="filterProjects('devops', 'yes')">DevOps: Yes</button>
        <button class="filter-btn ${projectFilters.devops === 'no' ? 'active' : ''}" onclick="filterProjects('devops', 'no')">DevOps: No</button>
    `;
    document.getElementById('projectsFilters').innerHTML = filtersHtml;
    
    document.getElementById('stats').innerHTML = `<span class="stat-badge">${projects.length} projects</span>`;
    
    // Filter projects
    let filtered = projects.filter(p => {
        if (projectFilters.app !== 'all' && p.application !== projectFilters.app) return false;
        if (projectFilters.status !== 'all' && p.status !== projectFilters.status) return false;
        if (projectFilters.devops !== 'all' && p.devopsUpdated !== projectFilters.devops) return false;
        return true;
    });
    
    let html = '';
    if (filtered.length === 0) {
        html = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 10px;">📊</div><div>No projects yet</div></div>';
    } else {
        const appLabels = { indi: 'Indi Claims', group: 'Group Claims', epic: 'EPIC' };
        const statusLabels = {
            requirement: 'Requirement',
            rab: 'RAB Approved',
            analysis: 'Analysis',
            cab: 'CAB Approved',
            development: 'Development',
            uat: 'UAT',
            release: 'Release',
            warranty: 'Warranty'
        };
        
        filtered.forEach(project => {
            html += `
                <div class="project-item">
                    <div class="item-header">
                        <div class="item-content">
                            <div class="item-text"><strong>#${project.projectId}</strong> - ${project.projectName}</div>
                            <div class="item-meta">
                                <span class="badge app-${project.application}">${appLabels[project.application]}</span>
                                <span class="badge status-badge">${statusLabels[project.status]}</span>
                                <span class="badge devops-${project.devopsUpdated}">DevOps: ${project.devopsUpdated === 'yes' ? 'Yes' : 'No'}</span>
                                ${project.closed ? '<span class="status-closed">Closed</span>' : ''}
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon expand-btn" id="btn-project-${project.id}" onclick="toggleExpand(${project.id}, 'project')">▼</button>
                            <button class="btn-icon edit-btn" onclick="editProject(${project.id})">✏️</button>
                            <button class="btn-icon delete-btn" onclick="deleteProject(${project.id})">🗑️</button>
                        </div>
                    </div>
                    <div class="expandable-content" id="expand-project-${project.id}">
                        <div class="detail-row"><span class="detail-label">Application:</span><span class="detail-value">${appLabels[project.application]}</span></div>
                        <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value">${statusLabels[project.status]}</span></div>
                        <div class="detail-row"><span class="detail-label">DevOps Updated:</span><span class="detail-value">${project.devopsUpdated === 'yes' ? 'Yes' : 'No'}</span></div>
                        ${project.reason ? `<div class="detail-row"><span class="detail-label">Reason:</span><span class="detail-value">${project.reason}</span></div>` : ''}
                        ${project.remarks ? `<div class="detail-row"><span class="detail-label">Remarks:</span><span class="detail-value">${project.remarks}</span></div>` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    document.getElementById('projectsContent').innerHTML = html;
}

// Render Projects table view
function renderProjectsTable() {
    let filtered = projects.filter(p => {
        if (projectFilters.app !== 'all' && p.application !== projectFilters.app) return false;
        if (projectFilters.status !== 'all' && p.status !== projectFilters.status) return false;
        if (projectFilters.devops !== 'all' && p.devopsUpdated !== projectFilters.devops) return false;
        return true;
    });
    
    const appLabels = { indi: 'Indi Claims', group: 'Group Claims', epic: 'EPIC' };
    const statusLabels = {
        requirement: 'Requirement',
        rab: 'RAB Approved',
        analysis: 'Analysis',
        cab: 'CAB Approved',
        development: 'Development',
        uat: 'UAT',
        release: 'Release',
        warranty: 'Warranty'
    };
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th class="checkbox-cell"><input type="checkbox" class="select-checkbox" onchange="if(this.checked) selectAllProjects(); else deselectAllProjects();"></th>
                    <th>Project ID</th>
                    <th>Project Name</th>
                    <th>Application</th>
                    <th>Status</th>
                    <th>DevOps Updated</th>
                    <th>Reason</th>
                    <th>Remarks</th>
                    <th>Closed</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    if (filtered.length === 0) {
        html += '<tr><td colspan="10" style="text-align: center; padding: 40px;">No projects yet</td></tr>';
    } else {
        filtered.forEach(project => {
            const isSelected = selectedProjects.has(project.id);
            html += `
                <tr class="${isSelected ? 'selected' : ''}">
                    <td class="checkbox-cell">
                        <input type="checkbox" class="select-checkbox" ${isSelected ? 'checked' : ''} onchange="toggleProjectSelection(${project.id})">
                    </td>
                    <td>#${project.projectId}</td>
                    <td>${project.projectName}</td>
                    <td>${appLabels[project.application]}</td>
                    <td>${statusLabels[project.status]}</td>
                    <td>${project.devopsUpdated === 'yes' ? 'Yes' : 'No'}</td>
                    <td style="max-width: 200px; white-space: normal;">${project.reason || '-'}</td>
                    <td style="max-width: 250px; white-space: normal;">${project.remarks || '-'}</td>
                    <td>${project.closed ? '<span class="status-closed">Yes</span>' : 'No'}</td>
                    <td>
                        <button class="btn-icon edit-btn" onclick="editProject(${project.id})" style="margin-right: 5px;">✏️</button>
                        <button class="btn-icon delete-btn" onclick="deleteProject(${project.id})">🗑️</button>
                    </td>
                </tr>
            `;
        });
    }
    
    html += '</tbody></table>';
    document.getElementById('projectsTableContent').innerHTML = html;
}

// === EXPORT/IMPORT FUNCTIONS ===
function exportData(type) {
    let data, filename;
    
    if (type === 'todo') {
        if (tasks.length === 0) { showToast('⚠️ No tasks to export!'); return; }
        data = tasks;
        filename = 'tasks-backup';
    } else if (type === 'budget') {
        if (budgetItems.length === 0) { showToast('⚠️ No transactions to export!'); return; }
        data = budgetItems;
        filename = 'budget-backup';
    } else if (type === 'habit') {
        if (habits.length === 0) { showToast('⚠️ No habits to export!'); return; }
        data = habits;
        filename = 'habits-backup';
    } else if (type === 'projects') {
        if (projects.length === 0) { showToast('⚠️ No projects to export!'); return; }
        data = projects;
        filename = 'projects-backup';
    }
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    const date = new Date().toISOString().split('T')[0];
    link.download = `${filename}-${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✅ Backup saved!');
}

function importData(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedData)) {
                showToast('❌ Invalid backup file!');
                return;
            }
            
            const shouldReplace = confirm(
                `Found ${importedData.length} items in backup.\n\n` +
                `OK = Replace\nCancel = Merge`
            );
            
            if (type === 'todo') {
                tasks = shouldReplace ? importedData : [...tasks, ...importedData];
                renderTasks();
            } else if (type === 'budget') {
                budgetItems = shouldReplace ? importedData : [...budgetItems, ...importedData];
                renderBudget();
            } else if (type === 'habit') {
                habits = shouldReplace ? importedData : [...habits, ...importedData];
                renderHabits();
            } else if (type === 'projects') {
                projects = shouldReplace ? importedData : [...projects, ...importedData];
                renderProjects();
            }
            
            saveData();
            showToast(`✅ Restored ${importedData.length} items!`);
        } catch (error) {
            showToast('❌ Error reading file!');
        }
    };
    
    reader.readAsText(file);
    event.target.value = '';
}

function closeModal() {
    document.getElementById('editModal').classList.remove('active');
}

// Initialize
document.getElementById('dateInput').min = new Date().toISOString().split('T')[0];
document.getElementById('budgetDateInput').value = new Date().toISOString().split('T')[0];

// Initialize category change handler
handleCategoryChange();

// Fix status dropdown behavior - show 3 items, scroll for more, return to normal after selection
document.addEventListener('DOMContentLoaded', function() {
    const statusSelects = document.querySelectorAll('#projectStatusInput, #editProjectStatus');
    statusSelects.forEach(select => {
        if (select) {
            select.addEventListener('change', function() {
                this.removeAttribute('size');
            });
            select.addEventListener('blur', function() {
                this.removeAttribute('size');
            });
        }
    });
});

renderTasks();

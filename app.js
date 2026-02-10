// Data storage
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let budgetItems = JSON.parse(localStorage.getItem('budgetItems')) || [];
let habits = JSON.parse(localStorage.getItem('habits')) || [];
let currentView = 'todo';
let currentCategory = 'all';
let deferredPrompt;

// PWA Install
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').classList.add('show');
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showToast('✅ App installed successfully!');
            }
            deferredPrompt = null;
            document.getElementById('installPrompt').classList.remove('show');
        });
    }
}

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
        console.log('Service Worker registered');
    });
}

function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('budgetItems', JSON.stringify(budgetItems));
    localStorage.setItem('habits', JSON.stringify(habits));
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
        habit: '🎯 Habit Tracker'
    };
    document.getElementById('pageTitle').textContent = titles[view];
    
    toggleMenu();
    
    if (view === 'todo') renderTasks();
    else if (view === 'budget') renderBudget();
    else if (view === 'habit') renderHabits();
}

function toggleAdditional(type) {
    const content = document.getElementById(type + 'AdditionalContent');
    const toggle = document.getElementById(type + 'AdditionalToggle');
    content.classList.toggle('expanded');
    toggle.classList.toggle('expanded');
}

// === TO-DO LIST FUNCTIONS ===
function addTask() {
    const input = document.getElementById('taskInput');
    const category = document.getElementById('categorySelect');
    const date = document.getElementById('dateInput');
    const recurring = document.getElementById('recurringSelect');
    const description = document.getElementById('descriptionInput');
    
    if (!input.value.trim()) return;
    
    tasks.push({
        id: Date.now(),
        text: input.value,
        category: category.value,
        dueDate: date.value || null,
        recurring: recurring.value,
        description: description.value || '',
        completed: false,
        createdAt: new Date().toISOString()
    });
    
    input.value = '';
    date.value = '';
    recurring.value = 'none';
    description.value = '';
    
    saveData();
    renderTasks();
    showToast('✅ Task added!');
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        if (task.completed && task.recurring !== 'none') {
            createNextRecurringTask(task);
        }
        saveData();
        renderTasks();
    }
}

function createNextRecurringTask(completedTask) {
    if (!completedTask.dueDate) return;
    
    const nextDate = new Date(completedTask.dueDate);
    
    switch(completedTask.recurring) {
        case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'biweekly': nextDate.setDate(nextDate.getDate() + 14); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
    }
    
    tasks.push({
        id: Date.now(),
        text: completedTask.text,
        category: completedTask.category,
        dueDate: nextDate.toISOString().split('T')[0],
        recurring: completedTask.recurring,
        description: completedTask.description,
        completed: false,
        createdAt: new Date().toISOString()
    });
    
    saveData();
    showToast('🔁 Next recurring task created!');
}

function deleteTask(id) {
    if (confirm('Delete this task?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveData();
        renderTasks();
        showToast('🗑️ Task deleted!');
    }
}

function toggleTaskDescription(taskId) {
    const descElement = document.getElementById(`desc-${taskId}`);
    const btnElement = document.getElementById(`btn-${taskId}`);
    
    if (descElement.classList.contains('expanded')) {
        descElement.classList.remove('expanded');
        btnElement.textContent = '▼';
    } else {
        descElement.classList.add('expanded');
        btnElement.textContent = '▲';
    }
}

function isToday(date) {
    if (!date) return false;
    const today = new Date();
    const taskDate = new Date(date);
    return today.toDateString() === taskDate.toDateString();
}

function isTomorrow(date) {
    if (!date) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const taskDate = new Date(date);
    return tomorrow.toDateString() === taskDate.toDateString();
}

function isOverdue(date) {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate < today;
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
    const today = tasks.filter(t => isToday(t.dueDate) && !t.completed).length;
    const overdue = tasks.filter(t => isOverdue(t.dueDate) && !t.completed).length;
    
    let statsHtml = `<span class="stat-badge">${active} active</span>`;
    if (today > 0) statsHtml += `<span class="stat-badge" style="background: #ffa726;">${today} today</span>`;
    if (overdue > 0) statsHtml += `<span class="stat-badge" style="background: #ef5350;">${overdue} overdue</span>`;
    document.getElementById('stats').innerHTML = statsHtml;
    
    let filteredTasks = tasks.filter(task => {
        if (currentCategory !== 'all' && task.category !== currentCategory) return false;
        return true;
    });
    
    const grouped = {};
    filteredTasks.forEach(task => {
        let key;
        if (!task.dueDate) {
            key = 'No Due Date';
        } else if (isOverdue(task.dueDate) && !task.completed) {
            key = '🔴 Overdue';
        } else if (isToday(task.dueDate)) {
            key = '📅 Today';
        } else if (isTomorrow(task.dueDate)) {
            key = '📆 Tomorrow';
        } else {
            const date = new Date(task.dueDate);
            key = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
        
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
    });
    
    const sortOrder = ['🔴 Overdue', '📅 Today', '📆 Tomorrow'];
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const aIdx = sortOrder.indexOf(a);
        const bIdx = sortOrder.indexOf(b);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        if (a === 'No Due Date') return 1;
        if (b === 'No Due Date') return -1;
        return 0;
    });
    
    let html = '';
    
    if (sortedKeys.length === 0) {
        html = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 10px;">📝</div><div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">No tasks yet</div><div>Add a task to get started!</div></div>';
    } else {
        const categoryLabels = {
            work: '💼 Work',
            personal: '👤 Personal',
            family: '👨‍👩‍👧 Family'
        };
        
        const recurringLabels = {
            'daily': '🔁 Daily',
            'weekly': '📅 Weekly',
            'biweekly': '📅 Biweekly',
            'monthly': '📆 Monthly'
        };
        
        sortedKeys.forEach(dateKey => {
            html += `<div class="date-group"><div class="date-header">${dateKey}</div>`;
            
            grouped[dateKey].forEach(task => {
                const categoryClass = `category-${task.category}`;
                
                let dateDisplay = '';
                if (task.dueDate) {
                    const date = new Date(task.dueDate);
                    dateDisplay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    let dateClass = 'date-badge';
                    if (isOverdue(task.dueDate) && !task.completed) dateClass += ' overdue';
                    else if (isToday(task.dueDate)) dateClass += ' today';
                    dateDisplay = `<span class="${dateClass}">📅 ${dateDisplay}</span>`;
                }
                
                let recurringDisplay = '';
                if (task.recurring && task.recurring !== 'none') {
                    recurringDisplay = `<span class="recurring-badge">${recurringLabels[task.recurring]}</span>`;
                }
                
                const hasDescription = task.description && task.description.trim() !== '';
                
                html += `
                    <div class="task">
                        <div class="task-main">
                            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></div>
                            <div class="task-content">
                                <div class="task-text ${task.completed ? 'completed' : ''}">${task.text}</div>
                                <div class="task-meta">
                                    <span class="category-badge ${categoryClass}">${categoryLabels[task.category]}</span>
                                    ${recurringDisplay}
                                    ${dateDisplay}
                                </div>
                            </div>
                            <div class="task-actions">
                                ${hasDescription ? `<button class="expand-btn" id="btn-${task.id}" onclick="toggleTaskDescription(${task.id})">▼</button>` : ''}
                                <button class="delete-btn" onclick="deleteTask(${task.id})">🗑️</button>
                            </div>
                        </div>
                        ${hasDescription ? `<div class="task-description" id="desc-${task.id}"><div class="description-content">${task.description}</div></div>` : ''}
                    </div>
                `;
            });
            
            html += '</div>';
        });
    }
    
    document.getElementById('todoContent').innerHTML = html;
}

function filterByCategory(category) {
    currentCategory = category;
    renderTasks();
}

// === BUDGET TRACKER FUNCTIONS ===
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
    date.value = '';
    
    saveData();
    renderBudget();
    showToast('✅ Transaction added!');
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
            <span class="summary-label">Total Income</span>
            <span class="summary-value">$${income.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Total Expenses</span>
            <span class="summary-value">$${expense.toFixed(2)}</span>
        </div>
        <div class="summary-row">
            <span class="summary-label">Balance</span>
            <span class="summary-value">$${balance.toFixed(2)}</span>
        </div>
    `;
    
    document.getElementById('stats').innerHTML = `
        <span class="stat-badge">Balance: $${balance.toFixed(2)}</span>
        <span class="stat-badge" style="background: #4caf50;">Income: $${income.toFixed(2)}</span>
        <span class="stat-badge" style="background: #f44336;">Expenses: $${expense.toFixed(2)}</span>
    `;
    
    const sorted = [...budgetItems].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = '';
    if (sorted.length === 0) {
        html = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 10px;">💰</div><div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">No transactions yet</div><div>Add a transaction to get started!</div></div>';
    } else {
        sorted.forEach(item => {
            const typeClass = `type-${item.type}`;
            const amountClass = item.type;
            
            html += `
                <div class="budget-item">
                    <div class="item-main">
                        <div class="item-content">
                            <div class="item-text">${item.description}</div>
                            <div class="item-meta">
                                <span class="category-badge ${typeClass}">${item.category}</span>
                                <span class="date-badge">📅 ${new Date(item.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <span class="amount ${amountClass}">${item.type === 'income' ? '+' : '-'}$${item.amount.toFixed(2)}</span>
                            <button class="delete-btn" onclick="deleteBudgetItem(${item.id})">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    document.getElementById('budgetContent').innerHTML = html;
}

// === HABIT TRACKER FUNCTIONS ===
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
        <span class="stat-badge" style="background: #4caf50;">${todayCompleted} done today</span>
    `;
    
    let html = '';
    if (habits.length === 0) {
        html = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 10px;">🎯</div><div style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">No habits yet</div><div>Add a habit to start tracking!</div></div>';
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
                    <div class="item-main">
                        <div class="habit-checkbox ${isDoneToday ? 'checked' : ''}" onclick="toggleHabit(${habit.id})"></div>
                        <div class="item-content">
                            <div class="item-text">${habit.name}</div>
                            <div class="item-meta">
                                <span class="category-badge category-${habit.category}">${categoryLabels[habit.category]}</span>
                                <span class="habit-streak">🔥 ${habit.streak} day streak</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="delete-btn" onclick="deleteHabit(${habit.id})">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    document.getElementById('habitContent').innerHTML = html;
}

// === EXPORT/IMPORT FUNCTIONS ===
function exportData(type) {
    let data, filename;
    
    if (type === 'todo') {
        if (tasks.length === 0) {
            showToast('⚠️ No tasks to export!');
            return;
        }
        data = tasks;
        filename = 'tasks-backup';
    } else if (type === 'budget') {
        if (budgetItems.length === 0) {
            showToast('⚠️ No transactions to export!');
            return;
        }
        data = budgetItems;
        filename = 'budget-backup';
    } else if (type === 'habit') {
        if (habits.length === 0) {
            showToast('⚠️ No habits to export!');
            return;
        }
        data = habits;
        filename = 'habits-backup';
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

// Initialize
document.getElementById('taskInput').addEventListener('keypress', e => {
    if (e.key === 'Enter') addTask();
});
document.getElementById('dateInput').min = new Date().toISOString().split('T')[0];
document.getElementById('budgetDateInput').value = new Date().toISOString().split('T')[0];

renderTasks();

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const categorySelect = document.getElementById("categorySelect");
const filterSelect = document.getElementById("filterSelect"); 
const searchInput = document.getElementById("searchInput");
const taskList = document.getElementById("taskList");
const notifContainer = document.getElementById("notification-container");
const totalCount = document.getElementById("totalCount");
const completedCount = document.getElementById("completedCount");
const pendingCount = document.getElementById("pendingCount");
const taskTimerInput = document.getElementById("taskTimer");
const loader = document.getElementById("loader");

let tasks = [];

async function fetchCategories() {
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/users');
        
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();
        const categories = data.map(user => user.company.bs.split(' ')[0]);
        const uniqueCategories = [...new Set(categories)].slice(0, 5);

        populateCategoryDropdowns(uniqueCategories);
    } catch (error) {
        showNotification("Failed to load categories. Using defaults.");
        populateCategoryDropdowns(["Personal", "Work", "Urgent"]);
        console.error("Fetch error: ", error);
    }
}

function populateCategoryDropdowns(categories) {
    categorySelect.innerHTML = '';
    filterSelect.innerHTML = '<option value="All">All</option>';

    categories.forEach(cat => {
        const capitalized = cat.charAt(0).toUpperCase() + cat.slice(1);
        
        const option = document.createElement('option');
        option.value = capitalized;
        option.textContent = capitalized;
        categorySelect.appendChild(option);

        const filterOption = document.createElement('option');
        filterOption.value = capitalized;
        filterOption.textContent = capitalized;
        filterSelect.appendChild(filterOption);
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function addTask(event) {
    event.preventDefault();
    const taskText = taskInput.value;
    const category = categorySelect.value;
    const minsValue = taskTimerInput.value;
    const mins = minsValue ? parseInt(minsValue, 10) : 0;
    
    toggleLoading(true); 

    try {
        await delay(500);

        if (!taskText.trim()) {
            throw new Error("Task text cannot be empty");
        }

        const newTask = {
            id: Date.now(),
            text: taskText,
            category: category,
            completed: false,
            isEditing: false,
            remainingTime: mins * 60, 
            originalTime: mins * 60, 
            isRunning: false,
            intervalId: null 
        };

        tasks.push(newTask);
        taskInput.value = '';
        taskTimerInput.value = '';
        renderTasks();
        showNotification("Task added!");
    } catch (error) {
        showNotification(`Error: ${error.message}`);
    } finally {
        toggleLoading(false); 
    }
}

function showNotification(message) {
    const notif = document.createElement("div");
    notif.className = "notification";
    notif.textContent = message;
    notifContainer.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function toggleTimer(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.remainingTime <= 0 || task.completed) return;

    if (task.isRunning) {
        clearInterval(task.intervalId);
        task.isRunning = false;
        task.intervalId = null;
    } else {
        task.isRunning = true;
        task.intervalId = setInterval(() => {
            if (task.remainingTime > 0) {
                task.remainingTime--;
                updateTimerDisplay(task);
            } else {
                clearInterval(task.intervalId);
                task.isRunning = false;
                task.intervalId = null;
                showNotification(`Time up: ${task.text}`);
                renderTasks();
            }
        }, 1000);
    }
    renderTasks();
}

function resetTimer(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    clearInterval(task.intervalId);
    task.isRunning = false;
    task.intervalId = null;
    task.remainingTime = task.originalTime;
    renderTasks();
}

function updateTimerDisplay(task) {
    const li = document.querySelector(`li[data-id="${task.id}"]`);
    if (li) {
        const timerSpan = li.querySelector('.timer-display');
        const mins = Math.floor(task.remainingTime / 60);
        const secs = task.remainingTime % 60;
        timerSpan.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
}

function toggleLoading(show) {
    if (show) loader.classList.remove("hidden");
    else loader.classList.add("hidden");
}

async function handleTaskClick(event) {
    const target = event.target;
    const li = target.closest('li');
    if (!li) return;
    const taskId = Number(li.dataset.id);

    try {
        if (target.classList.contains('deleteBtn')) {
            const task = tasks.find(t => t.id === taskId);
            if(task) clearInterval(task.intervalId);
            
            toggleLoading(true);
            await delay(800); 
            
            tasks = tasks.filter(t => t.id !== taskId);
            showNotification("Task deleted!");
            renderTasks();
        } 
        else if (target.classList.contains('startPauseBtn')) {
            toggleTimer(taskId);
        }
        else if (target.classList.contains('resetBtn')) {
            resetTimer(taskId);
        }
        else if (target.classList.contains('editBtn')) {
            tasks = tasks.map(t => t.id === taskId ? { ...t, isEditing: true } : t);
            renderTasks();
        }
        else if (target.classList.contains('saveBtn')) {
            const inputField = li.querySelector('.edit-input');
            tasks = tasks.map(t => t.id === taskId ? { ...t, text: inputField.value, isEditing: false } : t);
            renderTasks();
        }
        else if (target.classList.contains('task-text')) {
            tasks = tasks.map(t => {
                if (t.id === taskId) {
                    const newState = !t.completed;
                    if (newState) clearInterval(t.intervalId);
                    showNotification(newState ? "Task completed!" : "Task marked as pending"); 
                    return { ...t, completed: newState, isRunning: false };
                }
                return t;
            });
            renderTasks();
        }
    } catch (error) {
        showNotification("An error occurred while managing the task.");
    } finally {
        toggleLoading(false);
    }
}

function renderTasks() {
    totalCount.textContent = tasks.length;
    completedCount.textContent = tasks.filter(t => t.completed).length;
    pendingCount.textContent = tasks.length - tasks.filter(t => t.completed).length;

    taskList.innerHTML = '';
    
    const currentFilter = filterSelect.value;
    const searchText = searchInput.value.toLowerCase();

    const filteredTasks = tasks.filter(task => {
        const matchesCategory = currentFilter === "All" || task.category === currentFilter;
        const matchesSearch = task.text.toLowerCase().includes(searchText);
        return matchesCategory && matchesSearch;
    });

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        if (task.completed) li.classList.add('completed');

        if (task.isEditing) {
            li.innerHTML = `
                <input type="text" class="edit-input" value="${task.text}">
                <button class="saveBtn">Save</button>
            `;
            setTimeout(() => {
                const input = li.querySelector('.edit-input');
                if (input) input.focus();
            }, 1);
        } else {
            const mins = Math.floor(task.remainingTime / 60);
            const secs = task.remainingTime % 60;
            const timeDisplay = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

            li.innerHTML = `
                <div class="task-content">
                    <span class="category-badge badge-api">${task.category}</span>
                    <span class="task-text">${task.text}</span>
                    <span class="timer-display">${timeDisplay}</span>
                </div>
                <div class="actions">
                    <button class="startPauseBtn">${task.isRunning ? 'Pause' : 'Start'}</button>
                    <button class="resetBtn">Reset</button>
                    <button class="editBtn">Edit</button>
                    <button class="deleteBtn">Delete</button>
                </div>
            `;
        }
        taskList.appendChild(li);
    });
}

fetchCategories();
taskForm.addEventListener('submit', addTask);
taskList.addEventListener('click', handleTaskClick);
filterSelect.addEventListener('change', renderTasks);
searchInput.addEventListener('input', renderTasks);
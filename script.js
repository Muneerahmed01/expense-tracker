let editTransactionId = null; // Track karega ke edit chal raha hai ya naya add
const API_URL = "http://localhost:5000/api/transactions";

// ==========================================
// 1. SIGNUP & LOGIN (Abhi LocalStorage par hi chalega jab tak user backend na bane)
// ==========================================
const signupForm = document.getElementById("signupForm");
if (signupForm) {
    signupForm.addEventListener("submit", function(event) {
        let name = document.getElementById("fullname").value.trim();
        let email = document.getElementById("email").value.trim();
        let password = document.getElementById("password").value;
        let confirmPassword = document.getElementById("confirmPassword").value;
        let terms = document.getElementById("terms");
        
        if (name === "" || !email.includes("@") || !email.includes(".") || password.length < 6 || password !== confirmPassword || !terms.checked) { 
            alert("Validation failed! Check fields or terms."); 
            event.preventDefault(); 
            return; 
        }

        let userData = { userName: name, userEmail: email, userPassword: password };
        localStorage.setItem("registeredUser", JSON.stringify(userData));
        alert("Signup Successful and Data Saved!");
    });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", function(event) {
        event.preventDefault(); 
        let loginEmail = document.getElementById("email").value.trim();
        let loginPassword = document.getElementById("password").value;
        let storedData = localStorage.getItem("registeredUser");

        if (storedData) {
            let user = JSON.parse(storedData);
            if (loginEmail === user.userEmail && loginPassword === user.userPassword) {
                alert("Login Successful!");
                window.location.href = "dashboard.html";
            } else {
                alert("Invalid email or password!");
            }
        } else {
            alert("No registered user found!");
        }
    });
}

// ==========================================
// 2. ADD / SEND NEW TRANSACTION TO BACKEND (POST API)
// ==========================================
const transactionForm = document.getElementById('transactionForm');
if (transactionForm) {
    transactionForm.addEventListener('submit', function(event) {
        event.preventDefault(); 

        const transactionData = {
            type: document.getElementById('type').value,
            amount: parseFloat(document.getElementById('amount').value),
            category: document.getElementById('category').value,
            date: document.getElementById('date').value,
            description: document.getElementById('description').value
        };

        let method = 'POST';
        let url = API_URL;

        // Agar editTransactionId majood hai to PUT request chalegi update karne ke liye
        if (editTransactionId) {
            method = 'PUT';
            url = `${API_URL}/${editTransactionId}`;
        }

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData)
        })
        .then(response => response.json())
        .then(data => {
            alert(editTransactionId ? 'Transaction updated successfully!' : 'Transaction successfully added to Backend Server!');
            transactionForm.reset(); 
            editTransactionId = null; // Reset edit mode
            window.location.href = "dashboard.html"; // Redirect back to dashboard
        })
        .catch(error => console.error('Error saving transaction:', error));
    });
}

// ==========================================
// 3. RETRIEVE & DISPLAY DATA FROM MONGODB (GET API)
// ==========================================
const tableBody = document.getElementById('transaction-rows');
if (tableBody) {
    document.addEventListener('DOMContentLoaded', displayTransactions);
}

function displayTransactions() {
    if (!tableBody) return;
    tableBody.innerHTML = ''; 

    fetch(API_URL)
        .then(response => response.json())
        .then(transactions => {
            if (transactions.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 10px;">No transactions found.</td></tr>`;
                return;
            }
            transactions.forEach(function(transaction) {
                const id = transaction._id || transaction.id; 
                const cleanDate = transaction.date ? transaction.date.split('T')[0] : '2026-06-01';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${id}</td>
                    <td>${cleanDate}</td>
                    <td style="color: ${transaction.type.toLowerCase() === 'expense' ? 'red' : 'green'}; font-weight: bold;">
                        ${transaction.type.toUpperCase()}
                    </td>
                    <td>${transaction.category}</td>
                    <td>PKR ${transaction.amount.toLocaleString()}</td>
                    <td>${transaction.description}</td>
                    <td>
                        <button onclick="startEdit('${id}')" style="background-color: orange; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 3px; margin-right: 5px;">Edit</button>
                        <button onclick="deleteTransaction('${id}')" style="background-color: red; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 3px;">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error("Table load karne mein error:", error));
}

// ==========================================
// 4. DELETE TRANSACTION FROM MONGODB (DELETE API)
// ==========================================
function deleteTransaction(id) {
    if (confirm("Are you sure you want to delete this transaction?")) {
        fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(() => {
            alert("Transaction deleted from server!");
            displayTransactions();
            updateDashboard(); // Sync Dashboard
        })
        .catch(error => console.error('Error deleting transaction:', error));
    }
}

// ==========================================
// 5. UPDATE DASHBOARD SUMMARY FROM MONGODB DATA
// ==========================================
const totalIncomeElement = document.getElementById('total-income');
const totalExpenseElement = document.getElementById('total-expense');
const remainingBalanceElement = document.getElementById('remaining-balance');

if (totalIncomeElement && totalExpenseElement && remainingBalanceElement) {
    document.addEventListener('DOMContentLoaded', updateDashboard);
}

function updateDashboard() {
    fetch(API_URL)
        .then(response => response.json())
        .then(transactions => {
            let totalIncome = 0;
            let totalExpense = 0;

            transactions.forEach(function(transaction) {
                if (transaction.type.toLowerCase() === 'income') {
                    totalIncome += transaction.amount;
                } else if (transaction.type.toLowerCase() === 'expense') {
                    totalExpense += transaction.amount;
                }
            });

            const remainingBalance = totalIncome - totalExpense;

            totalIncomeElement.innerText = `PKR ${totalIncome.toLocaleString()}`;
            totalExpenseElement.innerText = `PKR ${totalExpense.toLocaleString()}`;
            remainingBalanceElement.innerText = `PKR ${remainingBalance.toLocaleString()}`;

            remainingBalanceElement.style.color = remainingBalance < 0 ? 'red' : 'green';
            
            // Sync extra components on dashboard
            updateRecentTransactions(transactions);
            updateMonthlySummary(transactions);
            calculateCategoryStatistics(transactions);
        })
        .catch(error => console.error('Dashboard sync error:', error));
}

// ==========================================
// 6. EDIT LOGIC (PUT Preparation)
// ==========================================
function startEdit(id) {
    localStorage.setItem('editTransactionId', id); // Temporary pass ID to next page
    window.location.href = "add.transaction.html"; 
}

document.addEventListener('DOMContentLoaded', function() {
    let savedEditId = localStorage.getItem('editTransactionId');
    if (savedEditId && document.getElementById('transactionForm')) {
        // Server se specific record fetch karna details populate karne ke liye
        fetch(`${API_URL}/${savedEditId}`)
            .then(response => response.json())
            .then(transactionToEdit => {
                if (transactionToEdit) {
                    document.getElementById('type').value = transactionToEdit.type;
                    document.getElementById('amount').value = transactionToEdit.amount;
                    document.getElementById('category').value = transactionToEdit.category;
                    document.getElementById('date').value = transactionToEdit.date ? transactionToEdit.date.split('T')[0] : '';
                    document.getElementById('description').value = transactionToEdit.description;
                    
                    editTransactionId = savedEditId;
                }
                localStorage.removeItem('editTransactionId');
            });
    }
});

// ==========================================
// 7. COMPONENT HELPER FUNCTIONS (Recent, Monthly & Stats)
// ==========================================
function updateRecentTransactions(transactions) {
    const listElement = document.getElementById('recent-transactions-list');
    if (!listElement) return; 
    listElement.innerHTML = ''; 

    const latestTransactions = [...transactions].reverse().slice(0, 5);
    latestTransactions.forEach(item => {
        const li = document.createElement('li');
        li.className = 'task8-item';
        const formattedCategory = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase() : 'Other';
        li.innerHTML = `<span>${formattedCategory}</span> <span>PKR ${parseFloat(item.amount)}</span>`;
        listElement.appendChild(li);
    });
}

function updateMonthlySummary(transactions) {
    const today = new Date();
    const currentMonth = today.getMonth(); 
    const currentYear = today.getFullYear(); 

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthElement = document.getElementById('current-month-name');
    if (monthElement) monthElement.innerText = monthNames[currentMonth];

    let income = 0; let expense = 0;

    transactions.forEach(item => {
        const txnDate = new Date(item.date);
        if (!isNaN(txnDate.getTime())) {
            if (txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
                const typeClean = item.type ? item.type.toLowerCase().trim() : '';
                const amountValue = parseFloat(item.amount) || 0;
                if (typeClean.includes('inc') || typeClean.includes('sal')) {
                    income += amountValue;
                } else {
                    expense += amountValue;
                }
            }
        }
    });

    const incEl = document.getElementById('monthly-income');
    const expEl = document.getElementById('monthly-expense');
    const balEl = document.getElementById('monthly-balance');

    if (incEl) incEl.innerText = `PKR ${income.toLocaleString()}`;
    if (expEl) expEl.innerText = `PKR ${expense.toLocaleString()}`;
    if (balEl) balEl.innerText = `PKR ${(income - expense).toLocaleString()}`;
}

function calculateCategoryStatistics(transactions) {
    const statsContainer = document.getElementById('category-stats-list');
    if (!statsContainer) return; 

    const categoryTotals = {};
    transactions.forEach(txn => {
        if (txn.type && txn.type.toLowerCase() === 'expense') {
            let category = txn.category || "Other";
            category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
            let amount = parseFloat(txn.amount);
            if (!isNaN(amount)) {
                categoryTotals[category] = (categoryTotals[category] || 0) + amount;
            }
        }
    });

    statsContainer.innerHTML = ''; 
    if (Object.keys(categoryTotals).length === 0) {
        statsContainer.innerHTML = '<p>No spending data available.</p>';
        return;
    }
    for (const category in categoryTotals) {
        statsContainer.innerHTML += `<p><b>${category}:</b> PKR ${categoryTotals[category].toLocaleString()}</p>`;
    }
}

// Search Aur Filter local UI standard rows par pehle ki tarah bilkul sahi chalenge!
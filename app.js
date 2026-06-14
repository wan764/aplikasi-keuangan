const categories = [
  { id: "food", name: "Makanan", type: "expense" },
  { id: "transport", name: "Transportasi", type: "expense" },
  { id: "shopping", name: "Belanja", type: "expense" },
  { id: "bills", name: "Tagihan", type: "expense" },
  { id: "entertainment", name: "Hiburan", type: "expense" },
  { id: "health", name: "Kesehatan", type: "expense" },
  { id: "education", name: "Pendidikan", type: "expense" },
  { id: "salary", name: "Gaji", type: "income" },
  { id: "bonus", name: "Bonus", type: "income" },
  { id: "investment", name: "Investasi", type: "income" },
  { id: "other", name: "Lainnya", type: "both" },
];

const initialState = {
  transactions: [],
  budgets: [],
  bills: [],
  freedomGoal: null,
};

let state = cloneInitialState();
let currentUser = null;
const API_BASE = window.location.protocol === "file:" ? "http://localhost:3000" : "";

const viewTitles = {
  dashboard: "Dashboard",
  transactions: "Transaksi",
  reports: "Laporan",
  budgets: "Anggaran",
  bills: "Tagihan",
  freedom: "Financial Freedom",
  settings: "Pengaturan",
};

const frequencyLabels = {
  once: "Sekali",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateText = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const el = (id) => document.getElementById(id);
const money = (value) => rupiah.format(Number(value || 0));
const todayIso = () => new Date().toISOString().slice(0, 10);
const monthIso = (date = new Date()) => date.toISOString().slice(0, 7);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const appShell = () => el("appShell");

function parseMoneyInput(value) {
  return Number(String(value || "").replace(/\D/g, "")) || 0;
}

function formatMoneyInput(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? new Intl.NumberFormat("id-ID").format(Number(digits)) : "";
}

function setupMoneyInputs() {
  document.querySelectorAll("[data-money-input]").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatMoneyInput(input.value);
    });
  });
}

function cloneInitialState() {
  return JSON.parse(JSON.stringify(initialState));
}

function saveState() {
  if (!currentUser) return;
  apiRequest("/api/data", {
    method: "PUT",
    body: JSON.stringify(state),
  }).catch((error) => showAuthMessage(error.message));
}

async function apiRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      credentials: "include",
      ...options,
    });
  } catch {
    throw new Error("Backend belum aktif. Jalankan npm start lalu buka http://localhost:3000.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Terjadi kesalahan.");
  return payload;
}

function setAuthenticated(payload) {
  currentUser = payload.user;
  state = { ...cloneInitialState(), ...(payload.data || {}) };
  el("currentUserName").textContent = currentUser.name;
  el("authScreen").classList.add("hidden");
  el("appShell").classList.remove("hidden");
  appShell().dataset.view = "dashboard";
  showAuthMessage("");
  seedFormDefaults();
  renderAll();
}

function setLoggedOut() {
  currentUser = null;
  state = cloneInitialState();
  el("appShell").classList.add("hidden");
  el("authScreen").classList.remove("hidden");
}

function showAuthMessage(message, isSuccess = false) {
  el("authMessage").textContent = message;
  el("authMessage").classList.toggle("success", isSuccess);
}

function setMobileMenu(open) {
  appShell().classList.toggle("nav-open", open);
  el("menuToggleBtn").setAttribute("aria-expanded", String(open));
}

function categoryName(id) {
  return categories.find((category) => category.id === id)?.name || "Lainnya";
}

function categoryOptions(type = "all") {
  return categories
    .filter((category) => type === "all" || category.type === type || category.type === "both")
    .map((category) => `<option value="${category.id}">${category.name}</option>`)
    .join("");
}

function setSelectOptions(select, type = "all", includeAll = false) {
  select.innerHTML = `${includeAll ? '<option value="all">Semua kategori</option>' : ""}${categoryOptions(type)}`;
}

function currentMonthTransactions(month = monthIso()) {
  return state.transactions.filter((transaction) => transaction.date.slice(0, 7) === month);
}

function sumTransactions(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + Number(transaction.amount), 0);
}

function expenseByCategory(transactions) {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((totals, transaction) => {
      totals[transaction.categoryId] = (totals[transaction.categoryId] || 0) + Number(transaction.amount);
      return totals;
    }, {});
}

function renderBars(container, totals, emptyText = "Belum ada pengeluaran.") {
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    container.innerHTML = `<p class="hint">${emptyText}</p>`;
    return;
  }

  const max = Math.max(...entries.map(([, amount]) => amount));
  container.innerHTML = entries
    .map(([categoryId, amount]) => {
      const width = max ? Math.max(4, (amount / max) * 100) : 0;
      return `
        <div class="bar-item">
          <div class="bar-top"><strong>${categoryName(categoryId)}</strong><span>${money(amount)}</span></div>
          <div class="bar-line"><span style="width:${width}%"></span></div>
        </div>
      `;
    })
    .join("");
}

function renderDashboard() {
  const today = todayIso();
  const month = monthIso();
  const todayTransactions = state.transactions.filter((transaction) => transaction.date === today);
  const monthTransactions = currentMonthTransactions(month);
  const incomeToday = sumTransactions(todayTransactions, "income");
  const expenseToday = sumTransactions(todayTransactions, "expense");
  const incomeMonth = sumTransactions(monthTransactions, "income");
  const expenseMonth = sumTransactions(monthTransactions, "expense");
  const balance = incomeMonth - expenseMonth;

  el("incomeToday").textContent = money(incomeToday);
  el("expenseToday").textContent = money(expenseToday);
  el("incomeMonth").textContent = money(incomeMonth);
  el("expenseMonth").textContent = money(expenseMonth);
  el("monthBalance").textContent = money(balance);
  el("monthBalancePill").textContent = balance >= 0 ? "Surplus" : "Defisit";
  el("savingInsight").textContent = buildSavingInsight(monthTransactions);
  renderBars(el("topCategories"), expenseByCategory(monthTransactions), "Belum ada kategori terbesar bulan ini.");
  renderFreedomMini();
}

function renderFreedomMini() {
  const goal = state.freedomGoal;
  const progress = goal?.targetAmount ? Math.min(100, (goal.projectedAmount / goal.targetAmount) * 100) : 0;
  el("freedomProgress").style.width = `${progress}%`;
  el("freedomPercentLabel").textContent = `${Math.round(progress)}%`;
  el("freedomTargetMini").textContent = money(goal?.targetAmount);
  el("freedomProjectedMini").textContent = money(goal?.projectedAmount);
}

function buildSavingInsight(transactions) {
  const totals = expenseByCategory(transactions);
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  if (!top) return "Mulai catat transaksi untuk melihat pola keuanganmu.";
  const dailyCut = 20000;
  return `${categoryName(top[0])} menjadi pengeluaran terbesar. Mengurangi ${money(dailyCut)} per hari bisa menambah tabungan sekitar ${money(dailyCut * 30)} per bulan.`;
}

function renderTransactions() {
  const query = el("transactionSearch").value.toLowerCase();
  const type = el("transactionTypeFilter").value;
  const category = el("transactionCategoryFilter").value;
  const list = state.transactions
    .filter((transaction) => type === "all" || transaction.type === type)
    .filter((transaction) => category === "all" || transaction.categoryId === category)
    .filter((transaction) => {
      const text = `${transaction.amount} ${categoryName(transaction.categoryId)} ${transaction.note} ${transaction.paymentMethod}`.toLowerCase();
      return text.includes(query);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  el("transactionList").innerHTML = list.length
    ? list
        .map((transaction) => `
          <article class="list-item">
            <div class="item-top">
              <div>
                <strong>${categoryName(transaction.categoryId)}</strong>
                <div class="hint">${transaction.date}${transaction.paymentMethod ? ` - ${transaction.paymentMethod}` : ""}</div>
              </div>
              <strong class="${transaction.type === "income" ? "amount-income" : "amount-expense"}">${transaction.type === "income" ? "+" : "-"} ${money(transaction.amount)}</strong>
            </div>
            ${transaction.note ? `<p>${transaction.note}</p>` : ""}
            <div class="item-actions">
              <button type="button" data-edit-transaction="${transaction.id}">Edit</button>
              <button type="button" data-delete-transaction="${transaction.id}">Hapus</button>
            </div>
          </article>
        `)
        .join("")
    : '<p class="hint">Belum ada transaksi yang cocok.</p>';
}

function resetTransactionForm() {
  el("transactionId").value = "";
  el("transactionFormTitle").textContent = "Tambah Transaksi";
  el("amount").value = "";
  el("date").value = todayIso();
  el("paymentMethod").value = "";
  el("note").value = "";
  document.querySelector('input[name="type"][value="income"]').checked = true;
  updateCategorySelect();
}

function updateCategorySelect() {
  const type = document.querySelector('input[name="type"]:checked').value;
  setSelectOptions(el("category"), type);
}

function renderReports() {
  const month = el("reportMonth").value || monthIso();
  const category = el("reportCategory").value;
  const transactions = currentMonthTransactions(month).filter((transaction) => category === "all" || transaction.categoryId === category);
  const previousDate = new Date(`${month}-01T00:00:00`);
  previousDate.setMonth(previousDate.getMonth() - 1);
  const previousTransactions = currentMonthTransactions(monthIso(previousDate));
  const income = sumTransactions(transactions, "income");
  const expense = sumTransactions(transactions, "expense");
  const previousExpense = sumTransactions(previousTransactions, "expense");
  const compare = previousExpense ? ((expense - previousExpense) / previousExpense) * 100 : 0;

  el("reportIncome").textContent = money(income);
  el("reportExpense").textContent = money(expense);
  el("reportBalance").textContent = money(income - expense);
  el("reportCompare").textContent = previousExpense ? `${compare > 0 ? "+" : ""}${Math.round(compare)}%` : "Belum ada data";
  renderBars(el("reportBars"), expenseByCategory(transactions), "Belum ada pengeluaran pada filter ini.");
  renderInsights(transactions, previousTransactions);
}

function renderInsights(transactions, previousTransactions) {
  const expense = sumTransactions(transactions, "expense");
  const previousExpense = sumTransactions(previousTransactions, "expense");
  const budgets = budgetStatuses(el("reportMonth").value || monthIso());
  const overBudget = budgets.find((budget) => budget.used > budget.monthlyLimit);
  const insights = [];

  if (previousExpense && expense > previousExpense) {
    insights.push(`Pengeluaran bulan ini ${Math.round(((expense - previousExpense) / previousExpense) * 100)}% lebih tinggi dari bulan lalu.`);
  }
  if (overBudget) {
    insights.push(`Anggaran ${categoryName(overBudget.categoryId)} sudah melewati batas.`);
  }
  if (!insights.length) {
    insights.push("Belum ada risiko besar yang terlihat dari data bulan ini.");
  }

  el("insightList").innerHTML = insights.map((insight) => `<div class="insight">${insight}</div>`).join("");
}

function budgetStatuses(month) {
  const [year, monthNumber] = month.split("-");
  const transactions = currentMonthTransactions(month);
  const totals = expenseByCategory(transactions);
  return state.budgets
    .filter((budget) => budget.year === year && budget.month === monthNumber)
    .map((budget) => ({ ...budget, used: totals[budget.categoryId] || 0 }));
}

function renderBudgets() {
  const month = el("budgetMonth").value || monthIso();
  const statuses = budgetStatuses(month);
  el("budgetList").innerHTML = statuses.length
    ? statuses
        .map((budget) => {
          const percent = budget.monthlyLimit ? Math.min(100, (budget.used / budget.monthlyLimit) * 100) : 0;
          const remaining = budget.monthlyLimit - budget.used;
          const className = remaining < 0 ? "over" : percent >= 90 ? "near" : "";
          return `
            <article class="list-item">
              <div class="item-top">
                <strong>${categoryName(budget.categoryId)}</strong>
                <strong class="${className}">${money(remaining)} tersisa</strong>
              </div>
              <div class="hint">Terpakai ${money(budget.used)} dari ${money(budget.monthlyLimit)}</div>
              <div class="bar-line"><span style="width:${percent}%"></span></div>
              <div class="item-actions">
                <button type="button" data-edit-budget="${budget.id}">Edit</button>
                <button type="button" data-delete-budget="${budget.id}">Hapus</button>
              </div>
            </article>
          `;
        })
        .join("")
    : '<p class="hint">Belum ada anggaran untuk bulan ini.</p>';
}

function resetBudgetForm() {
  el("budgetId").value = "";
  el("budgetLimit").value = "";
  el("budgetMonth").value = monthIso();
}

function renderBills() {
  const sortedBills = [...state.bills].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  el("billList").innerHTML = sortedBills.length
    ? sortedBills
        .map((bill) => {
          const days = Math.ceil((new Date(`${bill.dueDate}T00:00:00`) - new Date(`${todayIso()}T00:00:00`)) / 86400000);
          const dueText = bill.status === "paid" ? "Sudah dibayar" : days < 0 ? "Lewat jatuh tempo" : `${days} hari lagi`;
          return `
            <article class="list-item">
              <div class="item-top">
                <div>
                  <strong>${bill.name}</strong>
                  <div class="hint">${categoryName(bill.categoryId)} - ${frequencyLabels[bill.frequency]} - ${bill.dueDate}</div>
                </div>
                <strong>${money(bill.amount)}</strong>
              </div>
              <p class="${days <= 3 && bill.status !== "paid" ? "near" : ""}">${dueText}</p>
              <div class="item-actions">
                ${bill.status === "paid" ? "" : `<button type="button" data-pay-bill="${bill.id}">Bayar</button>`}
                <button type="button" data-edit-bill="${bill.id}">Edit</button>
                <button type="button" data-delete-bill="${bill.id}">Hapus</button>
              </div>
            </article>
          `;
        })
        .join("")
    : '<p class="hint">Belum ada pengingat tagihan.</p>';
}

function resetBillForm() {
  el("billId").value = "";
  el("billName").value = "";
  el("billAmount").value = "";
  el("billDueDate").value = todayIso();
  el("billFrequency").value = "once";
  el("billStatus").value = "unpaid";
}

function calculateFreedomGoal(values) {
  const years = Math.max(0, values.targetAge - values.currentAge);
  const futureMonthlyExpense = values.monthlyExpense * Math.pow(1 + values.inflationRate / 100, years);
  const targetAmount = (futureMonthlyExpense * 12) / (values.withdrawalRate / 100);
  const monthlyReturn = Math.pow(1 + values.returnRate / 100, 1 / 12) - 1;
  const months = years * 12;
  const projectedSavings = values.currentSavings * Math.pow(1 + monthlyReturn, months);
  const projectedContrib = monthlyReturn
    ? values.monthlyContribution * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn)
    : values.monthlyContribution * months;
  const projectedAmount = projectedSavings + projectedContrib;
  const contributionNeeded = monthlyReturn
    ? Math.max(0, (targetAmount - projectedSavings) * monthlyReturn / (Math.pow(1 + monthlyReturn, months) - 1))
    : Math.max(0, (targetAmount - values.currentSavings) / Math.max(1, months));

  return {
    ...values,
    targetAmount,
    projectedAmount,
    monthlyContributionNeeded: contributionNeeded,
  };
}

function renderFreedom() {
  const goal = state.freedomGoal;
  if (!goal) return;
  const gap = goal.projectedAmount - goal.targetAmount;
  const progress = goal.targetAmount ? Math.min(100, (goal.projectedAmount / goal.targetAmount) * 100) : 0;
  el("targetAmount").textContent = money(goal.targetAmount);
  el("projectedAmount").textContent = money(goal.projectedAmount);
  el("fundingGap").textContent = money(gap);
  el("neededContribution").textContent = money(goal.monthlyContributionNeeded);
  el("freedomResultProgress").textContent = `${Math.round(progress)}%`;
  el("freedomStatus").textContent = gap >= 0 ? "Target tercapai" : "Perlu ditingkatkan";
}

function seedFormDefaults() {
  el("todayLabel").textContent = dateText.format(new Date());
  el("date").value = todayIso();
  el("reportMonth").value = monthIso();
  el("budgetMonth").value = monthIso();
  el("billDueDate").value = todayIso();
  setSelectOptions(el("category"), "income");
  setSelectOptions(el("transactionCategoryFilter"), "all", true);
  setSelectOptions(el("reportCategory"), "all", true);
  setSelectOptions(el("budgetCategory"), "expense");
  setSelectOptions(el("billCategory"), "expense");
}

function renderAll() {
  renderDashboard();
  renderTransactions();
  renderReports();
  renderBudgets();
  renderBills();
  renderFreedom();
}

document.addEventListener("click", (event) => {
  const target = event.target;
  const navButton = target.closest("[data-view], [data-switch]");
  if (navButton) {
    const view = navButton.dataset.view || navButton.dataset.switch;
    document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
    el(`${view}View`).classList.add("active");
    el("viewTitle").textContent = viewTitles[view];
    appShell().dataset.view = view;
    setMobileMenu(false);
  }

  const editTransactionId = target.dataset.editTransaction;
  if (editTransactionId) {
    const transaction = state.transactions.find((item) => item.id === editTransactionId);
    if (transaction) {
      el("transactionId").value = transaction.id;
      document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
      updateCategorySelect();
      el("amount").value = formatMoneyInput(transaction.amount);
      el("date").value = transaction.date;
      el("category").value = transaction.categoryId;
      el("paymentMethod").value = transaction.paymentMethod || "";
      el("note").value = transaction.note || "";
      el("transactionFormTitle").textContent = "Edit Transaksi";
    }
  }

  if (target.dataset.deleteTransaction) {
    state.transactions = state.transactions.filter((item) => item.id !== target.dataset.deleteTransaction);
    saveState();
    renderAll();
  }

  const editBudgetId = target.dataset.editBudget;
  if (editBudgetId) {
    const budget = state.budgets.find((item) => item.id === editBudgetId);
    if (budget) {
      el("budgetId").value = budget.id;
      el("budgetCategory").value = budget.categoryId;
      el("budgetLimit").value = formatMoneyInput(budget.monthlyLimit);
      el("budgetMonth").value = `${budget.year}-${budget.month}`;
    }
  }

  if (target.dataset.deleteBudget) {
    state.budgets = state.budgets.filter((item) => item.id !== target.dataset.deleteBudget);
    saveState();
    renderAll();
  }

  const editBillId = target.dataset.editBill;
  if (editBillId) {
    const bill = state.bills.find((item) => item.id === editBillId);
    if (bill) {
      el("billId").value = bill.id;
      el("billName").value = bill.name;
      el("billAmount").value = formatMoneyInput(bill.amount);
      el("billDueDate").value = bill.dueDate;
      el("billFrequency").value = bill.frequency;
      el("billCategory").value = bill.categoryId;
      el("billStatus").value = bill.status;
    }
  }

  if (target.dataset.deleteBill) {
    state.bills = state.bills.filter((item) => item.id !== target.dataset.deleteBill);
    saveState();
    renderAll();
  }

  if (target.dataset.payBill) {
    const bill = state.bills.find((item) => item.id === target.dataset.payBill);
    if (bill) {
      bill.status = "paid";
      state.transactions.push({
        id: uid(),
        type: "expense",
        amount: Number(bill.amount),
        categoryId: bill.categoryId,
        date: todayIso(),
        note: `Pembayaran ${bill.name}`,
        paymentMethod: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      saveState();
      renderAll();
    }
  }
});

document.querySelectorAll('input[name="type"]').forEach((radio) => radio.addEventListener("change", updateCategorySelect));

el("quickAddBtn").addEventListener("click", () => {
  document.querySelector('[data-view="transactions"]').click();
  el("amount").focus();
});

el("menuToggleBtn").addEventListener("click", () => {
  setMobileMenu(!appShell().classList.contains("nav-open"));
});

el("navBackdrop").addEventListener("click", () => {
  setMobileMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMobileMenu(false);
});

el("transactionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = el("transactionId").value || uid();
  const now = new Date().toISOString();
  const transaction = {
    id,
    type: document.querySelector('input[name="type"]:checked').value,
    amount: parseMoneyInput(el("amount").value),
    date: el("date").value,
    categoryId: el("category").value,
    paymentMethod: el("paymentMethod").value.trim(),
    note: el("note").value.trim(),
    createdAt: state.transactions.find((item) => item.id === id)?.createdAt || now,
    updatedAt: now,
  };
  state.transactions = state.transactions.filter((item) => item.id !== id).concat(transaction);
  saveState();
  resetTransactionForm();
  renderAll();
});

el("budgetForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const [year, month] = el("budgetMonth").value.split("-");
  const id = el("budgetId").value || uid();
  const budget = {
    id,
    categoryId: el("budgetCategory").value,
    monthlyLimit: parseMoneyInput(el("budgetLimit").value),
    month,
    year,
  };
  state.budgets = state.budgets
    .filter((item) => item.id !== id)
    .filter((item) => !(item.categoryId === budget.categoryId && item.month === budget.month && item.year === budget.year))
    .concat(budget);
  saveState();
  resetBudgetForm();
  renderAll();
});

el("billForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = el("billId").value || uid();
  const bill = {
    id,
    name: el("billName").value.trim(),
    amount: parseMoneyInput(el("billAmount").value),
    dueDate: el("billDueDate").value,
    frequency: el("billFrequency").value,
    categoryId: el("billCategory").value,
    status: el("billStatus").value,
  };
  state.bills = state.bills.filter((item) => item.id !== id).concat(bill);
  saveState();
  resetBillForm();
  renderAll();
});

el("freedomForm").addEventListener("submit", (event) => {
  event.preventDefault();
  state.freedomGoal = calculateFreedomGoal({
    monthlyExpense: parseMoneyInput(el("monthlyExpense").value),
    inflationRate: Number(el("inflationRate").value),
    currentAge: Number(el("currentAge").value),
    targetAge: Number(el("targetAge").value),
    currentSavings: parseMoneyInput(el("currentSavings").value),
    monthlyContribution: parseMoneyInput(el("monthlyContribution").value),
    returnRate: Number(el("returnRate").value),
    withdrawalRate: Number(el("withdrawalRate").value),
  });
  saveState();
  renderAll();
});

el("clearDataBtn").addEventListener("click", () => {
  if (confirm("Hapus semua data keuangan untuk akun ini?")) {
    state = cloneInitialState();
    saveState();
    renderAll();
  }
});

["transactionSearch", "transactionTypeFilter", "transactionCategoryFilter"].forEach((id) => {
  el(id).addEventListener("input", renderTransactions);
});

["reportMonth", "reportCategory"].forEach((id) => {
  el(id).addEventListener("input", renderReports);
});

el("budgetMonth").addEventListener("input", renderBudgets);
el("resetTransactionBtn").addEventListener("click", resetTransactionForm);
el("resetBudgetBtn").addEventListener("click", resetBudgetForm);
el("resetBillBtn").addEventListener("click", resetBillForm);
setupMoneyInputs();

el("showLoginBtn").addEventListener("click", () => {
  el("showLoginBtn").classList.add("active");
  el("showRegisterBtn").classList.remove("active");
  el("loginForm").classList.remove("hidden");
  el("registerForm").classList.add("hidden");
  showAuthMessage("");
});

el("showRegisterBtn").addEventListener("click", () => {
  el("showRegisterBtn").classList.add("active");
  el("showLoginBtn").classList.remove("active");
  el("registerForm").classList.remove("hidden");
  el("loginForm").classList.add("hidden");
  showAuthMessage("");
});

el("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: el("loginEmail").value,
        password: el("loginPassword").value,
      }),
    });
    setAuthenticated(payload);
  } catch (error) {
    showAuthMessage(error.message);
  }
});

el("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = await apiRequest("/api/register", {
      method: "POST",
      body: JSON.stringify({
        name: el("registerName").value,
        email: el("registerEmail").value,
        password: el("registerPassword").value,
      }),
    });
    setAuthenticated(payload);
  } catch (error) {
    showAuthMessage(error.message);
  }
});

el("logoutBtn").addEventListener("click", async () => {
  await apiRequest("/api/logout", { method: "POST" }).catch(() => {});
  setLoggedOut();
});

async function initApp() {
  try {
    const payload = await apiRequest("/api/me");
    setAuthenticated(payload);
  } catch {
    setLoggedOut();
  }
}

initApp();

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  navigator.serviceWorker.register("/service-worker.js").catch(() => {});
}

const STORAGE_KEYS = {
  transactions: "findash_transactions_v1",
  budgets: "findash_budgets_v1",
};

const PAGE_SIZE = 8;

const form = document.getElementById("transaction-form");
const formError = document.getElementById("form-error");
const budgetForm = document.getElementById("budget-form");
const budgetError = document.getElementById("budget-error");
const budgetList = document.getElementById("budget-list");
const tableBody = document.getElementById("transactionTableBody");
const searchInput = document.getElementById("searchInput");
const sortBy = document.getElementById("sortBy");
const timeFilter = document.getElementById("timeFilter");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const summaryCards = document.getElementById("summary-cards");

let transactions = readStorageArray(STORAGE_KEYS.transactions);
let budgets = readStorageObject(STORAGE_KEYS.budgets);
let currentPage = 1;

let expensePieChart = null;
let monthlyBarChart = null;

function readStorageArray(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function readStorageObject(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
  localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeCategory(value) {
  return value.trim().replace(/\s+/g, " ");
}

function parseDate(value) {
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfWeek(date) {
  const temp = new Date(date);
  const day = temp.getDay();
  const diff = temp.getDate() - day + (day === 0 ? -6 : 1);
  temp.setDate(diff);
  temp.setHours(0, 0, 0, 0);
  return temp;
}

function endOfWeek(date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function inRange(date, from, to) {
  return date >= from && date <= to;
}

function buildFilteredTransactions() {
  const query = searchInput.value.trim().toLowerCase();
  const now = new Date();

  let filtered = transactions.filter((txn) => {
    const haystack = `${txn.category} ${txn.notes || ""}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;

    const txDate = parseDate(txn.date);
    if (!txDate) return false;

    if (timeFilter.value === "weekly") {
      return inRange(txDate, startOfWeek(now), endOfWeek(now));
    }

    if (timeFilter.value === "monthly") {
      return inRange(txDate, startOfMonth(now), endOfMonth(now));
    }

    if (timeFilter.value === "custom") {
      const customStart = parseDate(startDate.value);
      const customEnd = parseDate(endDate.value);
      if (!customStart || !customEnd) return true;
      const endAdjusted = new Date(customEnd);
      endAdjusted.setHours(23, 59, 59, 999);
      return inRange(txDate, customStart, endAdjusted);
    }

    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy.value === "dateAsc") return a.date.localeCompare(b.date);
    if (sortBy.value === "amountDesc") return b.amount - a.amount;
    if (sortBy.value === "amountAsc") return a.amount - b.amount;
    return b.date.localeCompare(a.date);
  });

  return filtered;
}

function renderSummary(filtered) {
  const totals = filtered.reduce(
    (acc, txn) => {
      if (txn.type === "Income") acc.income += txn.amount;
      else acc.expense += txn.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const net = totals.income - totals.expense;

  summaryCards.innerHTML = "";
  const items = [
    { label: "Income", value: formatCurrency(totals.income) },
    { label: "Expense", value: formatCurrency(totals.expense) },
    { label: "Net", value: formatCurrency(net) },
    { label: "Transactions", value: String(filtered.length) },
  ];

  items.forEach((item) => {
    const node = document.createElement("article");
    node.className =
      "rounded-2xl border border-cyan-400/20 bg-slate-950/45 px-3 py-3";
    node.innerHTML = `<p class="text-xs uppercase tracking-wide text-slate-400">${item.label}</p><strong class="mt-1 block text-lg font-bold text-cyan-100">${item.value}</strong>`;
    summaryCards.appendChild(node);
  });
}

function renderTable() {
  const filtered = buildFilteredTransactions();
  renderSummary(filtered);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const currentRows = filtered.slice(start, start + PAGE_SIZE);

  tableBody.innerHTML = "";
  if (!currentRows.length) {
    const row = document.createElement("tr");
    row.innerHTML =
      '<td colspan="6" class="px-4 py-5 text-center text-slate-400">No transactions found for selected filters.</td>';
    tableBody.appendChild(row);
  } else {
    currentRows.forEach((txn) => {
      const amountClass = txn.type === "Income" ? "text-emerald-300" : "text-rose-300";
      const typeClass =
        txn.type === "Income"
          ? "bg-emerald-500/15 text-emerald-300 border-emerald-300/30"
          : "bg-rose-500/15 text-rose-300 border-rose-300/30";
      const amountPrefix = txn.type === "Income" ? "+" : "-";
      const row = document.createElement("tr");
      row.className = "hover:bg-cyan-900/10 transition";
      row.innerHTML = `
        <td class="px-4 py-3 text-slate-300">${txn.date}</td>
        <td class="px-4 py-3"><span class="rounded-full border px-2 py-1 text-xs font-semibold ${typeClass}">${txn.type}</span></td>
        <td class="px-4 py-3 text-slate-200">${txn.category}</td>
        <td class="px-4 py-3 text-slate-300">${txn.paymentMode}</td>
        <td class="px-4 py-3 text-slate-400">${txn.notes || "-"}</td>
        <td class="px-4 py-3 text-right font-bold ${amountClass}">${amountPrefix}${formatCurrency(txn.amount)}</td>
      `;
      tableBody.appendChild(row);
    });
  }

  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;

  renderCharts(filtered);
  renderBudgetList();
}

function renderCharts(filtered) {
  const expenseByCategory = {};
  filtered.forEach((txn) => {
    if (txn.type === "Expense") {
      expenseByCategory[txn.category] = (expenseByCategory[txn.category] || 0) + txn.amount;
    }
  });

  const pieLabels = Object.keys(expenseByCategory);
  const pieData = Object.values(expenseByCategory);

  if (expensePieChart) expensePieChart.destroy();
  expensePieChart = new Chart(document.getElementById("expensePieChart"), {
    type: "pie",
    data: {
      labels: pieLabels.length ? pieLabels : ["No Expense Data"],
      datasets: [
        {
          data: pieData.length ? pieData : [1],
          backgroundColor: ["#007a5a", "#e76f51", "#457b9d", "#f4a261", "#2a9d8f", "#264653", "#ef476f"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#cbd5e1" },
        },
      },
    },
  });

  const monthlyMap = {};
  filtered.forEach((txn) => {
    const month = txn.date.slice(0, 7);
    monthlyMap[month] = monthlyMap[month] || { Income: 0, Expense: 0 };
    monthlyMap[month][txn.type] += txn.amount;
  });

  const sortedMonths = Object.keys(monthlyMap).sort();
  const incomeSeries = sortedMonths.map((key) => monthlyMap[key].Income);
  const expenseSeries = sortedMonths.map((key) => monthlyMap[key].Expense);

  if (monthlyBarChart) monthlyBarChart.destroy();
  monthlyBarChart = new Chart(document.getElementById("monthlyBarChart"), {
    type: "bar",
    data: {
      labels: sortedMonths.length ? sortedMonths : ["No Data"],
      datasets: [
        {
          label: "Income",
          data: sortedMonths.length ? incomeSeries : [0],
          backgroundColor: "#0f766e",
        },
        {
          label: "Expense",
          data: sortedMonths.length ? expenseSeries : [0],
          backgroundColor: "#e76f51",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#cbd5e1" },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#cbd5e1" },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
        x: {
          ticks: { color: "#cbd5e1" },
          grid: { color: "rgba(148, 163, 184, 0.08)" },
        },
      },
    },
  });
}

function getCurrentMonthExpensesByCategory() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return transactions.reduce((acc, txn) => {
    if (txn.type !== "Expense") return acc;
    const txDate = parseDate(txn.date);
    if (!txDate) return acc;
    if (txDate.getFullYear() !== year || txDate.getMonth() !== month) return acc;
    acc[txn.category] = (acc[txn.category] || 0) + txn.amount;
    return acc;
  }, {});
}

function renderBudgetList() {
  const spentMap = getCurrentMonthExpensesByCategory();
  const budgetEntries = Object.entries(budgets).sort(([a], [b]) => a.localeCompare(b));

  if (!budgetEntries.length) {
    budgetList.innerHTML = '<p class="text-sm text-slate-400">No budgets set yet.</p>';
    return;
  }

  budgetList.innerHTML = "";
  budgetEntries.forEach(([category, limit]) => {
    const spent = spentMap[category] || 0;
    const remaining = limit - spent;
    const over = remaining < 0;

    const item = document.createElement("article");
    item.className = `rounded-2xl border px-3 py-3 ${
      over
        ? "border-rose-400/45 bg-rose-500/10"
        : "border-cyan-400/25 bg-slate-950/40"
    }`;
    item.innerHTML = `
      <strong class="text-slate-100">${category}</strong>
      <p class="mt-1 text-sm text-slate-300">Budget: ${formatCurrency(limit)} | Spent (this month): ${formatCurrency(spent)}</p>
      <p class="mt-1 text-sm ${over ? "text-rose-300" : "text-emerald-300"}">${over ? `Over by ${formatCurrency(Math.abs(remaining))}` : `Remaining ${formatCurrency(remaining)}`}</p>
    `;

    budgetList.appendChild(item);
  });
}

function validateTransaction(formData) {
  const amount = Number(formData.get("amount"));
  const type = formData.get("type");
  const category = normalizeCategory(String(formData.get("category") || ""));
  const date = String(formData.get("date") || "");
  const paymentMode = formData.get("paymentMode");
  const notes = String(formData.get("notes") || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be greater than 0." };
  if (!["Income", "Expense"].includes(type)) return { error: "Please select a valid transaction type." };
  if (!category) return { error: "Category is required." };
  if (category.length > 30) return { error: "Category should be 30 characters or less." };
  if (!date || !parseDate(date)) return { error: "Please provide a valid date." };
  if (!["Cash", "Card", "UPI"].includes(paymentMode)) return { error: "Please select a valid payment mode." };
  if (notes.length > 80) return { error: "Notes should be 80 characters or less." };

  return {
    value: {
      id: crypto.randomUUID(),
      amount,
      type,
      category,
      date,
      paymentMode,
      notes,
    },
  };
}

function validateBudget(formData) {
  const category = normalizeCategory(String(formData.get("budgetCategory") || ""));
  const amount = Number(formData.get("budgetAmount"));

  if (!category) return { error: "Budget category is required." };
  if (category.length > 30) return { error: "Category should be 30 characters or less." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Budget amount must be greater than 0." };

  return { value: { category, amount } };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.textContent = "";

  const result = validateTransaction(new FormData(form));
  if (result.error) {
    formError.textContent = result.error;
    return;
  }

  transactions.push(result.value);
  persist();
  form.reset();
  document.getElementById("date").value = new Date().toISOString().slice(0, 10);
  currentPage = 1;
  renderTable();
});

budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  budgetError.textContent = "";

  const result = validateBudget(new FormData(budgetForm));
  if (result.error) {
    budgetError.textContent = result.error;
    return;
  }

  budgets[result.value.category] = result.value.amount;
  persist();
  budgetForm.reset();
  renderTable();
});

[searchInput, sortBy, timeFilter, startDate, endDate].forEach((control) => {
  control.addEventListener("input", () => {
    currentPage = 1;
    renderTable();
  });
  control.addEventListener("change", () => {
    currentPage = 1;
    renderTable();
  });
});

timeFilter.addEventListener("change", () => {
  const custom = timeFilter.value === "custom";
  startDate.disabled = !custom;
  endDate.disabled = !custom;
});

prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage -= 1;
    renderTable();
  }
});

nextPageBtn.addEventListener("click", () => {
  const total = Math.max(1, Math.ceil(buildFilteredTransactions().length / PAGE_SIZE));
  if (currentPage < total) {
    currentPage += 1;
    renderTable();
  }
});

(function init() {
  document.getElementById("date").value = new Date().toISOString().slice(0, 10);
  renderTable();
})();

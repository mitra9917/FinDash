# FinDash - Personal Finance Visualizer

FinDash is a responsive web-based personal finance dashboard to track income and expenses, set monthly category budgets, and visualize spending patterns with interactive charts.

## Project Overview

This project is designed as a practical finance dashboard that works entirely on the frontend using browser `localStorage`.

## Features

- Add transactions with:
  - Amount
  - Type (`Income` / `Expense`)
  - Category
  - Date
  - Payment mode (`Cash` / `Card` / `UPI`)
  - Notes
- Transaction history table with:
  - Search (category/notes)
  - Sorting (date and amount)
  - Time filters (weekly/monthly/custom range)
  - Pagination
- Analytics dashboard:
  - Expense distribution (Pie chart)
  - Monthly income vs expense (Bar chart)
  - Summary cards (income, expense, net, count)
- Budget planning:
  - Set monthly category budgets
  - Track spent vs budget for current month
  - Over-budget highlighting
- Responsive dark glassmorphism UI for desktop and mobile
- Validation and error handling for forms

## Tech Stack

- HTML5
- Tailwind CSS (CDN)
- JavaScript (Vanilla)
- Chart.js (CDN)
- LocalStorage for persistence

## Project Structure

```text
FinDash/
├── index.html
├── app.js
├── styles.css
├── DESCRIPTION.md
└── README.md
```

## How to Run Locally

1. Clone or download this repository.
2. Open `index.html` in your browser.
3. Start adding transactions and budgets.

Optional (recommended) local server:

```bash
# from repo root
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Data Storage

Data is stored in browser localStorage with keys:

- `findash_transactions_v1`
- `findash_budgets_v1`

Clearing browser storage removes saved data.

## Future Improvements

- Edit/delete transactions
- CSV import/export
- Multi-currency support
- Authentication + cloud sync

## License

This project is available for learning and personal use.

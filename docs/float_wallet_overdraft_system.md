
# 💳 Float Wallet + Overdraft System

---

## 🔍 What is it?

A **Float Wallet** allows users to spend more than they currently have in their wallet by drawing from a pre-approved credit line — often called a **float** or **overdraft**.

---

## 🧩 Core Components

| Component             | Role                                                                 |
|-----------------------|----------------------------------------------------------------------|
| **Wallet System**     | Manages user balances, transactions, and credit/debit operations     |
| **Float Ledger**      | Tracks borrowed amounts, interest, and repayment schedule            |
| **Credit Scoring Engine** | Determines user's float limit and eligibility                      |
| **Repayment Engine**  | Automatically deducts float from inflows or notifies for repayment   |
| **Interest Calculation** | Applies daily/monthly interest on outstanding float                 |
| **Notification System** | Alerts for float usage, repayments due, interest accrued           |

---

## 🏗️ System Architecture Overview

```
                 ┌────────────────────────────┐
                 │        Credit Engine       │
                 │  (scoring, eligibility)    │
                 └──────────┬─────────────────┘
                            │
                            ▼
┌─────────────┐     ┌────────────────┐      ┌──────────────────────┐
│  User Wallet│◄────┤   Float Ledger ├─────►│ Repayment Scheduler  │
└─────────────┘     └────────────────┘      └──────────────────────┘
       ▲                     ▲                          ▲
       │                     │                          │
       │             ┌───────┴──────┐             ┌─────┴─────┐
       │             │ Transaction  │             │ Notification│
       │             │   Engine     │             │   System    │
       │             └──────────────┘             └─────────────┘
       │
       ▼
User Interface
(Mobile App / Web)
```

---

## 💰 Float Transaction Flow

1. **User Initiates Transaction**
   - Their wallet balance is insufficient.

2. **System Checks Float Eligibility**
   - If eligible and within float limit, approve transaction.
   - Debit wallet into negative balance.

3. **Float Ledger Entry Created**
   - Log borrowed amount, timestamp, interest rate.

4. **Repayment Triggers**
   - On next deposit/inflow, system auto-deducts owed float.
   - Or user can manually repay.

---

## 🔐 Example Wallet States

| User         | Wallet Balance | Float Limit | Available to Spend | Owed Float |
|--------------|----------------|-------------|---------------------|------------|
| User A       | ₦0             | ₦5,000      | ₦5,000              | ₦0         |
| User B       | ₦2,000         | ₦3,000      | ₦5,000              | ₦0         |
| User C       | -₦2,000        | ₦3,000      | ₦1,000              | ₦2,000     |

---

## 📈 Interest & Penalties

| Parameter           | Description                                        |
|---------------------|----------------------------------------------------|
| Interest Rate       | e.g. 1.5% monthly or 0.05% daily                    |
| Grace Period        | Optional (e.g. 7 days interest-free)               |
| Penalty             | Flat fee or higher interest on missed repayment    |
| Max Utilization     | % of credit limit that can be borrowed at once     |

---

## 🧠 Credit Scoring Options

| Method                     | Example Sources                            |
|----------------------------|--------------------------------------------|
| Behavioral Data            | Wallet usage, repayments, txn frequency    |
| KYC Info                   | Verified ID, job status, income proof      |
| External Credit Bureaus    | e.g. CRC, CreditRegistry, FirstCentral     |
| Partner APIs               | e.g. Mono, Okra, Smile ID, VerifyMe        |

---

## 🧾 Sample Ledger Table

| ID  | UserID | Float Amount | Date Borrowed | Due Date | Interest | Status     |
|-----|--------|--------------|----------------|----------|----------|------------|
| 1   | 001    | ₦3,000       | 2025-04-10     | 2025-04-17 | ₦150     | Active     |
| 2   | 002    | ₦2,500       | 2025-04-08     | 2025-04-15 | ₦125     | Repaid     |

---

## ✅ Key Business Rules

- Can’t float beyond approved limit
- Partial repayment allowed
- Float can't be used for certain transactions (optional rule)
- Must settle old float before using new one
- Block wallet on overdue repayments (optional)

---

## 📌 Use Cases

- Salary Advance Wallets
- Emergency Loan Wallet
- Agent Float for Cash-Outs
- B2B Vendor Prepayment

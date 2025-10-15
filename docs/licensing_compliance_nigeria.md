
# 🛡️ Licensing & Compliance for Fintech in Nigeria

## 🏛️ 1. Central Bank of Nigeria (CBN)

CBN is the primary regulator of financial services in Nigeria.

### ✅ Common CBN Licenses for Wallets/Agency:

| License Type                     | Purpose                                              | Capital Req (₦)   |
|----------------------------------|-------------------------------------------------------|-------------------|
| **PSP (Payment Service Provider)** | General payment processing                          | ₦250M+            |
| **MMO (Mobile Money Operator)**   | Full wallet management, cash in/out, transfers       | ₦2B+              |
| **PTSP (POS Terminal Provider)**  | Provides POS devices, but doesn’t process payments   | ₦100M             |
| **PSSP (Payment Solution Service Provider)** | Gateways, processors, billing APIs | ₦100M             |
| **Super Agent**                   | Manages agent networks across Nigeria                | ₦50M              |
| **Switching & Processing License**| Advanced—payment routing, interbank switching        | ₦2B+              |

> If there's no license, **we must partner with a licensed provider** (e.g. Paystack, TeamApt, Interswitch, Providus, etc.).

---

## 👥 2. KYC (Know Your Customer)

All fintech platforms must implement **tiered KYC** according to CBN/NDIC guidelines.

| Tier | Requirements                         | Wallet Limitations                          |
|------|--------------------------------------|---------------------------------------------|
| 0    | Phone number                         | Max ₦20,000 balance, ₦3,000 txn limit       |
| 1    | Name + phone + DOB                   | ₦50,000 daily, ₦300,000 monthly             |
| 2    | + Valid ID (NIN, Voter, BVN)         | ₦200,000 daily, ₦1M monthly                 |
| 3    | + Utility bill, address verification | Higher limits, full financial access        |

> Use services like **Smile Identity**, **VerifyMe**, or **IdentityPass** to verify BVN, NIN, and capture selfie/ID photos.

---

## 🔒 3. NDPR (Nigeria Data Protection Regulation)

The **NDPR**, enforced by **NITDA**, protects the privacy of Nigerian users.

### You Must:
- Get user **consent** for data usage
- Store personal data securely (hashed, encrypted)
- Provide data access/removal on request
- Avoid data transfer outside Nigeria without safeguards
- Notify users in case of data breach

> Fines can go up to **₦10M or 2% of gross revenue** for violations.

---

## 🧾 4. Taxation & Financial Reporting

| Requirement | Enforced By     | Notes                           |
|-------------|-----------------|---------------------------------|
| TIN & Tax Filing | FIRS            | File annually + PAYE for staff |
| SCUML Registration | EFCC           | Needed if handling cash > ₦5M |
| AML/CFT Program | CBN & EFCC     | Detect/report suspicious activity |

---

## 💳 5. Card Schemes & Settlement Banks

If you’re issuing cards or handling card-based payments:

- **Partner with a CBN-licensed settlement bank** (e.g. Providus, Wema, Sterling)
- For debit cards, integrate via **Interswitch**, **Verve**, or **Mastercard/Visa**
- Settlement must be tracked and reported to CBN

---

## ⚙️ 6. Compliance Integration Tips

| Area            | Tool/Service                             |
|-----------------|------------------------------------------|
| BVN/NIN lookup  | VerifyMe, Smile ID, NIMC, IdentityPass   |
| AML Screening   | ComplyAdvantage, Onfido, LexisNexis      |
| Transaction Monitoring | Build or use APIs (e.g. Sentinels) |
| Data Privacy    | Internal policy + NDPR checklist         |

---

## 🤝 Bonus: Partnership Model Without License

If you can’t yet afford a license:
1. **White-label a wallet from a licensed provider**
   - e.g. **Monnify**, **Paystack**, **TeamApt**, **OnePipe**
2. **Operate under their compliance umbrella**
3. **Focus on customer experience, not regulation**

---

## 📌 Key Takeaways

- Start with **KYC + NDPR** compliance from Day 1
- If scaling, plan for **CBN licensing** (PSSP, MMO, etc.)
- Use **verified third-party APIs** to stay compliant
- Appoint a **compliance officer** as soon as you onboard real users

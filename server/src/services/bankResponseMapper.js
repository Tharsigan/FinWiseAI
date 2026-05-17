const CATEGORY_RULES = [
  ["Food", ["keells", "food", "grocery", "groceries", "kottu", "coffee", "pizza"]],
  ["Transport", ["pickme", "uber", "bus", "train", "transport", "ride"]],
  ["Rent", ["rent", "boarding", "hostel", "accommodation"]],
  ["Mobile Data", ["dialog", "mobitel", "hutch", "airtel", "reload", "data", "mobile"]],
  ["Entertainment", ["cinema", "movie", "netflix", "spotify", "game", "promo"]],
  ["Savings", ["saving", "savings", "sweep"]],
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeKey(key) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getByPossibleKeys(record, possibleKeys) {
  if (!isRecord(record)) return undefined;
  const wanted = new Set(possibleKeys.map(normalizeKey));
  for (const [key, value] of Object.entries(record)) {
    if (wanted.has(normalizeKey(key))) return value;
  }
  return undefined;
}

function getTransactionValue(record, possibleKeys) {
  return getByPossibleKeys(record, possibleKeys) ?? findFirstByKey(record, possibleKeys);
}

function findFirstByKey(value, possibleKeys) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findFirstByKey(entry, possibleKeys);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;

  const direct = getByPossibleKeys(value, possibleKeys);
  if (direct !== undefined) return direct;

  for (const child of Object.values(value)) {
    const found = findFirstByKey(child, possibleKeys);
    if (found !== undefined) return found;
  }

  return undefined;
}

function findFirstArray(value, preferredKeys = []) {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return undefined;

  for (const key of preferredKeys) {
    const direct = getByPossibleKeys(value, [key]);
    if (Array.isArray(direct)) return direct;
  }

  for (const child of Object.values(value)) {
    const found = findFirstArray(child, preferredKeys);
    if (found) return found;
  }

  return undefined;
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringValue(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function maskAccount(accountNumber) {
  const clean = String(accountNumber || "").replace(/\s/g, "");
  if (clean.length <= 4) return clean ? `**${clean}` : "Sandbox account";
  return `**${clean.slice(-4)}`;
}

function parseDateISO(value) {
  const raw = toStringValue(value);
  if (!raw) return new Date().toISOString().slice(0, 10);

  const isoMatch = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;

  const slash = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    const [, dd, mm, yyyy] = slash;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
}

export function readBankStatus(raw) {
  const code = toStringValue(findFirstByKey(raw, ["Code", "StatusCode"]), "UNKNOWN");
  const description = toStringValue(
    findFirstByKey(raw, ["Description", "Message", "StatusDescription"]),
    code === "0000" ? "Success" : "Bank request did not return a success code.",
  );

  return {
    code,
    description,
    success: code === "0000",
  };
}

export function categorizeBankNarration(description) {
  const haystack = String(description || "").toLowerCase();
  const match = CATEGORY_RULES.find(([, needles]) =>
    needles.some((needle) => haystack.includes(needle)),
  );
  return match ? match[0] : "Other";
}

export function mapBalanceResponse(raw, accountNumber) {
  const available = findFirstByKey(raw, [
    "AvailableBalance",
    "Available_Balance",
    "AccountBalance",
    "Balance",
    "AvailableAmount",
  ]);
  const ledger = findFirstByKey(raw, [
    "LedgerBalance",
    "CurrentBalance",
    "ActualBalance",
  ]);
  const currency = toStringValue(findFirstByKey(raw, ["Currency", "CurrencyCode"]), "LKR");

  return {
    currency,
    availableLKR: toNumber(available || ledger),
    ledgerLKR: toNumber(ledger || available),
    accountNumberMasked: maskAccount(accountNumber),
    accountType: "Seylan Sandbox Account",
    retrievedAt: new Date().toISOString(),
  };
}

export function mapTransactionResponse(raw) {
  const rows = findFirstArray(raw, [
    "Transactions",
    "Transaction",
    "TransactionList",
    "TransactionDetail",
    "TransactionDetails",
    "TransactionHistory",
    "AccountTransactions",
  ]);
  const list = Array.isArray(rows) ? rows : [];

  return list.map((entry, index) => {
    const record = isRecord(entry) ? entry : {};
    const description = toStringValue(
      getTransactionValue(record, [
        "Description",
        "Narration",
        "TransactionDescription",
        "TransactionNarration",
        "Remarks",
        "Particulars",
      ]),
      "Seylan sandbox transaction",
    );
    const debit = toNumber(
      getTransactionValue(record, [
        "DebitAmount",
        "Debit",
        "WithdrawalAmount",
        "DrAmount",
        "DebitValue",
      ]),
    );
    const credit = toNumber(
      getTransactionValue(record, [
        "CreditAmount",
        "Credit",
        "DepositAmount",
        "CrAmount",
        "CreditValue",
      ]),
    );
    const signedAmount = toNumber(
      getTransactionValue(record, ["Amount", "TransactionAmount", "TxnAmount"]),
    );
    const direction = toStringValue(
      getTransactionValue(record, [
        "DebitCreditIndicator",
        "DebitCredit",
        "DrCr",
        "DRCR",
        "TransactionType",
        "Type",
      ]),
    ).toLowerCase();
    const directedDebit =
      direction === "d" ||
      direction === "dr" ||
      direction.includes("debit") ||
      direction.includes("withdrawal")
        ? Math.abs(signedAmount)
        : 0;
    const directedCredit =
      direction === "c" ||
      direction === "cr" ||
      direction.includes("credit") ||
      direction.includes("deposit")
        ? Math.abs(signedAmount)
        : 0;
    const inferredDebit =
      debit > 0
        ? debit
        : directedDebit > 0
          ? directedDebit
          : signedAmount < 0
            ? Math.abs(signedAmount)
            : 0;
    const inferredCredit =
      credit > 0
        ? credit
        : directedCredit > 0
          ? directedCredit
          : signedAmount > 0 && directedDebit === 0
            ? signedAmount
            : 0;
    const id = toStringValue(
      getTransactionValue(record, [
        "Reference",
        "ReferenceNumber",
        "TransactionReference",
        "TransactionId",
        "TransactionID",
        "TxnId",
        "SerialNumber",
      ]),
      `seylan-${index + 1}`,
    );

    return {
      id,
      dateISO: parseDateISO(
        getTransactionValue(record, [
          "Date",
          "TransactionDate",
          "ValueDate",
          "PostingDate",
          "TxnDate",
          "EffectiveDate",
        ]),
      ),
      description,
      category: categorizeBankNarration(description),
      debit: inferredDebit,
      credit: inferredCredit,
    };
  });
}

export function mapTransferResponse(raw, amount, beneficiaryLabel, reference) {
  const status = readBankStatus(raw);
  const bankReference = toStringValue(
    findFirstByKey(raw, [
      "TransactionReference",
      "TransactionReferenceNumber",
      "ReferenceNumber",
      "FTReference",
      "ResponseReference",
      "TransactionId",
      "TransactionID",
    ]),
  );

  return {
    amountLKR: amount,
    beneficiaryLabel,
    reference,
    bankReference: bankReference || null,
    status: status.success ? "accepted_sandbox" : "rejected_sandbox",
    acceptedAt: new Date().toISOString(),
    bankStatus: status,
  };
}

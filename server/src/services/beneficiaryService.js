import crypto from "node:crypto";

import { HttpError } from "../http/errors.js";

const BANK_NAME = "Seylan Bank";
const ACCOUNT_NUMBER_PATTERN = /^\d{6,18}$/;

const beneficiaries = [
  {
    id: "ben-amaya-campus-savings",
    name: "Amaya · Campus savings",
    bankName: BANK_NAME,
    accountNumber: "001213437904100",
  },
  {
    id: "ben-campus-hostel-fees",
    name: "Campus Hostel Office",
    bankName: BANK_NAME,
    accountNumber: "4567891248",
  },
  {
    id: "ben-transport-card",
    name: "Seylan Transport Card",
    bankName: BANK_NAME,
    accountNumber: "4567891256",
  },
  {
    id: "ben-mobile-data",
    name: "Mobile Data Reload",
    bankName: BANK_NAME,
    accountNumber: "4567891264",
  },
];

function maskAccountNumber(accountNumber) {
  const visible = accountNumber.slice(-4);
  return `**${visible}`;
}

function serializeBeneficiary(beneficiary) {
  return {
    id: beneficiary.id,
    name: beneficiary.name,
    bankName: beneficiary.bankName,
    accountNumberMasked: maskAccountNumber(beneficiary.accountNumber),
  };
}

function normalizeBeneficiaryInput(input) {
  const name = String(input?.name ?? "").trim().replace(/\s+/g, " ");
  const accountNumber = String(input?.accountNumber ?? "").trim();

  if (name.length < 2 || name.length > 80) {
    throw new HttpError(
      400,
      "INVALID_BENEFICIARY_NAME",
      "Enter a beneficiary name between 2 and 80 characters.",
    );
  }

  if (!ACCOUNT_NUMBER_PATTERN.test(accountNumber)) {
    throw new HttpError(
      400,
      "INVALID_BENEFICIARY_ACCOUNT",
      "Seylan beneficiary account numbers must contain 6 to 18 digits.",
    );
  }

  return { name, accountNumber };
}

export function listBeneficiaries() {
  return beneficiaries.map(serializeBeneficiary);
}

export function getBeneficiaryById(id) {
  return beneficiaries.find((beneficiary) => beneficiary.id === id) ?? null;
}

export function createBeneficiary(input) {
  const { name, accountNumber } = normalizeBeneficiaryInput(input);
  const duplicate = beneficiaries.find(
    (beneficiary) => beneficiary.accountNumber === accountNumber,
  );

  if (duplicate) {
    return serializeBeneficiary(duplicate);
  }

  const beneficiary = {
    id: `ben-${crypto.randomUUID().slice(0, 8)}`,
    name,
    bankName: BANK_NAME,
    accountNumber,
  };
  beneficiaries.push(beneficiary);
  return serializeBeneficiary(beneficiary);
}

export function serializeSelectedBeneficiary(beneficiary) {
  return serializeBeneficiary(beneficiary);
}

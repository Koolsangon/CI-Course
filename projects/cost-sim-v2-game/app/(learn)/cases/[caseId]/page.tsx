import { CASES } from "@/lib/cases";
import CaseClient from "./CaseClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(CASES).map((caseId) => ({ caseId }));
}

export default function CasePage() {
  return <CaseClient />;
}

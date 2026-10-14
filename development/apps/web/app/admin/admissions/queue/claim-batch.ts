export type ClaimSelection = {
  applicationId: string;
  reference: string;
  version: number;
};
export type ClaimState =
  | "WAITING"
  | "CONFIRMED"
  | "CHANGED"
  | "UNAVAILABLE"
  | "UNCERTAIN"
  | "ACCESS_CHANGED"
  | "RATE_LIMITED";
export type ClaimBatchItem = ClaimSelection & {
  idempotencyKey: string;
  state: ClaimState;
};
export function createClaimBatch(items: ClaimSelection[]): ClaimBatchItem[] {
  if (
    !items.length ||
    items.length > 50 ||
    new Set(items.map((item) => item.applicationId)).size !== items.length ||
    items.some(
      (item) =>
        !item.applicationId ||
        !item.reference ||
        !Number.isSafeInteger(item.version) ||
        item.version < 1,
    )
  ) {
    throw new Error("Select 1–50 different current cases.");
  }
  return items.map((item) => ({
    ...item,
    idempotencyKey: crypto.randomUUID(),
    state: "WAITING",
  }));
}
export async function runClaimBatch(
  items: ClaimBatchItem[],
  claim: (item: ClaimBatchItem) => Promise<unknown>,
  changed: (items: ClaimBatchItem[]) => void,
  paused: () => boolean,
): Promise<ClaimBatchItem[]> {
  const result = items.map((item) => ({ ...item }));
  for (const item of result) {
    if (paused()) break;
    if (["CONFIRMED", "CHANGED", "UNAVAILABLE"].includes(item.state)) continue;
    // An access change requires switching/re-establishing the workspace,
    // never silently continuing the same selection under another identity.
    if (item.state === "ACCESS_CHANGED") break;
    try {
      const receipt = (await claim(item)) as {
        applicationId?: string;
        status?: string;
      } | null;
      item.state =
        receipt?.applicationId === item.applicationId &&
        receipt.status === "CLAIMED"
          ? "CONFIRMED"
          : "UNCERTAIN";
    } catch (error) {
      const { status, detail } = error as {
        status?: number;
        detail?: { code?: string };
      };
      item.state =
        status === 401 || status === 403
          ? "ACCESS_CHANGED"
          : status === 429
            ? "RATE_LIMITED"
            : status === 404
              ? "UNAVAILABLE"
              : status === 409 && detail?.code === "VERSION_CONFLICT"
                ? "CHANGED"
                : status === 409 &&
                    ["ASSIGNMENT_CONFLICT", "NOT_CLAIMABLE"].includes(
                      detail?.code ?? "",
                    )
                  ? "UNAVAILABLE"
                  : "UNCERTAIN";
    }
    changed(result.map((row) => ({ ...row })));
    if (!["CONFIRMED", "CHANGED", "UNAVAILABLE"].includes(item.state)) break;
  }
  return result;
}

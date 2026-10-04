export function supportActionStatus(status: string) {
  if (status === "PROPOSED") return "Awaiting your response";
  if (status === "ACCEPTED") return "Agreed";
  if (status === "DECLINED") return "Declined";
  if (status === "CLAIMED_COMPLETE") return "Awaiting adviser confirmation";
  if (status === "COMPLETE") return "Complete";
  return "State unavailable";
}

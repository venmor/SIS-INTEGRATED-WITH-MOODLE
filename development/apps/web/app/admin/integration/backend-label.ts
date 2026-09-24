export function moodleBackendLabel(backend: string | null | undefined) {
  return backend === "live" ? "Live Moodle" : "Moodle simulator";
}

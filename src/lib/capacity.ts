export type CapacityStatus = "ok" | "warning" | "full";

export const getCapacityStatus = (
  enrollmentCount: number,
  capacity: number,
): CapacityStatus => {
  if (enrollmentCount >= capacity) return "full";
  if (enrollmentCount / capacity >= 0.8) return "warning";
  return "ok";
};

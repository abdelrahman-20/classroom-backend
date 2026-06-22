import { db } from "./db";
import { eq } from "drizzle-orm";
import { departments } from "./schema/schema";

async function main() {
  try {
    console.log("Performing CRUD operations...");

    // CREATE: Insert a new user
    const [newDepartment] = await db
      .insert(departments)
      .values({
        code: "CS",
        name: "Computer Science",
        description: "Computer Science Department",
      })
      .returning();

    if (!newDepartment) {
      throw new Error("Failed to create department");
    }

    console.log("✅ CREATE: New department created:", newDepartment);

    // READ: Select the department
    const foundDepartment = await db
      .select()
      .from(departments)
      .where(eq(departments.id, newDepartment.id));
    console.log("✅ READ: Found department:", foundDepartment[0]);

    // UPDATE: Change the department's name
    const [updatedDepartment] = await db
      .update(departments)
      .set({ name: "Super Admin" })
      .where(eq(departments.id, newDepartment.id))
      .returning();

    if (!updatedDepartment) {
      throw new Error("Failed to update department");
    }

    console.log("✅ UPDATE: Department updated:", updatedDepartment);

    // DELETE: Remove the department
    await db.delete(departments).where(eq(departments.id, newDepartment.id));
    console.log("✅ DELETE: Department deleted.");

    console.log("\nCRUD operations completed successfully.");
  } catch (error) {
    console.error("❌ Error performing CRUD operations:", error);
    process.exit(1);
  }
}

main();

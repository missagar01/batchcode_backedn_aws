const pool = require("./src/config/db");
async function fixHotCoilSchema() {
    try {
        console.log("Checking and fixing hot_coil schema...");

        // Ensure necessary columns exist in hot_coil
        await pool.query(`
            ALTER TABLE hot_coil 
            ADD COLUMN IF NOT EXISTS picture text,
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);

        console.log("Schema fix completed successfully");
    } catch (err) {
        console.error("Error fixing schema:", err);
    } finally {
        process.exit();
    }
}
fixHotCoilSchema();

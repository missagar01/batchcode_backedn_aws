const pool = require("./src/config/db");
async function fixSchema() {
    try {
        await pool.query("ALTER TABLE sms_register ADD COLUMN IF NOT EXISTS melter_name text");
        await pool.query("ALTER TABLE sms_register ADD COLUMN IF NOT EXISTS shift_incharge text");
        await pool.query("ALTER TABLE sms_register ADD COLUMN IF NOT EXISTS temperature text");
        await pool.query("ALTER TABLE sms_register ADD COLUMN IF NOT EXISTS unique_code text");
        console.log("Schema fixed successfully");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
fixSchema();

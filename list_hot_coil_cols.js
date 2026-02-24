const pool = require("./src/config/db");
async function checkHotCoilColumns() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'hot_coil'
        `);
        console.log("COLUMNS IN hot_coil:");
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
checkHotCoilColumns();

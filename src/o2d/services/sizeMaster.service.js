const { pgQuery } = require("../../../config/pg.js");

/**
 * Get all size master data from PostgreSQL database
 * @returns {Promise<Array>} Array of size master records
 */
async function getSizeMasterData() {
    try {
        const query = `SELECT * FROM size_master ORDER BY id`;
        const result = await pgQuery(query);
        return result.rows;
    } catch (err) {
        console.error("Error fetching size master data:", err);
        throw err;
    }
}

/**
 * Get size master data by ID
 * @param {number} id - The size master ID
 * @returns {Promise<Object>} Size master record
 */
async function getSizeMasterById(id) {
    try {
        const query = `SELECT * FROM size_master WHERE id = $1`;
        const result = await pgQuery(query, [id]);
        return result.rows[0] || null;
    } catch (err) {
        console.error("Error fetching size master by ID:", err);
        throw err;
    }
}

/**
 * Create a new enquiry in the database
 * @param {Object} enquiryData - The enquiry data
 * @returns {Promise<Object>} Created enquiry record
 */
async function createEnquiry(enquiryData) {
    try {
        const { item_type, size, thickness, enquiry_date, customer, quantity } = enquiryData;

        const query = `
            INSERT INTO enq_erp (item_type, size, thickness, enquiry_date, customer, quantity)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            item_type,
            size,
            parseFloat(thickness),
            enquiry_date,
            customer,
            quantity ? parseInt(quantity) : null
        ];

        const result = await pgQuery(query, values);
        return result.rows[0];
    } catch (err) {
        console.error("Error creating enquiry:", err);
        throw err;
    }
}

module.exports = {
    getSizeMasterData,
    getSizeMasterById,
    createEnquiry
};

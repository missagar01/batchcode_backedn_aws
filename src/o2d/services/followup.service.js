const { pgQuery } = require("../../../config/pg.js");
const { generateCacheKey, withCache, delCached, DEFAULT_TTL } = require("../utils/cacheHelper.js");

const FOLLOWUPS_CACHE_KEY = generateCacheKey("followups");

/**
 * Get all followups
 */
async function getAllFollowups() {
    return withCache(FOLLOWUPS_CACHE_KEY, DEFAULT_TTL.TIMELINE, async () => {
        try {
            const query = `
                SELECT 
                    followup_id, 
                    client_name, 
                    sales_person, 
                    actual_order, 
                    actual_order_date, 
                    date_of_calling, 
                    next_calling_date 
                FROM client_followups 
                ORDER BY date_of_calling ASC 
                LIMIT 500
            `;
            const result = await pgQuery(query);
            return result.rows;
        } catch (err) {
            console.error("Error fetching followups:", err);
            throw err;
        }
    });
}

/**
 * Create a new followup
 */
async function createFollowup(followupData) {
    try {
        const {
            client_name,
            sales_person,
            actual_order,
            actual_order_date,
            date_of_calling,
            next_calling_date
        } = followupData;

        const query = `
            INSERT INTO client_followups (
                client_name, sales_person, actual_order, 
                actual_order_date, date_of_calling, next_calling_date
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            client_name,
            sales_person,
            actual_order ? parseFloat(actual_order) : 0,
            actual_order_date || null,
            date_of_calling || new Date(),
            next_calling_date || null
        ];

        const result = await pgQuery(query, values);

        // Invalidate cache
        await delCached(FOLLOWUPS_CACHE_KEY);

        return result.rows[0];
    } catch (err) {
        console.error("Error creating followup:", err);
        throw err;
    }
}

/**
 * Get followup by ID
 */
async function getFollowupById(followupId) {
    try {
        const query = `SELECT followup_id, client_name, sales_person, actual_order, actual_order_date, date_of_calling, next_calling_date FROM client_followups WHERE followup_id = $1`;
        const result = await pgQuery(query, [followupId]);
        return result.rows[0] || null;
    } catch (err) {
        console.error("Error fetching followup by ID:", err);
        throw err;
    }
}

/**
 * Update a followup
 */
async function updateFollowup(followupId, followupData) {
    try {
        const {
            client_name,
            sales_person,
            actual_order,
            actual_order_date,
            date_of_calling,
            next_calling_date
        } = followupData;

        const query = `
            UPDATE client_followups 
            SET client_name = $1, 
                sales_person = $2, 
                actual_order = $3, 
                actual_order_date = $4, 
                date_of_calling = $5, 
                next_calling_date = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE followup_id = $7
            RETURNING *
        `;

        const values = [
            client_name,
            sales_person,
            actual_order ? parseFloat(actual_order) : 0,
            actual_order_date,
            date_of_calling,
            next_calling_date,
            followupId
        ];

        const result = await pgQuery(query, values);

        // Invalidate cache
        await delCached(FOLLOWUPS_CACHE_KEY);

        return result.rows[0];
    } catch (err) {
        console.error("Error updating followup:", err);
        throw err;
    }
}

/**
 * Delete a followup
 */
async function deleteFollowup(followupId) {
    try {
        const query = `DELETE FROM client_followups WHERE followup_id = $1 RETURNING *`;
        const result = await pgQuery(query, [followupId]);

        // Invalidate cache
        await delCached(FOLLOWUPS_CACHE_KEY);

        return result.rows[0];
    } catch (err) {
        console.error("Error deleting followup:", err);
        throw err;
    }
}

module.exports = {
    getAllFollowups,
    createFollowup,
    getFollowupById,
    updateFollowup,
    deleteFollowup
};

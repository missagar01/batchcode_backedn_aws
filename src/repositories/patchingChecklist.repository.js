const pool = require("../config/db");

let patchingChecklistSchemaReadyPromise;
let patchingChecklistIdSequenceReadyPromise;

const ensurePatchingChecklistSchema = async () => {
    if (patchingChecklistSchemaReadyPromise) {
        return patchingChecklistSchemaReadyPromise;
    }

    patchingChecklistSchemaReadyPromise = pool
        .query(`
      CREATE TABLE IF NOT EXISTS patching_checklist (
        id SERIAL PRIMARY KEY,
        check_date DATE,
        furnace_number VARCHAR(50),
        crucible_number VARCHAR(50),
        rm_party_name VARCHAR(150),
        material_type VARCHAR(100),
        rm_bag_pic TEXT,
        patching_start_time TIMESTAMP,
        patching_end_time TIMESTAMP,
        fc_breaking_check BOOLEAN,
        lining_check BOOLEAN,
        gld_check BOOLEAN,
        premix_check BOOLEAN,
        bottom_check BOOLEAN,
        full_check BOOLEAN,
        nali_top_dry_check BOOLEAN,
        weight_check BOOLEAN,
        proper_weight_per_check BOOLEAN,
        mix_check BOOLEAN,
        checked_by VARCHAR(100),
        pprm_party VARCHAR(150),
        p_patching_life INTEGER,
        unique_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE patching_checklist 
        ADD COLUMN IF NOT EXISTS unique_code TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      
      -- Ensure default for created_at
      ALTER TABLE patching_checklist ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
    `)
        .catch((error) => {
            patchingChecklistSchemaReadyPromise = null;
            throw error;
        });

    return patchingChecklistSchemaReadyPromise;
};

const ensurePatchingChecklistIdSequence = async () => {
    if (patchingChecklistIdSequenceReadyPromise) {
        return patchingChecklistIdSequenceReadyPromise;
    }

    patchingChecklistIdSequenceReadyPromise = (async () => {
        // Serial already creates a sequence, but we ensure it's synced if needed
        await pool.query(`SELECT setval(pg_get_serial_sequence('patching_checklist', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM patching_checklist;`);
    })().catch((error) => {
        patchingChecklistIdSequenceReadyPromise = null;
        throw error;
    });

    return patchingChecklistIdSequenceReadyPromise;
};

const toBool = (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
        const lower = val.toLowerCase();
        if (lower === 'yes' || lower === 'true') return true;
        if (lower === 'no' || lower === 'false') return false;
    }
    return null;
};

const insertPatchingChecklist = async (payload) => {
    const {
        check_date,
        furnace_number,
        crucible_number,
        rm_party_name,
        material_type,
        rm_bag_pic,
        patching_start_time,
        patching_end_time,
        fc_breaking_check,
        lining_check,
        gld_check,
        premix_check,
        bottom_check,
        full_check,
        nali_top_dry_check,
        weight_check,
        proper_weight_per_check,
        mix_check,
        checked_by,
        pprm_party,
        p_patching_life,
        unique_code
    } = payload;

    await ensurePatchingChecklistSchema();
    await ensurePatchingChecklistIdSequence();

    const query = `
    INSERT INTO patching_checklist (
      check_date,
      furnace_number,
      crucible_number,
      rm_party_name,
      material_type,
      rm_bag_pic,
      patching_start_time,
      patching_end_time,
      fc_breaking_check,
      lining_check,
      gld_check,
      premix_check,
      bottom_check,
      full_check,
      nali_top_dry_check,
      weight_check,
      proper_weight_per_check,
      mix_check,
      checked_by,
      pprm_party,
      p_patching_life,
      unique_code,
      created_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, DEFAULT
    )
    RETURNING *
  `;

    const values = [
        check_date ?? null,
        furnace_number ?? null,
        crucible_number ?? null,
        rm_party_name ?? null,
        material_type ?? null,
        rm_bag_pic ?? null,
        patching_start_time ?? null,
        patching_end_time ?? null,
        toBool(fc_breaking_check),
        toBool(lining_check),
        toBool(gld_check),
        toBool(premix_check),
        toBool(bottom_check),
        toBool(full_check),
        toBool(nali_top_dry_check),
        toBool(weight_check),
        toBool(proper_weight_per_check),
        toBool(mix_check),
        checked_by ?? null,
        pprm_party ?? null,
        p_patching_life ?? null,
        unique_code ?? null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};

const findPatchingChecklists = async ({ id, uniqueCode } = {}) => {
    await ensurePatchingChecklistSchema();

    const filters = [];
    const values = [];

    if (id) {
        values.push(id);
        filters.push(`id = $${values.length}`);
    }

    if (uniqueCode) {
        values.push(uniqueCode);
        filters.push(`unique_code = $${values.length}`);
    }

    let query = `SELECT * FROM patching_checklist`;
    if (filters.length) {
        query += ` WHERE ${filters.join(' OR ')}`;
    }
    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query, values);
    return rows;
};

module.exports = {
    insertPatchingChecklist,
    findPatchingChecklists
};

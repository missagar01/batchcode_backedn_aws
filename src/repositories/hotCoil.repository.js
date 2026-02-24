const pool = require('../config/db');

let hotCoilIdSequenceReadyPromise;

const ensureHotCoilIdSequence = async () => {
  if (hotCoilIdSequenceReadyPromise) {
    return hotCoilIdSequenceReadyPromise;
  }

  hotCoilIdSequenceReadyPromise = (async () => {
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS hot_coil_id_seq;`);
    await pool.query(`
      SELECT setval(
        'hot_coil_id_seq',
        COALESCE((SELECT MAX(id) FROM hot_coil), 0) + 1,
        false
      );
    `);
  })().catch((error) => {
    hotCoilIdSequenceReadyPromise = null;
    throw error;
  });

  return hotCoilIdSequenceReadyPromise;
};

let hotCoilSchemaReadyPromise;

const ensureHotCoilSchema = async () => {
  if (hotCoilSchemaReadyPromise) {
    return hotCoilSchemaReadyPromise;
  }

  hotCoilSchemaReadyPromise = (async () => {
    // Add missing columns if they don't exist
    await pool.query(`
      ALTER TABLE hot_coil 
      ADD COLUMN IF NOT EXISTS picture text,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);
  })().catch((error) => {
    hotCoilSchemaReadyPromise = null;
    throw error;
  });

  return hotCoilSchemaReadyPromise;
};

const insertHotCoil = async (payload) => {
  const {
    sample_timestamp,
    sms_short_code,
    submission_type,
    size = null,
    mill_incharge = null,
    quality_supervisor = null,
    picture = null,
    electrical_dc_operator = null,
    remarks = null,
    strand1_temperature = null,
    strand2_temperature = null,
    shift_supervisor = null,
    unique_code
  } = payload;

  await ensureHotCoilSchema();
  await ensureHotCoilIdSequence();

  const query = `
    INSERT INTO hot_coil (
      id,
      sample_timestamp,
      sms_short_code,
      submission_type,
      size,
      mill_incharge,
      quality_supervisor,
      picture,
      electrical_dc_operator,
      remarks,
      strand1_temperature,
      strand2_temperature,
      shift_supervisor,
      unique_code,
      created_at,
      updated_at
    )
    VALUES (nextval('hot_coil_id_seq'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
    RETURNING *
  `;

  const values = [
    sample_timestamp ?? null,
    sms_short_code,
    submission_type,
    size,
    mill_incharge,
    quality_supervisor,
    picture,
    electrical_dc_operator,
    remarks,
    strand1_temperature,
    strand2_temperature,
    shift_supervisor,
    unique_code
  ];

  let result;
  try {
    result = await pool.query(query, values);
  } catch (error) {
    const looksLikeIdConflict =
      error?.code === "23505" && /id/i.test(String(error?.detail || ""));

    if (!looksLikeIdConflict) {
      throw error;
    }

    await pool.query(`
      SELECT setval(
        'hot_coil_id_seq',
        COALESCE((SELECT MAX(id) FROM hot_coil), 0) + 1,
        false
      );
    `);

    result = await pool.query(query, values);
  }

  const { rows } = result;
  return rows[0];
};

const findHotCoilEntries = async ({ id, uniqueCode, smsShortCode } = {}) => {
  const filters = [];
  const values = [];

  if (typeof id === 'number') {
    values.push(id);
    filters.push(`id = $${values.length}`);
  }

  if (typeof uniqueCode === 'string') {
    values.push(uniqueCode);
    filters.push(`unique_code = $${values.length}`);
  }

  if (typeof smsShortCode === 'string') {
    values.push(smsShortCode);
    filters.push(`sms_short_code = $${values.length}`);
  }

  let query = `
    SELECT *
    FROM hot_coil
  `;

  if (filters.length) {
    query += ` WHERE ${filters.join(' OR ')}`;
  }

  query += ' ORDER BY sample_timestamp DESC NULLS LAST, id DESC';

  const { rows } = await pool.query(query, values);
  return rows;
};

module.exports = { insertHotCoil, findHotCoilEntries };

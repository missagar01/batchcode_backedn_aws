const pool = require("../config/db");

let smsRegisterIdSequenceReadyPromise;

const ensureSmsRegisterIdSequence = async () => {
  if (smsRegisterIdSequenceReadyPromise) {
    return smsRegisterIdSequenceReadyPromise;
  }

  smsRegisterIdSequenceReadyPromise = (async () => {
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS sms_register_id_seq;`);
    await pool.query(`
      SELECT setval(
        'sms_register_id_seq',
        COALESCE((SELECT MAX(id) FROM sms_register), 0) + 1,
        false
      );
    `);
  })().catch((error) => {
    smsRegisterIdSequenceReadyPromise = null;
    throw error;
  });

  return smsRegisterIdSequenceReadyPromise;
};

const countByDate = async (dateISO) => {
  const queryText = `
    SELECT COUNT(*)::int AS total
    FROM sms_register
    WHERE DATE(sample_timestamp) = $1::date
  `;

  const result = await pool.query(queryText, [dateISO]);
  return result.rows[0]?.total ?? 0;
};

const insertSmsRegister = async (payload) => {
  const {
    sample_timestamp,
    sequence_number,
    laddle_number,
    sms_head,
    furnace_number,
    remarks = null,
    picture = null,
    shift_incharge,
    temperature,
    unique_code
  } = payload;

  await ensureSmsRegisterIdSequence();

  const queryText = `
    INSERT INTO sms_register (
      id,
      sample_timestamp,
      sequence_number,
      laddle_number,
      sms_head,
      furnace_number,
      remarks,
      picture,
      shift_incharge,
      temperature,
      unique_code
    )
    VALUES (nextval('sms_register_id_seq'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `;

  const values = [
    sample_timestamp ?? null,
    sequence_number,
    laddle_number ?? null,
    sms_head,
    furnace_number,
    remarks,
    picture,
    shift_incharge,
    temperature ?? null,
    unique_code
  ];

  let result;
  try {
    result = await pool.query(queryText, values);
  } catch (error) {
    // If id sequence drifts behind table data, re-sync once and retry.
    const looksLikeIdConflict =
      error?.code === "23505" && /id/i.test(String(error?.detail || ""));

    if (!looksLikeIdConflict) {
      throw error;
    }

    await pool.query(`
      SELECT setval(
        'sms_register_id_seq',
        COALESCE((SELECT MAX(id) FROM sms_register), 0) + 1,
        false
      );
    `);

    result = await pool.query(queryText, values);
  }

  return result.rows[0];
};

const findSmsRegisters = async ({ id, uniqueCode } = {}) => {
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

  let queryText = `
    SELECT *
    FROM sms_register
  `;

  if (filters.length > 0) {
    queryText += ` WHERE ${filters.join(' OR ')}`;
  }

  queryText += ' ORDER BY sample_timestamp ASC NULLS LAST, id ASC';

  const result = await pool.query(queryText, values);
  return result.rows;
};

module.exports = { insertSmsRegister, findSmsRegisters, countByDate };

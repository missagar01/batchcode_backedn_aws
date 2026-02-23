const pool = require("../config/db");

let qcLabSamplesIdSequenceReadyPromise;

const ensureQcLabSamplesIdSequence = async () => {
  if (qcLabSamplesIdSequenceReadyPromise) {
    return qcLabSamplesIdSequenceReadyPromise;
  }

  qcLabSamplesIdSequenceReadyPromise = (async () => {
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS qc_lab_samples_id_seq;`);
    await pool.query(`
      SELECT setval(
        'qc_lab_samples_id_seq',
        COALESCE((SELECT MAX(id) FROM qc_lab_samples), 0) + 1,
        false
      );
    `);
  })().catch((error) => {
    qcLabSamplesIdSequenceReadyPromise = null;
    throw error;
  });

  return qcLabSamplesIdSequenceReadyPromise;
};

const insertSample = async (payload) => {
  const {
    sample_timestamp,
    sms_batch_code,
    furnace_number,
    sequence_code,
    laddle_number,
    shift_type,
    final_c,
    final_mn,
    final_s,
    final_p,
    tested_by,
    remarks = null,
    report_picture = null,
    unique_code
  } = payload;

  const timestampValue = sample_timestamp ?? new Date().toISOString();

  await ensureQcLabSamplesIdSequence();

  const query = `
    INSERT INTO qc_lab_samples (
      id,
      sample_timestamp,
      sms_batch_code,
      furnace_number,
      sequence_code,
      laddle_number,
      shift_type,
      final_c,
      final_mn,
      final_s,
      final_p,
      tested_by,
      remarks,
      report_picture,
      unique_code
    ) VALUES (
      nextval('qc_lab_samples_id_seq'),
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14
    )
    RETURNING *
  `;

  const values = [
    timestampValue,
    sms_batch_code,
    furnace_number,
    sequence_code,
    laddle_number,
    shift_type,
    final_c ?? null,
    final_mn ?? null,
    final_s ?? null,
    final_p ?? null,
    tested_by,
    remarks,
    report_picture,
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
        'qc_lab_samples_id_seq',
        COALESCE((SELECT MAX(id) FROM qc_lab_samples), 0) + 1,
        false
      );
    `);

    result = await pool.query(query, values);
  }

  const { rows } = result;
  return rows[0];
};

const findSamples = async ({ id, uniqueCode } = {}) => {
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

  let query = `
    SELECT *
    FROM qc_lab_samples
  `;

  if (filters.length > 0) {
    query += ` WHERE ${filters.join(' OR ')}`;
  }

  query += ' ORDER BY sample_timestamp DESC NULLS LAST, id DESC';

  const { rows } = await pool.query(query, values);
  return rows;
};

module.exports = { insertSample, findSamples };

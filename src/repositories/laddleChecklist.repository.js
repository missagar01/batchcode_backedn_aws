const pool = require("../config/db");

let laddleChecklistIdSequenceReadyPromise;

const ensureLaddleChecklistIdSequence = async () => {
  if (laddleChecklistIdSequenceReadyPromise) {
    return laddleChecklistIdSequenceReadyPromise;
  }

  laddleChecklistIdSequenceReadyPromise = (async () => {
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS laddle_checklist_id_seq;`);
    await pool.query(`
      ALTER TABLE laddle_checklist
      ALTER COLUMN id SET DEFAULT nextval('laddle_checklist_id_seq');
    `);
    await pool.query(`
      SELECT setval(
        'laddle_checklist_id_seq',
        COALESCE((SELECT MAX(id) FROM laddle_checklist), 0) + 1,
        false
      );
    `);
    await pool.query(`
      UPDATE laddle_checklist
      SET id = nextval('laddle_checklist_id_seq')
      WHERE id IS NULL;
    `);
    await pool.query(`
      SELECT setval(
        'laddle_checklist_id_seq',
        COALESCE((SELECT MAX(id) FROM laddle_checklist), 0) + 1,
        false
      );
    `);
  })().catch((error) => {
    laddleChecklistIdSequenceReadyPromise = null;
    throw error;
  });

  return laddleChecklistIdSequenceReadyPromise;
};

const insertLaddleChecklist = async (payload) => {
  const {
    sample_timestamp,
    laddle_number,
    sample_date,
    slag_cleaning_top = null,
    slag_cleaning_bottom = null,
    nozzle_proper_lancing = null,
    pursing_plug_cleaning = null,
    sly_gate_check = null,
    nozzle_check_cleaning = null,
    sly_gate_operate = null,
    nfc_proper_heat = null,
    nfc_filling_nozzle = null,
    plate_life,
    timber_man_name = null,
    laddle_man_name = null,
    laddle_foreman_name = null,
    supervisor_name = null,
    unique_code
  } = payload;

  await ensureLaddleChecklistIdSequence();

  const query = `
    INSERT INTO laddle_checklist (
      id,
      sample_timestamp,
      laddle_number,
      sample_date,
      slag_cleaning_top,
      slag_cleaning_bottom,
      nozzle_proper_lancing,
      pursing_plug_cleaning,
      sly_gate_check,
      nozzle_check_cleaning,
      sly_gate_operate,
      nfc_proper_heat,
      nfc_filling_nozzle,
      plate_life,
      timber_man_name,
      laddle_man_name,
      laddle_foreman_name,
      supervisor_name,
      unique_code
    )
    VALUES (
      nextval('laddle_checklist_id_seq'),
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18
    )
    RETURNING *
  `;

  const values = [
    sample_timestamp ?? null,
    laddle_number ?? null,
    sample_date ?? null,
    slag_cleaning_top,
    slag_cleaning_bottom,
    nozzle_proper_lancing,
    pursing_plug_cleaning,
    sly_gate_check,
    nozzle_check_cleaning,
    sly_gate_operate,
    nfc_proper_heat,
    nfc_filling_nozzle,
    plate_life ?? null,
    timber_man_name,
    laddle_man_name,
    laddle_foreman_name,
    supervisor_name,
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
        'laddle_checklist_id_seq',
        COALESCE((SELECT MAX(id) FROM laddle_checklist), 0) + 1,
        false
      );
    `);

    result = await pool.query(query, values);
  }

  return result.rows[0];
};

const findLaddleChecklists = async ({ id, uniqueCode } = {}) => {
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
    FROM laddle_checklist
  `;

  if (filters.length) {
    query += ` WHERE ${filters.join(' OR ')}`;
  }

  query += ' ORDER BY sample_timestamp DESC NULLS LAST, id DESC';

  const { rows } = await pool.query(query, values);
  return rows;
};

module.exports = { insertLaddleChecklist, findLaddleChecklists };

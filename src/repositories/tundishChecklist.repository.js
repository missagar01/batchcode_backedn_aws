const pool = require("../config/db");

let tundishChecklistSchemaReadyPromise;
let tundishChecklistIdSequenceReadyPromise;

const ensureTundishChecklistSchema = async () => {
  if (tundishChecklistSchemaReadyPromise) {
    return tundishChecklistSchemaReadyPromise;
  }

  tundishChecklistSchemaReadyPromise = pool
    .query(`
      ALTER TABLE tundish_checklist
        ADD COLUMN IF NOT EXISTS tundish_number integer,
        ADD COLUMN IF NOT EXISTS nozzle_plate_check text,
        ADD COLUMN IF NOT EXISTS well_block_check text,
        ADD COLUMN IF NOT EXISTS board_proper_set text,
        ADD COLUMN IF NOT EXISTS board_sand_filling text,
        ADD COLUMN IF NOT EXISTS refractory_slag_cleaning text,
        ADD COLUMN IF NOT EXISTS tundish_mession_name text,
        ADD COLUMN IF NOT EXISTS handover_proper_check text,
        ADD COLUMN IF NOT EXISTS handover_nozzle_installed text,
        ADD COLUMN IF NOT EXISTS handover_masala_inserted text,
        ADD COLUMN IF NOT EXISTS stand1_mould_operator text,
        ADD COLUMN IF NOT EXISTS stand2_mould_operator text,
        ADD COLUMN IF NOT EXISTS timber_man_name text,
        ADD COLUMN IF NOT EXISTS laddle_operator_name text,
        ADD COLUMN IF NOT EXISTS shift_incharge_name text,
        ADD COLUMN IF NOT EXISTS forman_name text;
    `)
    .catch((error) => {
      tundishChecklistSchemaReadyPromise = null;
      throw error;
    });

  return tundishChecklistSchemaReadyPromise;
};

const ensureTundishChecklistIdSequence = async () => {
  if (tundishChecklistIdSequenceReadyPromise) {
    return tundishChecklistIdSequenceReadyPromise;
  }

  tundishChecklistIdSequenceReadyPromise = (async () => {
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS tundish_checklist_id_seq;`);
    await pool.query(`
      SELECT setval(
        'tundish_checklist_id_seq',
        COALESCE((SELECT MAX(id) FROM tundish_checklist), 0) + 1,
        false
      );
    `);
  })().catch((error) => {
    tundishChecklistIdSequenceReadyPromise = null;
    throw error;
  });

  return tundishChecklistIdSequenceReadyPromise;
};

const insertTundishChecklist = async (payload) => {
  const {
    sample_timestamp,
    tundish_number,
    nozzle_plate_check,
    well_block_check,
    board_proper_set,
    board_sand_filling,
    refractory_slag_cleaning,
    tundish_mession_name,
    handover_proper_check,
    handover_nozzle_installed,
    handover_masala_inserted,
    stand1_mould_operator,
    stand2_mould_operator,
    timber_man_name,
    laddle_operator_name,
    shift_incharge_name,
    forman_name,
    unique_code
  } = payload;

  await ensureTundishChecklistSchema();
  await ensureTundishChecklistIdSequence();

  const query = `
    INSERT INTO tundish_checklist (
      id,
      sample_timestamp,
      tundish_number,
      nozzle_plate_check,
      well_block_check,
      board_proper_set,
      board_sand_filling,
      refractory_slag_cleaning,
      tundish_mession_name,
      handover_proper_check,
      handover_nozzle_installed,
      handover_masala_inserted,
      stand1_mould_operator,
      stand2_mould_operator,
      timber_man_name,
      laddle_operator_name,
      shift_incharge_name,
      forman_name,
      unique_code
    )
    VALUES (
      nextval('tundish_checklist_id_seq'),
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16, $17, $18
    )
    RETURNING *
  `;

  const values = [
    sample_timestamp ?? null,
    tundish_number ?? null,
    nozzle_plate_check,
    well_block_check,
    board_proper_set,
    board_sand_filling,
    refractory_slag_cleaning,
    tundish_mession_name,
    handover_proper_check,
    handover_nozzle_installed,
    handover_masala_inserted,
    stand1_mould_operator,
    stand2_mould_operator,
    timber_man_name,
    laddle_operator_name,
    shift_incharge_name,
    forman_name,
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
        'tundish_checklist_id_seq',
        COALESCE((SELECT MAX(id) FROM tundish_checklist), 0) + 1,
        false
      );
    `);

    result = await pool.query(query, values);
  }

  return result.rows[0];
};

const findTundishChecklists = async ({ id, uniqueCode } = {}) => {
  await ensureTundishChecklistSchema();

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
    FROM tundish_checklist
  `;

  if (filters.length) {
    query += ` WHERE ${filters.join(' OR ')}`;
  }

  query += ' ORDER BY sample_timestamp DESC NULLS LAST, id DESC';

  const { rows } = await pool.query(query, values);
  return rows;
};

module.exports = { insertTundishChecklist, findTundishChecklists };

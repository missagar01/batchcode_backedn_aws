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
        ADD COLUMN IF NOT EXISTS sample_date date,
        ADD COLUMN IF NOT EXISTS sample_time time,
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
        ADD COLUMN IF NOT EXISTS forman_name text,
        ADD COLUMN IF NOT EXISTS remarks text,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS sample_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

      -- Ensure defaults are set if columns existed without them
      ALTER TABLE tundish_checklist ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE tundish_checklist ALTER COLUMN sample_timestamp SET DEFAULT CURRENT_TIMESTAMP;

      -- Ensure existing boolean columns are converted to text if they exist
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tundish_checklist' AND column_name = 'nozzle_plate_check' AND data_type = 'boolean') THEN
          ALTER TABLE tundish_checklist ALTER COLUMN nozzle_plate_check TYPE text USING (CASE WHEN nozzle_plate_check THEN 'Done' ELSE 'Not Done' END);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tundish_checklist' AND column_name = 'well_block_check' AND data_type = 'boolean') THEN
          ALTER TABLE tundish_checklist ALTER COLUMN well_block_check TYPE text USING (CASE WHEN well_block_check THEN 'Done' ELSE 'Not Done' END);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tundish_checklist' AND column_name = 'board_proper_set' AND data_type = 'boolean') THEN
          ALTER TABLE tundish_checklist ALTER COLUMN board_proper_set TYPE text USING (CASE WHEN board_proper_set THEN 'Done' ELSE 'Not Done' END);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tundish_checklist' AND column_name = 'board_sand_filling' AND data_type = 'boolean') THEN
          ALTER TABLE tundish_checklist ALTER COLUMN board_sand_filling TYPE text USING (CASE WHEN board_sand_filling THEN 'Done' ELSE 'Not Done' END);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tundish_checklist' AND column_name = 'refractory_slag_cleaning' AND data_type = 'boolean') THEN
          ALTER TABLE tundish_checklist ALTER COLUMN refractory_slag_cleaning TYPE text USING (CASE WHEN refractory_slag_cleaning THEN 'Done' ELSE 'Not Done' END);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tundish_checklist' AND column_name = 'handover_proper_check' AND data_type = 'boolean') THEN
          ALTER TABLE tundish_checklist ALTER COLUMN handover_proper_check TYPE text USING (CASE WHEN handover_proper_check THEN 'Yes' ELSE 'No' END);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tundish_checklist' AND column_name = 'handover_nozzle_installed' AND data_type = 'boolean') THEN
          ALTER TABLE tundish_checklist ALTER COLUMN handover_nozzle_installed TYPE text USING (CASE WHEN handover_nozzle_installed THEN 'Yes' ELSE 'No' END);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tundish_checklist' AND column_name = 'handover_masala_inserted' AND data_type = 'boolean') THEN
          ALTER TABLE tundish_checklist ALTER COLUMN handover_masala_inserted TYPE text USING (CASE WHEN handover_masala_inserted THEN 'Yes' ELSE 'No' END);
        END IF;
      END $$;
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
    sample_date,
    sample_time,
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
    remarks,
    unique_code
  } = payload;

  await ensureTundishChecklistSchema();
  await ensureTundishChecklistIdSequence();

  const query = `
    INSERT INTO tundish_checklist (
      id,
      sample_timestamp,
      sample_date,
      sample_time,
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
      remarks,
      unique_code,
      created_at
    )
    VALUES (
      nextval('tundish_checklist_id_seq'),
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, DEFAULT
    )
    RETURNING *
  `;

  const values = [
    sample_timestamp ?? null,
    sample_date ?? null,
    sample_time ?? null,
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
    remarks ?? null,
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

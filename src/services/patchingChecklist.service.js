const crypto = require('crypto');
const patchingChecklistRepository = require('../repositories/patchingChecklist.repository');

const CODE_PREFIX = 'PC-';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789';
const SEGMENT_LENGTH = 4;
const MAX_GENERATION_ATTEMPTS = 7;

const generateUniqueCode = () => {
    const bytes = crypto.randomBytes(SEGMENT_LENGTH);
    let segment = '';
    for (let index = 0; index < SEGMENT_LENGTH; index += 1) {
        segment += ALPHABET[bytes[index] % ALPHABET.length];
    }
    return `${CODE_PREFIX}${segment}`;
};

const createPatchingChecklist = async (payload) => {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
        const unique_code = generateUniqueCode();
        try {
            return await patchingChecklistRepository.insertPatchingChecklist({ ...payload, unique_code });
        } catch (error) {
            if (error?.code === '23505') {
                continue;
            }
            throw error;
        }
    }

    throw new Error('Unable to generate a unique Patching Checklist code after multiple attempts');
};

const listPatchingChecklists = async (filters = {}) =>
    patchingChecklistRepository.findPatchingChecklists(filters);

const getPatchingChecklistByUniqueCode = async (uniqueCode) => {
    const [entry] = await patchingChecklistRepository.findPatchingChecklists({ uniqueCode });
    return entry ?? null;
};

module.exports = {
    createPatchingChecklist,
    listPatchingChecklists,
    getPatchingChecklistByUniqueCode
};

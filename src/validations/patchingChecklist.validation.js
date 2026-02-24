const { z } = require('zod');

const timestampField = (fieldName) => z
    .preprocess((value) => {
        if (value === undefined || value === null || value === '') {
            return null;
        }
        if (value instanceof Date) {
            return value;
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date;
    }, z.date({ invalid_type_error: `${fieldName} must be a valid date` }).nullable())
    .transform((value) => value ? value.toISOString() : null);

const trimmedString = (field, max = 255) =>
    z
        .string()
        .min(1, `${field} is required`)
        .max(max)
        .transform((value) => value.trim());

const optionalTrimmedString = (max = 255) =>
    z
        .string()
        .max(max)
        .optional()
        .nullable()
        .transform((value) => value ? value.trim() : null);

const createPatchingChecklistSchema = {
    body: z.object({
        check_date: z.string().optional().nullable(),
        furnace_number: trimmedString('furnace_number'),
        crucible_number: trimmedString('crucible_number'),
        rm_party_name: trimmedString('rm_party_name'),
        material_type: trimmedString('material_type'),
        rm_bag_pic: z.string().optional().nullable(),
        picture: z.string().optional().nullable(), // Allow picture from file upload middleware
        patching_start_time: z.string().optional().nullable(),
        patching_end_time: z.string().optional().nullable(),
        fc_breaking_check: trimmedString('fc_breaking_check'),
        lining_check: trimmedString('lining_check'),
        gld_check: trimmedString('gld_check'),
        premix_check: trimmedString('premix_check'),
        bottom_check: trimmedString('bottom_check'),
        full_check: trimmedString('full_check'),
        nali_top_dry_check: trimmedString('nali_top_dry_check'),
        weight_check: optionalTrimmedString(),
        proper_weight_per_check: optionalTrimmedString(),
        mix_check: optionalTrimmedString(),
        checked_by: trimmedString('checked_by'),
        pprm_party: trimmedString('pprm_party'),
        p_patching_life: z.preprocess((val) => val === '' ? null : Number(val), z.number().int().nullable())
    }).transform((data) => {
        // Map 'picture' to 'rm_bag_pic' if present (from file upload)
        if (data.picture && !data.rm_bag_pic) {
            data.rm_bag_pic = data.picture;
        }
        return data;
    })
};

module.exports = { createPatchingChecklistSchema };

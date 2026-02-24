const { StatusCodes } = require('http-status-codes');
const patchingChecklistService = require('../services/patchingChecklist.service');
const { buildResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const parseIntegerParam = (value, fieldName) => {
    if (value === undefined) {
        return undefined;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `${fieldName} must be an integer`);
    }
    return parsed;
};

const normalizeStringParam = (value) => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
};

const createEntry = async (req, res) => {
    const { check_date, patching_start_time, patching_end_time } = req.body;

    // Combine date and time if they are just HH:mm
    const combine = (date, time) => {
        if (!date || !time) return time;
        if (time.includes('T') || time.includes('-')) return time; // Already full ISO/Date
        return `${date} ${time}`;
    };

    const finalPayload = {
        ...req.body,
        patching_start_time: combine(check_date, patching_start_time),
        patching_end_time: combine(check_date, patching_end_time)
    };

    const payload = await patchingChecklistService.createPatchingChecklist(finalPayload);

    // WhatsApp notification could be added here if required

    res.status(StatusCodes.CREATED).json(buildResponse('Patching checklist entry recorded', payload));
};

const listEntries = async (req, res) => {
    const id = parseIntegerParam(req.query.id, 'id');
    const uniqueCode = normalizeStringParam(req.query.unique_code);

    const entries = await patchingChecklistService.listPatchingChecklists({ id, uniqueCode });
    res.status(StatusCodes.OK).json(buildResponse('Patching checklist entries fetched', entries));
};

const getEntryByUniqueCode = async (req, res) => {
    const uniqueCode = normalizeStringParam(req.params.unique_code);
    if (!uniqueCode) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'unique_code path parameter is required');
    }

    const entry = await patchingChecklistService.getPatchingChecklistByUniqueCode(uniqueCode);
    if (!entry) {
        throw new ApiError(StatusCodes.NOT_FOUND, `No Patching checklist entry found for code ${uniqueCode}`);
    }

    res.status(StatusCodes.OK).json(buildResponse('Patching checklist entry fetched', entry));
};

module.exports = { createEntry, listEntries, getEntryByUniqueCode };

const sizeMasterService = require('../services/sizeMaster.service');

/**
 * Controller to get all size master data
 */
const getSizeMasterData = async (req, res) => {
    try {
        const data = await sizeMasterService.getSizeMasterData();
        res.json({
            success: true,
            data: data,
            count: data.length
        });
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to get size master data by ID
 */
const getSizeMasterById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await sizeMasterService.getSizeMasterById(id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Size master record not found'
            });
        }

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
/**
 * Controller to create a new enquiry
 */
const createEnquiry = async (req, res) => {
    try {
        const { item_type, size, thickness, enquiry_date, customer, quantity } = req.body;

        // Validate required fields
        if (!item_type || !size || !thickness || !enquiry_date || !customer) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: item_type, size, thickness, enquiry_date, customer'
            });
        }

        // Validate quantity if provided
        if (quantity && (isNaN(quantity) || parseInt(quantity) <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a positive number'
            });
        }

        const enquiryData = {
            item_type,
            size,
            thickness,
            enquiry_date,
            customer,
            quantity
        };

        const createdEnquiry = await sizeMasterService.createEnquiry(enquiryData);

        res.status(201).json({
            success: true,
            message: 'Enquiry created successfully',
            data: createdEnquiry
        });
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getSizeMasterData,
    getSizeMasterById,
    createEnquiry
};

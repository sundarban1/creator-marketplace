"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBusinessProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateBusinessProfileSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(2, 'Business name must be at least 2 characters').optional(),
    description: zod_1.z.string().max(1000).optional(),
    logoUrl: zod_1.z.string().url('Invalid logo URL').optional().nullable(),
    website: zod_1.z.string().url('Invalid website URL').optional().nullable(),
    categories: zod_1.z.array(zod_1.z.string()).optional(),
    panNo: zod_1.z.string().optional().nullable(),
    showPublicProfile: zod_1.z.boolean().optional(),
    hideContactDetails: zod_1.z.boolean().optional(),
    allowDirectMessages: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=business.schema.js.map
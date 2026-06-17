"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHelpArticleSchema = exports.createHelpArticleSchema = void 0;
const zod_1 = require("zod");
exports.createHelpArticleSchema = zod_1.z.object({
    question: zod_1.z.string().min(5, 'Question must be at least 5 characters'),
    answer: zod_1.z.string().min(10, 'Answer must be at least 10 characters'),
    category: zod_1.z.string().min(1).optional(),
    order: zod_1.z.number().int().min(0).optional(),
    published: zod_1.z.boolean().optional(),
});
exports.updateHelpArticleSchema = zod_1.z.object({
    question: zod_1.z.string().min(5).optional(),
    answer: zod_1.z.string().min(10).optional(),
    category: zod_1.z.string().min(1).optional(),
    order: zod_1.z.number().int().min(0).optional(),
    published: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=help.schema.js.map
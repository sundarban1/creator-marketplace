"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
function validate(schema, target = 'body') {
    return (req, _res, next) => {
        try {
            const parsed = schema.parse(req[target]);
            req[target] = parsed;
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                next(err);
            }
            else {
                next(err);
            }
        }
    };
}
//# sourceMappingURL=validate.js.map
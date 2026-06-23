"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = uploadImage;
exports.deleteImage = deleteImage;
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
async function uploadImage(buffer, folder, publicId) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            public_id: publicId,
            overwrite: true,
            resource_type: 'image',
            transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        }, (err, result) => {
            if (err || !result)
                return reject(err ?? new Error('Cloudinary upload failed'));
            resolve(result.secure_url);
        });
        stream.end(buffer);
    });
}
async function deleteImage(publicIdWithFolder) {
    await cloudinary_1.v2.uploader.destroy(publicIdWithFolder).catch(() => { });
}
//# sourceMappingURL=cloudinary.js.map
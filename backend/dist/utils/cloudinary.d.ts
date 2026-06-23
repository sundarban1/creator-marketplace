export type UploadFolder = 'creators/avatars' | 'businesses/logos';
export declare function uploadImage(buffer: Buffer, folder: UploadFolder, publicId: string): Promise<string>;
export declare function deleteImage(publicIdWithFolder: string): Promise<void>;
//# sourceMappingURL=cloudinary.d.ts.map
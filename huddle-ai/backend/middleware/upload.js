const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads/avatars';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'avatar-' + uniqueSuffix + extension);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_AVATAR_SIZE) || 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: fileFilter
});

const processImage = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    try {
        const inputPath = req.file.path;
        const outputPath = inputPath.replace(path.extname(inputPath), '_processed.png');
        
        const metadata = await sharp(inputPath).metadata();
        
        await sharp(inputPath)
            .resize(400, 400, {
                fit: 'cover',
                position: 'center'
            })
            .png({ quality: 90 })
            .toFile(outputPath);

        fs.unlinkSync(inputPath);

        req.file.path = outputPath;
        req.file.filename = path.basename(outputPath);
        req.file.mimetype = 'image/png';
        req.file.width = 400;
        req.file.height = 400;
        req.file.size = fs.statSync(outputPath).size;

        next();
    } catch (error) {
        console.error('Image processing error:', error);
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ error: 'Image processing failed' });
    }
};

const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: 'File too large. Maximum size is 5MB.' 
            });
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                error: 'Too many files. Only one file allowed.' 
            });
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ 
                error: 'Unexpected file field name.' 
            });
        }
    } else if (error.message.includes('Invalid file type')) {
        return res.status(400).json({ 
            error: error.message 
        });
    }
    
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
};

const uploadMiddleware = {
    single: (fieldName) => [
        upload.single(fieldName),
        handleUploadError,
        processImage
    ]
};

module.exports = uploadMiddleware;
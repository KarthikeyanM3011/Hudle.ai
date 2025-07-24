const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;

class Helpers {
    static generateId(prefix = '', length = 8) {
        const randomBytes = crypto.randomBytes(Math.ceil(length / 2));
        const randomId = randomBytes.toString('hex').slice(0, length);
        return prefix ? `${prefix}-${randomId}` : randomId;
    }

    static generateSlug(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    static sanitizeFilename(filename) {
        const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const extension = path.extname(sanitized);
        const basename = path.basename(sanitized, extension);
        const timestamp = Date.now();
        
        return `${basename}_${timestamp}${extension}`;
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return {
            isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
            errors: {
                length: password.length < minLength,
                uppercase: !hasUpperCase,
                lowercase: !hasLowerCase,
                numbers: !hasNumbers,
                special: !hasSpecialChar
            }
        };
    }

    static formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }

    static formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 Bytes';
        
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    static parseQuery(queryString) {
        const params = new URLSearchParams(queryString);
        const result = {};
        
        for (const [key, value] of params) {
            if (result[key]) {
                if (Array.isArray(result[key])) {
                    result[key].push(value);
                } else {
                    result[key] = [result[key], value];
                }
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }

    static async ensureDirectory(dirPath) {
        try {
            await fs.access(dirPath);
        } catch (error) {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    static async deleteFile(filePath) {
        try {
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    static paginate(page, limit, total) {
        const currentPage = Math.max(1, parseInt(page) || 1);
        const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit) || 20));
        const totalPages = Math.ceil(total / itemsPerPage);
        const offset = (currentPage - 1) * itemsPerPage;

        return {
            currentPage,
            itemsPerPage,
            totalPages,
            totalItems: total,
            offset,
            hasNext: currentPage < totalPages,
            hasPrev: currentPage > 1
        };
    }

    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }

        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }

        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    static generateApiResponse(data, message = 'Success', status = 200) {
        return {
            success: status >= 200 && status < 300,
            status,
            message,
            data,
            timestamp: new Date().toISOString()
        };
    }

    static generateErrorResponse(error, status = 500) {
        return {
            success: false,
            status,
            error: error.message || error,
            timestamp: new Date().toISOString()
        };
    }

    static validateRequired(obj, requiredFields) {
        const missing = [];
        
        for (const field of requiredFields) {
            if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
                missing.push(field);
            }
        }
        
        return {
            isValid: missing.length === 0,
            missing
        };
    }

    static truncateText(text, maxLength, suffix = '...') {
        if (text.length <= maxLength) {
            return text;
        }
        
        return text.slice(0, maxLength - suffix.length) + suffix;
    }

    static capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    static isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (error) {
            return false;
        }
    }

    static extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (error) {
            return null;
        }
    }

    static generateHash(data, algorithm = 'sha256') {
        return crypto
            .createHash(algorithm)
            .update(JSON.stringify(data))
            .digest('hex');
    }

    static async retry(fn, maxAttempts = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }
}

module.exports = Helpers;
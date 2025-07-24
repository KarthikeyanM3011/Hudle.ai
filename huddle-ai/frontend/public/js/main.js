// Main JavaScript for Huddle.ai

class HuddleApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeComponents();
        this.setupFormValidation();
        this.setupAnimations();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.handlePageLoad();
        });

        window.addEventListener('beforeunload', (e) => {
            this.handlePageUnload(e);
        });

        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });
    }

    handlePageLoad() {
        this.fadeInElements();
        this.initializeTooltips();
        this.setupAutoSave();
        this.checkNetworkStatus();
    }

    handlePageUnload(e) {
        const activeForm = document.querySelector('form[data-dirty="true"]');
        if (activeForm) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        }
    }

    handleGlobalClick(e) {
        if (e.target.matches('.quick-action-btn')) {
            this.handleQuickAction(e.target);
        }
        
        if (e.target.matches('.coach-card')) {
            this.handleCoachCardClick(e.target);
        }
        
        if (e.target.matches('.notification-dismiss')) {
            this.dismissNotification(e.target.closest('.notification'));
        }
    }

    initializeComponents() {
        this.initializeSearchBars();
        this.initializeFilters();
        this.initializeModals();
        this.initializeDatePickers();
        this.initializeFileUploads();
    }

    initializeSearchBars() {
        const searchBars = document.querySelectorAll('.search-bar');
        searchBars.forEach(searchBar => {
            const input = searchBar.querySelector('input');
            const results = searchBar.querySelector('.search-results');
            
            if (input && results) {
                input.addEventListener('input', this.debounce((e) => {
                    this.performSearch(e.target.value, results);
                }, 300));
                
                input.addEventListener('focus', () => {
                    searchBar.classList.add('active');
                });
                
                input.addEventListener('blur', () => {
                    setTimeout(() => {
                        searchBar.classList.remove('active');
                    }, 200);
                });
            }
        });
    }

    async performSearch(query, resultsContainer) {
        if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            this.displaySearchResults(data.results, resultsContainer);
        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = '<div class="search-error">Search unavailable</div>';
        }
    }

    displaySearchResults(results, container) {
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="search-no-results">No results found</div>';
            return;
        }

        const html = results.map(result => `
            <div class="search-result" data-id="${result.id}" data-type="${result.type}">
                <div class="search-result-icon">
                    <i class="fas fa-${this.getIconForType(result.type)}"></i>
                </div>
                <div class="search-result-content">
                    <div class="search-result-title">${this.escapeHtml(result.title)}</div>
                    <div class="search-result-description">${this.escapeHtml(result.description)}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    getIconForType(type) {
        const icons = {
            coach: 'robot',
            meeting: 'calendar',
            template: 'template',
            user: 'user'
        };
        return icons[type] || 'search';
    }

    initializeFilters() {
        const filterGroups = document.querySelectorAll('.filter-group');
        filterGroups.forEach(group => {
            const checkboxes = group.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    this.applyFilters();
                });
            });
        });
    }

    applyFilters() {
        const activeFilters = {};
        
        document.querySelectorAll('.filter-group').forEach(group => {
            const filterType = group.dataset.filterType;
            const checkedInputs = group.querySelectorAll('input:checked');
            
            if (checkedInputs.length > 0) {
                activeFilters[filterType] = Array.from(checkedInputs).map(input => input.value);
            }
        });

        this.filterContent(activeFilters);
    }

    filterContent(filters) {
        const items = document.querySelectorAll('.filterable-item');
        
        items.forEach(item => {
            let shouldShow = true;
            
            Object.keys(filters).forEach(filterType => {
                const itemValue = item.dataset[filterType];
                if (itemValue && !filters[filterType].includes(itemValue)) {
                    shouldShow = false;
                }
            });
            
            item.style.display = shouldShow ? '' : 'none';
        });
    }

    initializeModals() {
        const modalTriggers = document.querySelectorAll('[data-bs-toggle="modal"]');
        modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                const modalId = trigger.getAttribute('data-bs-target');
                const modal = document.querySelector(modalId);
                
                if (modal) {
                    this.prepareModal(modal, trigger);
                }
            });
        });
    }

    prepareModal(modal, trigger) {
        const modalData = trigger.dataset;
        
        if (modalData.title) {
            const titleElement = modal.querySelector('.modal-title');
            if (titleElement) titleElement.textContent = modalData.title;
        }
        
        if (modalData.content) {
            const bodyElement = modal.querySelector('.modal-body');
            if (bodyElement) bodyElement.innerHTML = modalData.content;
        }
        
        const form = modal.querySelector('form');
        if (form && modalData.action) {
            form.action = modalData.action;
        }
    }

    initializeDatePickers() {
        const dateInputs = document.querySelectorAll('input[type="date"], input[type="datetime-local"]');
        dateInputs.forEach(input => {
            const today = new Date().toISOString().split('T')[0];
            if (!input.hasAttribute('min')) {
                input.min = today;
            }
        });
    }

    initializeFileUploads() {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleFileUpload(e.target);
            });
        });
    }

    handleFileUpload(input) {
        const files = Array.from(input.files);
        const maxSize = parseInt(input.dataset.maxSize) || 5242880; // 5MB default
        const allowedTypes = input.dataset.allowedTypes ? input.dataset.allowedTypes.split(',') : ['image/*'];
        
        files.forEach(file => {
            if (file.size > maxSize) {
                this.showError(`File "${file.name}" is too large. Maximum size is ${this.formatFileSize(maxSize)}.`);
                input.value = '';
                return;
            }
            
            if (!this.isFileTypeAllowed(file, allowedTypes)) {
                this.showError(`File type "${file.type}" is not allowed.`);
                input.value = '';
                return;
            }
        });
        
        if (files.length > 0 && input.dataset.preview) {
            this.previewFile(files[0], input.dataset.preview);
        }
    }

    isFileTypeAllowed(file, allowedTypes) {
        return allowedTypes.some(type => {
            if (type.includes('*')) {
                const mainType = type.split('/')[0];
                return file.type.startsWith(mainType);
            }
            return file.type === type;
        });
    }

    previewFile(file, previewSelector) {
        const previewElement = document.querySelector(previewSelector);
        if (!previewElement) return;
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewElement.src = e.target.result;
                previewElement.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    setupFormValidation() {
        const forms = document.querySelectorAll('form[data-validate]');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                if (!this.validateForm(form)) {
                    e.preventDefault();
                    this.showFormErrors(form);
                }
            });
            
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    this.markFormDirty(form);
                    this.clearFieldError(input);
                });
                
                input.addEventListener('blur', () => {
                    this.validateField(input);
                });
            });
        });
    }

    validateForm(form) {
        const fields = form.querySelectorAll('[data-required], [data-validation]');
        let isValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    validateField(field) {
        const rules = field.dataset.validation ? field.dataset.validation.split('|') : [];
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        if (field.hasAttribute('data-required') && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        rules.forEach(rule => {
            if (!isValid) return;
            
            const [ruleName, ruleValue] = rule.split(':');
            
            switch (ruleName) {
                case 'min':
                    if (value.length < parseInt(ruleValue)) {
                        isValid = false;
                        errorMessage = `Minimum ${ruleValue} characters required`;
                    }
                    break;
                case 'max':
                    if (value.length > parseInt(ruleValue)) {
                        isValid = false;
                        errorMessage = `Maximum ${ruleValue} characters allowed`;
                    }
                    break;
                case 'email':
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (value && !emailRegex.test(value)) {
                        isValid = false;
                        errorMessage = 'Please enter a valid email address';
                    }
                    break;
                case 'password':
                    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
                    if (value && !passwordRegex.test(value)) {
                        isValid = false;
                        errorMessage = 'Password must contain uppercase, lowercase, and numbers';
                    }
                    break;
                case 'match':
                    const matchField = document.querySelector(`[name="${ruleValue}"]`);
                    if (matchField && value !== matchField.value) {
                        isValid = false;
                        errorMessage = 'Fields do not match';
                    }
                    break;
            }
        });
        
        this.setFieldValidation(field, isValid, errorMessage);
        return isValid;
    }

    setFieldValidation(field, isValid, errorMessage) {
        field.classList.toggle('is-invalid', !isValid);
        field.classList.toggle('is-valid', isValid && field.value.trim());
        
        const errorElement = field.parentNode.querySelector('.invalid-feedback');
        if (errorElement) {
            errorElement.textContent = errorMessage;
        } else if (!isValid && errorMessage) {
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = errorMessage;
            field.parentNode.appendChild(feedback);
        }
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const errorElement = field.parentNode.querySelector('.invalid-feedback');
        if (errorElement) {
            errorElement.remove();
        }
    }

    markFormDirty(form) {
        form.setAttribute('data-dirty', 'true');
    }

    setupAutoSave() {
        const autoSaveForms = document.querySelectorAll('form[data-autosave]');
        autoSaveForms.forEach(form => {
            const interval = parseInt(form.dataset.autosave) || 30000; // 30 seconds default
            
            setInterval(() => {
                if (form.hasAttribute('data-dirty')) {
                    this.autoSaveForm(form);
                }
            }, interval);
        });
    }

    async autoSaveForm(form) {
        const formData = new FormData(form);
        const autoSaveUrl = form.dataset.autosaveUrl || form.action;
        
        try {
            const response = await fetch(autoSaveUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Auto-Save': 'true'
                }
            });
            
            if (response.ok) {
                form.removeAttribute('data-dirty');
                this.showSuccess('Changes saved automatically', { temporary: true });
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    setupAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);
        
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }

    fadeInElements() {
        const elements = document.querySelectorAll('.fade-in');
        elements.forEach((el, index) => {
            setTimeout(() => {
                el.classList.add('visible');
            }, index * 100);
        });
    }

    initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipElements.forEach(element => {
            new bootstrap.Tooltip(element);
        });
    }

    checkNetworkStatus() {
        if ('onLine' in navigator) {
            window.addEventListener('online', () => {
                this.showSuccess('Connection restored', { temporary: true });
            });
            
            window.addEventListener('offline', () => {
                this.showError('Connection lost. Some features may be unavailable.', { persistent: true });
            });
        }
    }

    // Utility Methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Notification Methods
    showSuccess(message, options = {}) {
        this.showNotification(message, 'success', options);
    }

    showError(message, options = {}) {
        this.showNotification(message, 'error', options);
    }

    showInfo(message, options = {}) {
        this.showNotification(message, 'info', options);
    }

    showWarning(message, options = {}) {
        this.showNotification(message, 'warning', options);
    }

    showNotification(message, type, options = {}) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} ${options.temporary ? 'temporary' : ''}`;
        
        const icon = this.getNotificationIcon(type);
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${icon} notification-icon"></i>
                <span class="notification-message">${this.escapeHtml(message)}</span>
                <button class="notification-dismiss" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        const container = this.getNotificationContainer();
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto-remove temporary notifications
        if (options.temporary !== false) {
            setTimeout(() => {
                this.dismissNotification(notification);
            }, options.duration || 5000);
        }
        
        return notification;
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationContainer() {
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        return container;
    }

    dismissNotification(notification) {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // API Helper Methods
    async apiRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async uploadFile(file, url, onProgress = null) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    reject(new Error(`Upload failed with status: ${xhr.status}`));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });
            
            xhr.open('POST', url);
            xhr.send(formData);
        });
    }
}

// Initialize the app
const app = new HuddleApp();

// Export for use in other modules
window.HuddleApp = app;
class ColorShiftPro {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.originalImageData = null;
        this.currentImageData = null;
        this.originalImage = null;
        this.eyedropperMode = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCanvas();
        this.updateColorPreviews();
    }

    setupEventListeners() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const browseBtn = document.querySelector('.browse-btn');
        
        // Multiple ways to trigger file input for better mobile compatibility
        const triggerFileInput = () => {
            fileInput.value = ''; // Reset to allow selecting same file
            fileInput.click();
        };
        
        dropZone.addEventListener('click', triggerFileInput);
        browseBtn.addEventListener('click', triggerFileInput);
        dropZone.addEventListener('touchend', triggerFileInput);
        browseBtn.addEventListener('touchend', triggerFileInput);
        
        // Drag and drop events
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));
        
        // File input change events - multiple handlers for better compatibility
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        fileInput.addEventListener('input', this.handleFileSelect.bind(this));
        
        document.getElementById('target-color').addEventListener('change', this.updateColorPreviews.bind(this));
        document.getElementById('new-color').addEventListener('change', this.updateColorPreviews.bind(this));
        document.getElementById('target-hex').addEventListener('input', this.updateFromHex.bind(this));
        document.getElementById('new-hex').addEventListener('input', this.updateFromHex.bind(this));
        document.getElementById('tolerance').addEventListener('input', this.updateToleranceValue.bind(this));
        
        document.getElementById('apply-changes').addEventListener('click', this.applyColorChange.bind(this));
        document.getElementById('reset-image').addEventListener('click', this.resetImage.bind(this));
        document.getElementById('download-image').addEventListener('click', this.downloadImage.bind(this));
        
        document.querySelectorAll('.preset-color').forEach(preset => {
            preset.addEventListener('click', this.handlePresetColor.bind(this));
        });
        
        document.getElementById('eyedropper-btn').addEventListener('click', this.toggleEyedropper.bind(this));
    }

    setupCanvas() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    updateColorPreviews() {
        const targetColor = document.getElementById('target-color').value;
        const newColor = document.getElementById('new-color').value;
        
        document.getElementById('target-hex').value = targetColor.toUpperCase();
        document.getElementById('new-hex').value = newColor.toUpperCase();
        
        document.getElementById('target-preview').style.backgroundColor = targetColor;
        document.getElementById('new-preview').style.backgroundColor = newColor;
    }

    updateFromHex(e) {
        const hexValue = e.target.value;
        const isValid = this.isValidHex(hexValue);
        
        if (isValid) {
            e.target.classList.remove('invalid');
            if (e.target.id === 'target-hex') {
                document.getElementById('target-color').value = hexValue;
                document.getElementById('target-preview').style.backgroundColor = hexValue;
            } else if (e.target.id === 'new-hex') {
                document.getElementById('new-color').value = hexValue;
                document.getElementById('new-preview').style.backgroundColor = hexValue;
            }
        } else {
            e.target.classList.add('invalid');
        }
    }

    isValidHex(hex) {
        return /^#[0-9A-F]{6}$/i.test(hex);
    }

    updateToleranceValue() {
        const tolerance = document.getElementById('tolerance').value;
        document.getElementById('tolerance-value').textContent = tolerance;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        console.log('File select triggered:', e.type); // Debug log
        const files = e.target.files;
        console.log('Files found:', files.length); // Debug log
        
        if (files && files.length > 0) {
            const file = files[0];
            console.log('Processing file:', file.name, file.type, file.size); // Debug log
            this.processFile(file);
        } else {
            console.log('No files selected'); // Debug log
            this.showError('No file selected. Please try again.');
        }
    }

    processFile(file) {
        console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);
        
        // More lenient file type checking for mobile compatibility
        const fileName = file.name.toLowerCase();
        const isValidType = file.type.includes('png') || 
                           file.type.includes('image') || 
                           fileName.endsWith('.png');
        
        if (!isValidType) {
            this.showError('Please select a PNG image file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showError('File size too large. Please select a file under 10MB.');
            return;
        }
        
        console.log('File validation passed, loading image...');

        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('FileReader loaded, data URL length:', e.target.result.length);
            this.loadImage(e.target.result);
        };
        reader.onerror = (e) => {
            console.error('FileReader error:', e);
            this.showError('Failed to read the selected file. Please try again.');
        };
        reader.onabort = (e) => {
            console.error('FileReader aborted:', e);
            this.showError('File reading was interrupted. Please try again.');
        };
        
        try {
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error starting FileReader:', error);
            this.showError('Failed to process the file. Please try a different image.');
        }
    }

    loadImage(src) {
        console.log('Loading image from data URL...');
        const img = new Image();
        img.onload = () => {
            console.log('Image loaded successfully:', img.width, 'x', img.height);
            this.originalImage = img;
            this.displayImage(img);
            this.showEditor();
            this.showSuccess('Image loaded successfully!');
        };
        img.onerror = (e) => {
            console.error('Image load error:', e);
            this.showError('Failed to load image. Please try another file.');
        };
        
        try {
            img.src = src;
        } catch (error) {
            console.error('Error setting image src:', error);
            this.showError('Failed to process image. Please try a different file.');
        }
    }

    displayImage(img) {
        const maxWidth = 600;
        const maxHeight = 500;
        
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
        }
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(img, 0, 0, width, height);
        
        this.originalImageData = this.ctx.getImageData(0, 0, width, height);
        this.currentImageData = this.ctx.createImageData(this.originalImageData);
        this.currentImageData.data.set(this.originalImageData.data);
        
        // Add canvas click event for eyedropper
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
        this.canvas.addEventListener('mousemove', this.handleCanvasMouseMove.bind(this));
    }

    showEditor() {
        document.getElementById('editor-section').style.display = 'block';
        document.getElementById('editor-section').scrollIntoView({ behavior: 'smooth' });
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    colorDistance(color1, color2) {
        const rDiff = color1.r - color2.r;
        const gDiff = color1.g - color2.g;
        const bDiff = color1.b - color2.b;
        return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    }

    getBrightness(color) {
        // Calculate perceived brightness using luminance formula
        return (0.299 * color.r + 0.587 * color.g + 0.114 * color.b);
    }

    isExtremeColorChange(color1, color2) {
        const brightness1 = this.getBrightness(color1);
        const brightness2 = this.getBrightness(color2);
        const brightnessDiff = Math.abs(brightness1 - brightness2);
        
        // Consider it extreme if brightness difference is > 180 (out of 255)
        return brightnessDiff > 180;
    }

    isNearWhiteOrBlack(color) {
        const brightness = this.getBrightness(color);
        // Consider near-black if brightness < 50, near-white if brightness > 200
        return brightness < 50 || brightness > 200;
    }


    applyColorChange() {
        if (!this.originalImageData) {
            this.showError('Please load an image first.');
            return;
        }

        const targetColor = this.hexToRgb(document.getElementById('target-color').value);
        const newColor = this.hexToRgb(document.getElementById('new-color').value);
        const tolerance = parseFloat(document.getElementById('tolerance').value);
        
        const data = this.currentImageData.data;
        const originalData = this.originalImageData.data;
        
        // Optimized standard algorithm
        for (let i = 0; i < data.length; i += 4) {
            const pixel = {
                r: originalData[i],
                g: originalData[i + 1],
                b: originalData[i + 2],
                a: originalData[i + 3]
            };
            
            // Skip transparent pixels
            if (pixel.a === 0) {
                data[i] = pixel.r;
                data[i + 1] = pixel.g;
                data[i + 2] = pixel.b;
                data[i + 3] = pixel.a;
                continue;
            }
            
            const distance = this.colorDistance(pixel, targetColor);
            const isExtremeChange = this.isExtremeColorChange(targetColor, newColor);
            
            // Adaptive tolerance based on color characteristics
            let adaptiveMaxDistance;
            if (this.isNearWhiteOrBlack(targetColor)) {
                // For colors near white/black, use stricter tolerance
                adaptiveMaxDistance = tolerance * 3.8;
            } else {
                // For other colors, use more lenient tolerance to avoid affecting similar colors
                adaptiveMaxDistance = tolerance * 2.8;
            }
            
            let shouldReplace = false;
            let blendFactor = 0;
            
            if (isExtremeChange && tolerance > 80) {
                // Enhanced matching for extreme color changes (like black to white)
                const targetBrightness = this.getBrightness(targetColor);
                const pixelBrightness = this.getBrightness(pixel);
                const brightnessDiff = Math.abs(targetBrightness - pixelBrightness);
                
                if (brightnessDiff <= (tolerance / 100) * 255) {
                    shouldReplace = true;
                    blendFactor = 1 - (brightnessDiff / ((tolerance / 100) * 255));
                }
            } else {
                // Adaptive color distance matching
                if (distance <= adaptiveMaxDistance) {
                    shouldReplace = true;
                    blendFactor = 1 - (distance / adaptiveMaxDistance);
                }
            }
            
            if (shouldReplace) {
                data[i] = Math.round(pixel.r + (newColor.r - pixel.r) * blendFactor);
                data[i + 1] = Math.round(pixel.g + (newColor.g - pixel.g) * blendFactor);
                data[i + 2] = Math.round(pixel.b + (newColor.b - pixel.b) * blendFactor);
                data[i + 3] = pixel.a;
            } else {
                data[i] = pixel.r;
                data[i + 1] = pixel.g;
                data[i + 2] = pixel.b;
                data[i + 3] = pixel.a;
            }
        }
        
        this.ctx.putImageData(this.currentImageData, 0, 0);
        this.showSuccess('Color change applied successfully!');
    }

    resetImage() {
        if (!this.originalImageData) {
            return;
        }
        
        this.currentImageData.data.set(this.originalImageData.data);
        this.ctx.putImageData(this.currentImageData, 0, 0);
        this.showSuccess('Image reset to original.');
    }

    downloadImage() {
        if (!this.canvas) {
            this.showError('No image to download.');
            return;
        }
        
        // Create a temporary canvas with original image dimensions
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set canvas to original image size
        tempCanvas.width = this.originalImage.naturalWidth;
        tempCanvas.height = this.originalImage.naturalHeight;
        
        // Apply the same color transformation to the full-size image
        tempCtx.drawImage(this.originalImage, 0, 0);
        const fullImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Apply color changes to full resolution
        this.applyColorChangeToImageData(fullImageData);
        tempCtx.putImageData(fullImageData, 0, 0);
        
        // Download the image
        tempCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `colorshift-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showSuccess('Image downloaded successfully!');
        }, 'image/png');
    }

    applyColorChangeToImageData(imageData) {
        const targetColor = this.hexToRgb(document.getElementById('target-color').value);
        const newColor = this.hexToRgb(document.getElementById('new-color').value);
        const tolerance = parseFloat(document.getElementById('tolerance').value);
        
        const data = imageData.data;
        
        // Use the same optimized standard algorithm for full resolution
        for (let i = 0; i < data.length; i += 4) {
            const pixel = {
                r: data[i],
                g: data[i + 1],
                b: data[i + 2],
                a: data[i + 3]
            };
            
            // Skip transparent pixels
            if (pixel.a === 0) {
                continue;
            }
            
            const distance = this.colorDistance(pixel, targetColor);
            const isExtremeChange = this.isExtremeColorChange(targetColor, newColor);
            
            // Adaptive tolerance for download too
            let adaptiveMaxDistance;
            if (this.isNearWhiteOrBlack(targetColor)) {
                adaptiveMaxDistance = tolerance * 3.8;
            } else {
                adaptiveMaxDistance = tolerance * 2.8;
            }
            
            let shouldReplace = false;
            let blendFactor = 0;
            
            if (isExtremeChange && tolerance > 80) {
                // Enhanced matching for extreme color changes
                const targetBrightness = this.getBrightness(targetColor);
                const pixelBrightness = this.getBrightness(pixel);
                const brightnessDiff = Math.abs(targetBrightness - pixelBrightness);
                
                if (brightnessDiff <= (tolerance / 100) * 255) {
                    shouldReplace = true;
                    blendFactor = 1 - (brightnessDiff / ((tolerance / 100) * 255));
                }
            } else {
                // Adaptive color distance matching
                if (distance <= adaptiveMaxDistance) {
                    shouldReplace = true;
                    blendFactor = 1 - (distance / adaptiveMaxDistance);
                }
            }
            
            if (shouldReplace) {
                data[i] = Math.round(pixel.r + (newColor.r - pixel.r) * blendFactor);
                data[i + 1] = Math.round(pixel.g + (newColor.g - pixel.g) * blendFactor);
                data[i + 2] = Math.round(pixel.b + (newColor.b - pixel.b) * blendFactor);
            }
        }
    }

    handlePresetColor(e) {
        const color = e.target.dataset.color;
        document.getElementById('new-color').value = color;
        document.getElementById('new-hex').value = color.toUpperCase();
        this.updateColorPreviews();
    }

    toggleEyedropper() {
        this.eyedropperMode = !this.eyedropperMode;
        const btn = document.getElementById('eyedropper-btn');
        
        if (this.eyedropperMode) {
            btn.classList.add('active');
            this.canvas.classList.add('canvas-eyedropper');
            this.showSuccess('Click on the image to pick a color');
        } else {
            btn.classList.remove('active');
            this.canvas.classList.remove('canvas-eyedropper');
        }
    }

    handleCanvasClick(e) {
        if (!this.eyedropperMode) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (this.canvas.width / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (this.canvas.height / rect.height));
        
        const color = this.getPixelColor(x, y);
        if (color) {
            const hex = this.rgbToHex(color.r, color.g, color.b);
            document.getElementById('target-color').value = hex;
            document.getElementById('target-hex').value = hex.toUpperCase();
            this.updateColorPreviews();
            
            // Exit eyedropper mode
            this.toggleEyedropper();
            this.showSuccess(`Color picked: ${hex.toUpperCase()}`);
        }
    }

    handleCanvasMouseMove(e) {
        if (!this.eyedropperMode) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (this.canvas.width / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (this.canvas.height / rect.height));
        
        const color = this.getPixelColor(x, y);
        if (color) {
            const hex = this.rgbToHex(color.r, color.g, color.b);
            // Show preview in target color preview
            document.getElementById('target-preview').style.backgroundColor = hex;
        }
    }

    getPixelColor(x, y) {
        if (!this.currentImageData || x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
            return null;
        }
        
        const index = (y * this.canvas.width + x) * 4;
        const data = this.currentImageData.data;
        
        return {
            r: data[index],
            g: data[index + 1],
            b: data[index + 2],
            a: data[index + 3]
        };
    }

    rgbToHex(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join("");
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        if (type === 'error') {
            notification.style.background = '#dc3545';
        } else if (type === 'success') {
            notification.style.background = '#28a745';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ColorShiftPro();
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add loading states
function addLoadingState(element) {
    element.classList.add('loading');
    element.disabled = true;
}

function removeLoadingState(element) {
    element.classList.remove('loading');
    element.disabled = false;
}

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for scroll animations
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.step, .feature, .faq-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});
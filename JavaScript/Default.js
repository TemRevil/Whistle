// =============================================
// CORE UTILITIES & INITIALIZATION
// =============================================
const Utils = {
    rgbToHsl: (r, g, b) => {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
        if (max === min) return [0, 0, l];
        const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        return [h / 6, s, l];
    },
    
    hslToRgb: (h, s, l) => {
        if (s === 0) return [l, l, l].map(x => Math.round(x * 255));
        const hue2rgb = (p, q, t) => {
            t = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
            return t < 1/6 ? p + (q - p) * 6 * t : t < 1/2 ? q : t < 2/3 ? p + (q - p) * (2/3 - t) * 6 : p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
        return [hue2rgb(p, q, h + 1/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1/3)].map(x => Math.round(x * 255));
    }
};

// Initialize navigation links
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[targeted-with], [targted-with]').forEach(el => {
        el.style.cursor = 'pointer';
        el.onclick = () => location.href = el.getAttribute('targeted-with') || el.getAttribute('targted-with');
    });
});

// =============================================
// COLOR EXTRACTION & THEMING
// =============================================
class ColorExtractor {
    static async getColorFromImage(img) {
        try {
            img.crossOrigin = 'anonymous';
            if (!img.complete) await new Promise(r => img.onload = r);
            const colorThief = new ColorThief();
            const dominant = colorThief.getColor(img);
            const [h, s, l] = Utils.rgbToHsl(...dominant);
            const color = (s >= 0.3 && l >= 0.2 && l <= 0.8) ? dominant : this.findBestColor(colorThief.getPalette(img, 5));
            return this.enhanceColor(color);
        } catch { return [128, 128, 128]; }
    }

    static findBestColor(palette) {
        const usable = palette.filter(c => {
            const [,,l] = Utils.rgbToHsl(...c);
            return l >= 0.2 && l <= 0.8;
        });
        if (!usable.length) return palette[0];
        return usable.reduce((best, color) => {
            const [h, s] = Utils.rgbToHsl(...color);
            const coolness = (h * 360 >= 180 && h * 360 <= 240) ? 1 : (h * 360 >= 120 && h * 360 <= 180) ? 0.9 : 0;
            const score = coolness * 0.7 + s * 0.3;
            return score > (best.score || 0) ? {color, score} : best;
        }, {}).color || usable[0];
    }

    static enhanceColor([r, g, b]) {
        const [h, s, l] = Utils.rgbToHsl(r, g, b);
        return Utils.hslToRgb(h, Math.min(1, s + 0.5), Math.max(0.7, Math.min(0.85, l + 0.35)));
    }

    static applyColorToCircles(el, [r, g, b]) {
        el.style.setProperty('--circle-color-1', `rgb(${r} ${g} ${b} / 45%)`);
        el.style.setProperty('--circle-color-2', `rgb(${Math.min(255, r + 25)} ${Math.min(255, g + 25)} ${Math.min(255, b + 25)} / 35%)`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.inside-thiefe img').forEach(async img => {
        const color = await ColorExtractor.getColorFromImage(img);
        ColorExtractor.applyColorToCircles(img.closest('.inside-thiefe'), color);
    });
});

// =============================================
// VIDEO SYSTEM WITH SINGLE-PLAY RESTRICTION
// =============================================
class VideoController {
    constructor() {
        this.currentVideo = null;
        this.processedCount = 0;
        this.MAX_VIDEOS = 2;
        this.PATH = {
            play: 'M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z',
            pause: 'M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z',
            expand: 'M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z'
        };
        this.init();
    }

    setIcon(btn, name) {
        const el = btn.querySelector('i, svg');
        if (!el) return;
        if (el.tagName === 'I') { el.className = `fa-solid fa-${name}`; return; }
        el.setAttribute('viewBox', '0 0 512 512');
        let p = el.querySelector('path');
        if (!p) { p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); el.innerHTML = ''; el.appendChild(p); }
        if (this.PATH[name]) p.setAttribute('d', this.PATH[name]);
    }

    pauseAllVideos(except = null) {
        document.querySelectorAll('video:not(.non-control)').forEach(v => {
            if (v !== except && !v.paused) {
                v.pause();
                this.syncPlayIcon(v);
            }
        });
    }

    syncPlayIcon(v) {
        const wrap = v.closest('.video-container');
        if (!wrap) return;
        const playBtn = wrap.querySelector('.v-ps');
        if (!playBtn) return;
        
        if (v.ended || v.paused || v.readyState < 2) {
            this.setIcon(playBtn, 'play');
        } else {
            this.setIcon(playBtn, 'pause');
        }
    }

    addControls(v) {
        if (this.processedCount >= this.MAX_VIDEOS || v.closest('.video-container')?.querySelector('.video-controls') || v.classList.contains('non-control')) return;

        let wrap = v.closest('.video-container');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'video-container flex center';
            v.before(wrap); 
            wrap.append(v);
        } else {
            wrap.classList.add('flex', 'center');
        }

        if (wrap.querySelector('.video-controls')) return;
        this.processedCount++;

        const ctrls = document.createElement('div');
        ctrls.className = 'video-controls w flex col a-center gap';
        ctrls.innerHTML = `
            <div class="v-progress"></div>
            <div class="w flex row j-between gap">
                <div class="flex row gap">
                    <button class="v-ps text"><i class="fa-solid fa-play"></i></button>
                    <div class="back-forw flex center">
                        <button class="control-btn text">-10</button>
                        <button class="control-btn text">+10</button>
                    </div>
                    <div class="v-volume flex row center">
                        <button class="v-mute"><i class="fa-solid fa-volume-high"></i></button>
                        <input type="range" min="0" max="1" step="0.05" value="1">
                    </div>
                </div>
                <button class="v-fullscreen text"><i class="fa-solid fa-expand"></i></button>
            </div>`;
        wrap.append(ctrls);

        this.setupVideoControls(v, wrap, ctrls);
    }

    setupVideoControls(v, wrap, ctrls) {
        const prog = ctrls.querySelector('.v-progress');
        const playBtn = ctrls.querySelector('.v-ps');
        const backBtn = ctrls.querySelector('.control-btn:first-child');
        const fwdBtn = ctrls.querySelector('.control-btn:last-child');
        const fsBtn = ctrls.querySelector('.v-fullscreen');
        const muteBtn = ctrls.querySelector('.v-mute');
        const vol = ctrls.querySelector('input[type="range"]');

        const togglePlay = e => {
            e?.stopPropagation();
            if (v.paused) {
                this.pauseAllVideos(v);
                v.play();
                this.currentVideo = v;
            } else {
                v.pause();
                this.currentVideo = null;
            }
        };

        playBtn.addEventListener('click', togglePlay);
        v.addEventListener('click', togglePlay);

        // Enhanced event listeners
        ['play', 'pause', 'ended', 'loadeddata', 'canplay', 'waiting', 'stalled'].forEach(ev => 
            v.addEventListener(ev, () => this.syncPlayIcon(v))
        );

        backBtn.onclick = () => v.currentTime = Math.max(0, v.currentTime - 10);
        fwdBtn.onclick = () => v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);

        const updateVolumeProgress = () => {
            const percent = (vol.value / vol.max) * 100;
            vol.style.background = `linear-gradient(to right, var(--our-blue) ${percent}%, #555 ${percent}%)`;
        };

        const syncVolIcon = () => {
            const i = muteBtn.querySelector('i');
            if (!i) return;
            if (v.muted || v.volume === 0) i.className = 'fa-solid fa-volume-xmark';
            else if (v.volume < 0.3) i.className = 'fa-solid fa-volume-off';
            else if (v.volume < 0.7) i.className = 'fa-solid fa-volume-low';
            else i.className = 'fa-solid fa-volume-high';
        };

        muteBtn.onclick = () => { 
            v.muted = !v.muted; 
            vol.value = v.muted ? 0 : v.volume; 
            updateVolumeProgress(); syncVolIcon(); 
        };
        
        vol.oninput = e => { 
            v.volume = parseFloat(e.target.value) || 0; 
            v.muted = v.volume === 0; 
            updateVolumeProgress(); syncVolIcon(); 
        };

        ['volumechange', 'loadedmetadata'].forEach(ev => 
            v.addEventListener(ev, () => { syncVolIcon(); vol.value = v.muted ? 0 : v.volume; updateVolumeProgress(); })
        );

        // Progress bar
        let dragging = false, wasPlaying = false;
        const updateProgress = () => {
            if (!dragging && v.duration) prog.style.setProperty('--progress', `${(v.currentTime / v.duration) * 100}%`);
        };
        
        const seekTo = clientX => {
            if (!v.duration) return;
            const r = prog.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
            prog.style.setProperty('--progress', `${pos * 100}%`);
            v.currentTime = pos * v.duration;
        };

        prog.addEventListener('pointerdown', e => {
            dragging = true; wasPlaying = !v.paused; 
            if (wasPlaying) v.pause();
            prog.classList.add('dragging'); 
            seekTo(e.clientX); 
            prog.setPointerCapture(e.pointerId);
        });

        prog.addEventListener('pointermove', e => { if (dragging) seekTo(e.clientX); });
        
        const endDrag = e => {
            if (!dragging) return;
            dragging = false; prog.classList.remove('dragging');
            if (wasPlaying) v.play(); 
            prog.releasePointerCapture?.(e.pointerId);
        };
        
        prog.addEventListener('pointerup', endDrag);
        prog.addEventListener('pointercancel', endDrag);
        
        ['timeupdate', 'loadedmetadata', 'durationchange'].forEach(ev => v.addEventListener(ev, updateProgress));

        // Fullscreen
        fsBtn.onclick = () => {
            const isFS = document.fullscreenElement === wrap || document.fullscreenElement === v;
            if (!isFS) { wrap.requestFullscreen?.(); }
            else document.exitFullscreen?.();
        };
        
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(ev => 
            document.addEventListener(ev, () => {
                const isFS = document.fullscreenElement === wrap || document.fullscreenElement === v;
                this.setIcon(fsBtn, isFS ? 'compress' : 'expand');
            })
        );

        // Show/hide controls
        let t;
        const show = () => { ctrls.style.opacity = '1'; ctrls.style.transform = 'translateY(0)'; };
        const hide = () => { ctrls.style.opacity = '0'; ctrls.style.transform = 'translateY(10px)'; };
        const delayHide = () => { clearTimeout(t); t = setTimeout(hide, 3000); };
        
        wrap.addEventListener('mouseenter', () => { show(); delayHide(); });
        wrap.addEventListener('mousemove', () => { show(); delayHide(); });
        wrap.addEventListener('mouseleave', hide);
        v.addEventListener('pause', show);
        v.addEventListener('play', delayHide);

        // Initial sync
        setTimeout(() => { this.syncPlayIcon(v); syncVolIcon(); updateProgress(); updateVolumeProgress(); hide(); }, 100);
    }

    init() {
        // Process existing videos
        const allVideos = Array.from(document.querySelectorAll('video:not(.non-control)'));
        for (let i = 0; i < Math.min(allVideos.length, this.MAX_VIDEOS); i++) {
            this.addControls(allVideos[i]);
        }

        // Observe for new videos
        new MutationObserver(mutations => {
            if (this.processedCount >= this.MAX_VIDEOS) return;
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;
                    if (node.tagName === 'VIDEO' && !node.classList.contains('non-control')) {
                        this.addControls(node);
                    }
                    if (node.querySelectorAll) {
                        const videos = Array.from(node.querySelectorAll('video:not(.non-control)'));
                        for (let i = 0; i < videos.length && this.processedCount < this.MAX_VIDEOS; i++) {
                            this.addControls(videos[i]);
                        }
                    }
                });
            });
        }).observe(document.body, { childList: true, subtree: true });

        // Handle page visibility for single video restriction
        const handleVisibilityChange = () => {
            if (document.hidden && this.currentVideo && !this.currentVideo.paused) {
                this.currentVideo.pause();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
    }
}

// =============================================
// SOCIAL MEDIA SYSTEM
// =============================================
class SocialMediaSystem {
    constructor() {
        this.feedIt = document.querySelector('.feed-it');
        this.feedSection = document.querySelector('.feed');
        this.mediaButton = document.querySelector('.feed-it-control button:first-child');
        this.postButton = document.querySelector('.feed-it-control button:last-child');
        this.feedMediaContainer = document.querySelector('.feed-it-media');
        this.selectedFiles = [];
        this.textInput = null;
        this.gridProcessor = new PostGridProcessor();
        
        // Only initialize if required elements exist
        if (this.feedIt) {
            this.init();
        }
    }

    init() {
        this.setupEventListeners();
        this.createTextInput();
        this.createFileInput();
        this.gridProcessor.initializeObserver();
        this.setupLikedSystem();
        this.initializeHeights();
    }

    initializeHeights() {
        if (!this.feedIt) return;
        // Set initial heights and remove conflicting CSS constraints
        this.feedIt.style.height = '70px';
        this.feedIt.style.minHeight = '70px';
        this.feedIt.style.maxHeight = 'none'; // Remove max-height constraint
    }

    setupEventListeners() {
        if (!this.feedIt) return;
        
        this.feedIt.addEventListener('click', e => !e.target.closest('button') && this.activateFeed());
        
        if (this.mediaButton) {
            this.mediaButton.addEventListener('click', e => (e.stopPropagation(), this.openFileDialog()));
        }
        
        if (this.postButton) {
            this.postButton.addEventListener('click', e => (e.stopPropagation(), this.createPost()));
        }
        
        document.addEventListener('click', e => !this.feedIt.contains(e.target) && this.deactivateFeed());
    }

    setupLikedSystem() {
        new MutationObserver(mutations => {
            mutations.forEach(m => m.type === 'attributes' && m.attributeName === 'liked' && 
                m.target.classList.toggle('liked', m.target.getAttribute('liked') === 'true'));
        }).observe(document.body, { attributes: true, attributeFilter: ['liked'], subtree: true });

        document.addEventListener('click', e => {
            const btn = e.target.closest('[liked]');
            if (btn) this.toggleLike(btn);
        });

        document.querySelectorAll('[liked]').forEach(btn => 
            btn.classList.toggle('liked', btn.getAttribute('liked') === 'true'));
    }

    toggleLike(button) {
        const isLiked = button.getAttribute('liked') === 'true';
        button.setAttribute('liked', (!isLiked).toString());
    }

    createTextInput() {
        if (!this.feedIt) return;
        
        const textElement = this.feedIt.querySelector('.text');
        if (!textElement) return;
        
        this.textInput = document.createElement('textarea');
        this.textInput.placeholder = 'What\'s on your mind?';
        this.textInput.className = 'text feed-text-input';
        this.textInput.style.display = 'none';
        textElement.parentNode.insertBefore(this.textInput, textElement.nextSibling);
        
        // Add input event listener for dynamic height adjustment
        this.textInput.addEventListener('input', () => this.adjustTextareaHeight());
        this.textInput.addEventListener('keydown', () => setTimeout(() => this.adjustTextareaHeight(), 0));
    }

    createFileInput() {
        this.fileInput = document.createElement('input');
        Object.assign(this.fileInput, { type: 'file', multiple: true, accept: 'image/*,video/*' });
        this.fileInput.className = 'off';
        document.body.appendChild(this.fileInput);
        this.fileInput.addEventListener('change', e => this.handleFileSelection(e.target.files));
    }

    activateFeed() {
        if (!this.feedIt || !this.textInput) return;
        
        if (!this.feedIt.classList.contains('active')) {
            this.feedIt.classList.add('active');
            const deactivatedText = this.feedIt.querySelector('.text.deactivated');
            if (deactivatedText) deactivatedText.style.display = 'none';
            this.textInput.style.display = 'block';
            this.textInput.focus();
            this.updateFeedHeight();
        }
    }

    deactivateFeed() {
        if (!this.feedIt || !this.textInput) return;
        
        if (this.feedIt.classList.contains('active') && !this.textInput.value && !this.selectedFiles.length) {
            this.feedIt.classList.remove('active');
            const deactivatedText = this.feedIt.querySelector('.text.deactivated');
            if (deactivatedText) deactivatedText.style.display = 'block';
            this.textInput.style.display = 'none';
            this.updateFeedHeight();
        }
    }

    openFileDialog() { 
        if (this.fileInput) this.fileInput.click(); 
    }

    handleFileSelection(files) {
        Array.from(files).forEach(file => {
            if (file.type.match(/^(image|video)\//)) this.selectedFiles.push(file);
        });
        this.displaySelectedMedia();
        this.updateFeedHeight();
    }

    displaySelectedMedia() {
        if (!this.feedMediaContainer) return;
        
        this.feedMediaContainer.innerHTML = '';
        this.selectedFiles.forEach((file, index) => {
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.append(this.createMediaElement(file), this.createRemoveButton(index));
            this.feedMediaContainer.appendChild(wrapper);
        });
    }

    createMediaElement(file) {
        const url = URL.createObjectURL(file);
        if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            Object.assign(video, {src: url, className: 'non-control', muted: true, autoplay: true, loop: true});
            return video;
        }
        const img = document.createElement('img');
        img.src = url;
        return img;
    }

    createRemoveButton(index) {
        const btn = document.createElement('button');
        btn.innerHTML = '×';
        btn.className = 'remove-media-btn';
        btn.style.cssText = 'position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.7);color:white;border:none;border-radius:50%;width:25px;height:25px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;';
        btn.addEventListener('click', e => (e.stopPropagation(), this.removeMedia(index)));
        return btn;
    }

    removeMedia(index) {
        if (!this.feedMediaContainer) return;
        
        const mediaElement = this.feedMediaContainer.children[index]?.querySelector('img, video');
        if (mediaElement?.src.startsWith('blob:')) URL.revokeObjectURL(mediaElement.src);
        this.selectedFiles.splice(index, 1);
        this.displaySelectedMedia();
        this.updateFeedHeight();
    }

    adjustTextareaHeight() {
        if (!this.textInput) return;
        
        // Reset height to calculate new height
        this.textInput.style.height = 'auto';
        const scrollHeight = this.textInput.scrollHeight;
        
        // Set textarea height with limits
        const minHeight = 20;
        const maxHeight = 120;
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        this.textInput.style.height = newHeight + 'px';
        
        // Update feed container height based on content
        this.updateFeedHeight();
    }

    updateFeedHeight() {
        if (!this.feedIt || !this.feedMediaContainer) return;
        
        const hasMedia = this.selectedFiles.length > 0;
        const isActive = this.feedIt.classList.contains('active');
        
        // Clear existing height constraints
        this.feedIt.style.height = '';
        this.feedIt.style.minHeight = '';
        this.feedIt.style.maxHeight = 'none';
        
        if (hasMedia) {
            // When media is present - expand to accommodate media
            this.feedIt.style.minHeight = '260px';
            this.feedIt.style.maxHeight = '400px'; // Max height with media
            this.feedIt.style.height = 'auto';
            this.feedMediaContainer.style.height = '120px';
        } else if (isActive) {
            // When active but no media - expand based on text content
            const textHeight = this.textInput ? parseInt(this.textInput.style.height) || 20 : 20;
            const baseHeight = 120;
            const calculatedMinHeight = Math.max(baseHeight, baseHeight + textHeight - 20);
            
            this.feedIt.style.minHeight = calculatedMinHeight + 'px';
            this.feedIt.style.maxHeight = '300px'; // Max height for text only
            this.feedIt.style.height = 'auto';
            this.feedMediaContainer.style.height = '0px';
        } else {
            // When inactive - compact size
            this.feedIt.style.minHeight = '70px';
            this.feedIt.style.maxHeight = '70px';
            this.feedIt.style.height = '70px';
            this.feedMediaContainer.style.height = '0px';
        }
    }

    createPost() {
        if (!this.textInput) return;
        
        const postText = this.textInput.value.trim();
        if (!postText && !this.selectedFiles.length) {
            alert('Please write something or add media to post!');
            return;
        }
        const postElement = this.createPostElement(postText, this.selectedFiles);
        if (this.feedSection) {
            this.feedSection.appendChild(postElement);
        }
        
        const newPostMedia = postElement.querySelector('.post-media');
        if (newPostMedia) this.gridProcessor.processMediaGrid(newPostMedia);
        
        this.resetFeed();
    }

    createPostElement(text, mediaFiles) {
        const userName = this.feedIt?.getAttribute('feeder') || 'Anonymous';
        const userImgSrc = this.feedIt?.querySelector('.profile-img img')?.src || 'Background/user.jpg';
        
        const postBox = document.createElement('div');
        postBox.className = 'post-box flex col gap';
        postBox.innerHTML = `
            <div class="post-header w flex row j-between a-center">
                <div class="flex rwo a-center gap">
                    <div class="post-user-img profile-img"><img src="${userImgSrc}" alt="User"></div>
                    <span class="text">${userName}</span>
                </div>
                <button class="one-btn flex row a-center gap"><i class="fa-solid fa-ellipsis"></i><span>More</span></button>
            </div>
            <div class="post-content">${this.createPostContent(text, mediaFiles)}</div>
            <div class="post-footer flex row j-between gap">
                <div class="flex rwo a-center gap">
                    <button class="one-btn flex row a-center gap" liked="false"><i class="fa-regular fa-thumbs-up"></i><span>Like</span></button>
                    <button class="one-btn flex row a-center gap"><i class="fa-regular fa-comment"></i><span>Comment</span></button>
                </div>
                <button class="one-btn flex row a-center gap"><i class="fa-solid fa-share"></i><span>Share</span></button>
            </div>
        `;
        
        // Setup "See More" functionality
        this.setupSeeMore(postBox);
        
        return postBox;
    }

    createPostContent(text, mediaFiles) {
        let content = '';
        if (mediaFiles.length > 0) {
            content += '<div class="post-media">';
            mediaFiles.forEach(file => {
                const url = URL.createObjectURL(file);
                content += file.type.startsWith('video/') 
                    ? `<video src="${url}" autoplay muted loop></video>`
                    : `<img src="${url}">`;
            });
            content += '</div>';
        }
        if (text) content += `<div class="post-text text">${text}</div>`;
        return content;
    }

    setupSeeMore(postBox) {
        const postText = postBox.querySelector('.post-text');
        if (!postText) return;
        
        const text = postText.textContent;
        const maxLength = 200; // Characters to show before "See More"
        
        if (text.length > maxLength) {
            const shortText = text.substring(0, maxLength) + '...';
            
            // Create truncated version with "See More" and proper text wrapping
            postText.innerHTML = `
                <span class="text-preview" style="word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;">${shortText}</span>
                <button class="see-more-btn" style="color: #1877f2; background: none; border: none; cursor: pointer; font-weight: 500; margin-left: 5px; display: inline;">See More</button>
                <span class="full-text" style="display: none; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;">${text}</span>
                <button class="see-less-btn" style="display: none; color: #1877f2; background: none; border: none; cursor: pointer; font-weight: 500; margin-left: 5px;">See Less</button>
            `;
            
            // Add event listeners
            const seeMoreBtn = postText.querySelector('.see-more-btn');
            const seeLessBtn = postText.querySelector('.see-less-btn');
            const textPreview = postText.querySelector('.text-preview');
            const fullText = postText.querySelector('.full-text');
            
            seeMoreBtn.addEventListener('click', () => {
                textPreview.style.display = 'none';
                seeMoreBtn.style.display = 'none';
                fullText.style.display = 'inline';
                seeLessBtn.style.display = 'inline';
            });
            
            seeLessBtn.addEventListener('click', () => {
                textPreview.style.display = 'inline';
                seeMoreBtn.style.display = 'inline';
                fullText.style.display = 'none';
                seeLessBtn.style.display = 'none';
            });
        } else {
            // For short text, still add proper wrapping
            postText.style.wordWrap = 'break-word';
            postText.style.wordBreak = 'break-word';
            postText.style.overflowWrap = 'break-word';
            postText.style.whiteSpace = 'pre-wrap';
        }
    }

    resetFeed() {
        if (!this.feedIt || !this.textInput || !this.feedMediaContainer) return;
        
        // Clean up blob URLs
        this.feedMediaContainer.querySelectorAll('img, video').forEach(el => {
            if (el.src && el.src.startsWith('blob:')) URL.revokeObjectURL(el.src);
        });
        
        // Reset state
        this.textInput.value = '';
        this.selectedFiles = [];
        this.feedMediaContainer.innerHTML = '';
        this.feedIt.classList.remove('active');
        
        // Reset display
        const deactivatedText = this.feedIt.querySelector('.text.deactivated');
        if (deactivatedText) deactivatedText.style.display = 'block';
        this.textInput.style.display = 'none';
        
        // Reset heights
        this.updateFeedHeight();
    }
}

// =============================================
// POST MEDIA GRID PROCESSOR
// =============================================
class PostGridProcessor {
    constructor() {
        this.areaNames = ['a','b','c','d','e','f','g','h'];
        this.MIN_HEIGHT = 340;
        this.HEIGHT_RATIO = 0.65;
    }

    initializeObserver() {
        this.observer = new ResizeObserver(entries => {
            entries.forEach(entry => this.processMediaGrid(entry.target));
        });
        
        document.querySelectorAll('.post-media').forEach(container => {
            this.processMediaGrid(container);
            this.observer.observe(container);
        });
    }

    getGridHeight(containerWidth) {
        return `${Math.max(this.MIN_HEIGHT, Math.floor(containerWidth * this.HEIGHT_RATIO))}px`;
    }

    getMaxVisible(containerWidth) {
        if (containerWidth < 400) return 2;
        if (containerWidth > 490) return 5;
        if (containerWidth <= 450) return 3;
        if (containerWidth <= 600) return 4;
        return 5;
    }

    getTemplates(containerWidth, visibleCount, height, hasVideo) {
        const doubleRowHeight = `${parseInt(height) / 2}px`;
        const tripleRowHeight = `${parseInt(height) / 3}px`;
        const isMobile = containerWidth < 400;
        const isSmall = containerWidth <= 450;
        const isMedium = containerWidth <= 600;

        const baseTemplates = {
            1: [{ cols: '1fr', rows: height, areas: ['a'] }],
            2: hasVideo && !isMobile ? [{ cols: '2fr 1fr', rows: height, areas: ['a b'] }]
                                     : [{ cols: '1fr 1fr', rows: height, areas: ['a b'] }],
            3: isSmall ? [{ cols: '2fr 1fr', rows: `${doubleRowHeight} ${doubleRowHeight}`, areas: ['a b', 'a c'] }]
                       : [{ cols: '1fr 1fr 1fr', rows: height, areas: ['a b c'] }],
            4: isMedium ? [{ cols: '2fr 1fr', rows: `${tripleRowHeight} ${tripleRowHeight} ${tripleRowHeight}`, areas: ['a b', 'a c', 'a d'] }]
                        : [{ cols: '1fr 1fr', rows: `${doubleRowHeight} ${doubleRowHeight}`, areas: ['a b', 'c d'] }],
            5: [{ cols: '2fr 1fr 1fr', rows: `${doubleRowHeight} ${doubleRowHeight}`, areas: ['a b c', 'a d e'] }]
        };
        
        return baseTemplates[visibleCount] || baseTemplates[1];
    }

    processMediaGrid(container) {
        if (!container) return;
        
        const containerWidth = container.offsetWidth;
        const height = this.getGridHeight(containerWidth);
        const MAX_VISIBLE = this.getMaxVisible(containerWidth);

        // Clean up existing overlays
        container.querySelectorAll('.overlay-imgs').forEach(w => {
            const media = w.querySelector('img, video');
            if (media) w.replaceWith(media);
            else w.remove();
        });

        // Wrap videos
        container.querySelectorAll('video:not(.video-container video)').forEach(video => {
            const wrapper = document.createElement('div');
            wrapper.className = 'video-container';
            video.parentNode.insertBefore(wrapper, video);
            wrapper.appendChild(video);
        });

        let mediaItems = Array.from(container.querySelectorAll('img:not(.video-container img), .video-container'));
        
        // Sort videos first
        mediaItems.sort((a, b) => {
            if (a.classList.contains('video-container') && !b.classList.contains('video-container')) return -1;
            if (!a.classList.contains('video-container') && b.classList.contains('video-container')) return 1;
            return 0;
        });

        const total = mediaItems.length;
        const visibleCount = Math.min(total, MAX_VISIBLE);
        const hasVideo = mediaItems.some(m => m.classList.contains('video-container'));

        // Reset styles
        mediaItems.forEach(m => {
            m.classList.remove('off');
            m.style.gridArea = '';
        });

        // Hide extra items
        mediaItems.slice(visibleCount).forEach(m => m.classList.add('off'));

        const template = this.getTemplates(containerWidth, visibleCount, height, hasVideo)[0];

        // Apply grid styles
        Object.assign(container.style, {
            display: 'grid',
            gridTemplateColumns: template.cols,
            gridTemplateRows: template.rows,
            gridTemplateAreas: template.areas.map(r => `"${r}"`).join(' '),
            gap: containerWidth <= 300 ? '1px' : '2px',
            minHeight: height
        });

        // Assign grid areas
        for (let i = 0; i < visibleCount; i++) {
            const areaName = this.areaNames[i];
            const media = mediaItems[i];
            if (!media) continue;

            if (i === visibleCount - 1 && total > MAX_VISIBLE) {
                const wrapper = document.createElement('div');
                wrapper.className = 'overlay-imgs text';
                wrapper.setAttribute('data-extra', `+${total - MAX_VISIBLE}`);
                media.replaceWith(wrapper);
                wrapper.appendChild(media);
                wrapper.style.gridArea = areaName;
            } else {
                media.style.gridArea = areaName;
            }
        }

        container.innerHTML = '';
        mediaItems.forEach(m => container.appendChild(m.closest('.overlay-imgs') || m));
        
        if (this.observer && !container.hasAttribute('data-observed')) {
            this.observer.observe(container);
            container.setAttribute('data-observed', 'true');
        }
    }
}

// =============================================
// POST VIEWER CAROUSEL
// =============================================
class PostViewerCarousel {
  constructor() {
    this.v = document.getElementById("postViewer");
    if (!this.v) return;

    const q = (s, r = this.v) => r.querySelector(s);
    this.cv = q(".post-media-carousel");
    this.mv = q(".post-media-view");
    this.prev = q(".carousel-btn.prev");
    this.next = q(".carousel-btn.next");
    this.comments = q(".comments");
    this.nameEl = q(".post-content-view span.text");
    this.avatarEl = q(".post-content-view .post-user-img img");
    this.textEl = q(".post-content-view .post-text");
    this.likeBtn = q(".post-content-view .post-footer .one-btn");
    this.cIn = q("#post-comment");
    this.cSend = q("#enter-comment");

    this.i = 0; this.t = 0; this.pt = 0; this.drag = false; this.x0 = 0;
    this.post = null; this.avatar = "Background/user.png";

    // Only continue if essential elements exist
    if (!this.cv || !this.mv) return;

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Delegated open
    document.addEventListener("click", e => {
      let m = e.target.closest(".post-box .post-media img, .post-box .post-media video");
      if (!m && e.target.closest(".overlay-imgs")) m = e.target.closest(".overlay-imgs").querySelector("img");
      if (m) return this.open(m.closest(".post-box"), [...m.closest(".post-box").querySelectorAll(".post-media img, .post-media video")].indexOf(m));
      const cBtn = e.target.closest(".post-box .post-footer .one-btn");
      if (cBtn && (cBtn.innerHTML.includes("fa-comment") || /\bcomment\b/i.test(cBtn.textContent))) this.open(cBtn.closest(".post-box"), 0);
    });

    // Arrows
    if (this.prev) this.prev.addEventListener("click", () => this.slide(-1));
    if (this.next) this.next.addEventListener("click", () => this.slide(1));

    // Touch
    this.cv.addEventListener("touchstart", e => {
      this.drag = true;
      this.x0 = e.touches[0].clientX;
      this.cv.style.transition = "none";
    }, { passive: true });

    this.cv.addEventListener("touchmove", e => {
      if (!this.drag) return;
      this.cv.style.transform = `translateX(${this.pt + (e.touches[0].clientX - this.x0)}px)`;
    }, { passive: true });

    this.cv.addEventListener("touchend", () => {
      if (!this.drag) return;
      this.drag = false;
      this.snap(); // snap will animate
    });

    // Close
    this.v.addEventListener("click", e => e.target === this.v && this.close());
    if (this.mv) this.mv.addEventListener("click", e => e.target === this.mv && this.close());

    // Keys
    document.addEventListener("keydown", e => {
      if (this.v.classList.contains("off")) return;
      if (e.key === "Escape") this.close();
      else if (e.key === "ArrowLeft")  { e.preventDefault(); this.slide(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); this.slide(1); }
    });

    // Like in viewer
    if (this.likeBtn) {
      this.likeBtn.addEventListener("click", () => {
        if (!this.post) return;
        const on = !this._liked(this.likeBtn);
        this._setLike(this.likeBtn, on);
        const pb = this._postLikeBtn(this.post);
        this._setLike(pb, on);
        const me = this._me(), list = (this.post.dataset.liked || "").split(",").map(s => s.trim()).filter(Boolean);
        const has = list.some(n => n.toLowerCase() === me.toLowerCase());
        if (on && !has) list.push(me);
        if (!on && has) list.splice(list.findIndex(n => n.toLowerCase() === me.toLowerCase()), 1);
        this.post.dataset.liked = list.join(", ");
      });
    }

    // Comments
    if (this.cSend) this.cSend.addEventListener("click", () => this.addComment());
    if (this.cIn) this.cIn.addEventListener("keydown", e => e.key === "Enter" && (e.preventDefault(), this.addComment()));
  }

  open(postBox, idx = 0) {
    if (!postBox) return;
    
    this.post = postBox;
    const media = [...postBox.querySelectorAll(".post-media img, .post-media video")];
    media.forEach(el => el.classList.remove("off","active"));

    if (this.textEl) this.textEl.textContent = postBox.querySelector(".post-text")?.innerText || "";
    if (this.nameEl) this.nameEl.textContent = postBox.dataset.username || postBox.querySelector(".post-header .text")?.innerText || "";
    this.avatar = postBox.querySelector(".post-user-img img")?.src || "Background/user.png";
    if (this.avatarEl) this.avatarEl.src = this.avatar;
    this.v.dataset.postId = postBox.dataset.postId || "";
    if (this.cIn) this.cIn.value = "";

    this._renderComments(postBox.dataset.postComments || "");
    this._setLike(this.likeBtn, this._liked(this._postLikeBtn(postBox)));

    this.cv.innerHTML = "";
    media.forEach((el, i) => {
      const d = document.createElement("div");
      d.className = "media-item" + (i === idx ? " active" : "");
      const c = el.cloneNode(true);
      c.removeAttribute("style"); c.classList?.remove?.("off","active");
      d.appendChild(c);
      const v = c.tagName === "VIDEO" ? c : c.querySelector?.("video");
      if (v) {
        v.pause(); v.removeAttribute("autoplay");
        v.addEventListener("click", ev => { ev.stopPropagation(); this.i !== i ? (this.i = i, this.center(true)) : (v.paused ? v.play() : v.pause()); });
      }
      d.addEventListener("click", () => this.i !== i && (this.i = i, this.center(true)));
      this.cv.appendChild(d);
    });

    this.v.classList.remove("off");
    this.i = Math.max(0, Math.min(idx, this.cv.children.length - 1));
    this.center(true);
  }

  addComment() {
    if (!this.cIn || !this.post) return;
    
    const txt = (this.cIn.value || "").trim();
    if (!txt) return;
    
    const cur = this._parseC(this.post.dataset.postComments || []);
    const id = (cur.reduce((m, c) => Math.max(m, c.id || 0), 0) || 0) + 1;
    const name = this._me(), av = this._myAvatar();
    cur.push({ id, name, text: txt });
    this.post.dataset.postComments = this._strC(cur);
    this._appendComment(name, txt, av);
    this.cIn.value = "";
  }

  center(animate = true) {
    const its = [...this.cv.children]; if (!its.length) return;
    its.forEach((el, j) => { el.classList.toggle("active", j === this.i); const v = el.querySelector("video"); if (v && j !== this.i) v.pause(); });
    const cont = this.cv.parentElement, a = its[this.i];
    if (!cont || !a) return;
    const target = cont.clientWidth / 2 - (a.offsetLeft + a.offsetWidth / 2);
    this.t = this.pt = target;
    // smoother easing
    this.cv.style.transition = animate ? "transform .48s cubic-bezier(.2,.8,.2,1)" : "none";
    this.cv.style.transform = `translateX(${target}px)`;
  }

  slide(d) { const n = this.cv.children.length; if (!n) return; this.i = (this.i + d + n) % n; this.center(true); }

  snap() {
    const its = [...this.cv.children], r = this.cv.parentElement.getBoundingClientRect(), cx = r.left + r.width / 2;
    this.i = its.reduce((b, el, j) => {
      const rb = its[b].getBoundingClientRect(), ra = el.getBoundingClientRect();
      return Math.abs(cx - (ra.left + ra.width / 2)) < Math.abs(cx - (rb.left + rb.width / 2)) ? j : b;
    }, 0);
    this.center(true);
  }

  close() {
    this.v.classList.add("off"); this.cv.innerHTML = ""; 
    if (this.comments) this.comments.innerHTML = ""; 
    if (this.cIn) this.cIn.value = "";
    this.i = 0; this.t = this.pt = 0; this.drag = false; this.cv.style.cssText = ""; this.post = null;
  }

  // helpers (unchanged)
  _postLikeBtn(scope) { return [...scope.querySelectorAll(".post-footer .one-btn")].find(b => b.innerHTML.includes("fa-thumbs-up") || /Like/i.test(b.textContent)); }
  _liked(btn) { return !!(btn && (btn.getAttribute("liked") === "true" || btn.classList.contains("liked"))); }
  _setLike(btn, on) {
    if (!btn) return;
    on ? btn.setAttribute("liked","true") : btn.removeAttribute("liked");
    btn.classList.toggle("liked", !!on);
    const i = btn.querySelector(".fa-thumbs-up");
    if (i) { i.classList.toggle("fa-solid", !!on); i.classList.toggle("fa-regular", !on); }
  }
  _me() {
    const n = document.querySelector("[data-current-user-name]")?.getAttribute("data-current-user-name")
      || document.body?.dataset?.currentUserName
      || document.querySelector(".current-user-name")?.textContent;
    return (n || this.nameEl?.textContent || "User").trim();
  }
  _myAvatar() {
    const a = document.querySelector("[data-current-user-avatar]")?.getAttribute("data-current-user-avatar")
      || document.querySelector(".current-user-avatar img")?.src;
    return a || this.avatar || this.avatarEl?.src || "Background/user.png";
  }
  _parseC(str) {
    if (Array.isArray(str)) return str;
    return (str || "").split(",").map(s => s.trim()).filter(Boolean).map(x => {
      const [id, rest] = x.split(":"); if (!rest) return null;
      const [name, ...t] = rest.split(";"); return { id: +id || 0, name: (name || "").trim(), text: (t.join(";") || "").trim() };
    }).filter(Boolean);
  }
  _strC(list) { return list.map(o => `${o.id}:${o.name};${o.text}`).join(","); }
  _appendComment(name, text, avatar) {
    if (!this.comments) return;
    this.comments.insertAdjacentHTML("beforeend",
      `<div class="comment-box flex col gap">
        <div class="flex rwo a-center gap">
          <div class="comment-user-img profile-img"><img src="${avatar || "Background/user.png"}" alt="User"></div>
          <span class="text">${name || ""}</span>
        </div>
        <p class="text">${text || ""}</p>
        <div class="comment-control flex col j-between gap">
          <button class="comment-options"><i class="fa-solid fa-ellipsis"></i></button>
          <button class="comment-like"><i class="fa-solid fa-thumbs-up"></i></button>
        </div>
      </div>`);
  }
  _renderComments(dataStr) { 
    if (!this.comments) return;
    this.comments.innerHTML = ""; 
    this._parseC(dataStr).forEach(c => this._appendComment(c.name, c.text, this.avatar)); 
  }
}

// =============================================
// THUNDER ISLAND SYSTEM
// =============================================
class ThunderIsland {
    constructor() {
        this.island = document.querySelector('.thunder-island');
        this.pop = document.querySelector('.thunder-pop');
        if (!this.island || !this.pop) return;
        this.init();
    }

    init() {
        this.pop.addEventListener('click', () => this.toggle());
        document.addEventListener('click', (e) => {
            if (this.island.classList.contains('active') && !this.island.contains(e.target)) {
                this.close();
            }
        });
    }

    toggle() { this.island.classList.toggle('active'); }
    close() { this.island.classList.remove('active'); }
}

class ThunderMessenger {
    constructor() {
        this.island = document.querySelector('.thunder-island');
        this.list = document.querySelector('.whistlers');
        this.chat = document.querySelector('#whistle-whistling');
        this.messages = document.querySelector('.whistle-messages');
        this.input = document.querySelector('#whistleInput');
        
        if (!this.island || !this.list || !this.chat || !this.messages || !this.input) return;
        
        this.conversation = [];
        this.userId = null;
        this.init();
    }
    
    init() {
        new MutationObserver(() => this.checkState()).observe(this.island, {attributes: true});
        document.querySelectorAll('.whistle-box').forEach(b => b.onclick = e => this.openChat(e));
        
        const back = document.querySelector('#backToList');
        if (back) back.onclick = () => this.backToList();
        
        const sendBtn = document.querySelector('#sendWhistleBtn');
        if (sendBtn) sendBtn.onclick = () => this.send();
        
        this.input.addEventListener('keypress', e => e.key === 'Enter' && this.send());
        this.checkState();
    }
    
    checkState() {
        const active = this.island.classList.contains('active');
        this.list.classList.toggle('off', !active);
        this.chat.classList.add('off');
    }
    
    openChat(e) {
        const b = e.currentTarget;
        this.userId = b.getAttribute('user-id') || b.getAttribute('user-data');
        
        const curImg = document.querySelector('.cur-whistle-img img');
        const curText = document.querySelector('.cur-whistle .text');
        
        if (curImg) curImg.src = b.querySelector('.whistle-img img')?.src || '';
        if (curText) curText.textContent = b.querySelector('#whistle-box-username')?.textContent || '';
        
        try {
            this.conversation = JSON.parse(b.getAttribute('data-convo')?.replace(/&quot;/g, '"')) || [];
        } catch {
            this.conversation = this.getDefaultConversation();
        }
        
        this.messages.innerHTML = '';
        this.conversation.forEach(m => this.addMessage(m.text, m.from === 'me'));
        this.list.classList.add('off');
        this.chat.classList.remove('off');
        setTimeout(() => this.input.focus(), 100);
        this.scrollToBottom();
    }
    
    getDefaultConversation() {
        const defaults = {
            mohammed_dev: [{from:'them',text:'Hey! How are you doing?'},{from:'me',text:'They Tryna Insult My Intelligence, Sometimes i may Act Stupid.'},{from:'them',text:"That's deep man! 🤔"},{from:'me',text:'Yeah, just keeping it real 💯'},{from:'them',text:'Respect! Always stay true to yourself'}],
            sarah_design: [{from:'them',text:"What's up everyone! 🎉"}],
            alex_photo: [{from:'them',text:'Just finished my morning workout 💪'}],
            emma_art: [{from:'them',text:'Coffee and coding this morning ☕'}],
            david_tech: [{from:'them',text:'Beautiful sunset today! 🌅'}]
        };
        return defaults[this.userId] || [];
    }
    
    backToList() {
        this.chat.classList.add('off');
        this.list.classList.remove('off');
        this.input.value = '';
    }
    
    addMessage(text, sent) {
        const div = document.createElement('div');
        div.className = `whistle-in-live w flex col ${sent ? 'a-end' : 'a-start'}`;
        div.innerHTML = `<div class="message text ${sent ? 'sent' : ''}">${text}</div>`;
        this.messages.appendChild(div);
    }
    
    send() {
        const text = this.input.value.trim();
        if (!text) return;
        
        this.conversation.push({from: 'me', text: text});
        this.addMessage(text, true);
        this.updateConversation();
        this.input.value = '';
        this.scrollToBottom();
        
        // Auto-reply
        setTimeout(() => {
            const replies = ["That's interesting! 🤔", "I see 👍", "Tell me more", "Absolutely! 💯", "Nice! 😄"];
            const reply = replies[Math.floor(Math.random() * replies.length)];
            this.conversation.push({from: 'them', text: reply});
            this.addMessage(reply, false);
            this.updateConversation();
            this.scrollToBottom();
        }, 1000);
    }
    
    updateConversation() {
        const box = document.querySelector(`[user-id="${this.userId}"], [user-data="${this.userId}"]`);
        if (!box) return;
        
        box.setAttribute('data-convo', JSON.stringify(this.conversation));
        const lastMessage = this.conversation[this.conversation.length - 1];
        const preview = box.querySelector('#whistle-box-message');
        
        if (preview && lastMessage) {
            preview.textContent = lastMessage.text.length > 30 ? 
                lastMessage.text.substring(0, 30) + '...' : lastMessage.text;
        }
    }
    
    scrollToBottom() {
        setTimeout(() => this.messages.scrollTop = this.messages.scrollHeight, 100);
    }
}

// =============================================
// Components
// =============================================
// Tooltips
function initTooltips() {
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip text";
  document.body.appendChild(tooltip);

  function showTooltip(el) {
    const text = el.getAttribute("titled-with");
    if (!text) return;

    tooltip.textContent = text;
    tooltip.classList.add("show");

    const rect = el.getBoundingClientRect();
    const pos = el.getAttribute("titled-pos") || "top";
    const padding = 8;

    let top, left;
    switch (pos) {
      case "bottom":
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2;
        left = rect.left - tooltip.offsetWidth - padding;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltip.offsetHeight / 2;
        left = rect.right + padding;
        break;
      default: // top
        top = rect.top - tooltip.offsetHeight - padding;
        left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
    }

    tooltip.style.top = `${top + window.scrollY}px`;
    tooltip.style.left = `${left + window.scrollX}px`;
  }

  function hideTooltip() {
    tooltip.classList.remove("show");
  }

  document.addEventListener("mouseover", e => {
    const target = e.target.closest("[titled-with]");
    if (target) showTooltip(target);
  });

  document.addEventListener("mouseout", e => {
    if (e.target.closest("[titled-with]")) hideTooltip();
  });
}

// init on load
initTooltips();

// The Users Tooltips
function initUserTooltips() {
  const tooltip = document.createElement("div");
  tooltip.className = "user-tooltip";
  document.body.appendChild(tooltip);

  let hideTimeout, currentEl;
  
  const getAttr = (el, key, fallback) => 
    el.dataset[key] || el.getAttribute("friend-" + key) || fallback;

  function updatePosition() {
    if (!currentEl) return;
    
    const rect = currentEl.getBoundingClientRect();
    const tRect = tooltip.getBoundingClientRect();
    
    // Check available space
    const spaceTop = rect.top;
    const spaceBottom = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;
    
    let x, y, placement = "top";
    
    // Position logic: top -> bottom -> right -> left
    if (spaceTop >= tRect.height + 10) {
      placement = "top";
      x = Math.max(10, Math.min(
        rect.left + rect.width / 2 - tRect.width / 2, 
        window.innerWidth - tRect.width - 10
      ));
      y = rect.top - tRect.height - 8;
    } else if (spaceBottom >= tRect.height + 10) {
      placement = "bottom";
      x = Math.max(10, Math.min(
        rect.left + rect.width / 2 - tRect.width / 2, 
        window.innerWidth - tRect.width - 10
      ));
      y = rect.bottom + 8;
    } else if (spaceRight >= tRect.width + 10) {
      placement = "right";
      x = rect.right + 8;
      y = Math.max(10, Math.min(
        rect.top + rect.height / 2 - tRect.height / 2, 
        window.innerHeight - tRect.height - 10
      ));
    } else {
      placement = "left";
      x = rect.left - tRect.width - 8;
      y = Math.max(10, Math.min(
        rect.top + rect.height / 2 - tRect.height / 2, 
        window.innerHeight - tRect.height - 10
      ));
    }

    tooltip.setAttribute("data-placement", placement);
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  function showTooltip(el) {
    clearTimeout(hideTimeout);
    if (currentEl === el) return;
    
    currentEl = el;
    const name = getAttr(el, "name", "Unknown");
    const user = getAttr(el, "username", "@user");
    const followers = getAttr(el, "followers", "0");
    const following = getAttr(el, "following", "0");
    const posts = getAttr(el, "posts", "0");
    const status = getAttr(el, "status", "offline").toLowerCase();
    const img = getAttr(el, "image", el.querySelector("img")?.src || "");
    const statusClass = `status-${["online", "busy"].includes(status) ? status : "offline"}`;

    tooltip.innerHTML = `
      <div class="tooltip-header">
        <div class="tooltip-avatar"><img src="${img}" alt="Avatar"></div>
        <div class="tooltip-info">
          <div class="tooltip-name align">${name}</div>
          <div class="tooltip-username text">${user}</div>
        </div>
      </div>
      <div class="tooltip-stats">
        <div><span class="stat-number text">${followers}</span><div class="stat-label text">Followers</div></div>
        <div><span class="stat-number text">${following}</span><div class="stat-label text">Following</div></div>
        <div><span class="stat-number text">${posts}</span><div class="stat-label text">Posts</div></div>
      </div>
      <div class="tooltip-status text ${statusClass}">
        <div class="status-dot text"></div><span>${status}</span>
      </div>
    `;

    tooltip.classList.add("show");
    updatePosition();
  }

  function hideTooltip() {
    tooltip.classList.remove("show");
    currentEl = null;
  }

  // Event listeners
  document.addEventListener("mouseover", e => {
    const el = e.target.closest(".fr-tooltip");
    if (el) {
      showTooltip(el);
    } else if (e.target.closest(".user-tooltip")) {
      clearTimeout(hideTimeout);
    }
  });

  document.addEventListener("mouseout", e => {
    const inTooltip = e.target.closest(".fr-tooltip") || e.target.closest(".user-tooltip");
    const toTooltip = e.relatedTarget?.closest(".fr-tooltip") || e.relatedTarget?.closest(".user-tooltip");
    
    if (inTooltip && !toTooltip) {
      hideTimeout = setTimeout(hideTooltip, 200);
    }
  });

  // Update position on scroll and resize
  window.addEventListener("scroll", updatePosition, { passive: true });
  window.addEventListener("resize", updatePosition);
}

initUserTooltips();

// Dropdown
class TinyDropdown {
  constructor(el) {
    this.el = el;
    this.toggle = el.querySelector('.dropdown-toggle');
    this.menu = el.querySelector('.dropdown-menu');
    this.opts = (el.getAttribute('options') || '').split(',').map(s => s.trim()).filter(Boolean);
    this.value = el.getAttribute('selected') || this.opts[0] || '';
    this.render();
    this.events();
  }

  render() {
    this.toggle.innerHTML = `<span class="text">${this.value}</span><i class="fa-solid fa-chevron-down"></i>`;
    this.menu.innerHTML = this.opts
      .map(o => `<div class="dropdown-item text"${o === this.value ? ' style="font-weight:600"' : ''}>${o}</div>`)
      .join('');
  }

  events() {
    this.toggle.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-menu').forEach(m => m !== this.menu && m.classList.remove('show'));
      this.menu.classList.toggle('show');
    });

    this.menu.addEventListener('click', e => {
      const item = e.target.closest('.dropdown-item');
      if (!item) return;
      this.value = item.textContent.trim();
      this.el.setAttribute('selected', this.value);
      this.render();
      this.menu.classList.remove('show');
    });
  }

  static init(selector = '.dropdown') {
    document.querySelectorAll(selector).forEach(el => new TinyDropdown(el));
    document.addEventListener('click', () =>
      document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.remove('show'))
    );
  }
}

TinyDropdown.init();
// =============================================
// SETTINGS
// =============================================
// Settings Modal & Navigation
document.addEventListener('DOMContentLoaded', function() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.settings-section');
    
    // Navigation functionality
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            
            // Remove active from all nav buttons
            navButtons.forEach(btn => btn.classList.remove('active'));
            // Add active to clicked button
            this.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => section.classList.add('off'));
            // Show target section
            document.getElementById(target).classList.remove('off');
        });
    });
    
    // Close modal
    document.querySelector('.close-sets').addEventListener('click', function() {
        document.querySelector('.sets-modal').classList.add('off');
    });
    
    // Close on background click
    document.querySelector('.sets-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.add('off');
        }
    });

    // Open settings modal
    document.getElementById('open-sets')
      .addEventListener('click', () =>
        document.querySelector('.sets-modal')?.classList.remove('off')
    );

    // Theme toggler initialization
    ThemeToggler.init();
});

// The Day out of the Night
class ThemeToggler {
  static light = {
    '--bg-primary': '#edf2f4',
    '--tx-primary': '#000',
    '--tx-ag-blur': '#333',
    '--whites': '#fff',
    '--ag-whites': '#fff',
    '--blur': '#00000040',
    '--ag-blur': '#ffffff59',
    '--emerald': '#2fbf71ff',
    '--our-blue-lighted': '#bfddffff',
    '--our-blue': '#3395ffff',
    '--fill-blur': '12px'
  };

  static dark = {
    '--bg-primary': '#0f1115',
    '--tx-primary': '#fff',
    '--tx-ag-blur': '#aaa',
    '--whites': '#fff',
    '--ag-whites': '#111',
    '--blur': '#ffffff25',
    '--ag-blur': '#00000070',
    '--emerald': '#2fbf71ff',
    '--our-blue-lighted': '#163f5f',
    '--our-blue': '#3395ffff',
    '--fill-blur': '12px'
  };

  static apply(theme) {
    Object.entries(theme).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v)
    );
  }

  static init(toggleId = 'darkModeToggle') {
    const t = document.getElementById(toggleId);
    if (!t) return;
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const startDark = saved === 'dark' || (!saved && prefersDark);

    ThemeToggler.apply(startDark ? ThemeToggler.dark : ThemeToggler.light);
    t.checked = startDark;

    t.addEventListener('change', () => {
      const mode = t.checked ? 'dark' : 'light';
      ThemeToggler.apply(ThemeToggler[mode]);
      localStorage.setItem('theme', mode);
    });
  }
}
// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    new VideoController();
    new SocialMediaSystem();
    new PostViewerCarousel();
    new ThunderIsland();
    new ThunderMessenger();
});
// -------------------------------------
// Story Preview Functionality - FIXED VERSION
// -------------------------------------
class StoryPreview {
    constructor() {
        this.timer = null;
        this.active = null;
        this.lastHovered = null;
        this.storyTimers = new Map();
        this.currentStories = [];
        this.currentStoryIndex = 0;
        this.viewerTimer = null;
        this.progressBars = [];
        this.storyLikes = new Map();
        this.currentUsername = null;
        this.storyBoxes = []; // store all story boxes in order
        this.init();
        this.initScrolling();
    }

    init() {
        this.storyBoxes = [...document.querySelectorAll('.story-box')];
        this.storyBoxes.forEach(box => {
            box.addEventListener('mouseover', () => {
                if (this.lastHovered === box) return;
                this.lastHovered = box;
                clearTimeout(this.timer);
                this.timer = setTimeout(() => this.activateBox(box), 3000);
            });
            box.addEventListener('mouseleave', () => {
                clearTimeout(this.timer);
                this.lastHovered = null;
                if (box.classList.contains('active')) this.deactivateBox(box);
            });
            box.addEventListener('click', () => this.openViewer(box));
        });

        ['closeBtn', 'likeBtn'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => {
                    if (id === 'closeBtn') {
                        this.closeViewer();
                    } else {
                        this.toggleLike();
                    }
                });
            }
        });

        document.getElementById('storyViewer').addEventListener('click', (e) => {
            if (e.target.id === 'storyViewer') this.closeViewer();
        });

        document.addEventListener('keydown', (e) => {
            const viewer = document.getElementById('storyViewer');
            if (!viewer.classList.contains('off')) {
                if (e.key === 'Escape') this.closeViewer();
                else if (e.key === 'ArrowRight') this.nextStory();
                else if (e.key === 'ArrowLeft') this.prevStory();
            }
        });

        document.querySelector('.viewer-story').addEventListener('click', (e) => {
            const rect = e.target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            x < rect.width / 3 ? this.prevStory() : x > rect.width * 2/3 ? this.nextStory() : null;
        });
    }

    // Generate unique key for each story
    getStoryKey(username, storyIndex) {
        return `${username}_story_${storyIndex}`;
    }

    // Toggle like for current story
    toggleLike() {
        const likeBtn = document.getElementById('likeBtn');
        if (!likeBtn || !this.currentUsername) return;

        const storyKey = this.getStoryKey(this.currentUsername, this.currentStoryIndex);
        const isLiked = this.storyLikes.get(storyKey) || false;
        
        this.storyLikes.set(storyKey, !isLiked);
        this.updateLikeButton(!isLiked);
    }

    // Update like button appearance
    updateLikeButton(isLiked) {
        const likeBtn = document.getElementById('likeBtn');
        if (!likeBtn) return;
        const svg = likeBtn.querySelector('svg');
        if (!svg) return;

        if (isLiked) {
            likeBtn.classList.add('st-like');
            svg.innerHTML = '<path fill="currentColor" d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5z"/>';
        } else {
            likeBtn.classList.remove('st-like');
            svg.innerHTML = '<path fill="currentColor" d="M225.8 468.2l-2.5-2.3L48.1 303.2C17.4 274.7 0 234.7 0 192.8v-3.3c0-70.4 50-130.8 119.2-144C158.6 37.9 198.9 47 231 69.6c9 6.4 17.4 13.8 25 22.3c4.2-4.8 8.7-9.2 13.5-13.3c3.7-3.2 7.5-6.2 11.5-9c0 0 0 0 0 0C313.1 47 353.4 37.9 392.8 45.4C462 58.6 512 119.1 512 189.5v3.3c0 41.9-17.4 81.9-48.1 110.4L288.7 465.9l-2.5 2.3c-8.2 7.6-19 11.9-30.2 11.9s-22-4.2-30.2-11.9zM239.1 145c-.4-.3-.7-.7-1-1.1l-17.8-20c0 0-.1-.1-.1-.1c0 0 0 0 0 0c-23.1-25.9-58-37.7-92-31.2C81.6 101.5 48 142.1 48 189.5v3.3c0 28.5 11.9 55.8 32.8 75.2L256 430.7 431.2 268c20.9-19.4 32.8-46.7 32.8-75.2v-3.3c0-47.3-33.6-88-80.1-96.9c-34-6.5-69 5.4-92 31.2c0 0 0 0-.1 .1s0 0-.1 .1l-17.8 20c-.3 .4-.7 .7-1 1.1c-4.5 4.5-10.6 7-16.9 7s-12.4-2.5-16.9-7z"/>';
        }
    }

    markStoryWatched(username) {
        const box = this.storyBoxes.find(b => b.getAttribute('data-username') === username);
        if (box) {
            box.querySelector('.story-rounded')?.classList.add('watched');
        }
    }

    openViewer(box) {
        if (this.active) {
            this.deactivateBox(this.active);
            this.active = null;
        }

        const stories = box.getAttribute('story');
        if (!stories) return;

        this.currentStories = stories.split(',').map(s => s.trim());
        this.currentStoryIndex = 0;
        const username = box.getAttribute('data-username') || 'Unknown';
        this.currentUsername = username;
        
        document.getElementById('userName').textContent = username
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        document.getElementById('userAvatar').src = box.querySelector('img').src;
        document.getElementById('storiesProgress').innerHTML = '<div></div>'.repeat(this.currentStories.length);
        this.progressBars = [...document.querySelectorAll('#storiesProgress div')];
        document.getElementById('storyViewer').classList.remove('off');
        document.body.style.overflow = 'hidden';

        this.markStoryWatched(username); // Mark watched when opening
        this.showStory();
    }

    showStory() {
        if (this.currentStoryIndex >= this.currentStories.length) return this.closeViewer();

        const src = this.currentStories[this.currentStoryIndex];
        const isVideo = ['mp4', 'webm'].includes(src.split('.').pop().toLowerCase());

        clearTimeout(this.viewerTimer);
        this.updateProgress();

        const storyKey = this.getStoryKey(this.currentUsername, this.currentStoryIndex);
        const isLiked = this.storyLikes.get(storyKey) || false;
        this.updateLikeButton(isLiked);

        document.querySelector('.viewer-story').innerHTML = isVideo ? 
            `<video src="${src}" class="non-control" autoplay playsinline style="width:100%;height:100%;object-fit:cover"></video>` :
            `<img src="${src}" style="width:100%;height:100%;object-fit:cover">`;
        
        const element = document.querySelector('.viewer-story').firstChild;
        
        if (isVideo) {
            element.addEventListener('loadedmetadata', () => this.animateProgress(this.progressBars[this.currentStoryIndex], element.duration * 1000));
            element.addEventListener('ended', () => this.nextStory());
        } else {
            this.animateProgress(this.progressBars[this.currentStoryIndex], 5000);
            this.viewerTimer = setTimeout(() => this.nextStory(), 5000);
        }
    }

    animateProgress(bar, duration) {
        this.progressBars.forEach((b, i) => b.className = i < this.currentStoryIndex ? 'completed' : '');
        bar.className = 'active';
        bar.style.setProperty('--duration', `${duration}ms`);
    }

    updateProgress() {
        this.progressBars.forEach((bar, i) => bar.className = i < this.currentStoryIndex ? 'completed' : '');
    }

    nextStory() {
        if (this.progressBars[this.currentStoryIndex]) {
            this.progressBars[this.currentStoryIndex].className = 'completed';
        }
        this.currentStoryIndex++;

        if (this.currentStoryIndex >= this.currentStories.length) {
            // Finished all stories for current user
            this.markStoryWatched(this.currentUsername);

            // Go to next user
            let currentIndex = this.storyBoxes.findIndex(b => b.getAttribute('data-username') === this.currentUsername);
            if (currentIndex !== -1 && currentIndex < this.storyBoxes.length - 1) {
                let nextBox = this.storyBoxes[currentIndex + 1];
                this.openViewer(nextBox);
            } else {
                // No next story → close viewer
                this.closeViewer();
            }
        } else {
            this.showStory();
        }
    }

    prevStory() {
        if (this.currentStoryIndex > 0) {
            this.progressBars[this.currentStoryIndex].className = '';
            this.currentStoryIndex--;
            this.showStory();
        } else {
            let currentIndex = this.storyBoxes.findIndex(b => b.getAttribute('data-username') === this.currentUsername);
            if (currentIndex > 0) {
                let prevBox = this.storyBoxes[currentIndex - 1];
                this.openViewer(prevBox);
                this.currentStoryIndex = this.currentStories.length - 1;
                this.showStory();
            }
        }
    }

    closeViewer() {
        document.getElementById('storyViewer').classList.add('off');
        document.body.style.overflow = '';
        clearTimeout(this.viewerTimer);
        const video = document.querySelector('.viewer-story video');
        if (video) video.pause();
        this.progressBars.forEach(bar => bar.className = '');
        this.currentUsername = null;
    }

    activateBox(box) {
        const viewer = document.getElementById('storyViewer');
        if (!viewer.classList.contains('off')) return;

        if (this.active) this.deactivateBox(this.active);
        box.classList.add('active');
        this.active = box;
        box.querySelector('.story-rounded').classList.add('off');
        box.querySelector('.text').classList.add('off');

        const username = box.getAttribute('data-username') || 'Unknown';
        const fontSize = window.innerWidth <= 768 ? '16px' : '26px';
        
        box.innerHTML += `
            <div class="story-preview w h"></div>
            <div class="story-data-inpreview flex col a-start">
                <span class="text story-username-preview" style="font-size: ${fontSize}; font-weight: 600">
                    ${username.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span class="text">4 Hours Ago</span>
            </div>`;

        const stories = box.getAttribute('story');
        if (stories) {
            this.playPreview(box, box.querySelector('.story-preview'), stories.split(',').map(s => s.trim()));
        }
        
        this.scrollToActiveBox(box);
    }

    scrollToActiveBox(box) {
        const storyLine = document.querySelector('.story-line');
        const expandedWidth = window.innerWidth <= 768 ? 200 : 250;
        const boxCenter = box.offsetLeft + (expandedWidth / 2);
        const containerCenter = storyLine.clientWidth / 2;
        const targetScroll = boxCenter - containerCenter;
        this.scrollTo(Math.max(0, targetScroll));
    }

    playPreview(box, preview, sources) {
        let index = 0;
        const showNext = () => {
            if (!box.classList.contains('active') || index >= sources.length) {
                if (index >= sources.length) this.deactivateBox(box);
                return;
            }
            const src = sources[index];
            const isVideo = ['mp4', 'webm'].includes(src.split('.').pop().toLowerCase());
            
            preview.innerHTML = isVideo ? 
                `<video src="${src}" class="non-control" autoplay playsinline style="width:100%;height:100%;object-fit:cover"></video>` :
                `<img src="${src}" style="width:100%;height:100%;object-fit:cover">`;
            
            if (isVideo) {
                preview.firstChild.addEventListener('ended', () => {
                    index++;
                    this.storyTimers.set(box, setTimeout(showNext, 0));
                });
            } else {
                this.storyTimers.set(box, setTimeout(() => { index++; showNext(); }, 5000));
            }
        };
        showNext();
    }

    deactivateBox(box) {
        box.classList.remove('active');
        if (this.active === box) this.active = null;
        box.querySelector('.story-rounded').classList.remove('off');
        box.querySelector('.text').classList.remove('off');
        box.querySelector('.story-preview')?.remove();
        box.querySelector('.story-data-inpreview')?.remove();
        const timer = this.storyTimers.get(box);
        if (timer) {
            clearTimeout(timer);
            this.storyTimers.delete(timer);
        }
    }

    // Smooth scrolling
    initScrolling() {
        const storyLine = document.querySelector('.story-line');
        let current = 0, target = 0, velocity = 0, isDragging = false, startX = 0, lastX = 0;

        this.scrollTo = (x) => {
            target = Math.max(0, Math.min(x, storyLine.scrollWidth - storyLine.clientWidth));
        };

        const animate = () => {
            if (!isDragging) {
                velocity += (target - current) * 0.2;
                velocity *= 0.8;
                current += velocity;
                storyLine.scrollLeft = current;
            }
            requestAnimationFrame(animate);
        };

        const handleStart = (clientX) => {
            isDragging = true;
            startX = lastX = clientX;
            velocity = 0;
            storyLine.style.cursor = 'grabbing';
        };

        const handleMove = (clientX) => {
            if (!isDragging) return;
            const delta = (lastX - clientX) * 2;
            current = Math.max(0, Math.min(current + delta, storyLine.scrollWidth - storyLine.clientWidth));
            target = current;
            storyLine.scrollLeft = current;
            lastX = clientX;
        };

        const handleEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            storyLine.style.cursor = 'grab';
        };

        storyLine.addEventListener('mousedown', (e) => {
            handleStart(e.clientX);
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => handleMove(e.clientX));
        document.addEventListener('mouseup', handleEnd);

        storyLine.addEventListener('touchstart', (e) => {
            handleStart(e.touches[0].clientX);
        }, { passive: true });
        
        storyLine.addEventListener('touchmove', (e) => {
            handleMove(e.touches[0].clientX);
            if (Math.abs(e.touches[0].clientX - startX) > 10) e.preventDefault();
        }, { passive: false });
        
        storyLine.addEventListener('touchend', handleEnd, { passive: true });

        storyLine.addEventListener('wheel', (e) => {
            e.preventDefault();
            target += (e.deltaX || e.deltaY) * 2;
            target = Math.max(0, Math.min(target, storyLine.scrollWidth - storyLine.clientWidth));
        }, { passive: false });

        current = target = storyLine.scrollLeft;
        storyLine.style.overflow = 'hidden';
        storyLine.style.cursor = 'grab';
        animate();
    }
}

new StoryPreview();
// -------------------------------------
// Nothing Yet
// -------------------------------------

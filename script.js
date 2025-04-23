document.addEventListener('DOMContentLoaded', function() {
    // Setup lightning canvas
    const canvas = document.getElementById('lightning-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Track mouse for interactive lightning
    let mouseX = 0;
    let mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    // Lightning class - creates realistic lightning bolts
    class Lightning {
        constructor(options) {
            this.startX = options.startX;
            this.startY = options.startY;
            this.endX = options.endX;
            this.endY = options.endY;
            this.mainWidth = options.width || 1.8; // Reduced from 4 to 1.8 for thinner bolts
            this.branchWidth = this.mainWidth / 2.5; // Thinner branching
            this.opacity = options.opacity || 1;
            this.color = options.color || '#FFFFFF';
            this.branches = options.branches || 3;
            this.detail = options.detail || 3; // Higher detail for more jagged, realistic look
            this.segments = [];
            this.branchSegments = [];
            this.life = options.life || 1;
            this.decay = options.decay || 0.05;
            this.hasBranched = false;
            
            // Generate the lightning path
            this.generate();
        }
        
        generate() {
            let points = this.createLightningPoints(
                this.startX, this.startY,
                this.endX, this.endY,
                this.detail
            );
            this.segments = points;
            
            // Create branches if this is the main bolt
            if (this.branches > 0 && !this.hasBranched) {
                this.createBranches(points);
            }
        }
        
        createLightningPoints(startX, startY, endX, endY, detail) {
            let points = [];
            points.push({x: startX, y: startY});
            
            let currentX = startX;
            let currentY = startY;
            let targetX = endX;
            let targetY = endY;
            
            // Displacement scales with distance
            let distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            let maxDisplacement = distance / 4; // More jagged
            
            // Create jagged path
            let segments = Math.pow(2, detail);
            let segmentLength = distance / segments;
            
            for (let i = 0; i < segments; i++) {
                // Move towards target
                let dx = (targetX - currentX) / (segments - i);
                let dy = (targetY - currentY) / (segments - i);
                
                // Add displacement perpendicular to movement direction
                let perpX = -dy;
                let perpY = dx;
                let perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
                
                // Normalize and scale by random displacement
                if (perpLength > 0) {
                    perpX /= perpLength;
                    perpY /= perpLength;
                }
                
                let displacement = (Math.random() * 2 - 1) * maxDisplacement;
                maxDisplacement *= 0.8; // Reduce displacement as we get closer
                
                let newX = currentX + dx + perpX * displacement;
                let newY = currentY + dy + perpY * displacement;
                
                points.push({x: newX, y: newY});
                
                currentX = newX;
                currentY = newY;
            }
            
            points.push({x: endX, y: endY});
            return points;
        }
        
        createBranches(points) {
            this.hasBranched = true;
            // Create branches at random points along the main bolt
            for (let b = 0; b < this.branches; b++) {
                if (points.length < 3) continue;
                
                // Choose a random point on the main bolt except the endpoints
                let startIndex = Math.floor(Math.random() * (points.length - 2)) + 1;
                let startPoint = points[startIndex];
                
                // Get direction to next point to inform branch direction
                let nextPoint = points[startIndex + 1];
                let dx = nextPoint.x - startPoint.x;
                let dy = nextPoint.y - startPoint.y;
                
                // Randomize branch angle and length relative to main bolt
                let angle = Math.atan2(dy, dx) + (Math.random() * Math.PI - Math.PI/2);
                let length = Math.random() * 80 + 40; // Slightly shorter branches
                
                let endX = startPoint.x + Math.cos(angle) * length;
                let endY = startPoint.y + Math.sin(angle) * length;
                
                // Create branch with reduced parameters
                let branchPoints = this.createLightningPoints(
                    startPoint.x, startPoint.y,
                    endX, endY,
                    this.detail - 1
                );
                
                this.branchSegments.push({
                    points: branchPoints,
                    life: this.life * 0.7, // Branches fade faster than main bolt
                    width: this.branchWidth
                });
                
                // Add secondary branches with a small probability
                if (Math.random() > 0.7 && this.detail > 1) {
                    let midIdx = Math.floor(branchPoints.length / 2);
                    if (midIdx > 0 && branchPoints.length > 2) {
                        let midPoint = branchPoints[midIdx];
                        let branchAngle = angle + (Math.random() - 0.5) * Math.PI/2;
                        let branchLength = length * 0.4;
                        
                        let branchEndX = midPoint.x + Math.cos(branchAngle) * branchLength;
                        let branchEndY = midPoint.y + Math.sin(branchAngle) * branchLength;
                        
                        let secondaryBranch = this.createLightningPoints(
                            midPoint.x, midPoint.y,
                            branchEndX, branchEndY,
                            this.detail - 2
                        );
                        
                        this.branchSegments.push({
                            points: secondaryBranch,
                            life: this.life * 0.5, // Secondary branches fade even faster
                            width: this.branchWidth * 0.6 // Thinner secondary branches
                        });
                    }
                }
            }
        }
        
        update() {
            // Reduce life/opacity
            this.life -= this.decay;
            
            // Update branches
            for (let i = 0; i < this.branchSegments.length; i++) {
                this.branchSegments[i].life -= this.decay * 1.2; // Branches fade faster
            }
            
            return this.life > 0;
        }
        
        draw(ctx) {
            if (this.life <= 0) return false;
            
            // Main bolt glow effect
            this.drawPath(ctx, this.segments, this.mainWidth * 2.5, `rgba(173, 216, 255, ${this.life * 0.2})`);
            
            // Main bolt white core
            this.drawPath(ctx, this.segments, this.mainWidth, `rgba(255, 255, 255, ${this.life})`);
            
            // Draw branches
            for (let i = 0; i < this.branchSegments.length; i++) {
                let branch = this.branchSegments[i];
                if (branch.life > 0) {
                    // Branch glow
                    this.drawPath(ctx, branch.points, branch.width * 2.5, `rgba(173, 216, 255, ${branch.life * 0.15})`);
                    
                    // Branch core
                    this.drawPath(ctx, branch.points, branch.width, `rgba(255, 255, 255, ${branch.life})`);
                }
            }
            
            return true;
        }
        
        drawPath(ctx, points, width, color) {
            if (points.length < 2) return;
            
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            
            ctx.stroke();
        }
    }
    
    // Lightning Manager - manages all lightning effects
    class LightningManager {
        constructor(canvas, ctx) {
            this.canvas = canvas;
            this.ctx = ctx;
            this.bolts = [];
            this.nextStrike = this.getNextStrikeTime();
            this.buttonsHovered = new Set();
        }
        
        getNextStrikeTime() {
            // Random timing between strikes
            return Date.now() + 800 + Math.random() * 4000;
        }
        
        createRandomLightning() {
            // Edge of screen to random point
            let startX, startY, endX, endY;
            
            // Choose a side to start from
            let side = Math.floor(Math.random() * 4);
            
            switch(side) {
                case 0: // Top
                    startX = Math.random() * this.canvas.width;
                    startY = 0;
                    endX = startX + (Math.random() * 400 - 200);
                    endY = Math.random() * this.canvas.height * 0.7;
                    break;
                case 1: // Right
                    startX = this.canvas.width;
                    startY = Math.random() * this.canvas.height * 0.5;
                    endX = Math.random() * this.canvas.width * 0.7;
                    endY = Math.random() * this.canvas.height;
                    break;
                case 2: // Bottom
                    startX = Math.random() * this.canvas.width;
                    startY = this.canvas.height;
                    endX = startX + (Math.random() * 400 - 200);
                    endY = Math.random() * this.canvas.height * 0.7;
                    break;
                case 3: // Left
                    startX = 0;
                    startY = Math.random() * this.canvas.height * 0.5;
                    endX = Math.random() * this.canvas.width * 0.7 + this.canvas.width * 0.3;
                    endY = Math.random() * this.canvas.height;
                    break;
            }
            
            // Create main bolt
            const lightning = new Lightning({
                startX,
                startY,
                endX,
                endY,
                width: 1.2 + Math.random() * 1.8, // Thinner bolts
                branches: 2 + Math.floor(Math.random() * 3),
                detail: 7, // Higher detail for more realistic jaggedness
                life: 0.8 + Math.random() * 0.4,
                decay: 0.02 + Math.random() * 0.02
            });
            
            this.bolts.push(lightning);
            
            // Create smaller secondary strikes
            if (Math.random() > 0.6) {
                setTimeout(() => {
                    const secondary = new Lightning({
                        startX: startX + (Math.random() * 100 - 50),
                        startY: startY + (Math.random() * 50),
                        endX: endX + (Math.random() * 100 - 50),
                        endY: endY + (Math.random() * 100 - 50),
                        width: 0.8 + Math.random() * 1.2, // Thinner secondary bolts
                        branches: 1 + Math.floor(Math.random() * 2),
                        detail: 6,
                        life: 0.6 + Math.random() * 0.3,
                        decay: 0.03 + Math.random() * 0.02
                    });
                    this.bolts.push(secondary);
                }, 50 + Math.random() * 100); // Slight delay for realism
            }
            
            // Create thunder audio effect
            this.createThunderSound();
        }
        
        createLightningBetweenPoints(x1, y1, x2, y2, options = {}) {
            const lightning = new Lightning({
                startX: x1,
                startY: y1,
                endX: x2,
                endY: y2,
                width: options.width || 1.2, // Thinner
                branches: options.branches || 1,
                detail: options.detail || 5,
                life: options.life || 0.7,
                decay: options.decay || 0.05
            });
            
            this.bolts.push(lightning);
            return lightning;
        }
        
        createLightningToPoint(x, y) {
            // Create lightning from edge of screen to point
            let startX, startY;
            let edge = Math.floor(Math.random() * 4);
            
            switch(edge) {
                case 0: // Top
                    startX = x + (Math.random() * 200 - 100);
                    startY = 0;
                    break;
                case 1: // Right
                    startX = this.canvas.width;
                    startY = y + (Math.random() * 200 - 100);
                    break;
                case 2: // Bottom
                    startX = x + (Math.random() * 200 - 100);
                    startY = this.canvas.height;
                    break;
                case 3: // Left
                    startX = 0;
                    startY = y + (Math.random() * 200 - 100);
                    break;
            }
            
            return this.createLightningBetweenPoints(startX, startY, x, y, {
                width: 1.2 + Math.random() * 1, // Thinner
                branches: 1 + Math.floor(Math.random() * 3),
                detail: 6,
                life: 0.7 + Math.random() * 0.3,
                decay: 0.04 + Math.random() * 0.02
            });
        }
        
        createButtonBurst(button) {
            const rect = button.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Create burst effect
            const burstCount = 8 + Math.floor(Math.random() * 6);
            for (let i = 0; i < burstCount; i++) {
                const angle = (i / burstCount) * Math.PI * 2;
                const dist = 50 + Math.random() * 100;
                const endX = centerX + Math.cos(angle) * dist;
                const endY = centerY + Math.sin(angle) * dist;
                
                setTimeout(() => {
                    this.createLightningBetweenPoints(centerX, centerY, endX, endY, {
                        width: 0.8 + Math.random() * 1, // Thinner bolts
                        branches: Math.random() > 0.7 ? 1 : 0,
                        detail: 4 + Math.floor(Math.random() * 2),
                        life: 0.5 + Math.random() * 0.3,
                        decay: 0.06 + Math.random() * 0.04
                    });
                }, i * 30); // Stagger for better effect
            }
            
            // Create main strike to the button
            if (Math.random() > 0.3) {
                this.createLightningToPoint(centerX, centerY);
            }
        }
        
        createThunderSound() {
            // For accessibility reasons, we're making this sound optional
            // This creates a subtle thunder audio effect 
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const thunder = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                thunder.type = 'sine';
                thunder.frequency.value = 50 + Math.random() * 20;
                
                gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.03 + Math.random() * 0.03, audioContext.currentTime + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2);
                
                thunder.connect(gain);
                gain.connect(audioContext.destination);
                
                thunder.start();
                thunder.stop(audioContext.currentTime + 2);
            } catch(e) {
                // Audio API not supported or not allowed - ignore silently
            }
        }
        
        update() {
            // Check if it's time for a new random strike
            if (Date.now() > this.nextStrike) {
                this.createRandomLightning();
                this.nextStrike = this.getNextStrikeTime();
            }
            
            // Mouse-triggered lightning
            if (Math.random() > 0.995) {
                this.createLightningToPoint(mouseX, mouseY);
            }
            
            // Button-specific lightning
            for (const button of this.buttonsHovered) {
                if (Math.random() > 0.98) {
                    this.createButtonBurst(button);
                }
            }
            
            // Update all bolts
            for (let i = this.bolts.length - 1; i >= 0; i--) {
                const alive = this.bolts[i].update();
                if (!alive) {
                    this.bolts.splice(i, 1);
                }
            }
        }
        
        render() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw all lightning bolts
            for (let i = 0; i < this.bolts.length; i++) {
                this.bolts[i].draw(this.ctx);
            }
        }
        
        trackButtonHover(button, isHovering) {
            if (isHovering) {
                this.buttonsHovered.add(button);
                // Create immediate lightning effect when hovering
                if (Math.random() > 0.5) {
                    this.createButtonBurst(button);
                }
            } else {
                this.buttonsHovered.delete(button);
            }
        }
    }
    
    // Initialize the Lightning Manager
    const lightningManager = new LightningManager(canvas, ctx);
    
    // Animation loop
    function animate() {
        lightningManager.update();
        lightningManager.render();
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // Setup button interactions
    const buttons = document.querySelectorAll('.box-button');
    buttons.forEach(button => {
        // Track hover state
        button.addEventListener('mouseenter', function() {
            const effect = this.querySelector('.electricity-effect');
            effect.style.height = '8px';
            effect.style.boxShadow = '0 0 15px #73d0ff, 0 0 25px white';
            
            // Tell the lightning manager about the hover
            lightningManager.trackButtonHover(this, true);
        });
        
        button.addEventListener('mouseleave', function() {
            const effect = this.querySelector('.electricity-effect');
            effect.style.height = '4px';
            effect.style.boxShadow = 'none';
            
            lightningManager.trackButtonHover(this, false);
        });
        
        // Add click effect
        button.addEventListener('click', function() {
            // Create burst effect
            const burst = document.createElement('div');
            burst.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background-color: rgba(255, 255, 255, 0.8);
                box-shadow: 0 0 40px 20px rgba(255, 255, 255, 0.8);
                animation: burst 0.8s forwards;
                pointer-events: none;
                z-index: 10;
            `;
            
            this.appendChild(burst);
            
            // Create massive lighting burst
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    lightningManager.createButtonBurst(this);
                }, i * 100);
            }
            
            // Note: We don't prevent default here so the link works normally
        });
    });
    
    // Initial lightning for page load impact
    setTimeout(() => {
        lightningManager.createRandomLightning();
    }, 500);
    
    setTimeout(() => {
        lightningManager.createRandomLightning();
    }, 1200);
});
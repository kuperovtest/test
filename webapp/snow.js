(function() {
    'use strict';
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSnow);
    } else {
        initSnow();
    }
    
    function initSnow() {
        const canvas = document.createElement('canvas');
        canvas.id = 'snowCanvas';
        canvas.className = 'snow-canvas';
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        let animationId;
        let particles = [];

        const config = {
            maxParticles: 50, 
            minSize: 2,
            maxSize: 5,
            minSpeed: 0.8,
            maxSpeed: 2.5,
            minOpacity: 0.4,
            maxOpacity: 0.85,
            windStrength: 0.4
        };
        
        // Цвет
        const colors = [
            '#f2a603',
            '#f2a603',
            '#e69500',
            '#ffb31a'
        ];
    
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        
        class Particle {
            constructor() {
                this.reset();
                this.y = Math.random() * canvas.height;
            }
            
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = -20;
                this.size = Math.random() * (config.maxSize - config.minSize) + config.minSize;
                this.speed = Math.random() * (config.maxSpeed - config.minSpeed) + config.minSpeed;
                this.opacity = Math.random() * (config.maxOpacity - config.minOpacity) + config.minOpacity;
                this.wind = (Math.random() - 0.5) * config.windStrength;
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.08;
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }
            
            update() {
                this.y += this.speed;
                this.x += this.wind + Math.sin(this.y * 0.01) * 0.5;
                this.rotation += this.rotationSpeed;
                
                if (this.y > canvas.height + 20 || this.x < -20 || this.x > canvas.width + 20) {
                    this.reset();
                }
            }
            
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.globalAlpha = this.opacity;
                
                const s = this.size;
                
                // Рисуем форму pegtop (4-конечная звезда с закругленными концами)
                ctx.beginPath();
                
                // Верхний луч
                ctx.moveTo(0, -s);
                ctx.bezierCurveTo(s * 0.15, -s * 0.6, s * 0.15, -s * 0.4, s * 0.5, -s * 0.15);
                
                // Правый луч
                ctx.bezierCurveTo(s * 0.6, -s * 0.15, s * 0.8, -s * 0.1, s, 0);
                ctx.bezierCurveTo(s * 0.8, s * 0.1, s * 0.6, s * 0.15, s * 0.5, s * 0.15);
                
                // Нижний луч
                ctx.bezierCurveTo(s * 0.15, s * 0.4, s * 0.15, s * 0.6, 0, s);
                ctx.bezierCurveTo(-s * 0.15, s * 0.6, -s * 0.15, s * 0.4, -s * 0.5, s * 0.15);
                
                // Левый луч
                ctx.bezierCurveTo(-s * 0.6, s * 0.15, -s * 0.8, s * 0.1, -s, 0);
                ctx.bezierCurveTo(-s * 0.8, -s * 0.1, -s * 0.6, -s * 0.15, -s * 0.5, -s * 0.15);
                
                // Замыкаем к верхнему лучу
                ctx.bezierCurveTo(-s * 0.15, -s * 0.4, -s * 0.15, -s * 0.6, 0, -s);
                
                ctx.closePath();
                
                // Заливка с градиентом
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(0.7, this.color);
                gradient.addColorStop(1, 'rgba(242, 166, 3, 0.3)');
                
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // Блик
                ctx.globalAlpha = this.opacity * 0.4;
                ctx.beginPath();
                ctx.arc(-s * 0.2, -s * 0.3, s * 0.15, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fill();
                
                ctx.restore();
            }
        }
        
        function createParticles() {
            particles = [];
            for (let i = 0; i < config.maxParticles; i++) {
                particles.push(new Particle());
            }
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (let particle of particles) {
                particle.update();
                particle.draw();
            }
            
            animationId = requestAnimationFrame(animate);
        }
        
        function handleResize() {
            resizeCanvas();
            const currentParticles = particles.length;
            if (currentParticles < config.maxParticles) {
                for (let i = currentParticles; i < config.maxParticles; i++) {
                    particles.push(new Particle());
                }
            }
        }
        
        resizeCanvas();
        createParticles();
        animate();
        
        window.addEventListener('resize', handleResize);
        
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                cancelAnimationFrame(animationId);
            } else {
                animate();
            }
        });
    }
})();


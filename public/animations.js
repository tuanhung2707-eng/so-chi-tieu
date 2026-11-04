document.addEventListener("DOMContentLoaded", () => {
    // Check if user prefers reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const getVar = (el, name, def) => {
        const val = el.style.getPropertyValue(name) || getComputedStyle(el).getPropertyValue(name);
        if (!val) return def;
        const parsed = parseFloat(val.trim().replace('s', ''));
        return isNaN(parsed) ? def : parsed;
    };

    const q = (sel, parent=document) => Array.from(parent.querySelectorAll(sel));

    // A helper to handle dynamic elements using MutationObserver
    const dynamicAnimations = []; // array of { selector, animateFn }

    const applyDynamic = (node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        dynamicAnimations.forEach(({selector, animateFn}) => {
            if (node.matches(selector)) {
                animateFn(node);
            }
            q(selector, node).forEach(animateFn);
        });
    };

    const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
            if (m.type === 'childList') {
                m.addedNodes.forEach(node => applyDynamic(node));
            } else if (m.type === 'attributes' && m.attributeName === 'class' && m.target.classList.contains('hero')) {
                // Handle hero.over state change for falling leaves
                handleHeroState(m.target);
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    const registerAnim = (selector, animateFn) => {
        dynamicAnimations.push({ selector, animateFn });
        q(selector).forEach(animateFn);
    };

    // --- Hero Scene ---
    registerAnim('.tree', el => el.animate([
        { transform: 'rotate(-1deg)' }, { transform: 'rotate(1.2deg)', offset: 0.5 }, { transform: 'rotate(-1deg)' }
    ], { duration: 7200, iterations: Infinity, easing: 'ease-in-out' }));

    registerAnim('.crown', el => el.animate([
        { transform: 'rotate(-1.6deg) translateX(-1px)' }, { transform: 'rotate(1.8deg) translateX(2px)', offset: 0.5 }, { transform: 'rotate(-1.6deg) translateX(-1px)' }
    ], { duration: 5600, iterations: Infinity, easing: 'ease-in-out' }));

    const cloudKfs = [ { transform: 'translateX(-10px)' }, { transform: 'translateX(12px)' } ];
    registerAnim('.cloud-one', el => el.animate(cloudKfs, { duration: 26000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
    registerAnim('.cloud-two', el => el.animate(cloudKfs, { duration: 32000, iterations: Infinity, direction: 'alternate-reverse', easing: 'ease-in-out' }));
    registerAnim('.cloud-three', el => el.animate(cloudKfs, { duration: 29000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));

    registerAnim('.tuft', el => {
        let dur = 6400, del = 0;
        if (el.classList.contains('t1')) { dur = 5200; del = -1700; }
        else if (el.classList.contains('t2')) { dur = 7300; del = -3400; }
        el.animate([ { transform: 'rotate(-5deg)' }, { transform: 'rotate(6deg)', offset: 0.5 }, { transform: 'rotate(-5deg)' } ],
            { duration: dur, delay: del, iterations: Infinity, easing: 'ease-in-out' });
    });

    // Handle .hero.over
    const activeLeaves = new Map();
    const handleHeroState = (hero) => {
        const isOver = hero.classList.contains('over');

        q('.lf', hero).forEach(el => {
            if (isOver && !activeLeaves.has(el)) {
                const dur = parseFloat(el.style.animationDuration || '12s') * 1000;
                const del = parseFloat(el.style.animationDelay || '0s') * 1000;
                const x0 = el.style.getPropertyValue('--x0') || '0px';
                const y0 = el.style.getPropertyValue('--y0') || '0px';
                const dx = el.style.getPropertyValue('--dx') || '0px';
                const y1 = el.style.getPropertyValue('--y1') || '0px';
                const anim = el.animate([
                    { transform: `translate(${x0}, ${y0})`, opacity: 0 },
                    { opacity: 0.85, offset: 0.08 },
                    { transform: `translate(calc(${x0} + ${dx} * -0.35), calc(${y0} + (${y1} - ${y0}) * 0.3))`, offset: 0.3 },
                    { transform: `translate(calc(${x0} + ${dx} * 0.55), calc(${y0} + (${y1} - ${y0}) * 0.62))`, offset: 0.62 },
                    { opacity: 0.8, offset: 0.88 },
                    { transform: `translate(calc(${x0} + ${dx}), ${y1})`, opacity: 0 }
                ], { duration: dur, delay: del, iterations: Infinity, easing: 'linear' });
                activeLeaves.set(el, anim);
            } else if (!isOver && activeLeaves.has(el)) {
                activeLeaves.get(el).cancel();
                activeLeaves.delete(el);
            }
        });

        q('.lfi', hero).forEach(el => {
            if (isOver && !activeLeaves.has(el)) {
                const del = parseFloat(el.style.animationDelay || '0s') * 1000;
                const anim = el.animate([ { transform: 'rotate(-55deg)' }, { transform: 'rotate(65deg)' } ],
                    { duration: 4600, delay: del, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
                activeLeaves.set(el, anim);
            } else if (!isOver && activeLeaves.has(el)) {
                activeLeaves.get(el).cancel();
                activeLeaves.delete(el);
            }
        });
    };

    // Apply initially
    q('.hero').forEach(handleHeroState);

    // Check for mobile layout for background animations
    const isMobile = window.innerWidth <= 600;

    // --- Ocean Bubbles & Lights ---
    registerAnim('.bub', el => {
        if (isMobile) return;
        const d = getVar(el, '--d', 10) * 1000;
        const w = getVar(el, '--w', 0) * 1000;
        // Apply bubRise instead of oceanBubble
        el.animate([
            { transform: 'translate3d(0,0,0)', opacity: 0 },
            { opacity: 0.75, offset: 0.1 },
            { transform: 'translate3d(16px,-38vh,0)', offset: 0.35 },
            { transform: 'translate3d(-12px,-74vh,0)', opacity: 0.6, offset: 0.65 },
            { transform: 'translate3d(10px,-112vh,0)', opacity: 0 }
        ], { duration: d, delay: w, iterations: Infinity, easing: 'linear' });
    });

    registerAnim('.blob', el => {
        if (el.classList.contains('b1')) {
            el.animate([ { transform: 'translate3d(0,0,0) scale(1)' }, { transform: 'translate3d(90px,70px,0) scale(1.12)' }, { transform: 'translate3d(0,0,0) scale(1)' } ],
                { duration: 20000, iterations: Infinity, easing: 'ease-in-out' });
        } else if (el.classList.contains('b2')) {
            el.animate([ { transform: 'translate3d(0,0,0) scale(1)' }, { transform: 'translate3d(-100px,-60px,0) scale(1.1)' }, { transform: 'translate3d(0,0,0) scale(1)' } ],
                { duration: 25000, iterations: Infinity, easing: 'ease-in-out' });
        } else if (el.classList.contains('b3')) {
            el.animate([ { transform: 'translate3d(0,0,0) scale(1)' }, { transform: 'translate3d(80px,-50px,0) scale(1.15)' }, { transform: 'translate3d(0,0,0) scale(1)' } ],
                { duration: 30000, iterations: Infinity, easing: 'ease-in-out' });
        }
    });

    const bgEl = document.querySelector('.bg');
    if (!isMobile && bgEl && bgEl.animate) {
        const oceanLightKfs = [ { transform: 'translate3d(-12px, 0, 0) scale(1)' }, { transform: 'translate3d(35px, 22px, 0) scale(1.12)' } ];
        try {
            bgEl.animate(oceanLightKfs, { duration: 18000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out', pseudoElement: '::before' });
            bgEl.animate(oceanLightKfs, { duration: 24000, iterations: Infinity, direction: 'alternate-reverse', easing: 'ease-in-out', pseudoElement: '::after' });
        } catch (e) {}
    }

    // --- Sea Creatures ---
    registerAnim('.dust', el => {
        const t = getVar(el, '--t', 16) * 1000;
        const dl = getVar(el, '--dl', 0) * 1000;
        el.animate([
            { transform: 'translate(0, 0) scale(.6)', opacity: 0 }, { opacity: 0.65, offset: 0.15 },
            { transform: 'translate(12px, -45vh) scale(1)', offset: 0.5 }, { opacity: 0.4, offset: 0.85 },
            { transform: 'translate(-8px, -100vh) scale(.7)', opacity: 0 }
        ], { duration: t, delay: dl, iterations: Infinity, easing: 'linear' });
    });

    registerAnim('.kelp', el => {
        const t = getVar(el, '--t', 9) * 1000;
        const dl = getVar(el, '--dl', 0) * 1000;
        el.animate([ { transform: 'rotate(-5deg) skewX(-2deg)' }, { transform: 'rotate(7deg) skewX(3deg)' } ],
            { duration: t, delay: dl, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    });

    registerAnim('.grass', el => {
        const t = getVar(el, '--t', 6) * 1000;
        const dl = getVar(el, '--dl', 0) * 1000;
        el.animate([ { transform: 'rotate(-7deg)' }, { transform: 'rotate(8deg)' } ],
            { duration: t, delay: dl, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    });

    registerAnim('.star', el => {
        const dl = el.classList.contains('s2') ? -3000 : 0;
        el.animate([ { scale: 1 }, { scale: 1.08 } ],
            { duration: 7000, delay: dl, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    });

    const swimKfs = [
        { transform: 'translateX(0) scaleX(1)' }, { transform: 'translateX(var(--sx)) scaleX(1)', offset: 0.46 },
        { transform: 'translateX(var(--sx)) scaleX(-1)', offset: 0.50 }, { transform: 'translateX(0) scaleX(-1)', offset: 0.96 },
        { transform: 'translateX(0) scaleX(1)' }
    ];
    registerAnim('.fish', el => {
        const t = getVar(el, '--t', 32) * 1000;
        const dl = getVar(el, '--dl', 0) * 1000;
        el.animate(swimKfs, { duration: t, delay: dl, iterations: Infinity, easing: 'linear' });
    });

    registerAnim('.turtle', el => {
        el.animate(swimKfs, { duration: 90000, delay: -22000, iterations: Infinity, easing: 'linear' });
    });

    registerAnim('.fish svg', el => el.animate([ { transform: 'translateY(-3px) rotate(-2deg)' }, { transform: 'translateY(3px) rotate(2deg)' } ],
        { duration: 4000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));

    registerAnim('.fish .tail', el => {
        const d = el.closest('.fish').classList.contains('small') ? 700 : 1000;
        el.animate([ { transform: 'rotate(-14deg)' }, { transform: 'rotate(14deg)' } ],
            { duration: d, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    });

    registerAnim('.crab', el => {
        const t = getVar(el, '--t', 35) * 1000;
        const dl = getVar(el, '--dl', 0) * 1000;
        const dir = el.classList.contains('small') ? 'alternate-reverse' : 'alternate';
        el.animate([ { transform: 'translateX(0)' }, { transform: 'translateX(var(--walk))' } ],
            { duration: t, delay: dl, iterations: Infinity, direction: dir, easing: 'ease-in-out' });
    });

    registerAnim('.crab svg', el => el.animate([ { transform: 'translateY(0)' }, { transform: 'translateY(-2px)' } ],
        { duration: 1000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));

    registerAnim('.crab .cl-l, .crab .cl-r', el => {
        const dl = el.classList.contains('cl-r') ? -1500 : 0;
        el.animate([ { transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' } ],
            { duration: 3000, delay: dl, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    });

    registerAnim('.crab .jaw', el => el.animate([
        { transform: 'rotate(0)' }, { transform: 'rotate(-15deg)', offset: 0.76 },
        { transform: 'rotate(2deg)', offset: 0.86 }, { transform: 'rotate(0)' }
    ], { duration: 2500, iterations: Infinity, easing: 'ease-in-out' }));

    registerAnim('.crab .legs', el => el.animate([ { transform: 'scaleY(.97)' }, { transform: 'scaleY(1.03)' } ],
        { duration: 600, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));

    registerAnim('.turtle svg', el => el.animate([ { transform: 'translateY(-7px) rotate(-2deg)' }, { transform: 'translateY(7px) rotate(2deg)' } ],
        { duration: 7000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));

    registerAnim('.turtle .fl', el => {
        const dl = el.classList.contains('fl-b') ? -1500 : (el.classList.contains('fl-r') ? -750 : 0);
        el.animate([ { transform: 'rotate(-15deg)' }, { transform: 'rotate(14deg)' } ],
            { duration: 3000, delay: dl, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    });

});

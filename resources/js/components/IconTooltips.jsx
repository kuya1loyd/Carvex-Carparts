import { useEffect } from 'react';

let tooltipId = 0;

const isIconOnlyControl = (control) => {
    if (!control || !control.querySelector('svg, img')) {
        return false;
    }

    const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    while (textNode) {
        const text = String(textNode.nodeValue || '').trim();
        const parent = textNode.parentElement;
        const isHiddenHelper = parent?.closest('svg, img, [aria-hidden="true"], [hidden], .sr-only, .visually-hidden, .cv-skeleton-visually-hidden');
        if (text && !/^\d+$/.test(text) && !isHiddenHelper) {
            return false;
        }
        textNode = walker.nextNode();
    }

    return true;
};

export default function IconTooltips() {
    useEffect(() => {
        const tooltip = document.createElement('div');
        tooltip.className = 'cv-icon-tooltip';
        tooltip.setAttribute('role', 'tooltip');
        tooltip.hidden = true;
        document.body.appendChild(tooltip);

        let activeControl = null;
        let activeDescription = null;

        const hide = () => {
            if (activeControl && activeDescription) {
                const describedBy = (activeControl.getAttribute('aria-describedby') || '')
                    .split(/\s+/)
                    .filter((id) => id && id !== activeDescription);
                if (describedBy.length) {
                    activeControl.setAttribute('aria-describedby', describedBy.join(' '));
                } else {
                    activeControl.removeAttribute('aria-describedby');
                }
            }
            activeControl = null;
            activeDescription = null;
            tooltip.hidden = true;
        };

        const show = (control) => {
            if (!isIconOnlyControl(control)) {
                hide();
                return;
            }

            if (activeControl && activeControl !== control) {
                hide();
            }

            const label = String(control.getAttribute('aria-label') || control.dataset.tooltip || control.getAttribute('title') || '').trim();
            if (!label) {
                hide();
                return;
            }

            if (control.hasAttribute('title')) {
                control.removeAttribute('title');
            }
            if (!control.hasAttribute('aria-label')) {
                control.setAttribute('aria-label', label);
            }
            tooltip.textContent = label;
            tooltip.hidden = false;
            activeControl = control;
            activeDescription = tooltip.id || `cv-icon-tooltip-${++tooltipId}`;
            tooltip.id = activeDescription;
            const describedBy = new Set((control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
            describedBy.add(activeDescription);
            control.setAttribute('aria-describedby', Array.from(describedBy).join(' '));

            const rect = control.getBoundingClientRect();
            const halfTooltipWidth = tooltip.offsetWidth / 2;
            const left = Math.min(Math.max(rect.left + rect.width / 2, halfTooltipWidth + 8), window.innerWidth - halfTooltipWidth - 8);
            const below = rect.bottom + 8;
            const top = below + tooltip.offsetHeight <= window.innerHeight - 8
                ? below
                : Math.max(8, rect.top - tooltip.offsetHeight - 8);
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        };

        const onPointerOver = (event) => {
            const control = event.target instanceof Element ? event.target.closest('button, a') : null;
            if (control && isIconOnlyControl(control)) {
                show(control);
            }
        };
        const onPointerOut = (event) => {
            if (activeControl && event.target instanceof Element && activeControl.contains(event.target)
                && !(event.relatedTarget instanceof Node && activeControl.contains(event.relatedTarget))) {
                hide();
            }
        };
        const onFocusIn = (event) => {
            const control = event.target instanceof Element ? event.target.closest('button, a') : null;
            if (control) {
                show(control);
            }
        };
        const onFocusOut = (event) => {
            if (activeControl && event.target === activeControl) {
                hide();
            }
        };
        const onViewportChange = () => {
            if (activeControl) {
                show(activeControl);
            }
        };

        document.addEventListener('pointerover', onPointerOver);
        document.addEventListener('pointerout', onPointerOut);
        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('focusout', onFocusOut);
        window.addEventListener('scroll', onViewportChange, true);
        window.addEventListener('resize', onViewportChange);

        return () => {
            hide();
            document.removeEventListener('pointerover', onPointerOver);
            document.removeEventListener('pointerout', onPointerOut);
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('focusout', onFocusOut);
            window.removeEventListener('scroll', onViewportChange, true);
            window.removeEventListener('resize', onViewportChange);
            tooltip.remove();
        };
    }, []);

    return null;
}

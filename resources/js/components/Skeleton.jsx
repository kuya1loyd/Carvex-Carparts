import React from 'react';

const row = (key, className = '') => (
    <div className={`cv-skeleton-row ${className}`} key={key} aria-hidden="true">
        <span className="cv-skeleton-block cv-skeleton-row__image" />
        <span className="cv-skeleton-row__copy">
            <span className="cv-skeleton-block cv-skeleton-row__title" />
            <span className="cv-skeleton-block cv-skeleton-row__line" />
            <span className="cv-skeleton-block cv-skeleton-row__short" />
        </span>
    </div>
);

export default function PageSkeleton({ variant = 'route', label = 'Loading content' }) {
    let content;

    if (variant === 'cards') {
        content = (
            <div className="cv-skeleton-grid" aria-hidden="true">
                {Array.from({ length: 8 }, (_, index) => (
                    <div className="cv-skeleton-card" key={index}>
                        <span className="cv-skeleton-block cv-skeleton-card__image" />
                        <span className="cv-skeleton-block cv-skeleton-card__title" />
                        <span className="cv-skeleton-block cv-skeleton-card__line" />
                        <span className="cv-skeleton-block cv-skeleton-card__price" />
                        <span className="cv-skeleton-block cv-skeleton-card__button" />
                    </div>
                ))}
            </div>
        );
    } else if (variant === 'list') {
        content = <div className="cv-skeleton-list" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => row(index))}</div>;
    } else if (variant === 'detail') {
        content = (
            <div className="cv-skeleton-detail" aria-hidden="true">
                <span className="cv-skeleton-block cv-skeleton-detail__image" />
                <div className="cv-skeleton-detail__copy">
                    <span className="cv-skeleton-block cv-skeleton-detail__title" />
                    <span className="cv-skeleton-block cv-skeleton-detail__line" />
                    <span className="cv-skeleton-block cv-skeleton-detail__line cv-skeleton-detail__line--short" />
                    <span className="cv-skeleton-block cv-skeleton-detail__price" />
                    <span className="cv-skeleton-block cv-skeleton-detail__button" />
                </div>
            </div>
        );
    } else if (variant === 'dashboard') {
        content = (
            <div className="cv-skeleton-dashboard" aria-hidden="true">
                <div className="cv-skeleton-stats">{Array.from({ length: 4 }, (_, index) => <span className="cv-skeleton-block" key={index} />)}</div>
                <div className="cv-skeleton-dashboard__columns">
                    <div>{Array.from({ length: 4 }, (_, index) => row(index))}</div>
                    <div className="cv-skeleton-dashboard__panel">
                        <span className="cv-skeleton-block" />
                        <span className="cv-skeleton-block" />
                        <span className="cv-skeleton-block" />
                    </div>
                </div>
            </div>
        );
    } else {
        content = (
            <div className="cv-skeleton-route" aria-hidden="true">
                <span className="cv-skeleton-block cv-skeleton-route__heading" />
                <span className="cv-skeleton-block cv-skeleton-route__subheading" />
                <div className="cv-skeleton-stats">{Array.from({ length: 3 }, (_, index) => <span className="cv-skeleton-block" key={index} />)}</div>
                <div className="cv-skeleton-route__body">
                    <span className="cv-skeleton-block" />
                    <span className="cv-skeleton-block" />
                </div>
            </div>
        );
    }

    return (
        <div className={`cv-skeleton-page cv-skeleton-page--${variant}`} role="status" aria-label={label}>
            <span className="cv-skeleton-visually-hidden">{label}</span>
            {content}
        </div>
    );
}

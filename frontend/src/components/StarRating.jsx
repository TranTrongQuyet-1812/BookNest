import React from 'react';
import { Star } from 'lucide-react';

/**
 * Component hiển thị sao đánh giá (1 - 5 sao) và hỗ trợ tương tác chọn số sao
 */
export const StarRating = ({ rating = 0, onRatingChange, interactive = false, size = 18 }) => {
  const stars = [1, 2, 3, 4, 5];

  if (!interactive) {
    return (
      <div
        className="inline-flex items-center gap-1"
        role="img"
        aria-label={`${rating} trên 5 sao`}
      >
        {stars.map((sao) => {
          const isFilled = sao <= rating;
          return (
            <span
              key={sao}
              aria-hidden="true"
              style={{
                color: isFilled ? '#D97706' : 'var(--border)',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <Star
                size={size}
                fill={isFilled ? '#D97706' : 'transparent'}
                strokeWidth={1.5}
              />
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1"
      role="radiogroup"
      aria-label="Chọn số sao"
    >
      {stars.map((sao) => {
        const isFilled = sao <= rating;
        return (
          <button
            key={sao}
            type="button"
            role="radio"
            aria-checked={sao === rating}
            aria-label={`${sao} sao`}
            onClick={() => onRatingChange && onRatingChange(sao)}
            style={{
              cursor: 'pointer',
              color: isFilled ? '#D97706' : 'var(--border)',
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <Star
              size={size}
              fill={isFilled ? '#D97706' : 'transparent'}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
